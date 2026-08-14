import { db } from '../db';
import { User } from '../types';
import { auth, firestore, usernameToEmail, saveDocumentToCloud, deleteDocumentFromCloud, fetchCollectionFromCloud } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const SESSION_KEY = 'teacher_os_active_user_id';

const DEFAULT_BUILTIN_USERS: User[] = [
  {
    id: 'admin-1',
    username: '1',
    password: 'saidislomadmin1',
    email: 'admin@learningcenter.com',
    fullName: 'Administrator',
    role: 'ADMIN',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't-1',
    username: 'english',
    password: '1',
    email: 'english@learningcenter.com',
    fullName: "Ingliz tili o'qituvchisi",
    role: 'TEACHER',
    subject: 'English',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't-math',
    username: 'math',
    password: '1',
    email: 'math@learningcenter.com',
    fullName: "Matematika o'qituvchisi",
    role: 'TEACHER',
    subject: 'Math',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export async function loginUser(username: string, password: string): Promise<User | null> {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  // 1. Instant check against local IndexedDB (< 5ms response time)
  let allUsers: User[] = [];
  try {
    allUsers = await db.users.toArray();
  } catch {}

  const matchedLocalUser = allUsers.find(
    (u) => u.username === cleanUsername && (u.password === cleanPassword || (!u.password && cleanPassword === '1'))
  );

  if (matchedLocalUser) {
    localStorage.setItem(SESSION_KEY, matchedLocalUser.id);
    window.dispatchEvent(new Event('auth_state_changed'));
    return matchedLocalUser;
  }

  // 2. Instant check against Built-in Accounts (< 5ms response time)
  const matchedBuiltin = DEFAULT_BUILTIN_USERS.find(
    (u) => u.username === cleanUsername && u.password === cleanPassword
  );

  if (matchedBuiltin) {
    localStorage.setItem(SESSION_KEY, matchedBuiltin.id);
    await db.users.put(matchedBuiltin).catch(() => {});
    window.dispatchEvent(new Event('auth_state_changed'));
    return matchedBuiltin;
  }

  // 3. Fallback: Fast Cloud Firestore search
  try {
    const cloudUsers = await fetchCollectionFromCloud('users');
    const matchedCloudUser = cloudUsers.find(
      (u: any) => u.username === cleanUsername && (u.password === cleanPassword || (!u.password && cleanPassword === '1'))
    );

    if (matchedCloudUser) {
      localStorage.setItem(SESSION_KEY, matchedCloudUser.id);
      await db.users.put(matchedCloudUser).catch(() => {});
      window.dispatchEvent(new Event('auth_state_changed'));
      return matchedCloudUser;
    }
  } catch (err) {
    console.error('[Firestore Login Error]:', err);
  }

  return null;
}

export function logoutUser(): void {
  signOut(auth).catch(() => {});
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('teacher_os_focused_group_id');
  localStorage.removeItem('teacher_os_selected_group_id');
  window.dispatchEvent(new Event('auth_state_changed'));
  window.dispatchEvent(new Event('workspace_group_changed'));
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) return null;

  // Instant response from local DB so UI never hangs
  const localUser = await db.users.get(userId);
  if (localUser) return localUser;

  // Fallback to cloud if not found locally
  try {
    const userDocRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const u = userSnap.data() as User;
      await db.users.put(u);
      return u;
    }
  } catch (err) {
    console.warn('[Firestore User Fetch Notice]:', err);
  }

  return null;
}

export async function saveUser(user: User): Promise<void> {
  // Create user in Firebase Auth if it doesn't exist
  if (user.username && user.password) {
    try {
      const email = usernameToEmail(user.username);
      await createUserWithEmailAndPassword(auth, email, user.password);
    } catch (err) {
      console.log('[Firebase User Creation Notice]:', err);
    }
  }

  await db.users.put(user);
  await saveDocumentToCloud('users', user.id, user);
  window.dispatchEvent(new Event('auth_state_changed'));
}

export async function deleteUser(userId: string): Promise<void> {
  await db.users.delete(userId);
  await deleteDocumentFromCloud('users', userId);
  window.dispatchEvent(new Event('auth_state_changed'));
}
