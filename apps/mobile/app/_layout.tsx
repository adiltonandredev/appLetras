import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { SupabaseProvider } from '@/lib/supabase/provider';
import { useAuthStore } from '@/stores/auth.store';
import { syncDelta } from '@/lib/offline/sync';
import * as Network from 'expo-network';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
});

function AuthGuard() {
  const { user, isLoading, setUser, setLoading, setRole } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch full user + role
        const { data: userData } = await supabase
          .from('users')
          .select('*, role_assignments:user_role_assignments(role:roles(name))')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          setUser({ ...userData, role: userData.role_assignments?.[0]?.role?.name ?? 'padrao' });
          setRole(userData.role_assignments?.[0]?.role?.name ?? 'padrao');
        }

        // Sync offline data if connected
        const state = await Network.getNetworkStateAsync();
        if (state.isConnected) {
          syncDelta().catch(() => {});
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SupabaseProvider>
            <StatusBar style="auto" />
            <AuthGuard />
          </SupabaseProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
