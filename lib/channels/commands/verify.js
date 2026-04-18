import { redeemCode } from '../../db/user-channels.js';

/**
 * /verify <code>
 * Pre-auth: binds the incoming channel chat to the user who issued the code.
 */
export async function verifyCommand({ args, ctx }) {
  const [code] = args;
  if (!code) {
    return { handled: true, reply: 'Usage: /verify <code>' };
  }
  try {
    const { userId } = redeemCode(ctx.channel, code, ctx.channelChatId);
    return { handled: true, reply: 'Linked. Send a message to start chatting.', userId };
  } catch (err) {
    return { handled: true, reply: `Verification failed: ${err.message}` };
  }
}
