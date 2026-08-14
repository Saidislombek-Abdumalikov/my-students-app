import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection, onSnapshot, QuerySnapshot, DocumentData, FirestoreError } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Your live Firebase Project Config (my-students-app-df447)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCVnhueiEcqJmnmppfagsOmodl0iDu_j2s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "my-students-app-df447.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "my-students-app-df447",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "my-students-app-df447.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "246898505613",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:246898505613:web:2a080aadd3556988962fc4"
};

// Initialize Firebase App & Services
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const auth = getAuth(app);

/**
 * Maps a username (e.g. "1", "english", "math") to an internal email format
 */
export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${clean || 'user'}@teacher-os.internal`;
}

/**
 * Real-time Firestore Collection Listener
 */
export function subscribeToFirestoreCollection<T = any>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(firestore, collectionName);
  return onSnapshot(
    colRef,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as T[];
      onData(items);
    },
    (err: FirestoreError) => {
      console.warn(`[Firestore Realtime Error] '${collectionName}':`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Direct Document Saver (Cloud Firestore)
 */
export async function saveDocumentToCloud(collectionName: string, id: string, data: any): Promise<boolean> {
  try {
    const docRef = doc(firestore, collectionName, String(id));
    await setDoc(docRef, { ...data, id: String(id), updatedAtCloud: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.error(`[Firestore Save Error] '${collectionName}/${id}':`, err);
    return false;
  }
}

/**
 * Direct Document Deleter (Cloud Firestore)
 */
export async function deleteDocumentFromCloud(collectionName: string, id: string): Promise<boolean> {
  try {
    const docRef = doc(firestore, collectionName, String(id));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`[Firestore Delete Error] '${collectionName}/${id}':`, err);
    return false;
  }
}

/**
 * Cloud Sync Utility: Pushes items to Cloud Firestore
 */
export async function syncCollectionToCloud(collectionName: string, items: any[]): Promise<boolean> {
  try {
    for (const item of items) {
      if (item && item.id) {
        await saveDocumentToCloud(collectionName, String(item.id), item);
      }
    }
    console.log(`[Firebase Firestore] ${items.length} items synced to collection '${collectionName}'`);
    return true;
  } catch (err) {
    console.warn(`[Firebase Firestore Sync Notice]`, err);
    return false;
  }
}

/**
 * Cloud Fetch Utility: Pulls documents from Cloud Firestore collection
 */
export async function fetchCollectionFromCloud(collectionName: string): Promise<any[]> {
  try {
    const colRef = collection(firestore, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn(`[Firebase Firestore Fetch Notice]`, err);
    return [];
  }
}

