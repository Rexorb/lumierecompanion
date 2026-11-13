import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius, spacing } from '@/theme';

export function Button({ label, onPress, variant = 'primary', disabled = false, icon }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean; icon?: ReactNode;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.base, variant === 'primary' ? styles.primary : styles.secondary, pressed && styles.pressed, disabled && styles.disabled]}>
    {icon}<Text style={variant === 'primary' ? styles.primaryText : styles.secondaryText}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.pill, paddingHorizontal: spacing.xl, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: colors.surfaceLow },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontFamily: fonts.semibold },
  secondaryText: { color: colors.text, fontSize: 15, fontFamily: fonts.semibold },
  pressed: { opacity: 0.75 }, disabled: { opacity: 0.5 },
});
