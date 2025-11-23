import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCustomers } from '@/hooks/use-customers';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Customer } from '@/types/time';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CURRENCIES = ['SEK', 'EUR', 'USD', 'GBP', 'NOK', 'DKK'];

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { customers, editCustomer } = useCustomers();
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: 'rgba(0, 0, 0, 0.03)', dark: 'rgba(255, 255, 255, 0.05)' }, 'background');
  const borderColor = useThemeColor({ light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' }, 'background');
  const iconColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [rate, setRate] = useState('');
  const [currency, setCurrency] = useState('SEK');
  const [vat, setVat] = useState('25');
  const [billingAddress, setBillingAddress] = useState('');
  const [costPlace, setCostPlace] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    const foundCustomer = customers.find(c => c.id === id);
    if (foundCustomer) {
      setCustomer(foundCustomer);
      setName(foundCustomer.name);
      setInvoiceRef(foundCustomer.invoiceRef || '');
      setRate(foundCustomer.rate?.toString() || '');
      setCurrency(foundCustomer.currency || 'SEK');
      setVat(foundCustomer.vat?.toString() || '25');
      setBillingAddress(foundCustomer.billingAddress || '');
      setCostPlace(foundCustomer.costPlace || '');
      setNotes(foundCustomer.notes || '');
    }
  }, [id, customers]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a customer name');
      return;
    }

    if (!customer) return;

    try {
      setSaving(true);
      await editCustomer({
        ...customer,
        name: name.trim(),
        invoiceRef: invoiceRef.trim() || undefined,
        rate: rate ? parseFloat(rate) : undefined,
        currency: currency || 'SEK',
        vat: vat ? parseFloat(vat) : 25,
        billingAddress: billingAddress.trim() || undefined,
        costPlace: costPlace.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to save customer:', error);
      Alert.alert('Error', 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  if (!customer) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <ThemedText>Customer not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => router.back()} disabled={saving}>
            <Ionicons name="close" size={28} color={iconColor} />
          </TouchableOpacity>
          <ThemedText type="subtitle">Edit Customer</ThemedText>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <ThemedText style={[styles.saveButton, { color: primaryColor }, saving && styles.saveButtonDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            {/* Basic Information Section */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Customer Name *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter customer name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Invoice Reference</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={invoiceRef}
                  onChangeText={setInvoiceRef}
                  placeholder="e.g., Customer ID, PO Number"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Billing Information Section */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Billing Information</ThemedText>
              
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <ThemedText style={styles.label}>Hourly Rate</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                    value={rate}
                    onChangeText={setRate}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, styles.currencyGroup]}>
                  <ThemedText style={styles.label}>Currency</ThemedText>
                  <TouchableOpacity
                    style={[styles.currencyButton, { backgroundColor: inputBg, borderColor }]}
                    onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}>
                    <ThemedText style={styles.currencyText}>{currency}</ThemedText>
                    <Ionicons name="chevron-down" size={20} color={iconColor} />
                  </TouchableOpacity>
                </View>
              </View>

              {showCurrencyPicker && (
                <View style={[styles.currencyPicker, { backgroundColor: inputBg }]}>
                  {CURRENCIES.map(curr => (
                    <TouchableOpacity
                      key={curr}
                      style={[
                        styles.currencyOption,
                        { borderBottomColor: borderColor },
                        currency === curr && styles.currencyOptionSelected,
                      ]}
                      onPress={() => {
                        setCurrency(curr);
                        setShowCurrencyPicker(false);
                      }}>
                      <ThemedText
                        style={[
                          styles.currencyOptionText,
                          currency === curr && styles.currencyOptionTextSelected,
                        ]}>
                        {curr}
                      </ThemedText>
                      {currency === curr && (
                        <Ionicons name="checkmark" size={20} color={primaryColor} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>VAT (%)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={vat}
                  onChangeText={setVat}
                  placeholder="25"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Cost Place</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={costPlace}
                  onChangeText={setCostPlace}
                  placeholder="e.g., Department, Project Code"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Billing Address</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={billingAddress}
                  onChangeText={setBillingAddress}
                  placeholder="Enter billing address"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Additional Information Section */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Additional Information</ThemedText>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Notes</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any additional notes"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    fontSize: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  currencyGroup: {
    width: 100,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyPicker: {
    marginTop: -12,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
  },
  currencyOptionSelected: {
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
  },
  currencyOptionText: {
    fontSize: 16,
  },
  currencyOptionTextSelected: {
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
