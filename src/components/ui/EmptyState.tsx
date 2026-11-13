import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/theme';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <View style={styles.root}><View style={styles.accent} /><Text style={styles.label}>EM PREPARAÇÃO</Text><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text></View>;
}
const styles = StyleSheet.create({
  root: { backgroundColor: colors.surfaceLowest, borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.md, minHeight: 228, justifyContent: 'center' },
  accent: { width: 36, height: 3, borderRadius: radius.pill, backgroundColor: colors.secondary, marginBottom: spacing.sm },
  label: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1.5, color: colors.accent },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 31, lineHeight: 35 },
  description: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 23 },
});
