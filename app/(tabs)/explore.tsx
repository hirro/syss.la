import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useCustomers } from '@/hooks/use-customers';
import { clearAllTodos } from '@/lib/db/todos';
import { getCurrentUser } from '@/services/github/api-client';
import { getSyncConfig } from '@/services/sync-service';
import type { Customer } from '@/types/time';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { isAuthenticated, logout } = useAuth();
  const { customers, addCustomer, editCustomer, archiveCustomer } = useCustomers();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [syncRepo, setSyncRepo] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [flickNavigationEnabled, setFlickNavigationEnabled] = useState(true);
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

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const enabled = await AsyncStorage.getItem('flick_navigation_enabled');
        if (enabled !== null) {
          setFlickNavigationEnabled(enabled === 'true');
        }
      } catch (error) {
        console.error('Failed to load flick navigation setting:', error);
      }
    };
    loadSettings();
  }, []);

  const handleToggleFlickNavigation = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('flick_navigation_enabled', value.toString());
      setFlickNavigationEnabled(value);
    } catch (error) {
      console.error('Failed to save flick navigation setting:', error);
    }
  };

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

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerName('');
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerName(customer.name);
    setShowCustomerModal(true);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top }}>
      <ThemedView style={styles.content}>
        <ThemedText type="title">Settings</ThemedText>

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
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Flick Navigation</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Quickly flick your device to switch between Todos and Timer tabs
                </ThemedText>
              </View>
              <Switch
                value={flickNavigationEnabled}
                onValueChange={handleToggleFlickNavigation}
              />
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
      </ThemedView>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
