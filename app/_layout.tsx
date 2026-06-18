import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LockProvider, useLock } from '../src/contexts/LockContext';

function AuthGate() {
  const { session, loading } = useAuth();
  const { isLocked, isLockEnabled } = useLock();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return;

    const onLockScreen = segments[0] === 'lock';
    if (isLockEnabled && isLocked && !onLockScreen) {
      router.replace('/lock');
      return;
    }

    const inAuth = segments[0] === '(auth)';
    const inApp  = segments[0] === '(app)';

    if (!session && inApp) {
      router.replace('/(auth)/login');  // ✅ capital L
    }
    if (!session && !inAuth) {
      router.replace('/(auth)/login');  // ✅ capital L
    }
    if (session && inAuth) {
      router.replace('/(app)/home');
    }
  }, [session, loading, segments, isLocked, isLockEnabled]);

  return null;
}

function SplashScreen() {
  return (
    <View style={{
      flex:            1,
      backgroundColor: '#111110',
      alignItems:      'center',
      justifyContent:  'center',
    }}>
      <ActivityIndicator color="#C8A96E" size="large" />
    </View>
  );
}

function RootLayoutInner() {
  const { loading } = useAuth();
  if (loading) return <SplashScreen />;

  return (
    <>
      <StatusBar style="auto" />
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index"           options={{ animation: 'none' }} />
  <Stack.Screen name="(auth)"          options={{ animation: 'fade' }} />
  <Stack.Screen name="(app)"           options={{ animation: 'fade' }} />
  {/* ✅ Remove account from here — it lives inside (app) tabs now */}
  <Stack.Screen name="lock"            options={{ animation: 'fade' }} />
  <Stack.Screen name="set-pin"         options={{ animation: 'slide_from_bottom' }} />
  <Stack.Screen name="new-entry"       options={{ animation: 'slide_from_bottom' }} />
  <Stack.Screen name="entry/[id]"      options={{ animation: 'slide_from_right' }} />
  <Stack.Screen name="edit-entry/[id]" options={{ animation: 'slide_from_right' }} />
  <Stack.Screen name="add-memory"      options={{ animation: 'slide_from_bottom' }} />
  <Stack.Screen name="memory-detail"   options={{ animation: 'slide_from_right' }} />
  <Stack.Screen name="person/[id]"     options={{ animation: 'slide_from_right' }} />
</Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LockProvider>
          <RootLayoutInner />
        </LockProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}