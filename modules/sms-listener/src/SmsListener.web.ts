import { registerWebModule, NativeModule } from 'expo';

import { type SmsListenerModuleEvents } from './SmsListener.types';

// Web has no SMS access; this stub never emits.
class SmsListenerModule extends NativeModule<SmsListenerModuleEvents> {}

export default registerWebModule(SmsListenerModule, 'SmsListener');
