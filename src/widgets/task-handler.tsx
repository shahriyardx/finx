import type { WidgetTaskHandlerProps } from 'react-native-android-widget'

import { BalanceWidget } from './balance-widget'
import { getWidgetData } from './data'

/**
 * Runs in a headless JS context when Android asks the widget to render
 * (added, resized, or on its periodic update). Reads fresh data from the DB.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await getWidgetData()
      props.renderWidget(<BalanceWidget {...data} />)
      break
    }
    default:
      break
  }
}
