import { StyleSheet, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/services/github/api-client';
import { getSyncConfig, setSyncConfig } from '@/services/sync-service';

export default function SettingsScreen() {
  const { isAuthenticated, login, logout } = useAuth();
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncOwner, setSyncOwner] = useState('');
  const [syncRepo, setSyncRepo] = useState('');
  const [syncBranch, setSyncBranch] = useState('main');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSyncConfig();
  }, []);

  const loadSyncConfig = async () => {
    const config = await getSyncConfig();
    if (config) {
      setSyncOwner(config.owner);
      setSyncRepo(config.repo);
      setSyncBranch(config.branch || 'main');
    }
  };

  const handleLogin = async () => {
    if (!token.trim()) {
      alert('Please enter a GitHub Personal Access Token');
      return;
    }

    try {
      setLoading(true);
      await login(token);
      const user = await getCurrentUser();
      setUsername(user.login);
      setToken('');
      alert(`Authenticated as ${user.login}`);
    } catch {
      alert('Authentication failed. Please check your token.');
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUsername('');
  };

  const handleSaveSyncConfig = async () => {
    if (!syncOwner.trim() || !syncRepo.trim()) {
      alert('Please enter GitHub owner and repository name');
      return;
    }

    try {
      await setSyncConfig({
        owner: syncOwner.trim(),
        repo: syncRepo.trim(),
        branch: syncBranch.trim() || 'main',
      });
      alert('Sync configuration saved!');
    } catch {
      alert('Failed to save sync configuration');
    }
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
              <TouchableOpacity style={styles.button} onPress={handleLogout}>
                <ThemedText type="link">Sign Out</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authSection}>
              <ThemedText>
                Enter your GitHub Personal Access Token to sync issues and store data.
              </ThemedText>
              
              <ThemedText style={styles.instructions}>
                Create a token at: github.com/settings/tokens
              </ThemedText>
              
              <ThemedText style={styles.instructions}>
                Required scopes: repo, user, read:org
              </ThemedText>

              <TextInput
                style={styles.input}
                placeholder="ghp_..."
                value={token}
                onChangeText={setToken}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}>
                <ThemedText type="link">{loading ? 'Authenticating...' : 'Sign In'}</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">GitHub Storage</ThemedText>
          <ThemedText style={styles.instructions}>
            Configure where your todos will be stored in GitHub
          </ThemedText>

          <TextInput
            style={styles.input}
            placeholder="GitHub Username/Org"
            value={syncOwner}
            onChangeText={setSyncOwner}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Repository Name"
            value={syncRepo}
            onChangeText={setSyncRepo}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Branch (default: main)"
            value={syncBranch}
            onChangeText={setSyncBranch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.button} onPress={handleSaveSyncConfig}>
            <ThemedText type="link">Save Configuration</ThemedText>
          </TouchableOpacity>
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
  instructions: {
    fontSize: 12,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
