import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    const navigateToDefaultTab = async () => {
      if (hasNavigated) return;
      
      try {
        const defaultTab = await AsyncStorage.getItem('default_startup_tab');
        if (defaultTab && defaultTab !== 'todos') {
          setHasNavigated(true);
          if (defaultTab === 'timer') {
            router.replace('/(tabs)/timer');
          } else if (defaultTab === 'settings') {
            router.replace('/(tabs)/settings');
          }
        } else {
          // Default to todo tab
          router.replace('/(tabs)/todo');
        }
      } catch (error) {
        console.error('Failed to load default tab:', error);
      }
    };
    
    navigateToDefaultTab();
  }, [hasNavigated, router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hidden redirect screen
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: 'Todos',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="checklist" color={color} />,
          href: isAuthenticated ? '/(tabs)/todo' : null,
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: 'Timer',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock" color={color} />,
          href: isAuthenticated ? '/(tabs)/timer' : null,
        }}
      />
      <Tabs.Screen
        name="wiki"
        options={{
          title: 'Wiki',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
          href: isAuthenticated ? '/(tabs)/wiki' : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
          href: null,
        }}
      />
    </Tabs>
  );
}
