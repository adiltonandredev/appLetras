import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

const NAVY = '#1B3A6B';

export default function RecuperarSenhaScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      setError('Digite seu e-mail.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (resetError) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.');
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>📧</Text>
          <Text style={styles.successTitle}>E-mail enviado!</Text>
          <Text style={styles.successText}>
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.backBtnText}>Voltar para o login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
              <Text style={styles.goBackText}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Recuperar senha</Text>
            <Text style={styles.subtitle}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

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

          <TouchableOpacity style={styles.sendBtn} onPress={handleReset} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.sendBtnText}>Enviar link</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flexGrow: 1, padding: 24 },
  header: { marginBottom: 28, marginTop: 8 },
  goBack: { marginBottom: 20 },
  goBackText: { color: NAVY, fontWeight: '600', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: NAVY },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 6, lineHeight: 22 },
  errorBox: {
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1,
    borderRadius: 12, height: 48, paddingHorizontal: 14,
    fontSize: 15, color: '#111827', marginBottom: 24,
  },
  sendBtn: {
    backgroundColor: NAVY, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { fontSize: 48, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: NAVY, marginBottom: 8 },
  successText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  backBtn: {
    backgroundColor: NAVY, borderRadius: 14, height: 52, width: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
