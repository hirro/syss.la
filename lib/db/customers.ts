import type { Customer } from '@/types/time';
import { forceMigration, getDatabase } from './client';

export async function getCustomers(includeArchived = false): Promise<Customer[]> {
  const db = await getDatabase();
  
  const query = includeArchived
    ? 'SELECT * FROM customers ORDER BY name'
    : 'SELECT * FROM customers WHERE archived = 0 ORDER BY name';
  
  try {
    const rows = await db.getAllAsync<any>(query);
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      archived: row.archived === 1,
      invoiceRef: row.invoice_ref,
      notes: row.notes,
      rate: row.rate,
      currency: row.currency,
      vat: row.vat,
      billingAddress: row.billing_address,
      costPlace: row.cost_place,
    }));
  } catch (error: any) {
    // If rate column doesn't exist, force migration and retry
    if (error?.message?.includes('no such column')) {
      console.log('⚠️ Missing column detected in getCustomers, forcing migration...');
      await forceMigration();
      const rows = await db.getAllAsync<any>(query);
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        archived: row.archived === 1,
        invoiceRef: row.invoice_ref,
        notes: row.notes,
        rate: row.rate,
        currency: row.currency,
        vat: row.vat,
        billingAddress: row.billing_address,
        costPlace: row.cost_place,
      }));
    }
    throw error;
  }
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
    rate: row.rate,
    currency: row.currency,
    vat: row.vat,
    billingAddress: row.billing_address,
    costPlace: row.cost_place,
  };
}

export async function insertCustomer(customer: Customer): Promise<void> {
  const db = await getDatabase();
  
  try {
    await db.runAsync(
      `INSERT INTO customers (id, name, archived, invoice_ref, notes, rate, currency, vat, billing_address, cost_place) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        customer.archived ? 1 : 0,
        customer.invoiceRef || null,
        customer.notes || null,
        customer.rate || null,
        customer.currency || 'SEK',
        customer.vat !== undefined ? customer.vat : 25.0,
        customer.billingAddress || null,
        customer.costPlace || null,
      ]
    );
  } catch (error: any) {
    if (error?.message?.includes('no such column: rate')) {
      console.log('⚠️ Rate column missing in insertCustomer, forcing migration...');
      await forceMigration();
      await db.runAsync(
        `INSERT INTO customers (id, name, archived, invoice_ref, notes, rate, currency, vat, billing_address, cost_place) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer.id,
          customer.name,
          customer.archived ? 1 : 0,
          customer.invoiceRef || null,
          customer.notes || null,
          customer.rate || null,
          customer.currency || 'SEK',
          customer.vat !== undefined ? customer.vat : 25.0,
          customer.billingAddress || null,
          customer.costPlace || null,
        ]
      );
    } else {
      throw error;
    }
  }
}

export async function updateCustomer(customer: Customer): Promise<void> {
  const db = await getDatabase();
  
  try {
    await db.runAsync(
      `UPDATE customers SET name = ?, archived = ?, invoice_ref = ?, notes = ?, 
       rate = ?, currency = ?, vat = ?, billing_address = ?, cost_place = ? 
       WHERE id = ?`,
      [
        customer.name,
        customer.archived ? 1 : 0,
        customer.invoiceRef || null,
        customer.notes || null,
        customer.rate || null,
        customer.currency || 'SEK',
        customer.vat !== undefined ? customer.vat : 25.0,
        customer.billingAddress || null,
        customer.costPlace || null,
        customer.id,
      ]
    );
  } catch (error: any) {
    // Check if error is due to missing column
    if (error?.message?.includes('no such column: rate')) {
      console.log('⚠️ Rate column missing, forcing migration...');
      await forceMigration();
      // Retry the update after migration
      await db.runAsync(
        `UPDATE customers SET name = ?, archived = ?, invoice_ref = ?, notes = ?, 
         rate = ?, currency = ?, vat = ?, billing_address = ?, cost_place = ? 
         WHERE id = ?`,
        [
          customer.name,
          customer.archived ? 1 : 0,
          customer.invoiceRef || null,
          customer.notes || null,
          customer.rate || null,
          customer.currency || 'SEK',
          customer.vat !== undefined ? customer.vat : 25.0,
          customer.billingAddress || null,
          customer.costPlace || null,
          customer.id,
        ]
      );
    } else {
      throw error;
    }
  }
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
