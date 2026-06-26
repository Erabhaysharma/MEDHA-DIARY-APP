import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Platform } from 'react-native';
import { View } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AppLayout() {
  const { colors: C } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor:  C.border,
          borderTopWidth:  1,
          height:          Platform.OS === 'android' ? 65 : 85,
          paddingBottom:   Platform.OS === 'android' ? 10 : 28,
          paddingTop:      8,
          elevation:       8,
        },
        tabBarActiveTintColor:   C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
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
      <Tabs.Screen
        name="social"
        options={{
          title: 'Diaries',
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
        }}
      />

      
         <Tabs.Screen
        name="account"
        options={{
          href: null,  // ← this hides it from tab bar completely
        }}
      />

      {/* Hidden from tabbar — still routable */}
      <Tabs.Screen name="people"   options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
    </Tabs>
  );
}
function AstroTabIcon({ color, size }: { color: string; size: number }) {
  const { user }      = useAuth();
  const [isPremium, setIsPremium] = useState(false);

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
          borderWidth:     0,
          alignItems:      'center',
          justifyContent:  'center',
        }}>
          <Ionicons name="diamond" size={11} color="#00b3ff" />
        </View>
      )}
    </View>
  );
}