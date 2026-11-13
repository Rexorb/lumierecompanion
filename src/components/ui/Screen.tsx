import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@/theme';
import { EditorialHeading } from './EditorialHeading';

export function ScreenHeader({ label, first, emphasis, description }: { label: string; first: string; emphasis: string; description?: string }) {
  return <>
    <View style={styles.top}><Text style={styles.brand}>Lumière<Text style={styles.dot}>.</Text></Text><Text style={styles.companion}>COMPANION</Text></View>
    <EditorialHeading eyebrow={label} first={first} emphasis={emphasis} description={description} />
  </>;
}

export function Screen({ label, first, emphasis, description, children, refreshing, onRefresh }: { label: string; first: string; emphasis: string; description?: string; children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={styles.content} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} /> : undefined}>
    <ScreenHeader label={label} first={first} emphasis={emphasis} description={description} />
    {children}
  </ScrollView></SafeAreaView>;
}
export const screenStyles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.surface }, content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl } });
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.xxl, paddingBottom: spacing.xxxl },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.sm },
  brand: { fontFamily: fonts.brand, fontSize: 27, color: colors.accent },
  dot: { color: colors.secondaryDark }, companion: { fontFamily: fonts.mono, color: colors.muted, fontSize: 9, letterSpacing: 2 },
});
