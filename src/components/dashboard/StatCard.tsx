import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/theme';

export function StatCard({ title, value, description, icon }: { title: string; value: number; description: string; icon: ReactNode }) {
  return <View style={styles.card} accessibilityLabel={`${title}: ${value}. ${description}`}>
    <View style={styles.top}><Text style={styles.title}>{title.toUpperCase()}</Text>{icon}</View>
    <Text style={styles.value}>{value}</Text><Text style={styles.description}>{description}</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { width: '48%', minHeight: 186, backgroundColor: colors.surfaceLowest, borderRadius: radius.xl, padding: spacing.lg, justifyContent: 'space-between', gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xs },
  title: { fontFamily: fonts.monoMedium, color: colors.subtle, fontSize: 9, letterSpacing: 0.5, flexShrink: 1 },
  value: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, color: colors.text },
  description: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
