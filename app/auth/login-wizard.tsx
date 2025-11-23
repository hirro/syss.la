import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { clearAllTodos } from '@/lib/db/todos';
import { getCurrentUser, listUserRepos } from '@/services/github/api-client';
import { syncGitHubIssues } from '@/services/github/issues';
import { fullSync, setSyncConfig } from '@/services/sync-service';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Repository {
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string;
}

type WizardStep = 'token' | 'repository' | 'syncing';

export default function LoginWizardScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState<WizardStep>('token');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState('');
  const [syncComplete, setSyncComplete] = useState(false);

  const handleTokenSubmit = async () => {
    if (!token.trim()) {
      alert('Please enter a GitHub Personal Access Token');
      return;
    }

    try {
      setLoading(true);
      
      // Clear any existing data
      await clearAllTodos();
      
      // Authenticate
      await login(token);
      const user = await getCurrentUser();
      setUsername(user.login);
      
      // Load repositories
      setLoadingRepos(true);
      const repos = await listUserRepos();
      setRepositories(repos);
      setLoadingRepos(false);
      
      // Move to repository selection
      setStep('repository');
    } catch (error) {
      console.error('Authentication failed:', error);
      alert('Authentication failed. Please check your token and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRepoSelect = async (repo: Repository) => {
    try {
      setLoading(true);
      setSelectedRepo(repo);
      
      // Save sync configuration
      await setSyncConfig({
        owner: repo.owner.login,
        repo: repo.name,
        branch: repo.default_branch || 'main',
      });
      
      // Move to syncing step
      setStep('syncing');
      setLoading(false);
      
      // Start synchronization
      await performInitialSync();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration. Please try again.');
      setLoading(false);
    }
  };

  const performInitialSync = async () => {
    
    try {
      // Step 1: Sync GitHub issues with per-repo detail
      setCurrentStep('Loading GitHub issues from repositories...');
      await syncGitHubIssues();
      
      // Get count from database and group by repository
      const { getActiveTodos, getCompletedTodos } = await import('@/lib/db/todos');
      const activeTodos = await getActiveTodos();
      const completedTodos = await getCompletedTodos();
      const githubIssues = [...activeTodos, ...completedTodos].filter(t => t.source === 'github-issue');
      
      // Group issues by repository
      const repoMap = new Map<string, number>();
      githubIssues.forEach(issue => {
        if (issue.github) {
          const repoKey = `${issue.github.owner}/${issue.github.repo}`;
          repoMap.set(repoKey, (repoMap.get(repoKey) || 0) + 1);
        }
      });
      
      // Store repo data
      const repoData = {
        total: githubIssues.length,
        repoCount: repoMap.size,
        repos: Array.from(repoMap.entries()).map(([repo, count]) => ({ repo, count }))
      };
      setSyncProgress([JSON.stringify({ type: 'repos', data: repoData })]);
      
      // Step 2: Sync storage
      setCurrentStep('Syncing with GitHub storage...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX
      
      await fullSync();
      
      // Get updated counts
      const updatedActive = await getActiveTodos();
      const updatedCompleted = await getCompletedTodos();
      const totalTodos = updatedActive.length + updatedCompleted.length;
      
      const storageData = {
        total: totalTodos,
        active: updatedActive.length,
        completed: updatedCompleted.length
      };
      setSyncProgress([
        JSON.stringify({ type: 'repos', data: repoData }),
        JSON.stringify({ type: 'storage', data: storageData })
      ]);
      
      // Step 3: Complete
      setCurrentStep('');
      setSyncComplete(true);
      
      // Auto-scroll to button
      setTimeout(() => {
        // Scroll will happen automatically as content appears
      }, 100);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncProgress([JSON.stringify({ type: 'error', data: { message: 'Sync failed. You can try again from the app.' } })]);
      setCurrentStep('');
      setSyncComplete(true);
    }
  };

  const handleComplete = () => {
    router.replace('/(tabs)/todo');
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step === 'token' && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'repository' && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'syncing' && styles.stepDotActive]} />
        </View>

        {/* Step 1: Token Entry */}
        {step === 'token' && (
          <View style={styles.stepContent}>
            <ThemedText type="title" style={styles.title}>
              Sign in to GitHub
            </ThemedText>
            
            <ThemedText style={styles.description}>
              To use this app, you need to authenticate with GitHub using a Personal Access Token.
            </ThemedText>

            <TextInput
              style={styles.input}
              placeholder="Paste your GitHub token here (ghp_...)"
              placeholderTextColor="#999"
              value={token}
              onChangeText={setToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={handleTokenSubmit}
              disabled={loading}>
              <ThemedText style={styles.buttonText}>
                {loading ? 'Authenticating...' : 'Continue'}
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.instructionsBox}>
              <ThemedText type="subtitle" style={styles.instructionsTitle}>
                How to create a token:
              </ThemedText>
              <ThemedText style={styles.instructionStep}>
                1. Go to: github.com/settings/tokens
              </ThemedText>
              <ThemedText style={styles.instructionStep}>
                2. Click &quot;Generate new token&quot; → &quot;Generate new token (classic)&quot;
              </ThemedText>
              <ThemedText style={styles.instructionStep}>
                3. Give it a name (e.g., &quot;syss.la App&quot;)
              </ThemedText>
              <ThemedText style={styles.instructionStep}>
                4. Select scopes: <ThemedText style={styles.bold}>repo</ThemedText> (required)
              </ThemedText>
              <ThemedText style={styles.instructionStep}>
                5. Click &quot;Generate token&quot; and copy it
              </ThemedText>
            </View>

            <ThemedText style={styles.warning}>
              ⚠️ Keep your token secure. Don&apos;t share it with anyone.
            </ThemedText>
          </View>
        )}

        {/* Step 2: Repository Selection */}
        {step === 'repository' && (
          <View style={styles.stepContent}>
            <ThemedText type="title" style={styles.title}>
              Select Storage Repository
            </ThemedText>
            
            <ThemedText style={styles.description}>
              Authenticated as: <ThemedText style={styles.bold}>{username}</ThemedText>
            </ThemedText>

            <ThemedText style={styles.description}>
              Choose a repository where your todos will be stored. The app will create files in this repository to sync your data.
            </ThemedText>

            <ThemedText style={styles.infoText}>
              ℹ️ Only private repositories are shown
            </ThemedText>

            {loadingRepos ? (
              <ActivityIndicator size="large" style={styles.loader} />
            ) : (
              <ScrollView style={styles.repoList}>
                {repositories.map((repo) => (
                  <TouchableOpacity
                    key={repo.full_name}
                    style={styles.repoItem}
                    onPress={() => handleRepoSelect(repo)}
                    disabled={loading}>
                    <ThemedText style={styles.repoName}>{repo.full_name}</ThemedText>
                    <ThemedText style={styles.repoMeta}>
                      Branch: {repo.default_branch || 'main'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Step 3: Syncing & Complete */}
        {step === 'syncing' && (
          <View style={styles.stepContent}>
            <ThemedText type="title" style={styles.title}>
              {syncComplete ? '✅ Setup Complete!' : 'Syncing Your Data'}
            </ThemedText>
            
            {!syncComplete && (
              <>
                <ActivityIndicator size="large" style={styles.syncLoader} />
                <ThemedText style={styles.syncCurrentStep}>
                  {currentStep}
                </ThemedText>
              </>
            )}
            
            {syncProgress.length === 0 && !syncComplete && (
              <ThemedText style={styles.description}>
                Please wait while we sync your data...
              </ThemedText>
            )}

            {syncComplete && (
              <>
                {/* Storage Info Panel */}
                <View style={styles.summaryBox}>
                  <View>
                    <ThemedText style={styles.summaryLabel}>Account:</ThemedText>
                    <ThemedText style={styles.summaryValue}>{username}</ThemedText>
                  </View>
                  
                  <View>
                    <ThemedText style={styles.summaryLabel}>Storage Repository:</ThemedText>
                    <ThemedText style={styles.summaryValue}>{selectedRepo?.full_name}</ThemedText>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>Branch:</ThemedText>
                    <ThemedText style={styles.summaryValue}>{selectedRepo?.default_branch || 'main'}</ThemedText>
                  </View>
                </View>

                {/* Render progress panels */}
                {syncProgress.map((item, index) => {
                  try {
                    const progressItem = JSON.parse(item);
                    
                    if (progressItem.type === 'repos' && progressItem.data) {
                      const { total, repoCount, repos } = progressItem.data;
                      return (
                        <View key={index} style={styles.infoPanel}>
                          <ThemedText style={styles.infoPanelTitle}>
                            ✅ Loaded {total} GitHub {total === 1 ? 'issue' : 'issues'} from {repoCount} {repoCount === 1 ? 'repository' : 'repositories'}
                          </ThemedText>
                          <ScrollView style={styles.repoScrollView}>
                            {repos.map((r: any, i: number) => (
                              <ThemedText key={i} style={styles.repoListItem}>
                                • {r.repo}: {r.count} {r.count === 1 ? 'issue' : 'issues'}
                              </ThemedText>
                            ))}
                          </ScrollView>
                        </View>
                      );
                    }
                    
                    if (progressItem.type === 'storage' && progressItem.data) {
                      const { total, active, completed } = progressItem.data;
                      return (
                        <View key={index} style={styles.infoPanel}>
                          <ThemedText style={styles.infoPanelTitle}>
                            ✅ Synced {total} total items from storage
                          </ThemedText>
                          <ThemedText style={styles.infoPanelDetail}>
                            • {active} active todos
                          </ThemedText>
                          <ThemedText style={styles.infoPanelDetail}>
                            • {completed} completed todos
                          </ThemedText>
                        </View>
                      );
                    }
                    
                    if (progressItem.type === 'error' && progressItem.data) {
                      return (
                        <View key={index} style={styles.infoPanel}>
                          <ThemedText style={styles.infoPanelError}>
                            ❌ {progressItem.data.message}
                          </ThemedText>
                        </View>
                      );
                    }
                  } catch {
                    // Fallback for any parsing errors
                    return null;
                  }
                  return null;
                })}

                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleComplete}>
                  <ThemedText style={styles.buttonText}>
                    Get Started
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#ccc',
  },
  stepContent: {
    gap: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    opacity: 0.8,
    fontSize: 16,
    lineHeight: 24,
  },
  infoText: {
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: -8,
  },
  instructionsBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  instructionsTitle: {
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
  warning: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.8,
    color: '#FF9500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 40,
  },
  syncLoader: {
    marginVertical: 30,
  },
  syncCurrentStep: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    color: '#007AFF',
  },
  syncCompleteStep: {
    fontSize: 20,
    color: '#34C759',
  },
  syncProgressContainer: {
    width: '100%',
    gap: 8,
    marginTop: 16,
  },
  syncProgressItem: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  repoList: {
    maxHeight: 400,
  },
  repoItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  repoMeta: {
    fontSize: 14,
    opacity: 0.6,
    color: '#000',
  },
  summaryBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoPanel: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  infoPanelTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  infoPanelDetail: {
    fontSize: 15,
    marginLeft: 8,
    marginBottom: 4,
    color: '#000',
  },
  infoPanelError: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  repoScrollView: {
    maxHeight: 120,
  },
  repoListItem: {
    fontSize: 15,
    marginLeft: 8,
    marginBottom: 4,
    color: '#000',
  },
});
