import { Tabs } from 'expo-router';
import { House, BookOpen, Music, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B3A6B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F3F4F6',
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { color: '#111827', fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
          headerTitle: 'Repertório Litúrgico',
        }}
      />
      <Tabs.Screen
        name="repertorios"
        options={{
          title: 'Repertórios',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          headerTitle: 'Repertórios',
        }}
      />
      <Tabs.Screen
        name="musicas"
        options={{
          title: 'Músicas',
          tabBarIcon: ({ color, size }) => <Music color={color} size={size} />,
          headerTitle: 'Músicas',
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          headerTitle: 'Perfil',
        }}
      />
    </Tabs>
  );
}
