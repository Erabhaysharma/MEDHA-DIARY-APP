import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';

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
          height:          65,
          paddingBottom:   10,
          paddingTop:      8,
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diary',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}


        
      />

      <Tabs.Screen
  name="schedule"
  options={{
    title: 'Schedule',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="calendar-outline" size={size} color={color} />
    ),
  }}
/>

   

      {/* ── Hidden routes — no tab bar item ── */}
      
        
      
      
      
      
    </Tabs>
  );
}