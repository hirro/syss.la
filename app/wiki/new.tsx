import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWiki } from '@/hooks/use-wiki';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewWikiScreen() {
  const router = useRouter();
  const { folderPath } = useLocalSearchParams<{ folderPath?: string }>();
  const insets = useSafeAreaInsets();
  const { addEntry } = useWiki();
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: 'rgba(0, 0, 0, 0.02)', dark: 'rgba(255, 255, 255, 0.05)' }, 'background');
  const borderColor = useThemeColor({ light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' }, 'background');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    try {
      setSaving(true);
      // Add markdown heading if not present
      const finalContent = content.startsWith('#') ? content : `# ${title}\n\n${content}`;
      
      // If we're in a folder, prepend the folder path to the title
      const fullTitle = folderPath ? `${folderPath}/${title}` : title;
      
      await addEntry(fullTitle, finalContent);
      router.back();
    } catch (error) {
      console.error('Failed to save entry:', error);
      Alert.alert('Error', 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} disabled={saving}>
          <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText type="subtitle">New Entry</ThemedText>
          {folderPath && (
            <ThemedText style={styles.folderPath}>{folderPath}</ThemedText>
          )}
        </View>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <ThemedText style={[styles.saveButton, { color: primaryColor }, saving && styles.saveButtonDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Editor */}
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.editorContainer}>
          <ThemedText style={styles.label}>Title</ThemedText>
          <TextInput
            style={[styles.titleInput, { backgroundColor: inputBg, color: textColor }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter title..."
            placeholderTextColor="#888"
            autoFocus
          />

          <ThemedText style={styles.label}>Content</ThemedText>
          <TextInput
            style={[styles.contentInput, { backgroundColor: inputBg, color: textColor }]}
            value={content}
            onChangeText={setContent}
            placeholder="Write your note in markdown..."
            placeholderTextColor="#888"
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderPath: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  scrollContainer: {
    flex: 1,
  },
  editorContainer: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    padding: 12,
    borderRadius: 8,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 400,
    padding: 12,
    borderRadius: 8,
  },
});
