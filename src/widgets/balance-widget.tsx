// react-native-android-widget needs raw function components; opt this file out
// of the React Compiler (the app's reactCompiler experiment is on).
'use no memo'

import { FlexWidget, IconWidget, TextWidget } from 'react-native-android-widget'

import { formatMoney } from '@/lib/format'

// MaterialCommunityIcons glyphs (bundled via the widget plugin's `fonts`).
const ICON_FONT = 'MaterialCommunityIcons'
const ARROW_IN = String.fromCodePoint(0xf0042) // arrow-bottom-left
const ARROW_OUT = String.fromCodePoint(0xf005c) // arrow-top-right

export type BalanceWidgetData = {
  total: number
  income: number
  spend: number
  currency: string
}

const FOREST = '#163300'
const LIME = '#9FE870'
const WHITE = '#FFFFFF'
const ICON_BG = 'rgba(159, 232, 112, 0.18)'

/** A circular badge with a MaterialCommunityIcons arrow, mirroring the app card. */
function StatIcon({ icon }: { icon: string }) {
  'use no memo'
  return (
    <FlexWidget
      style={{
        height: 34,
        width: 34,
        borderRadius: 17,
        backgroundColor: ICON_BG,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <IconWidget icon={icon} font={ICON_FONT} size={18} style={{ color: WHITE }} />
    </FlexWidget>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  'use no memo'
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
      <StatIcon icon={icon} />
      <FlexWidget style={{ flexDirection: 'column', marginLeft: 8 }}>
        <TextWidget text={label} style={{ fontSize: 11, color: LIME }} />
        <TextWidget text={value} style={{ fontSize: 14, fontWeight: '600', color: WHITE }} />
      </FlexWidget>
    </FlexWidget>
  )
}

/** Home-screen widget mirroring the dashboard's "Total balance" card. */
export function BalanceWidget({ total, income, spend, currency }: BalanceWidgetData) {
  'use no memo'
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: FOREST,
        borderRadius: 24,
        padding: 20,
      }}>
      <TextWidget text="Total balance" style={{ fontSize: 13, color: LIME }} />
      <TextWidget
        text={formatMoney(total, currency)}
        style={{ fontSize: 36, fontWeight: '700', color: WHITE, marginTop: 4 }}
      />
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: 14 }}>
        <Stat icon={ARROW_IN} label="Income" value={formatMoney(income, currency)} />
        <Stat icon={ARROW_OUT} label="Spent" value={formatMoney(spend, currency)} />
      </FlexWidget>
    </FlexWidget>
  )
}
