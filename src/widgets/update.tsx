import { Platform } from 'react-native'
import { requestWidgetUpdate } from 'react-native-android-widget'

import { BalanceWidget } from './balance-widget'
import { getWidgetData } from './data'

/** Push the latest balance to any placed widget. No-op off Android. */
export async function updateBalanceWidget(): Promise<void> {
  if (Platform.OS !== 'android') return
  const data = await getWidgetData()
  await requestWidgetUpdate({
    widgetName: 'Balance',
    renderWidget: () => <BalanceWidget {...data} />,
    widgetNotFound: () => {},
  })
}
