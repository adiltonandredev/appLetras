import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('E-mail ou senha incorretos.');
    }
    setLoading(false);
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    setError(null);
    setOauthLoading(provider);

    const redirectUrl = Linking.createURL('/auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error || !data.url) {
      setError('Erro ao conectar com ' + (provider === 'google' ? 'Google' : 'Facebook'));
      setOauthLoading(null);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (result.type === 'success') {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
    }
    setOauthLoading(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>🎵</Text>
            </View>
            <Text style={styles.appName}>Repertório Litúrgico</Text>
            <Text style={styles.subtitle}>Entre na sua conta</Text>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* OAuth */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() => handleOAuth('google')}
            disabled={!!loading || !!oauthLoading}
          >
            {oauthLoading === 'google'
              ? <ActivityIndicator color="#374151" />
              : <Text style={styles.googleBtnText}>G  Continuar com Google</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.facebookBtn}
            onPress={() => handleOAuth('facebook')}
            disabled={!!loading || !!oauthLoading}
          >
            {oauthLoading === 'facebook'
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.facebookBtnText}>f  Continuar com Facebook</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Senha</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoComplete="current-password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push('/(auth)/recuperar-senha')} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading || !!oauthLoading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>Entrar</Text>
            }
          </TouchableOpacity>

          {/* Register */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Não tem conta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/registro')}>
              <Text style={styles.registerLink}>Criar conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const NAVY = '#1B3A6B';
const BLUE = '#2D7DD2';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoIcon: { fontSize: 28 },
  appName: { fontSize: 22, fontWeight: '700', color: NAVY, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 4 },
  errorBox: {
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
  googleBtn: {
    backgroundColor: '#fff', borderColor: '#E5E7EB', borderWidth: 1,
    borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  googleBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  facebookBtn: {
    backgroundColor: '#1877F2', borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  facebookBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontSize: 12, marginHorizontal: 12, fontWeight: '500' },
  form: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1,
    borderRadius: 12, height: 48, paddingHorizontal: 14,
    fontSize: 15, color: '#111827',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    width: 48, height: 48, backgroundColor: '#fff', borderColor: '#D1D5DB',
    borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },
  forgotText: { color: BLUE, fontSize: 13, fontWeight: '500' },
  loginBtn: {
    backgroundColor: NAVY, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { color: '#6B7280', fontSize: 14 },
  registerLink: { color: NAVY, fontWeight: '700', fontSize: 14 },
});
