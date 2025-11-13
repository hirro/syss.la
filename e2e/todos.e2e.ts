import { device, element, by, expect as detoxExpect } from 'detox';

describe('Todo Management', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display todo list', async () => {
    await detoxExpect(element(by.id('todo-list'))).toBeVisible();
  });

  it('should allow creating a new todo', async () => {
    // Tap the add todo button
    await element(by.id('add-todo-button')).tap();
    
    // Enter todo title
    await element(by.id('todo-title-input')).typeText('Test Todo Item');
    
    // Enter todo description
    await element(by.id('todo-description-input')).typeText('This is a test description');
    
    // Save the todo
    await element(by.id('save-todo-button')).tap();
    
    // Verify todo appears in list
    await detoxExpect(element(by.text('Test Todo Item'))).toBeVisible();
  });

  it('should allow marking todo as complete', async () => {
    // Find and tap the checkbox for the first todo
    await element(by.id('todo-checkbox-0')).tap();
    
    // Verify todo is marked as complete (visual indicator)
    await detoxExpect(element(by.id('todo-checkbox-0'))).toHaveToggleValue(true);
  });

  it('should allow editing a todo', async () => {
    // Tap on a todo item to open details
    await element(by.id('todo-item-0')).tap();
    
    // Tap edit button
    await element(by.id('edit-todo-button')).tap();
    
    // Modify the title
    await element(by.id('todo-title-input')).clearText();
    await element(by.id('todo-title-input')).typeText('Updated Todo Title');
    
    // Save changes
    await element(by.id('save-todo-button')).tap();
    
    // Verify changes are reflected
    await detoxExpect(element(by.text('Updated Todo Title'))).toBeVisible();
  });

  it('should allow deleting a todo', async () => {
    // Tap on a todo item
    await element(by.id('todo-item-0')).tap();
    
    // Tap delete button
    await element(by.id('delete-todo-button')).tap();
    
    // Confirm deletion if there's a confirmation dialog
    await element(by.text('Delete')).tap();
    
    // Verify todo is removed from list
    await detoxExpect(element(by.id('todo-item-0'))).not.toBeVisible();
  });

  it('should sync todos with GitHub', async () => {
    // Trigger manual sync
    await element(by.id('sync-button')).tap();
    
    // Wait for sync to complete
    await detoxExpect(element(by.id('sync-indicator'))).not.toBeVisible();
    
    // Verify sync success message
    await detoxExpect(element(by.text('Synced successfully'))).toBeVisible();
  });
});
