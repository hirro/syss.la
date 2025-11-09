import { getActiveTodos, getCompletedTodos, insertTodo, updateTodo, clearAllTodos } from '@/lib/db/todos';
import { fetchTodosFromGitHub, pushTodosToGitHub, type SyncConfig } from './github/storage';
import type { Todo } from '@/types/todo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncTimeDataToGitHub } from './time-sync';

const SYNC_CONFIG_KEY = 'sync_config';

export async function getSyncConfig(): Promise<SyncConfig | null> {
  try {
    console.log('📖 Reading sync config from storage...');
    const config = await AsyncStorage.getItem(SYNC_CONFIG_KEY);
    if (config) {
      const parsed = JSON.parse(config);
      console.log('✅ Sync config loaded:', parsed);
      return parsed;
    } else {
      console.log('⚠️ No sync config found');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to get sync config:', error);
    return null;
  }
}

export async function setSyncConfig(config: SyncConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to set sync config:', error);
    throw error;
  }
}

export async function syncTodosToGitHub(): Promise<void> {
  const config = await getSyncConfig();
  if (!config) {
    throw new Error('Sync configuration not set. Please configure your GitHub repository.');
  }

  // Get all todos (active and completed) from local database
  const activeTodos = await getActiveTodos();
  const completedTodos = await getCompletedTodos();
  const allTodos = [...activeTodos, ...completedTodos];

  console.log(`Syncing ${activeTodos.length} active and ${completedTodos.length} completed todos`);

  // Push to GitHub (function will separate them)
  await pushTodosToGitHub(config, allTodos);
}

export async function syncTodosFromGitHub(): Promise<void> {
  const config = await getSyncConfig();
  if (!config) {
    throw new Error('Sync configuration not set. Please configure your GitHub repository.');
  }

  // Fetch from GitHub
  const remoteTodos = await fetchTodosFromGitHub(config);

  // Get local todos
  const localTodos = await getActiveTodos();

  // Merge: GitHub is source of truth for now (simple strategy)
  // Create a map of local todos by ID
  const localTodoMap = new Map(localTodos.map((t) => [t.id, t]));

  // Update or insert todos from GitHub
  for (const remoteTodo of remoteTodos) {
    const localTodo = localTodoMap.get(remoteTodo.id);
    
    if (localTodo) {
      // Update if remote is newer
      const remoteDate = new Date(remoteTodo.updatedAt || remoteTodo.createdAt);
      const localDate = new Date(localTodo.updatedAt || localTodo.createdAt);
      
      if (remoteDate > localDate) {
        await updateTodo(remoteTodo);
      }
    } else {
      // Insert new todo from GitHub
      await insertTodo(remoteTodo);
    }
  }
}

export async function fullSync(): Promise<void> {
  console.log('🔄 fullSync() started');
  
  const config = await getSyncConfig();
  if (!config) {
    console.log('❌ No sync config found');
    throw new Error('Sync configuration not set. Please configure your GitHub repository.');
  }

  console.log('📍 Sync config:', config);

  // 1. Fetch from GitHub (may be empty if file doesn't exist yet)
  console.log('📥 Fetching todos from GitHub...');
  const remoteTodos = await fetchTodosFromGitHub(config);
  console.log(`✅ Fetched ${remoteTodos.length} todos from GitHub`);
  
  // 2. Get local todos (both active and completed)
  console.log('📖 Reading local todos from database...');
  const localActiveTodos = await getActiveTodos();
  const localCompletedTodos = await getCompletedTodos();
  const localTodos = [...localActiveTodos, ...localCompletedTodos];
  console.log(`✅ Found ${localActiveTodos.length} active and ${localCompletedTodos.length} completed local todos`);

  // 3. Merge strategy: Combine both, preferring newer updates
  console.log('🔀 Merging local and remote todos...');
  const todoMap = new Map<string, Todo>();

  // Add all local todos
  for (const todo of localTodos) {
    todoMap.set(todo.id, todo);
    if (todo.completedAt) {
      console.log(`📝 Local completed todo: ${todo.id} (completed: ${todo.completedAt})`);
    }
  }
  console.log(`📝 Added ${localTodos.length} local todos to merge map`);

  // Merge with remote todos
  let remoteWins = 0;
  let newFromRemote = 0;
  let localCompletedWins = 0;
  
  for (const remoteTodo of remoteTodos) {
    const existing = todoMap.get(remoteTodo.id);
    
    if (!existing) {
      todoMap.set(remoteTodo.id, remoteTodo);
      newFromRemote++;
    } else {
      // If local has completedAt but remote doesn't, local wins (just completed)
      if (existing.completedAt && !remoteTodo.completedAt) {
        console.log(`✅ Local completed version wins for: ${existing.id}`);
        localCompletedWins++;
        // Keep existing (local) version
      } else {
        // Compare timestamps
        const remoteDate = new Date(remoteTodo.updatedAt || remoteTodo.createdAt);
        const localDate = new Date(existing.updatedAt || existing.createdAt);
        
        if (remoteDate >= localDate) {
          todoMap.set(remoteTodo.id, remoteTodo);
          remoteWins++;
        }
      }
    }
  }
  
  console.log(`✅ Merge complete: ${newFromRemote} new from remote, ${remoteWins} remote updates won, ${localCompletedWins} local completed won`);

  const mergedTodos = Array.from(todoMap.values());
  console.log(`📊 Total merged todos: ${mergedTodos.length}`);

  // 4. Update local database
  console.log('💾 Updating local database...');
  await clearAllTodos();
  for (const todo of mergedTodos) {
    await insertTodo(todo);
  }
  console.log('✅ Local database updated');

  // 5. Push merged result back to GitHub (only if we have todos)
  if (mergedTodos.length > 0) {
    console.log(`📤 Pushing ${mergedTodos.length} todos to GitHub...`);
    await pushTodosToGitHub(config, mergedTodos);
    console.log('✅ Todos pushed to GitHub');
  } else {
    console.log('⚠️ No todos to sync to GitHub');
  }
  
  console.log('🎉 fullSync() completed successfully');
}

/**
 * Sync all data (todos + time data) to GitHub
 */
export async function syncAllDataToGitHub(): Promise<void> {
  console.log('🔄 Starting full data sync to GitHub...');
  
  try {
    // Sync todos
    await syncTodosToGitHub();
    
    // Sync time data
    await syncTimeDataToGitHub();
    
    console.log('✅ All data synced to GitHub successfully');
  } catch (error) {
    console.error('❌ Failed to sync all data:', error);
    throw error;
  }
}
