import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';

// Your live Firebase Project Config (my-students-app-df447)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCVnhueiEcqJmnmppfagsOmodl0iDu_j2s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "my-students-app-df447.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "my-students-app-df447",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "my-students-app-df447.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "246898505613",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:246898505613:web:2a080aadd3556988962fc4"
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

/**
 * Cloud Sync Utility: Pushes local IndexedDB items to Cloud Firestore
 */
export async function syncCollectionToCloud(collectionName: string, items: any[]): Promise<boolean> {
  try {
    for (const item of items) {
      if (item && item.id) {
        const ref = doc(firestore, collectionName, String(item.id));
        await setDoc(ref, { ...item, updatedAtCloud: new Date().toISOString() }, { merge: true });
      }
    }
    console.log(`[Firebase Firestore] ${items.length} items synced to collection '${collectionName}'`);
    return true;
  } catch (err) {
    console.warn(`[Firebase Firestore Offline Mode] Using local IndexedDB storage.`, err);
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
    const items = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    console.log(`[Firebase Firestore] Pulled ${items.length} items from collection '${collectionName}'`);
    return items;
  } catch (err) {
    console.warn(`[Firebase Firestore Fetch Notice] Using local cache.`, err);
    return [];
  }
}
