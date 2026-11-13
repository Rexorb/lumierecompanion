import { StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Clock3, LogOut, MapPin, UsersRound, CircleAlert } from 'lucide-react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { isAxiosError } from 'axios';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { useOverview } from '@/hooks/useOverview';
import { colors, fonts, radius, spacing } from '@/theme';

function formatTime(iso: string, timezone: string) {
  try { return new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)); }
  catch { return 'Horário indisponível'; }
}
function formatDate(iso: string, timezone: string) {
  try { return new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, day: '2-digit', month: 'short' }).format(new Date(iso)); }
  catch { return 'Data indisponível'; }
}
const statusLabels = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', CONCLUIDO: 'Concluído', FALTOU: 'Não compareceu' } as const;

export default function Overview() {
  const { user, salonId, selectSalon, logout } = useAuth();
  const query = useOverview();
  const netInfo = useNetInfo();
  const offline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const forbidden = isAxiosError(query.error) && [401, 403, 404].includes(query.error.response?.status ?? 0);
  const showData = !!query.data && !forbidden;
  const refresh = () => { void query.refetch(); };
  const metrics = query.data?.metrics;
  const cards = metrics ? [
    { title: 'Hoje', value: metrics.today.value, description: metrics.today.change === 0 ? 'agendamentos para hoje' : `${Math.abs(metrics.today.change)} ${metrics.today.change > 0 ? 'a mais' : 'a menos'} que ontem`, icon: <Clock3 size={17} color={colors.accent} /> },
    { title: 'Esta semana', value: metrics.week.value, description: metrics.week.percentageChange === null ? 'sem histórico anterior' : `${Math.abs(metrics.week.percentageChange)}% ${metrics.week.percentageChange > 0 ? 'acima' : 'abaixo'} da semana passada`, icon: <CalendarDays size={17} color={colors.accent} /> },
    { title: 'Clientes', value: metrics.clients.value, description: `${metrics.clients.newThisMonth} ${metrics.clients.newThisMonth === 1 ? 'novo' : 'novos'} este mês`, icon: <UsersRound size={17} color={colors.accent} /> },
    { title: 'Pendentes', value: metrics.pending.value, description: 'aguardando confirmação', icon: <CircleAlert size={17} color={colors.accent} /> },
  ] : [];
  return <Screen label="Visão geral / início" first="Seu atelier" emphasis="em números." description="Um olhar sobre o que acontece no seu salão." refreshing={query.isRefetching} onRefresh={salonId ? refresh : undefined}>
    <View style={styles.salonCard}>
      <View style={styles.salonHeader}><MapPin size={17} color={colors.secondary} /><Text style={styles.salonLabel}>SEU ESPAÇO</Text></View>
      <Text style={styles.salonName}>{showData ? query.data.salon.name : user?.saloes.find((salon) => salon.id === salonId)?.name ?? 'Nenhum salão ativo disponível'}</Text>
      <Text style={styles.greeting}>Olá, {user?.nome}.</Text>
    </View>
    {user && user.saloes.length > 1 ? <View style={styles.salons}><Text style={styles.sectionLabel}>ALTERNAR SALÃO</Text>{user.saloes.map((salon) => <Button key={salon.id} label={`${salon.name}${salonId === salon.id ? ' · selecionado' : ''}`} variant="secondary" onPress={() => selectSalon(salon.id)} />)}</View> : null}
    {!salonId ? <ErrorState message="Nenhum salão ativo disponível para esta conta." /> : null}
    {salonId && query.isPending ? <Loading message="Buscando indicadores do salão…" /> : null}
    {salonId && query.isError && !showData ? <ErrorState message={forbidden ? 'O acesso ao salão não está mais disponível. Entre novamente ou escolha outro salão autorizado.' : offline ? 'Sem conexão para carregar o painel.' : 'Falha ao consultar o painel do salão.'} onRetry={refresh} /> : null}
    {showData ? <>
      {offline || query.isError ? <Text style={styles.notice}>Sem conexão · exibindo dados anteriores. Puxe para atualizar quando a rede voltar.</Text> : null}
      <View style={styles.section}><Text style={styles.sectionLabel}>INDICADORES DO SALÃO</Text><View style={styles.grid}>{cards.map((card) => <StatCard key={card.title} {...card} />)}</View></View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PRÓXIMOS AGENDAMENTOS</Text>
        {query.data.upcoming.length === 0 ? <EmptyState title="Nenhum próximo agendamento" description="Não há reservas futuras pendentes ou confirmadas para este salão." /> :
          query.data.upcoming.map((appointment) => <View key={appointment.id} style={styles.appointment}>
            <View style={styles.appointmentTop}><Text style={styles.time}>{formatTime(appointment.startsAt, query.data.timezone)}</Text><Text style={styles.date}>{formatDate(appointment.startsAt, query.data.timezone)}</Text></View>
            <Text style={styles.client} numberOfLines={2}>{appointment.clientName}</Text><Text style={styles.service} numberOfLines={2}>{appointment.serviceName}</Text>
            <Text style={styles.status}>{statusLabels[appointment.status]}</Text>
          </View>)}
      </View>
      <Text style={styles.updated}>ATUALIZADO EM {formatDate(query.data.generatedAt, query.data.timezone)} · {formatTime(query.data.generatedAt, query.data.timezone)}</Text>
    </> : null}
    <Button label="Sair da conta" variant="secondary" icon={<LogOut color={colors.accent} size={17} />} onPress={() => { void logout(); }} />
  </Screen>;
}
const styles = StyleSheet.create({
  salonCard: { backgroundColor: colors.accent, padding: spacing.xl, borderRadius: radius.xxl, gap: spacing.md, minHeight: 160, justifyContent: 'center' },
  salonHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  salonLabel: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 1.7, color: colors.secondaryLight },
  salonName: { color: colors.onPrimary, fontFamily: fonts.display, fontSize: 35, lineHeight: 39 },
  greeting: { color: colors.secondaryLight, fontFamily: fonts.body, fontSize: 13 },
  salons: { gap: spacing.sm }, sectionLabel: { fontFamily: fonts.mono, color: colors.accent, letterSpacing: 1.5, fontSize: 10 },
  section: { gap: spacing.lg }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  appointment: { padding: spacing.xl, backgroundColor: colors.surfaceLowest, borderRadius: radius.xl, gap: spacing.sm },
  appointmentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontFamily: fonts.monoMedium, color: colors.accent, fontSize: 14 },
  date: { fontFamily: fonts.mono, color: colors.subtle, fontSize: 11 },
  client: { fontFamily: fonts.display, fontSize: 29, color: colors.text, lineHeight: 32 },
  service: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  status: { fontFamily: fonts.monoMedium, fontSize: 10, color: colors.accent, letterSpacing: 1, marginTop: spacing.sm },
  notice: { fontFamily: fonts.body, fontSize: 13, color: colors.warning, lineHeight: 20 },
  updated: { fontFamily: fonts.mono, fontSize: 10, color: colors.subtle, letterSpacing: 0.5 },
});
