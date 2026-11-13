import { View, StyleSheet, Text } from 'react-native';
import { Button } from './Button';
import { colors, spacing } from '@/theme';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <View style={styles.root} accessibilityLiveRegion="polite"><Text style={styles.title}>Não foi possível carregar</Text><Text style={styles.message}>{message}</Text>{onRetry ? <Button label="Tentar novamente" variant="secondary" onPress={onRetry} /> : null}</View>;
}
const styles = StyleSheet.create({ root: { gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.surfaceLowest, borderRadius: 20 }, title: { fontSize: 21, color: colors.text }, message: { color: colors.textMuted } });
