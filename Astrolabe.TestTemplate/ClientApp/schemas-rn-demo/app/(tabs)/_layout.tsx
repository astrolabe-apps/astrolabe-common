import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        headerStyle: {
          backgroundColor: '#f8fafc',
        },
        headerTintColor: '#1e293b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Catalog',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="survey"
        options={{
          title: 'Survey',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="display"
        options={{
          title: 'Display',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'eye' : 'eye-outline'} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}