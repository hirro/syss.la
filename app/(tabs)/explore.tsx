import { StyleSheet, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, listUserRepos, getRepo } from '@/services/github/api-client';
import { getSyncConfig, setSyncConfig } from '@/services/sync-service';

interface Repository {
  name: string;
  full_name: string;
  owner: { login: string };
}

interface Branch {
  name: string;
}

export default function SettingsScreen() {
  const { isAuthenticated, login, logout } = useAuth();
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncOwner, setSyncOwner] = useState('');
  const [syncRepo, setSyncRepo] = useState('');
  const [syncBranch, setSyncBranch] = useState('main');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showRepoList, setShowRepoList] = useState(false);
  const [showBranchList, setShowBranchList] = useState(false);
  const insets = useSafeAreaInsets();

  const loadSyncConfig = async () => {
    const config = await getSyncConfig();
    if (config) {
      setSyncOwner(config.owner);
      setSyncRepo(config.repo);
      setSyncBranch(config.branch || 'main');
      
      // Load branches for the configured repo
      if (config.owner && config.repo) {
        await loadBranches(config.owner, config.repo);
      }
    }
  };

  const loadRepositories = useCallback(async () => {
    try {
      setLoadingRepos(true);
      console.log('📥 Loading repositories...');
      const repos = await listUserRepos();
      setRepositories(repos);
      console.log(`✅ Loaded ${repos.length} repositories`);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  const loadBranches = async (owner: string, repo: string) => {
    try {
      setLoadingBranches(true);
      console.log(`📥 Loading branches for ${owner}/${repo}...`);
      const repoData = await getRepo(owner, repo);
      // For now, just use the default branch
      // In a full implementation, you'd fetch all branches via API
      setBranches([{ name: repoData.default_branch || 'main' }]);
      console.log(`✅ Default branch: ${repoData.default_branch}`);
    } catch (error) {
      console.error('Failed to load branches:', error);
      setBranches([{ name: 'main' }]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleSelectRepo = async (repo: Repository) => {
    setSyncOwner(repo.owner.login);
    setSyncRepo(repo.name);
    setShowRepoList(false);
    await loadBranches(repo.owner.login, repo.name);
  };

  const handleSelectBranch = (branch: Branch) => {
    setSyncBranch(branch.name);
    setShowBranchList(false);
  };

  useEffect(() => {
    loadSyncConfig();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRepositories();
    }
  }, [isAuthenticated, loadRepositories]);

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
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.button, styles.buttonFlex]} 
                  onPress={loadRepositories}
                  disabled={loadingRepos}>
                  <ThemedText type="link">
                    {loadingRepos ? 'Loading...' : 'Reload GH Repos'}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, styles.buttonFlex]} 
                  onPress={handleLogout}>
                  <ThemedText type="link">Sign Out</ThemedText>
                </TouchableOpacity>
              </View>
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
            Select repository where your todos will be stored
          </ThemedText>

          {isAuthenticated ? (
            <>
              {/* Repository Selector */}
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowRepoList(!showRepoList)}>
                <ThemedText style={styles.selectorText}>
                  {syncRepo ? `${syncOwner}/${syncRepo}` : 'Select Repository'}
                </ThemedText>
                <ThemedText>▼</ThemedText>
              </TouchableOpacity>

              {showRepoList && (
                <ScrollView style={styles.dropdown}>
                  {loadingRepos ? (
                    <ActivityIndicator style={styles.loader} />
                  ) : (
                    repositories.map((repo) => (
                      <TouchableOpacity
                        key={repo.full_name}
                        style={styles.dropdownItem}
                        onPress={() => handleSelectRepo(repo)}>
                        <ThemedText>{repo.full_name}</ThemedText>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              )}

              {/* Branch Selector */}
              {syncRepo && (
                <>
                  <TouchableOpacity
                    style={styles.selector}
                    onPress={() => setShowBranchList(!showBranchList)}>
                    <ThemedText style={styles.selectorText}>
                      {syncBranch || 'Select Branch'}
                    </ThemedText>
                    <ThemedText>▼</ThemedText>
                  </TouchableOpacity>

                  {showBranchList && (
                    <ScrollView style={styles.dropdown}>
                      {loadingBranches ? (
                        <ActivityIndicator style={styles.loader} />
                      ) : (
                        branches.map((branch) => (
                          <TouchableOpacity
                            key={branch.name}
                            style={styles.dropdownItem}
                            onPress={() => handleSelectBranch(branch)}>
                            <ThemedText>{branch.name}</ThemedText>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  )}
                </>
              )}

              <TouchableOpacity
                style={[styles.button, (!syncRepo || !syncBranch) && styles.buttonDisabled]}
                onPress={handleSaveSyncConfig}
                disabled={!syncRepo || !syncBranch}>
                <ThemedText type="link">Save Configuration</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <ThemedText style={styles.instructions}>
              Please sign in to configure GitHub storage
            </ThemedText>
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonFlex: {
    flex: 1,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
  },
  dropdown: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: -8,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  loader: {
    padding: 20,
  },
});
