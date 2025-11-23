import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useCustomers } from '@/hooks/use-customers';
import { useThemeColor } from '@/hooks/use-theme-color';
import { clearAllDatabaseTables } from '@/lib/db/client';
import { getCurrentUser } from '@/services/github/api-client';
import { fullSync, getSyncConfig } from '@/services/sync-service';
import type { Customer } from '@/types/time';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { isAuthenticated, logout } = useAuth();
  const { customers, addCustomer, editCustomer, archiveCustomer, refresh: refreshCustomers } = useCustomers();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [syncRepo, setSyncRepo] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [defaultTab, setDefaultTab] = useState<'todos' | 'timer'>('todos');
  const insets = useSafeAreaInsets();
  const primaryColor = useThemeColor({}, 'primary');

  // Refresh customers when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshCustomers();
    }, [refreshCustomers])
  );

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

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const startupTab = await AsyncStorage.getItem('default_startup_tab');
        if (startupTab !== null && (startupTab === 'todos' || startupTab === 'timer')) {
          setDefaultTab(startupTab);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);


  const handleDefaultTabChange = async (tab: 'todos' | 'timer') => {
    try {
      await AsyncStorage.setItem('default_startup_tab', tab);
      setDefaultTab(tab);
    } catch (error) {
      console.error('Failed to save default tab setting:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'This will sync all your data to GitHub, then clear all local data.\n\nYour data will be safely stored in GitHub and restored when you sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Running final sync before sign out...');
              
              // Run full sync to ensure all data is saved to GitHub
              try {
                await fullSync();
                console.log('✅ Final sync completed');
              } catch (syncError) {
                console.error('⚠️ Sync failed, but continuing with sign out:', syncError);
                // Continue with sign out even if sync fails
              }
              
              console.log('🗑️ Clearing all local data...');
              await clearAllDatabaseTables();
              await AsyncStorage.removeItem('sync_config');
              await logout();
              setUsername('');
              setSyncRepo('');
              
              // Navigate back and then to Todos tab
              router.back();
              router.replace('/(tabs)/todo');
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

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerName('');
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    router.push(`/customer/${customer.id}`);
  };

  const handleSaveCustomer = async () => {
    if (!customerName.trim()) {
      alert('Please enter a customer name');
      return;
    }

    try {
      if (editingCustomer) {
        await editCustomer({
          ...editingCustomer,
          name: customerName.trim(),
        });
      } else {
        await addCustomer({
          id: Date.now().toString(),
          name: customerName.trim(),
        });
      }
      setShowCustomerModal(false);
      setCustomerName('');
      setEditingCustomer(null);
    } catch (error) {
      console.error('Failed to save customer:', error);
      alert('Failed to save customer');
    }
  };

  const handleArchiveCustomer = (customer: Customer) => {
    Alert.alert(
      'Archive Customer',
      `Are you sure you want to archive "${customer.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveCustomer(customer.id);
            } catch (error) {
              console.error('Failed to archive customer:', error);
              alert('Failed to archive customer');
            }
          },
        },
      ]
    );
  };

  // Swipe right gesture to close
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([10, 999999]) // Only activate on right swipe (positive X)
    .onEnd((event) => {
      if (event.translationX > 100) {
        runOnJS(router.back)();
      }
    });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipeGesture}>
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={primaryColor} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>GitHub Authentication</ThemedText>
            {isAuthenticated ? (
              <View style={styles.cardContent}>
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
              <View style={styles.cardContent}>
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

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle" style={styles.cardTitle}>Customers</ThemedText>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCustomer}>
                <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cardContent}>
              {customers.length === 0 ? (
                <ThemedText style={styles.emptyText}>No customers yet</ThemedText>
              ) : (
                customers.map((customer) => (
                  <View key={customer.id} style={styles.customerItem}>
                    <View style={styles.customerInfo}>
                      <ThemedText style={styles.customerName}>{customer.name}</ThemedText>
                    </View>
                    <View style={styles.customerActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditCustomer(customer)}>
                        <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.archiveButton]}
                        onPress={() => handleArchiveCustomer(customer)}>
                        <ThemedText style={styles.actionButtonText}>Archive</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Navigation</ThemedText>
            <View style={styles.cardContent}>
              <View style={styles.settingSection}>
                <View style={styles.settingInfo}>
                  <ThemedText style={styles.settingLabel}>Default Startup Tab</ThemedText>
                  <ThemedText style={styles.settingDescription}>
                    Choose which tab to show when opening the app
                  </ThemedText>
                </View>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      styles.segmentButtonLeft,
                      defaultTab === 'todos' && styles.segmentButtonActive
                    ]}
                    onPress={() => handleDefaultTabChange('todos')}>
                    <ThemedText style={[
                      styles.segmentButtonText,
                      defaultTab === 'todos' && styles.segmentButtonTextActive
                    ]}>
                      Todos
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      styles.segmentButtonRight,
                      defaultTab === 'timer' && styles.segmentButtonActive
                    ]}
                    onPress={() => handleDefaultTabChange('timer')}>
                    <ThemedText style={[
                      styles.segmentButtonText,
                      defaultTab === 'timer' && styles.segmentButtonTextActive
                    ]}>
                      Timer
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </View>

          <View style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>About</ThemedText>
            <View style={styles.cardContent}>
              <ThemedText>syss.la v1.0.0</ThemedText>
              <ThemedText>A developer productivity app</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Customer Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </ThemedText>
            
            <TextInput
              style={styles.input}
              placeholder="Customer name"
              value={customerName}
              onChangeText={setCustomerName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCustomerModal(false)}>
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveCustomer}>
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44, // Same width as back button to center the title
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardContent: {
    gap: 12,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  archiveButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  settingSection: {
    gap: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  segmentButtonMiddle: {
    // No border radius
  },
  segmentButtonRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#007AFF',
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
});
