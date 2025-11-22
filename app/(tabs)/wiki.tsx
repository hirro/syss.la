import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWiki } from '@/hooks/use-wiki';
import type { WikiEntry } from '@/types/wiki';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WikiScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { entries, loading, search, syncWithGitHub, removeEntry } = useWiki();
  const primaryColor = useThemeColor({}, 'primary');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WikiEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());

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

  // Build tree structure from flat entries
  interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    entry?: WikiEntry;
    children: TreeNode[];
  }

  const buildTree = useCallback((entries: WikiEntry[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const dirMap = new Map<string, TreeNode>();

    entries.forEach(entry => {
      const parts = entry.filename.split('/');
      let currentPath = '';
      let currentLevel = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isFile) {
          // Add file node
          currentLevel.push({
            name: entry.title,
            path: currentPath,
            type: 'file',
            entry,
            children: [],
          });
        } else {
          // Add or get directory node
          let dirNode = dirMap.get(currentPath);
          if (!dirNode) {
            dirNode = {
              name: part,
              path: currentPath,
              type: 'directory',
              children: [],
            };
            dirMap.set(currentPath, dirNode);
            currentLevel.push(dirNode);
          }
          currentLevel = dirNode.children;
        }
      });
    });

    return root;
  }, []);

  const treeData = useMemo(() => buildTree(displayEntries), [displayEntries, buildTree]);

  const toggleDirectory = (path: string) => {
    setCollapsedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderTree = (nodes: TreeNode[], depth: number): React.ReactNode => {
    return nodes.map((node) => {
      if (node.type === 'directory') {
        const isCollapsed = collapsedDirs.has(node.path);
        return (
          <View key={node.path}>
            <TouchableOpacity
              style={[styles.directoryItem, { paddingLeft: 20 + depth * 16 }]}
              onPress={() => toggleDirectory(node.path)}
              activeOpacity={0.7}>
              <Ionicons
                name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                size={16}
                color="#888"
                style={styles.chevron}
              />
              <Ionicons
                name={isCollapsed ? 'folder' : 'folder-open'}
                size={20}
                color={primaryColor}
                style={styles.folderIcon}
              />
              <ThemedText style={styles.directoryName}>{node.name}</ThemedText>
            </TouchableOpacity>
            {!isCollapsed && renderTree(node.children, depth + 1)}
          </View>
        );
      } else {
        return (
          <TouchableOpacity
            key={node.entry!.id}
            style={[styles.fileItem, { paddingLeft: 20 + depth * 16 }]}
            onPress={() => router.push(`/wiki/${node.entry!.id}`)}
            activeOpacity={0.7}>
            <Ionicons
              name="document-text"
              size={18}
              color="#888"
              style={styles.fileIcon}
            />
            <ThemedText style={styles.fileName}>{node.name}</ThemedText>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(node.entry!);
              }}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      }
    });
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

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Wiki</ThemedText>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          disabled={syncing}>
          <Ionicons
            name={syncing ? "sync" : "cloud-upload-outline"}
            size={24}
            color={primaryColor}
          />
        </TouchableOpacity>
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

      {/* Entries List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : displayEntries.length === 0 ? (
        <View style={styles.centerContainer}>
          <ThemedText style={styles.emptyText}>
            {searchQuery.trim() ? 'No results found' : 'No wiki entries yet'}
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {searchQuery.trim() ? 'Try a different search' : 'Tap + to create your first note'}
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {renderTree(treeData, 0)}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={() => router.push('/wiki/new')}
        activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  syncButton: {
    padding: 8,
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
});
