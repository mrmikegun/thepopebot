import { ChannelAdapter } from './base.js';
import {
  sendMessage,
  downloadFile,
  reactToMessage,
  startTypingIndicator,
  formatToolCall,
} from '../tools/telegram.js';
import { isWhisperEnabled, transcribeAudio } from '../tools/openai.js';

class TelegramAdapter extends ChannelAdapter {
  constructor(botToken) {
    super();
    this.botToken = botToken;
  }

  /**
   * Parse a Telegram webhook update into normalized message data.
   * Handles: text, voice/audio (transcribed), photos, documents.
   * Returns null if the update should be ignored.
   */
  async receive(request) {
    const { TELEGRAM_WEBHOOK_SECRET, TELEGRAM_CHAT_ID, TELEGRAM_VERIFICATION } = process.env;

    // Validate secret token (required)
    if (!TELEGRAM_WEBHOOK_SECRET) {
      console.error('[telegram] TELEGRAM_WEBHOOK_SECRET not configured — rejecting webhook');
      return null;
    }
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
    if (headerSecret !== TELEGRAM_WEBHOOK_SECRET) {
      return null;
    }

    const update = await request.json();
    const message = update.message || update.edited_message;

    if (!message || !message.chat || !this.botToken) return null;

    const chatId = String(message.chat.id);
    let text = message.text || null;
    const attachments = [];

    // Check for verification code — works even before TELEGRAM_CHAT_ID is set
    if (TELEGRAM_VERIFICATION && text === TELEGRAM_VERIFICATION) {
      await sendMessage(this.botToken, chatId, `Your chat ID:\n<code>${chatId}</code>`);
      return null;
    }

    // Security: if no TELEGRAM_CHAT_ID configured, ignore all messages
    if (!TELEGRAM_CHAT_ID) return null;

    // Security: only accept messages from configured chat
    if (chatId !== TELEGRAM_CHAT_ID) return null;

    // Voice messages → transcribe to text
    if (message.voice) {
      if (!isWhisperEnabled()) {
        await sendMessage(
          this.botToken,
          chatId,
          'Voice messages are not supported. Please set OPENAI_API_KEY to enable transcription.'
        );
        return null;
      }
      try {
        const { buffer, filename } = await downloadFile(this.botToken, message.voice.file_id);
        text = await transcribeAudio(buffer, filename);
      } catch (err) {
        console.error('Failed to transcribe voice:', err);
        await sendMessage(this.botToken, chatId, 'Sorry, I could not transcribe your voice message.');
        return null;
      }
    }

    // Audio messages → transcribe to text
    if (message.audio && !text) {
      if (!isWhisperEnabled()) {
        await sendMessage(
          this.botToken,
          chatId,
          'Audio messages are not supported. Please set OPENAI_API_KEY to enable transcription.'
        );
        return null;
      }
      try {
        const { buffer, filename } = await downloadFile(this.botToken, message.audio.file_id);
        text = await transcribeAudio(buffer, filename);
      } catch (err) {
        console.error('Failed to transcribe audio:', err);
        await sendMessage(this.botToken, chatId, 'Sorry, I could not transcribe your audio message.');
        return null;
      }
    }

    // Photo → download largest size, add as image attachment
    if (message.photo && message.photo.length > 0) {
      try {
        const largest = message.photo[message.photo.length - 1];
        const { buffer } = await downloadFile(this.botToken, largest.file_id);
        attachments.push({ category: 'image', mimeType: 'image/jpeg', data: buffer });
        // Use caption as text if no text yet
        if (!text && message.caption) text = message.caption;
      } catch (err) {
        console.error('Failed to download photo:', err);
      }
    }

    // Document → download, add as document attachment
    if (message.document) {
      try {
        const { buffer, filename } = await downloadFile(this.botToken, message.document.file_id);
        const mimeType = message.document.mime_type || 'application/octet-stream';
        attachments.push({ category: 'document', mimeType, data: buffer });
        if (!text && message.caption) text = message.caption;
      } catch (err) {
        console.error('Failed to download document:', err);
      }
    }

    // Nothing actionable
    if (!text && attachments.length === 0) return null;

    return {
      threadId: chatId,
      text: text || '',
      attachments,
      metadata: { messageId: message.message_id, chatId },
    };
  }

  async acknowledge(metadata) {
    await reactToMessage(this.botToken, metadata.chatId, metadata.messageId).catch(() => {});
  }

  startProcessingIndicator(metadata) {
    return startTypingIndicator(this.botToken, metadata.chatId);
  }

  async sendResponse(threadId, text, metadata) {
    await sendMessage(this.botToken, threadId, text);
  }

  /**
   * Consume a chatStream() async iterable and send progressive messages.
   * - Text chunks accumulate and flush when a tool-call arrives or stream ends.
   * - Each tool-call sends immediately as its own message.
   * - Tool-results react to the tool-call message with ✅ (or ❌ on error).
   *
   * @param {string} chatId - Telegram chat ID
   * @param {AsyncIterable} chunks - chatStream() output
   */
  async streamChatResponse(chatId, chunks) {
    let textBuffer = '';
    // Map toolCallId → { telegramMessageId, hasCompleteArgs }
    const toolMessages = new Map();

    for await (const chunk of chunks) {
      if (chunk.type === 'text') {
        textBuffer += chunk.text;
      } else if (chunk.type === 'tool-call') {
        // Skip the first empty-args emission — wait for complete args
        if (!chunk.args || Object.keys(chunk.args).length === 0) {
          continue;
        }

        // Flush accumulated text before tool call
        if (textBuffer.trim()) {
          await sendMessage(this.botToken, chatId, textBuffer.trim());
          textBuffer = '';
        }

        // Send tool call as its own message
        const text = formatToolCall(chunk.toolName, chunk.args);
        try {
          const msg = await sendMessage(this.botToken, chatId, text);
          toolMessages.set(chunk.toolCallId, msg.message_id);
        } catch (err) {
          console.error('[telegram] Failed to send tool call:', err.message);
        }
      } else if (chunk.type === 'tool-result') {
        const messageId = toolMessages.get(chunk.toolCallId);
        if (messageId) {
          const emoji = chunk.result?.includes?.('error') || chunk.result?.includes?.('Error')
            ? '👎'
            : '👍';
          reactToMessage(this.botToken, chatId, messageId, emoji).catch(() => {});
          toolMessages.delete(chunk.toolCallId);
        }
      }
      // Skip: meta, result, thinking-*, unknown
    }

    // Flush remaining text
    if (textBuffer.trim()) {
      await sendMessage(this.botToken, chatId, textBuffer.trim());
    }
  }

  get supportsStreaming() {
    return false;
  }
}

export { TelegramAdapter };
