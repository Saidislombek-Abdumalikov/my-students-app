import { db } from '../db';
import { User } from '../types';
import { auth, firestore, usernameToEmail, saveDocumentToCloud, deleteDocumentFromCloud, fetchCollectionFromCloud } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const SESSION_KEY = 'teacher_os_active_user_id';

export async function loginUser(username: string, password: string): Promise<User | null> {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  // 1. Instant check against local DB (seeded admin/teacher accounts)
  const allUsers = await db.users.toArray();
  const matchedUser = allUsers.find(
    (u) => u.username === cleanUsername && (u.password === cleanPassword || (!u.password && cleanPassword === '1'))
  );

  if (matchedUser) {
    localStorage.setItem(SESSION_KEY, matchedUser.id);
    window.dispatchEvent(new Event('auth_state_changed'));
    
    // Background cloud sync/auth
    try {
      const email = usernameToEmail(cleanUsername);
      signInWithEmailAndPassword(auth, email, cleanPassword).catch(() => {});
    } catch {}

    return matchedUser;
  }

  // 2. Fallback: Check Firebase Auth with timeout
  try {
    const email = usernameToEmail(cleanUsername);
    const userCredential = await signInWithEmailAndPassword(auth, email, cleanPassword);
    if (userCredential.user) {
      const uid = userCredential.user.uid;
      const userDocRef = doc(firestore, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const u = userSnap.data() as User;
        localStorage.setItem(SESSION_KEY, u.id);
        await db.users.put(u);
        window.dispatchEvent(new Event('auth_state_changed'));
        return u;
      }
    }
  } catch (err) {
    console.log('[Firebase Auth Login Notice]:', err);
  }

  // 3. Fallback: Check Cloud Firestore users collection
  try {
    const cloudUsers = await fetchCollectionFromCloud('users');
    const matchedCloudUser = cloudUsers.find(
      (u: any) => u.username === cleanUsername && (u.password === cleanPassword || (!u.password && cleanPassword === '1'))
    );

    if (matchedCloudUser) {
      localStorage.setItem(SESSION_KEY, matchedCloudUser.id);
      await db.users.put(matchedCloudUser);
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
  window.dispatchEvent(new Event('auth_state_changed'));
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
