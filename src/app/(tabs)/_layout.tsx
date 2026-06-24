import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'shift' }}
      tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="wallets" options={{ title: 'Wallets' }} />
      <Tabs.Screen name="people" options={{ title: 'People' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
