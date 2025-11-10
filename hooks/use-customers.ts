import { useState, useEffect, useCallback } from 'react';
import type { Customer } from '@/types/time';
import {
  getCustomers,
  insertCustomer,
  updateCustomer,
  archiveCustomer as archiveCustomerDb,
  unarchiveCustomer as unarchiveCustomerDb,
} from '@/lib/db/customers';
import { uploadCustomers, downloadCustomers } from '@/services/github/time-sync';
import { useAuth } from './use-auth';

export function useCustomers() {
  const { isAuthenticated } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const syncToGitHub = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const allCustomers = await getCustomers(false);
      await uploadCustomers(allCustomers);
      console.log('✅ Customers synced to GitHub');
    } catch (err) {
      console.error('Failed to sync customers to GitHub:', err);
      // Don't throw - sync is optional
    }
  }, [isAuthenticated]);

  const syncFromGitHub = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const githubCustomers = await downloadCustomers();
      
      // Merge GitHub customers with local ones
      for (const customer of githubCustomers) {
        try {
          await insertCustomer(customer);
        } catch (err) {
          // Customer might already exist, try update
          await updateCustomer(customer);
        }
      }
      
      console.log('✅ Customers synced from GitHub');
    } catch (err) {
      console.error('Failed to sync customers from GitHub:', err);
      // Don't throw - sync is optional
    }
  }, [isAuthenticated]);

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
    const init = async () => {
      await loadCustomers();
      await syncFromGitHub();
      await loadCustomers(); // Reload after sync
    };
    init();
  }, [loadCustomers, syncFromGitHub]);

  const addCustomer = useCallback(async (customer: Customer) => {
    try {
      await insertCustomer(customer);
      await loadCustomers();
      await syncToGitHub();
    } catch (err) {
      console.error('Failed to add customer:', err);
      throw err;
    }
  }, [loadCustomers, syncToGitHub]);

  const editCustomer = useCallback(async (customer: Customer) => {
    try {
      await updateCustomer(customer);
      await loadCustomers();
      await syncToGitHub();
    } catch (err) {
      console.error('Failed to update customer:', err);
      throw err;
    }
  }, [loadCustomers, syncToGitHub]);

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
