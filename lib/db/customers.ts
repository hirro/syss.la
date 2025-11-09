import type { Customer } from '@/types/time';
import { getDatabase } from './client';

export async function getCustomers(includeArchived = false): Promise<Customer[]> {
  const db = await getDatabase();
  
  const query = includeArchived
    ? 'SELECT * FROM customers ORDER BY name'
    : 'SELECT * FROM customers WHERE archived = 0 ORDER BY name';
  
  const rows = await db.getAllAsync<any>(query);
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    archived: row.archived === 1,
    invoiceRef: row.invoice_ref,
    notes: row.notes,
  }));
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const db = await getDatabase();
  
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM customers WHERE id = ?',
    [id]
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    archived: row.archived === 1,
    invoiceRef: row.invoice_ref,
    notes: row.notes,
  };
}

export async function insertCustomer(customer: Customer): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'INSERT INTO customers (id, name, archived, invoice_ref, notes) VALUES (?, ?, ?, ?, ?)',
    [
      customer.id,
      customer.name,
      customer.archived ? 1 : 0,
      customer.invoiceRef || null,
      customer.notes || null,
    ]
  );
}

export async function updateCustomer(customer: Customer): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'UPDATE customers SET name = ?, archived = ?, invoice_ref = ?, notes = ? WHERE id = ?',
    [
      customer.name,
      customer.archived ? 1 : 0,
      customer.invoiceRef || null,
      customer.notes || null,
      customer.id,
    ]
  );
}

export async function archiveCustomer(id: string): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'UPDATE customers SET archived = 1 WHERE id = ?',
    [id]
  );
}

export async function unarchiveCustomer(id: string): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'UPDATE customers SET archived = 0 WHERE id = ?',
    [id]
  );
}
