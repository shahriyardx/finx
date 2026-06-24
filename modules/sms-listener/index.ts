import SmsListener from './src/SmsListener';
export { type SmsReceivedEvent } from './src/SmsListener.types';

/** True when a working native SMS listener is available (real Android build). */
export const isSmsListenerAvailable = SmsListener !== null;

/** Subscribe to incoming SMS. Returns a subscription with `.remove()`. */
export function addSmsListener(cb: (event: { sender: string; body: string }) => void) {
  if (!SmsListener) return { remove() {} };
  return SmsListener.addListener('onSmsReceived', cb);
}

export default SmsListener;
