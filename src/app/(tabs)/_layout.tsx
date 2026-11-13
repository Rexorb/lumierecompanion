import { Tabs } from 'expo-router';
import { CalendarDays, House, Users } from 'lucide-react-native';
import { colors, fonts } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: { backgroundColor: colors.surfaceLowest, height: 62 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8), borderTopWidth: 0, elevation: 0 },
    tabBarItemStyle: { minHeight: 48 }, tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, marginTop: 2 } }}>
    <Tabs.Screen name="overview" options={{ title: 'Início', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
    <Tabs.Screen name="agendamentos" options={{ title: 'Agenda', tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }} />
    <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
  </Tabs>;
}
