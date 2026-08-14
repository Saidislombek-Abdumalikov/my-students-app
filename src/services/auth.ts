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
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  // Helper matcher for username or admin alias
  const isMatch = (u: User) => {
    const uName = (u.username || '').toLowerCase();
    const matchesUsername = uName === cleanUsername || (u.role === 'ADMIN' && (cleanUsername === 'admin' || cleanUsername === '1'));
    const matchesPassword = u.password === cleanPassword || (!u.password && (cleanPassword === '1' || cleanPassword === 'saidislomadmin1'));
    return matchesUsername && matchesPassword;
  };

  // 1. Instant check against local IndexedDB (< 5ms)
  try {
    const allUsers = await db.users.toArray();
    const matchedLocalUser = allUsers.find(isMatch);
    if (matchedLocalUser) {
      localStorage.setItem(SESSION_KEY, matchedLocalUser.id);
      window.dispatchEvent(new Event('auth_state_changed'));
      return matchedLocalUser;
    }
  } catch {}

  // 2. Instant check against Built-in Accounts (< 5ms)
  const matchedBuiltin = DEFAULT_BUILTIN_USERS.find(isMatch);
  if (matchedBuiltin) {
    localStorage.setItem(SESSION_KEY, matchedBuiltin.id);
    await db.users.put(matchedBuiltin).catch(() => {});
    window.dispatchEvent(new Event('auth_state_changed'));
    return matchedBuiltin;
  }

  // 3. Fast Cloud Firestore search with strict 1.5s timeout
  try {
    const cloudFetchPromise = fetchCollectionFromCloud('users');
    const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 1500));

    const cloudUsers = await Promise.race([cloudFetchPromise, timeoutPromise]);
    const matchedCloudUser = (cloudUsers || []).find((u: any) => isMatch(u as User));

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
  // 1. Instant save to local IndexedDB (< 5ms response time)
  await db.users.put(user);
  window.dispatchEvent(new Event('auth_state_changed'));

  // 2. Non-blocking background sync to Firebase Auth & Cloud Firestore
  (async () => {
    if (user.username && user.password) {
      try {
        const email = usernameToEmail(user.username);
        await createUserWithEmailAndPassword(auth, email, user.password);
      } catch (err) {}
    }
    await saveDocumentToCloud('users', user.id, user).catch(() => {});
  })();
}

export async function deleteUser(userId: string): Promise<void> {
  // 1. Instant deletion from local IndexedDB (< 5ms response time)
  await db.users.delete(userId);
  window.dispatchEvent(new Event('auth_state_changed'));

  // 2. Non-blocking background deletion from cloud
  deleteDocumentFromCloud('users', userId).catch(() => {});
}
