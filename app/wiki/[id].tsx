import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWiki } from '@/hooks/use-wiki';
import { getWikiEntry } from '@/lib/db/wiki';
import type { WikiEntry } from '@/types/wiki';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import type { ImageStyle } from 'react-native';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WikiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { removeEntry } = useWiki();
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({ light: 'rgba(0, 0, 0, 0.05)', dark: 'rgba(255, 255, 255, 0.1)' }, 'background');
  
  const [entry, setEntry] = useState<WikiEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEntry = async () => {
      if (!id) return;
      
      try {
        const data = await getWikiEntry(id);
        setEntry(data);
      } catch (error) {
        console.error('Failed to load wiki entry:', error);
        Alert.alert('Error', 'Failed to load entry');
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [id]);

  // Get display title from filename
  const getDisplayTitle = () => {
    if (!entry) return 'Wiki';
    
    // Remove .md extension
    const pathWithoutExt = entry.filename.replace(/\.md$/, '');
    
    // If it has a directory structure, show the path
    if (pathWithoutExt.includes('/')) {
      return pathWithoutExt;
    }
    
    // Otherwise just show the title
    return entry.title;
  };

  const handleDelete = () => {
    if (!entry) return;

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
              router.back();
            } catch (error) {
              console.error('Failed to delete wiki entry:', error);
              Alert.alert('Error', `Failed to delete entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    router.push(`/wiki/edit/${id}`);
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  if (!entry) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <ThemedText>Entry not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{
          title: getDisplayTitle(),
          headerShown: true,
        }}
      />
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}>
        {/* Action buttons at top */}
        <View style={styles.actionBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.actionButton}>
            <Ionicons name="arrow-back" size={24} color={primaryColor} />
          </TouchableOpacity>
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
              <Ionicons name="create-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Markdown 
          style={{
            ...markdownStyles,
            body: { ...markdownStyles.body, color: textColor },
            heading1: { ...markdownStyles.heading1, color: textColor },
            heading2: { ...markdownStyles.heading2, color: textColor },
            heading3: { ...markdownStyles.heading3, color: textColor },
            paragraph: { ...markdownStyles.paragraph, color: textColor },
            code_inline: { ...markdownStyles.code_inline, backgroundColor },
            code_block: { ...markdownStyles.code_block, backgroundColor },
            image: markdownStyles.image,
          }}
        >
            {entry.content}
          </Markdown>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 22,
  },
  code_inline: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 4,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  list_item: {
    marginBottom: 4,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'contain' as const,
    marginVertical: 8,
  } as ImageStyle,
};
