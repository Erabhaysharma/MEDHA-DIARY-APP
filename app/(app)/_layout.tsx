import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Platform, View, Text } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppLayout() {
  const { colors: C }  = useTheme();
  const insets         = useSafeAreaInsets();  // ← reads actual system insets

  // Bottom inset — handles gesture bar on Android + home indicator on iOS
  const bottomInset = insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor:  C.border,
          borderTopWidth:  0.5,
          // ← Dynamic height based on actual system inset
          height:          52 + bottomInset,
          paddingBottom:   bottomInset > 0 ? bottomInset : 8,
          paddingTop:      8,
          elevation:       8,
          // Ensure it sits above system nav bar
          position:        'absolute',
          bottom:          0,
          left:            0,
          right:           0,
        },
        tabBarActiveTintColor:   C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diary',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
  name="chat"
  options={{
    title: 'Chat',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="chatbubble-ellipses" size={size} color={color} />
    ),
    // ← Hide tabbar completely on chat screen
    tabBarStyle: { display: 'none' },
  }}
/>
      <Tabs.Screen
        name="social"
        options={{
          title: 'Diaries',
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="astro"
        options={{
          title: 'Astro',
          tabBarIcon: ({ color, size }) => (
            <AstroTabIcon color={color} size={size} />
          ),
        }}
      />
     

      {/* Hidden tabs */}
      <Tabs.Screen name="people"   options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="account" options={{href: null}}/>
    </Tabs>
  );
}

function AstroTabIcon({ color, size }: { color: string; size: number }) {
  const { user }                    = useAuth();
  const [isPremium, setIsPremium]   = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setIsPremium(data?.is_premium ?? false));
  }, [user]);

  return (
    <View style={{ width: size + 6, height: size + 6, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="planet-outline" size={size} color={color} />
      {!isPremium && (
        <View style={{
          position:        'absolute',
          top:             0,
          right:           0,
          width:           12,
          height:          12,
          borderRadius:    6,
          alignItems:      'center',
          justifyContent:  'center',
        }}>
          <Ionicons name="diamond" size={10} color="#00a2ff" />
        </View>
      )}
    </View>
  );
}