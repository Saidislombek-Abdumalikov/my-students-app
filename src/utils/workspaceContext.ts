/**
 * Workspace Focus Context Utilities for Teacher OS.
 * Manages the active group workspace state in localStorage.
 */

const KEY = 'teacher_os_active_workspace_group';

export function getFocusedGroupId(): string | null {
  return localStorage.getItem(KEY);
}

export function setFocusedGroupId(groupId: string): void {
  if (groupId) {
    localStorage.setItem(KEY, groupId);
    window.dispatchEvent(new Event('workspace_group_changed'));
  }
}

export function clearFocusedGroupId(): void {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('workspace_group_changed'));
}
