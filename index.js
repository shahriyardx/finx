// Custom entry: register the home-screen widget's headless task handler, then
// hand off to expo-router. Set as package.json "main".
import 'expo-router/entry'

import { registerWidgetTaskHandler } from 'react-native-android-widget'

import { widgetTaskHandler } from './src/widgets/task-handler'

registerWidgetTaskHandler(widgetTaskHandler)
