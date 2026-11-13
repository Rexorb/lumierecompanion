import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { isAxiosError } from 'axios';
import { DataList } from '@/components/ui/DataList';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import type { Appointment, AppointmentStatus } from '@/types/consultas';
import { formatSalonDate, formatSalonTime, shiftDate, todayAtSalon } from '@/utils/dates';
import { colors, fonts, spacing } from '@/theme';

const statuses: { value: AppointmentStatus | null; label: string }[] = [
  { value: null, label: 'Todos' }, { value: 'PENDENTE', label: 'Pendente' }, { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'CANCELADO', label: 'Cancelado' }, { value: 'CONCLUIDO', label: 'Concluído' }, { value: 'FALTOU', label: 'Não compareceu' },
];
const labels: Record<AppointmentStatus, string> = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', CONCLUIDO: 'Concluído', FALTOU: 'Não compareceu' };

function AppointmentCard({ item, timezone }: { item: Appointment; timezone: string }) {
  return <View style={styles.card} accessibilityLabel={`${formatSalonTime(item.startsAt, timezone)}, ${item.clientName}, ${item.serviceName}, ${labels[item.status]}`}>
    <View style={styles.top}><Text style={styles.time}>{formatSalonTime(item.startsAt, timezone)}</Text><Text style={styles.status}>{labels[item.status].toUpperCase()}</Text></View>
    <Text style={styles.client} numberOfLines={2}>{item.clientName}</Text>
    <Text style={styles.service} numberOfLines={2}>{item.serviceName} · {item.durationMinutes} min</Text>
  </View>;
}

export default function Agendamentos() {
  const { salonId } = useAuth();
  const [date, setDate] = useState(todayAtSalon);
  const [status, setStatus] = useState<AppointmentStatus | null>(null);
  const query = useAgendamentos(date, status);
  const net = useNetInfo();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  const denied = isAxiosError(query.error) && [401, 403, 404].includes(query.error.response?.status ?? 0);
  const items = !denied ? query.data?.pages.flatMap((page) => page.items) ?? [] : [];
  const timezone = query.data?.pages[0]?.timezone ?? 'America/Sao_Paulo';
  const refresh = () => { void query.refetch(); };
  return <DataList label="Agenda / agendamentos" first="Sua agenda," emphasis="dia a dia." description="Reservas reais do salão, no horário local."
    controls={<View style={styles.controls}>
      <Text style={styles.salonLabel}>SALÃO · {query.data?.pages[0]?.salon.name ?? 'SELECIONADO'}</Text>
      <View style={styles.dateRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dia anterior" onPress={() => setDate(shiftDate(date, -1))} style={styles.dayButton}><ChevronLeft size={22} color={colors.accent} /></Pressable>
        <View style={styles.dateInfo}><Text style={styles.dateText} numberOfLines={2}>{formatSalonDate(date)}</Text><Pressable accessibilityRole="button" accessibilityLabel="Voltar para hoje" onPress={() => setDate(todayAtSalon())}><Text style={styles.today}>HOJE</Text></Pressable></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo dia" onPress={() => setDate(shiftDate(date, 1))} style={styles.dayButton}><ChevronRight size={22} color={colors.accent} /></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityLabel="Filtrar por status">{statuses.map((option) => <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: status === option.value }} style={[styles.chip, status === option.value && styles.chipSelected]} onPress={() => setStatus(option.value)}><Text style={[styles.chipText, status === option.value && styles.chipTextSelected]}>{option.label}</Text></Pressable>)}</ScrollView>
      {items.length > 0 && (offline || query.isError) ? <Text style={styles.stale}>Dados anteriores · verifique sua conexão e atualize.</Text> : null}
    </View>}
    data={items} keyExtractor={(item) => item.id} renderItem={(item) => <AppointmentCard item={item} timezone={timezone} />}
    empty={!salonId ? <ErrorState message="Nenhum salão ativo disponível." /> : query.isPending ? <Loading message="Carregando reservas…" /> : query.isError ? <ErrorState message={denied ? 'Você não tem acesso a este salão.' : offline ? 'Sem conexão para carregar reservas.' : 'Falha ao consultar agendamentos.'} onRetry={refresh} /> : <EmptyState title="Nenhum agendamento neste dia" description="Altere o dia ou o filtro para consultar outras reservas." />}
    footer={query.isFetchingNextPage ? <Loading message="Carregando mais reservas…" /> : query.isFetchNextPageError ? <ErrorState message="Falha ao carregar mais reservas." onRetry={() => { void query.fetchNextPage(); }} /> : null}
    refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={refresh}
    onEndReached={() => { if (query.hasNextPage && !query.isFetching && !denied && !offline) void query.fetchNextPage(); }} />;
}
const styles = StyleSheet.create({
  controls: { gap: spacing.lg }, salonLabel: { color: colors.accent, fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLowest, borderRadius: 18, padding: spacing.sm, gap: spacing.xs },
  dayButton: { width: 48, height: 52, alignItems: 'center', justifyContent: 'center' }, dateInfo: { flex: 1, alignItems: 'center', gap: spacing.xs },
  dateText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center' }, today: { color: colors.accent, fontFamily: fonts.monoMedium, fontSize: 10, paddingVertical: spacing.xs },
  filters: { gap: spacing.sm }, chip: { borderRadius: 9999, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.surfaceLowest, minHeight: 44, justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.accent }, chipText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12 }, chipTextSelected: { color: colors.onPrimary },
  stale: { fontFamily: fonts.body, fontSize: 13, color: colors.warning },
  card: { padding: spacing.xl, gap: spacing.sm }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  time: { fontFamily: fonts.monoMedium, fontSize: 17, color: colors.accent }, status: { fontFamily: fonts.monoMedium, fontSize: 9, color: colors.accent, letterSpacing: 0.3, flexShrink: 1 },
  client: { fontFamily: fonts.display, fontSize: 29, lineHeight: 33, color: colors.text }, service: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
