import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { isAxiosError } from 'axios';
import { DataList } from '@/components/ui/DataList';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useClientes } from '@/hooks/useClientes';
import type { Client } from '@/types/consultas';
import { colors, fonts, spacing } from '@/theme';

function ClientCard({ client }: { client: Client }) {
  return <View style={styles.card} accessibilityLabel={`${client.nome}, ${client.totalVisitas} visitas`}>
    <View style={styles.avatar}><Text style={styles.initial}>{client.nome.trim().charAt(0).toUpperCase()}</Text></View>
    <View style={styles.info}><Text style={styles.name} numberOfLines={2}>{client.nome}</Text>
      <Text style={styles.meta}>{client.totalVisitas} {client.totalVisitas === 1 ? 'visita' : 'visitas'}</Text></View>
  </View>;
}

export default function Clientes() {
  const { salonId } = useAuth();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => setSearch(input.trim()), 350); return () => clearTimeout(timer); }, [input]);
  const query = useClientes(search);
  const net = useNetInfo();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  const denied = isAxiosError(query.error) && [401, 403, 404].includes(query.error.response?.status ?? 0);
  const items = !denied ? query.data?.pages.flatMap((page) => page.items) ?? [] : [];
  const refresh = () => { void query.refetch(); };
  return <DataList label="Pessoas / clientes" first="Seu atelier" emphasis="em histórias." description="Consulte quem faz parte do seu salão."
    controls={<View style={styles.controls}>
      <Text style={styles.salonLabel}>SALÃO · {query.data?.pages[0]?.salon.name ?? 'SELECIONADO'}</Text>
      <View style={styles.search}><Search color={colors.accent} size={19} /><TextInput value={input} onChangeText={setInput} accessibilityLabel="Buscar clientes pelo nome" placeholder="Buscar por nome" placeholderTextColor={colors.subtle} style={styles.input} autoCorrect={false} /></View>
      {items.length > 0 ? <Text style={styles.counter}>{query.data?.pages[0]?.total ?? 0} clientes encontrados</Text> : null}
      {items.length > 0 && (offline || query.isError) ? <Text style={styles.stale}>Dados anteriores · verifique sua conexão e atualize.</Text> : null}
    </View>}
    data={items} keyExtractor={(client) => client.id} renderItem={(client) => <ClientCard client={client} />}
    empty={!salonId ? <ErrorState message="Nenhum salão ativo disponível." /> : query.isPending ? <Loading message="Carregando clientes…" /> : query.isError ? <ErrorState message={denied ? 'Você não tem acesso a este salão.' : offline ? 'Sem conexão para carregar clientes.' : 'Falha ao consultar clientes.'} onRetry={refresh} /> : <EmptyState title="Nenhum cliente encontrado" description={search ? 'Tente buscar outro nome.' : 'Ainda não há clientes cadastrados neste salão.'} />}
    footer={query.isFetchingNextPage ? <Loading message="Carregando mais clientes…" /> : query.isFetchNextPageError ? <ErrorState message="Falha ao carregar mais clientes." onRetry={() => { void query.fetchNextPage(); }} /> : null}
    refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={refresh}
    onEndReached={() => { if (query.hasNextPage && !query.isFetching && !denied && !offline) void query.fetchNextPage(); }} />;
}

const styles = StyleSheet.create({
  controls: { gap: spacing.lg }, salonLabel: { color: colors.accent, fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.surfaceLowest, borderRadius: 16 },
  input: { minHeight: 52, flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  counter: { fontFamily: fonts.mono, fontSize: 10, color: colors.subtle }, stale: { fontFamily: fonts.body, fontSize: 13, color: colors.warning },
  card: { padding: spacing.lg, minHeight: 90, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.secondaryLight, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.display, color: colors.accent, fontSize: 30 },
  info: { flex: 1, gap: spacing.xs }, name: { fontFamily: fonts.display, color: colors.text, fontSize: 27, lineHeight: 30 },
  meta: { fontFamily: fonts.mono, fontSize: 10, color: colors.subtle },
});
