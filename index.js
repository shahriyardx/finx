// Custom entry: register headless task handlers (widget + app-killed SMS
// import), then hand off to expo-router. Set as package.json "main".
import 'expo-router/entry'

import { AppRegistry } from 'react-native'
import { registerWidgetTaskHandler } from 'react-native-android-widget'

import { smsImportTask } from './src/lib/sms-import'
import { widgetTaskHandler } from './src/widgets/task-handler'

registerWidgetTaskHandler(widgetTaskHandler)

// Runs when a manifest-declared receiver delivers an SMS while the app is killed.
AppRegistry.registerHeadlessTask('SmsImportTask', () => smsImportTask)
