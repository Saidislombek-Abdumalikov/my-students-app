import { db } from '../db';
import { User } from '../types';
import { syncCollectionToCloud } from './firebase';

const SESSION_KEY = 'teacher_os_active_user_id';

export async function loginUser(username: string, password: string): Promise<User | null> {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  // Find user by username
  const allUsers = await db.users.toArray();
  const matchedUser = allUsers.find(
    (u) => u.username === cleanUsername && (u.password === cleanPassword || (!u.password && cleanPassword === '1'))
  );

  if (matchedUser) {
    localStorage.setItem(SESSION_KEY, matchedUser.id);
    window.dispatchEvent(new Event('auth_state_changed'));
    return matchedUser;
  }

  return null;
}

export function logoutUser(): void {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('auth_state_changed'));
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) return null;

  const user = await db.users.get(userId);
  return user || null;
}

export async function saveUser(user: User): Promise<void> {
  await db.users.put(user);
  const allUsers = await db.users.toArray();
  syncCollectionToCloud('users', allUsers).catch(console.error);
  window.dispatchEvent(new Event('auth_state_changed'));
}

export async function deleteUser(userId: string): Promise<void> {
  await db.users.delete(userId);
  const allUsers = await db.users.toArray();
  syncCollectionToCloud('users', allUsers).catch(console.error);
  window.dispatchEvent(new Event('auth_state_changed'));
}
