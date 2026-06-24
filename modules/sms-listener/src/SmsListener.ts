import { NativeModule, requireNativeModule } from 'expo';

import { type SmsListenerModuleEvents } from './SmsListener.types';

declare class SmsListenerModule extends NativeModule<SmsListenerModuleEvents> {}

// The native module only exists in a real build (dev client / release APK), not
// in Expo Go or on platforms without an implementation. Guard the lookup so the
// app still loads there — the SMS feature is simply inactive.
let native: SmsListenerModule | null = null;
try {
  native = requireNativeModule<SmsListenerModule>('SmsListener');
} catch {
  native = null;
}

export default native;
