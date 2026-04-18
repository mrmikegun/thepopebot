// Re-export Telegram API helpers from the package (single source of truth).
// The CLI setup wizard shares these helpers with the admin UI server actions.
export {
  validateBotToken,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  deleteTelegramWebhook,
} from '../../lib/tools/telegram.js';

/**
 * Get BotFather URL for creating a new bot
 */
export function getBotFatherURL() {
  return 'https://t.me/BotFather';
}
