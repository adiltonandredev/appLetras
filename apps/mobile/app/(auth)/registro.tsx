'use client';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

const NAVY = '#1B3A6B';

export default function RegistroScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    setLoading(false);

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Este e-mail já está cadastrado.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Conta criada!</Text>
          <Text style={styles.successText}>
            Verifique seu e-mail para confirmar o cadastro e então entre na sua conta.
          </Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginBtnText}>Ir para o login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Preencha os dados abaixo</Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Seu nome"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>E-mail</Text>
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
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.registerBtnText}>Criar conta</Text>
            }
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flexGrow: 1, padding: 24 },
  header: { marginBottom: 28, marginTop: 8 },
  backBtn: { marginBottom: 20 },
  backBtnText: { color: NAVY, fontWeight: '600', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: NAVY },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  errorBox: {
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
  form: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1,
    borderRadius: 12, height: 48, paddingHorizontal: 14,
    fontSize: 15, color: '#111827',
  },
  registerBtn: {
    backgroundColor: NAVY, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  registerBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: '#6B7280', fontSize: 14 },
  loginLink: { color: NAVY, fontWeight: '700', fontSize: 14 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { fontSize: 48, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: NAVY, marginBottom: 8 },
  successText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  loginBtn: {
    backgroundColor: NAVY, borderRadius: 14, height: 52, width: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
