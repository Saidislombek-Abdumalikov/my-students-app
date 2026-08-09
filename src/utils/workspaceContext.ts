/**
 * Workspace & Group Context Utilities for Teacher OS.
 * Remembers selected group across pages and manages workspace focus mode.
 */

const FOCUS_KEY = 'teacher_os_active_workspace_group';
const SELECTED_KEY = 'teacher_os_selected_group';

// Focused Group Workspace (Locked Mode)
export function getFocusedGroupId(): string | null {
  return localStorage.getItem(FOCUS_KEY);
}

export function setFocusedGroupId(groupId: string): void {
  if (groupId) {
    localStorage.setItem(FOCUS_KEY, groupId);
    localStorage.setItem(SELECTED_KEY, groupId);
    window.dispatchEvent(new Event('workspace_group_changed'));
  }
}

export function clearFocusedGroupId(): void {
  localStorage.removeItem(FOCUS_KEY);
  window.dispatchEvent(new Event('workspace_group_changed'));
}

// Active Selected Group (Cross-Page Memory)
export function getSelectedGroupId(): string {
  return localStorage.getItem(SELECTED_KEY) || '';
}

export function setSelectedGroupIdMemory(groupId: string): void {
  if (groupId) {
    localStorage.setItem(SELECTED_KEY, groupId);
    window.dispatchEvent(new Event('selected_group_changed'));
  }
}
