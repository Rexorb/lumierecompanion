import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorMessage } from '@/utils/errors';
import { isApiConfigured } from '@/services/api';
import { colors, fonts, radius, spacing } from '@/theme';

const schema = z.object({ email: z.email('Informe um e-mail válido.'), senha: z.string().min(1, 'Informe sua senha.') });
type Credentials = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit } = useForm<Credentials>({ resolver: zodResolver(schema), defaultValues: { email: '', senha: '' } });
  const submit = handleSubmit(async ({ email, senha }) => {
    setError(null);
    setSubmitting(true);
    try { await login(email.trim(), senha); }
    catch (cause) { setError(authErrorMessage(cause)); }
    finally { setSubmitting(false); }
  });
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
    <View style={styles.orb} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
    <View style={styles.header}><Text style={styles.brand}>Lumière<Text style={styles.brandDot}>.</Text></Text><Text style={styles.brandCaption}>COMPANION  /  MOBILE</Text></View>
    <View style={styles.card}>
      <Text style={styles.eyebrow}>SEU ESPAÇO DE GESTÃO</Text>
      <Text style={styles.title}>Bem-vindo <Text style={styles.titleItalic}>de volta.</Text></Text>
      <Text style={styles.description}>A excelência do seu atelier, agora na palma da mão.</Text>
      <View style={styles.fields}>
        <Controller control={control} name="email" render={({ field, fieldState }) => <Input label="E-mail" placeholder="seu@email.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} editable={!submitting} />} />
        <View style={styles.passwordField}>
          <Controller control={control} name="senha" render={({ field, fieldState }) => <Input label="Senha" placeholder="Sua senha" autoComplete="current-password" secureTextEntry={!showPassword} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} editable={!submitting} />} />
          <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'} hitSlop={12} style={styles.eye} onPress={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}</Pressable>
        </View>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {Platform.OS === 'web' ? <Text style={styles.note}>Esta página é uma prévia visual. Para entrar com segurança, use o aplicativo no Android ou iOS.</Text> : !isApiConfigured() ? <Text style={styles.note}>Configure EXPO_PUBLIC_API_URL no arquivo .env para entrar.</Text> : null}
      <Button label={submitting ? 'Entrando…' : 'Entrar no atelier'} icon={<ArrowRight size={18} color={colors.onPrimary} />} disabled={submitting || !isApiConfigured() || Platform.OS === 'web'} onPress={() => { void submit(); }} />
    </View>
    <Text style={styles.footer}>LUZ PARA O SEU NEGÓCIO. TEMPO PARA VOCÊ.</Text>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.authBackground },
  root: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl, gap: spacing.xxl, overflow: 'hidden' },
  orb: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: colors.secondaryLight, right: -135, top: -80, opacity: 0.75 },
  header: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl },
  brand: { fontFamily: fonts.brand, fontSize: 53, color: colors.accent, lineHeight: 59 }, brandDot: { color: colors.secondaryDark },
  brandCaption: { fontFamily: fonts.mono, fontSize: 9, color: colors.accent, letterSpacing: 2.5 },
  card: { backgroundColor: colors.surfaceLowest, borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.lg },
  eyebrow: { color: colors.accent, fontFamily: fonts.monoMedium, letterSpacing: 2, fontSize: 10 },
  title: { fontFamily: fonts.display, fontSize: 43, lineHeight: 44, color: colors.text, letterSpacing: -1 },
  titleItalic: { fontFamily: fonts.displayItalic, color: colors.accent },
  description: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, marginBottom: spacing.md },
  fields: { gap: spacing.xl, marginBottom: spacing.md }, passwordField: { position: 'relative' },
  eye: { position: 'absolute', right: 0, bottom: 3, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  note: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 21 },
  error: { color: colors.danger, fontFamily: fonts.body, lineHeight: 21 },
  footer: { textAlign: 'center', color: colors.accent, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5 },
});
