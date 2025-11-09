import type { Project } from '@/types/time';
import { getDatabase } from './client';

export async function getProjects(customerId?: string): Promise<Project[]> {
  const db = await getDatabase();
  
  const query = customerId
    ? 'SELECT * FROM projects WHERE customer_id = ? ORDER BY name'
    : 'SELECT * FROM projects ORDER BY name';
  
  const params = customerId ? [customerId] : [];
  const rows = await db.getAllAsync<any>(query, params);
  
  return rows.map(row => ({
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    code: row.code,
    notes: row.notes,
  }));
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDatabase();
  
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM projects WHERE id = ?',
    [id]
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    code: row.code,
    notes: row.notes,
  };
}

export async function insertProject(project: Project): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'INSERT INTO projects (id, customer_id, name, code, notes) VALUES (?, ?, ?, ?, ?)',
    [
      project.id,
      project.customerId,
      project.name,
      project.code || null,
      project.notes || null,
    ]
  );
}

export async function updateProject(project: Project): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'UPDATE projects SET customer_id = ?, name = ?, code = ?, notes = ? WHERE id = ?',
    [
      project.customerId,
      project.name,
      project.code || null,
      project.notes || null,
      project.id,
    ]
  );
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'DELETE FROM projects WHERE id = ?',
    [id]
  );
}
