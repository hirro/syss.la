import { StyleSheet, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/services/github/api-client';
import { getSyncConfig } from '@/services/sync-service';
import { useRouter } from 'expo-router';
import { clearAllTodos } from '@/lib/db/todos';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [syncRepo, setSyncRepo] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadUserData = async () => {
      if (isAuthenticated) {
        try {
          const user = await getCurrentUser();
          setUsername(user.login);
          const config = await getSyncConfig();
          if (config) {
            setSyncRepo(`${config.owner}/${config.repo}`);
          }
        } catch (error) {
          console.error('Failed to load user data:', error);
        }
      }
    };
    loadUserData();
  }, [isAuthenticated]);

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'This will clear all local todos. Your GitHub storage will remain unchanged.\n\nNote: If you sign in again, syncing will restore todos from GitHub.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Clearing all local data...');
              await clearAllTodos();
              await AsyncStorage.removeItem('sync_config');
              await logout();
              setUsername('');
              setSyncRepo('');
              
              // Navigate to Todos tab to show authentication required screen
              router.replace('/(tabs)');
            } catch (error) {
              console.error('❌ Failed to clear data:', error);
              alert('Failed to clear local data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleLogin = () => {
    router.push('/auth/login-wizard');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top }}>
      <ThemedView style={styles.content}>
        <ThemedText type="title">Settings</ThemedText>

        <View style={styles.section}>
          <ThemedText type="subtitle">GitHub Authentication</ThemedText>
          
          {isAuthenticated ? (
            <View style={styles.authSection}>
              <ThemedText>Authenticated as: {username}</ThemedText>
              {syncRepo && (
                <ThemedText>Storage: {syncRepo}</ThemedText>
              )}
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleLogout}>
                <ThemedText type="link">Sign Out</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authSection}>
              <ThemedText>
                You are not signed in. Please sign in to use the app.
              </ThemedText>
              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}>
                <ThemedText type="link">Sign In to GitHub</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">About</ThemedText>
          <ThemedText>Syssla v1.0.0</ThemedText>
          <ThemedText>A developer productivity app</ThemedText>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  authSection: {
    gap: 12,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
  },
});
