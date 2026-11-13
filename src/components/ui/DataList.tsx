import type { ReactNode } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { ScreenHeader, screenStyles } from './Screen';

export function DataList<T>({ label, first, emphasis, description, controls, data, renderItem, keyExtractor, empty, footer, refreshing, onRefresh, onEndReached }: {
  label: string; first: string; emphasis: string; description: string; controls: ReactNode;
  data: T[]; renderItem: (item: T) => ReactNode; keyExtractor: (item: T) => string;
  empty?: ReactNode; footer?: ReactNode; refreshing: boolean; onRefresh: () => void; onEndReached: () => void;
}) {
  return <SafeAreaView style={screenStyles.safe} edges={['top', 'left', 'right']}>
    <FlatList data={data} keyExtractor={keyExtractor} renderItem={({ item }) => <View style={styles.item}>{renderItem(item)}</View>}
      contentContainerStyle={[screenStyles.content, styles.content]} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View style={styles.header}><ScreenHeader label={label} first={first} emphasis={emphasis} description={description} />{controls}</View>}
      ListEmptyComponent={empty ? <>{empty}</> : undefined} ListFooterComponent={footer ? <>{footer}</> : undefined}
      refreshing={refreshing} onRefresh={onRefresh} onEndReached={onEndReached} onEndReachedThreshold={0.35} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1 }, header: { gap: spacing.xxl, marginBottom: spacing.xl }, item: { marginBottom: spacing.md, backgroundColor: colors.surfaceLowest, borderRadius: 20, overflow: 'hidden' } });
