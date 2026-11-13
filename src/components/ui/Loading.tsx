import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

export function Loading({ message = 'Carregando…' }: { message?: string }) {
  return <View style={styles.root} accessibilityLiveRegion="polite"><ActivityIndicator color={colors.accent} /><Text style={styles.text}>{message}</Text></View>;
}
const styles = StyleSheet.create({ root: { alignItems: 'center', gap: spacing.md, padding: spacing.xl }, text: { color: colors.textMuted } });
