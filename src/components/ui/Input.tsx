import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors, fonts, spacing } from '@/theme';

export function Input({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label.toUpperCase()}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.textMuted} style={[styles.input, error && styles.invalid]} {...props} />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: spacing.xs }, label: { color: colors.subtle, fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1.4 },
  input: { minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.border, color: colors.text, fontSize: 16, fontFamily: fonts.body, paddingVertical: spacing.sm },
  invalid: { borderBottomColor: colors.danger }, error: { color: colors.danger, fontSize: 13, fontFamily: fonts.body },
});
