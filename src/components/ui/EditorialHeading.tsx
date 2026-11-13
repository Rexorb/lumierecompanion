import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, typography } from '@/theme';

export function EditorialHeading({ eyebrow, first, emphasis, description }: {
  eyebrow: string; first: string; emphasis: string; description?: string;
}) {
  return <View style={styles.root}>
    <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
    <Text style={styles.heading} adjustsFontSizeToFit numberOfLines={2}>{first}{'\n'}<Text style={styles.emphasis}>{emphasis}</Text></Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: spacing.md }, eyebrow: { fontFamily: fonts.monoMedium, fontSize: typography.caption, color: colors.accent, letterSpacing: 2 },
  heading: { fontFamily: fonts.display, fontSize: typography.headline, color: colors.text, lineHeight: 52, letterSpacing: -1 },
  emphasis: { fontFamily: fonts.displayItalic, color: colors.accent },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.textMuted, maxWidth: 310 },
});
