import { useState, useEffect, useCallback } from 'react';
import type { Customer } from '@/types/time';
import {
  getCustomers,
  insertCustomer,
  updateCustomer,
  archiveCustomer as archiveCustomerDb,
  unarchiveCustomer as unarchiveCustomerDb,
} from '@/lib/db/customers';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCustomers = useCallback(async (includeArchived = false) => {
    try {
      setLoading(true);
      const data = await getCustomers(includeArchived);
      setCustomers(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const addCustomer = useCallback(async (customer: Customer) => {
    try {
      await insertCustomer(customer);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to add customer:', err);
      throw err;
    }
  }, [loadCustomers]);

  const editCustomer = useCallback(async (customer: Customer) => {
    try {
      await updateCustomer(customer);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to update customer:', err);
      throw err;
    }
  }, [loadCustomers]);

  const archiveCustomer = useCallback(async (id: string) => {
    try {
      await archiveCustomerDb(id);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to archive customer:', err);
      throw err;
    }
  }, [loadCustomers]);

  const unarchiveCustomer = useCallback(async (id: string) => {
    try {
      await unarchiveCustomerDb(id);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to unarchive customer:', err);
      throw err;
    }
  }, [loadCustomers]);

  const refresh = useCallback(() => {
    loadCustomers();
  }, [loadCustomers]);

  return {
    customers,
    loading,
    error,
    addCustomer,
    editCustomer,
    archiveCustomer,
    unarchiveCustomer,
    refresh,
  };
}
