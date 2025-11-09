import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTimer } from '@/hooks/use-timer';
import { useTimeEntries } from '@/hooks/use-time-entries';
import { useCustomers } from '@/hooks/use-customers';
import { formatDuration, deleteTimeEntry, updateTimeEntry } from '@/lib/db/time-entries';
import type { TimeEntry } from '@/types/time';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const { customers } = useCustomers();
  const { activeTimer, elapsedTime, startTimer, stopTimer } = useTimer();
  const { entriesByDate, formatTotalDuration, refresh } = useTimeEntries();
  
  const [note, setNote] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'pomodoro'>('list');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showEntryEditor, setShowEntryEditor] = useState(false);

  const handleStartTimer = async (customerId: string) => {
    try {
      await startTimer(customerId, undefined, note);
      setNote('');
      setShowCustomerPicker(false);
    } catch (error) {
      console.error('Failed to start timer:', error);
      Alert.alert('Error', 'Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    try {
      await stopTimer();
      refresh();
    } catch (error) {
      console.error('Failed to stop timer:', error);
      Alert.alert('Error', 'Failed to stop timer');
    }
  };

  const handleStartFromEntry = async (customerId: string, entryNote?: string) => {
    try {
      await startTimer(customerId, undefined, entryNote || '');
      refresh();
    } catch (error) {
      console.error('Failed to start timer from entry:', error);
      Alert.alert('Error', 'Failed to start timer');
    }
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setShowEntryEditor(true);
  };

  const handleDeleteEntry = async () => {
    if (!editingEntry) return;
    
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this time entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTimeEntry(editingEntry.id);
              setShowEntryEditor(false);
              setEditingEntry(null);
              refresh();
            } catch (error) {
              console.error('Failed to delete entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const handleSaveEntry = async () => {
    if (!editingEntry) return;

    try {
      await updateTimeEntry(editingEntry);
      setShowEntryEditor(false);
      setEditingEntry(null);
      refresh();
    } catch (error) {
      console.error('Failed to update entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }
  };


  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  // Convert entriesByDate to sorted array
  const sortedDates = Array.from(entriesByDate.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Timer</ThemedText>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <ThemedText style={styles.headerIconText}>+</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <ThemedText style={styles.headerIconText}>⚙</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}>
          <ThemedText style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            List
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pomodoro' && styles.tabActive]}
          onPress={() => setActiveTab('pomodoro')}>
          <ThemedText style={[styles.tabText, activeTab === 'pomodoro' && styles.tabTextActive]}>
            Pomodoro
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Time Entries List */}
      <ScrollView style={styles.scrollContainer}>
        {sortedDates.map(date => {
          const entries = entriesByDate.get(date) || [];
          const totalDuration = formatTotalDuration(date);

          return (
            <View key={date} style={styles.dateSection}>
              <View style={styles.dateSectionHeader}>
                <ThemedText style={styles.dateText}>{formatDate(date)}</ThemedText>
                <ThemedText style={styles.dateTotalText}>{totalDuration}</ThemedText>
              </View>

              {entries.map(entry => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.entryCard}
                  onPress={() => handleEditEntry(entry)}
                  activeOpacity={0.7}>
                  <View style={styles.entryInfo}>
                    <ThemedText style={styles.entryCustomer}>
                      {getCustomerName(entry.customerId)}
                    </ThemedText>
                    {entry.note && (
                      <ThemedText style={styles.entryNote}>{entry.note}</ThemedText>
                    )}
                  </View>
                  <View style={styles.entryRight}>
                    <ThemedText style={styles.entryDuration}>
                      {formatDuration(entry.durationMinutes || 0)}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.entryPlayButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleStartFromEntry(entry.customerId, entry.note);
                      }}>
                      <ThemedText style={styles.entryPlayIcon}>▶</ThemedText>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {sortedDates.length === 0 && !activeTimer && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No time entries yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>Start tracking your time below</ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Active Timer Bar (Bottom) */}
      {activeTimer ? (
        <View style={styles.activeTimerBar}>
          <View style={styles.activeTimerBarContent}>
            <View style={styles.activeTimerBarInfo}>
              <ThemedText style={styles.activeTimerBarTime}>{elapsedTime}</ThemedText>
              <ThemedText style={styles.activeTimerBarCustomer}>
                {getCustomerName(activeTimer.customerId)}
              </ThemedText>
              {activeTimer.note && (
                <ThemedText style={styles.activeTimerBarNote}>• {activeTimer.note}</ThemedText>
              )}
            </View>
            <TouchableOpacity
              style={styles.stopBarButton}
              onPress={handleStopTimer}>
              <View style={styles.stopIcon} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Bottom Input Bar */
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowNoteEditor(true)}>
            <ThemedText style={styles.inputPlaceholder}>
              {note || "I'm working on..."}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              if (!selectedCustomerId) {
                Alert.alert('Select Customer', 'Please select a customer first');
                setShowNoteEditor(true);
              } else {
                handleStartTimer(selectedCustomerId);
              }
            }}>
            <ThemedText style={styles.startButtonText}>▶</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Note Editor Modal */}
      <Modal
        visible={showNoteEditor}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowNoteEditor(false)}>
        <ThemedView style={[styles.editorContainer, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={() => setShowNoteEditor(false)}>
              <ThemedText style={styles.closeButton}>✕</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (selectedCustomerId) {
                  setShowNoteEditor(false);
                  handleStartTimer(selectedCustomerId);
                } else {
                  Alert.alert('Select Customer', 'Please select a customer first');
                }
              }}>
              <ThemedText style={styles.saveButton}>Save</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Timer Display */}
          <ThemedText style={styles.timerDisplay}>00,00 h</ThemedText>

          {/* Note Input */}
          <TextInput
            style={styles.noteInput}
            placeholder="I'm working on..."
            placeholderTextColor="rgba(147, 51, 234, 0.5)"
            value={note}
            onChangeText={setNote}
            multiline
            autoFocus
          />

          {/* Customer Selection */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setShowNoteEditor(false);
                setTimeout(() => setShowCustomerPicker(true), 300);
              }}>
              <ThemedText style={styles.actionButtonText}>
                @ {selectedCustomerId ? getCustomerName(selectedCustomerId) : 'Select customer'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal
        visible={showCustomerPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Select Customer
            </ThemedText>

            <ScrollView style={styles.customerList}>
              {customers.map(customer => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomerId(customer.id);
                    setShowCustomerPicker(false);
                    setTimeout(() => setShowNoteEditor(true), 300);
                  }}>
                  <ThemedText style={styles.customerName}>{customer.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowCustomerPicker(false);
                setTimeout(() => setShowNoteEditor(true), 300);
              }}>
              <ThemedText>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Entry Editor Modal */}
      <Modal
        visible={showEntryEditor}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowEntryEditor(false)}>
        {editingEntry && (
          <ThemedView style={[styles.editorContainer, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.editorHeader}>
              <TouchableOpacity onPress={() => setShowEntryEditor(false)}>
                <ThemedText style={styles.closeButton}>✕</ThemedText>
              </TouchableOpacity>
              <ThemedText type="subtitle">Edit Entry</ThemedText>
              <TouchableOpacity onPress={handleSaveEntry}>
                <ThemedText style={styles.saveButton}>Save</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.entryEditorContent}>
              {/* Customer */}
              <View style={styles.editorSection}>
                <ThemedText style={styles.editorLabel}>Customer</ThemedText>
                <ThemedText style={styles.editorValue}>
                  {getCustomerName(editingEntry.customerId)}
                </ThemedText>
              </View>

              {/* Note */}
              <View style={styles.editorSection}>
                <ThemedText style={styles.editorLabel}>Note</ThemedText>
                <TextInput
                  style={styles.editorInput}
                  value={editingEntry.note || ''}
                  onChangeText={(text) => setEditingEntry({ ...editingEntry, note: text })}
                  placeholder="Add a note..."
                  placeholderTextColor="rgba(147, 51, 234, 0.5)"
                  multiline
                />
              </View>

              {/* Start Time */}
              <View style={styles.editorSection}>
                <ThemedText style={styles.editorLabel}>Start Time</ThemedText>
                <ThemedText style={styles.editorValue}>
                  {new Date(editingEntry.start).toLocaleString()}
                </ThemedText>
              </View>

              {/* End Time */}
              <View style={styles.editorSection}>
                <ThemedText style={styles.editorLabel}>End Time</ThemedText>
                <ThemedText style={styles.editorValue}>
                  {editingEntry.end ? new Date(editingEntry.end).toLocaleString() : 'Not set'}
                </ThemedText>
              </View>

              {/* Duration */}
              <View style={styles.editorSection}>
                <ThemedText style={styles.editorLabel}>Duration</ThemedText>
                <ThemedText style={styles.editorValue}>
                  {formatDuration(editingEntry.durationMinutes || 0)}
                </ThemedText>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteEntry}>
                <ThemedText style={styles.deleteButtonText}>Delete Entry</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        )}
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 20,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    fontSize: 16,
    opacity: 0.6,
  },
  tabTextActive: {
    opacity: 1,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  activeTimerBar: {
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(147, 51, 234, 0.3)',
    paddingBottom: 16,
  },
  activeTimerBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  activeTimerBarInfo: {
    flex: 1,
  },
  activeTimerBarTime: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  activeTimerBarCustomer: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTimerBarNote: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 1,
  },
  stopBarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  stopIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateTotalText: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.7,
  },
  entryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.03)',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
  },
  entryInfo: {
    flex: 1,
  },
  entryCustomer: {
    fontSize: 16,
    fontWeight: '500',
  },
  entryNote: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  entryPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryPlayIcon: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  inputBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  inputPlaceholder: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  startButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    marginBottom: 16,
  },
  customerList: {
    maxHeight: 400,
  },
  customerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  customerName: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  editorContainer: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9333EA',
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  noteInput: {
    fontSize: 18,
    color: '#9333EA',
    marginBottom: 24,
    minHeight: 60,
    paddingHorizontal: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  actionButton: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#9333EA',
  },
  entryEditorContent: {
    flex: 1,
  },
  editorSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  editorLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
  },
  editorValue: {
    fontSize: 16,
  },
  editorInput: {
    fontSize: 16,
    color: '#9333EA',
    minHeight: 60,
    padding: 12,
    backgroundColor: 'rgba(147, 51, 234, 0.05)',
    borderRadius: 8,
  },
  deleteButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
