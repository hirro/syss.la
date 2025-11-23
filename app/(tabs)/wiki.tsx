import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWiki } from '@/hooks/use-wiki';
import type { WikiEntry } from '@/types/wiki';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WikiScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { entries, loading, search, syncWithGitHub, removeEntry, addEntry, refresh } = useWiki();
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
  const modalBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const inputBg = useThemeColor({ light: 'rgba(0, 0, 0, 0.02)', dark: 'rgba(255, 255, 255, 0.05)' }, 'background');
  const borderColor = useThemeColor({ light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' }, 'background');
  const buttonBg = useThemeColor({ light: 'rgba(0, 0, 0, 0.05)', dark: 'rgba(255, 255, 255, 0.1)' }, 'background');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WikiEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Reload entries when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await search(query);
      setSearchResults(results.map(r => r.entry));
    } else {
      setSearchResults([]);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await syncWithGitHub();
      Alert.alert('Success', 'Wiki entries synced with GitHub');
    } catch (error) {
      console.error('Failed to sync:', error);
      Alert.alert('Error', 'Failed to sync with GitHub. Make sure you are signed in.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (entry: WikiEntry) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete "${entry.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeEntry(entry.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const displayEntries = searchQuery.trim() ? searchResults : entries;

  // Get items in current directory level
  interface DirectoryItem {
    name: string;
    type: 'file' | 'folder';
    path: string;
    count?: number;
    entry?: WikiEntry;
  }

  // Get items in current directory
  const getCurrentDirectoryItems = useCallback((entries: WikiEntry[], path: string): DirectoryItem[] => {
    const items = new Map<string, DirectoryItem>();
    
    entries.forEach(entry => {
      const relativePath = entry.filename;
      const isSysslaFile = entry.title === '.syssla' || entry.filename.endsWith('/.syssla.md');
      
      // Check if entry is in current path
      if (path && !relativePath.startsWith(path + '/')) {
        return;
      }
      
      // Get the part after current path
      const afterPath = path ? relativePath.substring(path.length + 1) : relativePath;
      const parts = afterPath.split('/');
      
      if (parts.length === 1) {
        // File in current directory - skip .syssla files
        if (isSysslaFile) {
          return;
        }
        items.set(afterPath, {
          name: entry.title,
          type: 'file',
          path: relativePath,
          entry,
        });
      } else {
        // Folder in current directory
        const folderName = parts[0];
        const folderPath = path ? `${path}/${folderName}` : folderName;
        
        if (!items.has(folderName)) {
          // Count items in this folder (excluding .syssla files)
          const count = entries.filter(e => 
            e.filename.startsWith(folderPath + '/') && 
            e.title !== '.syssla' && 
            !e.filename.endsWith('/.syssla.md')
          ).length;
          
          items.set(folderName, {
            name: folderName,
            type: 'folder',
            path: folderPath,
            count,
          });
        }
      }
    });
    
    // Sort: folders first, then files, alphabetically
    return Array.from(items.values()).sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, []);

  const currentItems = useMemo(() => 
    getCurrentDirectoryItems(displayEntries, currentPath), 
    [displayEntries, currentPath, getCurrentDirectoryItems]
  );

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const handleBackClick = () => {
    if (currentPath) {
      const parts = currentPath.split('/');
      parts.pop();
      setCurrentPath(parts.join('/'));
    }
  };

  const getHeaderTitle = () => {
    if (!currentPath) return 'Folders';
    const parts = currentPath.split('/');
    return parts[parts.length - 1];
  };

  const handleDeleteItem = async (item: DirectoryItem) => {
    if (item.type === 'folder') {
      // Delete all entries in this folder
      Alert.alert(
        'Delete Folder',
        `Are you sure you want to delete "${item.name}" and all its contents?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Find all entries in this folder
                const entriesToDelete = entries.filter(e => 
                  e.filename.startsWith(item.path + '/')
                );
                
                // Delete each entry
                for (const entry of entriesToDelete) {
                  await removeEntry(entry.id);
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to delete folder');
              }
            },
          },
        ]
      );
    } else if (item.entry) {
      // Delete single file
      Alert.alert(
        'Delete Entry',
        `Are you sure you want to delete "${item.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeEntry(item.entry!.id);
              } catch (error) {
                Alert.alert('Error', 'Failed to delete entry');
              }
            },
          },
        ]
      );
    }
  };

  const renderRightActions = (item: DirectoryItem) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteItem(item)}>
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <ThemedText style={styles.deleteActionText}>Delete</ThemedText>
      </TouchableOpacity>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPreview = (content: string) => {
    // Remove markdown heading
    const withoutHeading = content.replace(/^#\s+.+$/m, '').trim();
    // Get first 100 characters
    const preview = withoutHeading.substring(0, 100);
    return preview + (withoutHeading.length > 100 ? '...' : '');
  };

  const handleCreateFolder = () => {
    setShowFolderModal(true);
  };

  const handleSaveFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }
    
    // Create a hidden .syssla file in the folder to make it exist in GitHub
    try {
      const folderPath = currentPath 
        ? `${currentPath}/${newFolderName.trim()}`
        : newFolderName.trim();
      
      // Create the hidden file with folder path
      await addEntry(`${folderPath}/.syssla`, '# Folder placeholder\n\nThis file ensures the folder exists in GitHub.');
      
      // Close modal and clear input
      setShowFolderModal(false);
      setNewFolderName('');
      
      // Note: addEntry already calls loadEntries() which updates the entries state
    } catch (error) {
      console.error('Failed to create folder:', error);
      Alert.alert('Error', 'Failed to create folder');
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {currentPath && (
            <TouchableOpacity onPress={handleBackClick} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={primaryColor} />
            </TouchableOpacity>
          )}
          <ThemedText type="title" style={styles.headerTitle}>{getHeaderTitle()}</ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleCreateFolder}>
            <Ionicons name="folder-outline" size={24} color={primaryColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push({
              pathname: '/wiki/new',
              params: { folderPath: currentPath }
            })}>
            <Ionicons name="create-outline" size={24} color={primaryColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSync}
            disabled={syncing}>
            <Ionicons
              name={syncing ? "sync" : "cloud-upload-outline"}
              size={24}
              color={primaryColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Items List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : currentItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <ThemedText style={styles.emptyText}>
            {searchQuery.trim() ? 'No results found' : 'No wiki entries yet'}
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {searchQuery.trim() ? 'Try a different search' : 'Tap + to create your first note'}
          </ThemedText>
        </View>
      ) : (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ScrollView style={styles.scrollContainer}>
            {currentItems.map((item) => (
              <Swipeable
                key={item.path}
                renderRightActions={() => renderRightActions(item)}
                overshootRight={false}>
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => {
                    if (item.type === 'folder') {
                      handleFolderClick(item.path);
                    } else {
                      router.push(`/wiki/${item.entry!.id}`);
                    }
                  }}
                  activeOpacity={0.7}>
                  <Ionicons
                    name={item.type === 'folder' ? 'folder' : 'document-text'}
                    size={24}
                    color={item.type === 'folder' ? '#FFA500' : '#888'}
                    style={styles.itemIcon}
                  />
                  <View style={styles.itemContent}>
                    <ThemedText style={[styles.itemName, { color: textColor }]}>{item.name}</ThemedText>
                    {item.type === 'folder' && item.count !== undefined && (
                      <ThemedText style={[styles.itemCount, { color: secondaryTextColor }]}>{item.count}</ThemedText>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
                </TouchableOpacity>
              </Swipeable>
            ))}
          </ScrollView>
        </GestureHandlerRootView>
      )}

      {/* Folder Creation Modal */}
      {showFolderModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            <ThemedText style={styles.modalTitle}>New Folder</ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
              placeholder="Folder name"
              placeholderTextColor="#999"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: buttonBg }]}
                onPress={() => {
                  setShowFolderModal(false);
                  setNewFolderName('');
                }}>
                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: primaryColor }]}
                onPress={handleSaveFolder}>
                <ThemedText style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Create</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ThemedView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButton: {
    padding: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 17,
    fontWeight: '400',
  },
  itemCount: {
    fontSize: 17,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  scrollContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  directoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 20,
  },
  chevron: {
    marginRight: 4,
  },
  folderIcon: {
    marginRight: 8,
  },
  directoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 20,
    backgroundColor: 'rgba(147, 51, 234, 0.02)',
  },
  fileIcon: {
    marginRight: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 15,
  },
  entryPreview: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 12,
    opacity: 0.5,
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
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
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
