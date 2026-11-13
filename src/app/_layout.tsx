import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui/Loading';
import { useState } from 'react';
import { useFonts } from 'expo-font';

function Navigation() {
  const { ready, user } = useAuth();
  if (!ready) return <Loading message="Verificando sessão…" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!user}><Stack.Screen name="(auth)" /></Stack.Protected>
    <Stack.Protected guard={!!user}><Stack.Screen name="(tabs)" /></Stack.Protected>
    <Stack.Screen name="index" />
  </Stack>;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const [loaded, error] = useFonts({
    CormorantGaramond_300Light: require('@expo-google-fonts/cormorant-garamond/300Light/CormorantGaramond_300Light.ttf'),
    CormorantGaramond_300Light_Italic: require('@expo-google-fonts/cormorant-garamond/300Light_Italic/CormorantGaramond_300Light_Italic.ttf'),
    CormorantGaramond_600SemiBold_Italic: require('@expo-google-fonts/cormorant-garamond/600SemiBold_Italic/CormorantGaramond_600SemiBold_Italic.ttf'),
    DMSans_400Regular: require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
    DMSans_500Medium: require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
    DMSans_600SemiBold: require('@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf'),
    JetBrainsMono_400Regular: require('@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf'),
    JetBrainsMono_500Medium: require('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
  });
  return <QueryClientProvider client={queryClient}><AuthProvider><StatusBar style="dark" />{loaded || error ? <Navigation /> : <Loading message="Preparando o atelier…" />}</AuthProvider></QueryClientProvider>;
}
