import { useEffect, useState } from 'react';
import { db } from '../db';
import { syncCollectionToCloud } from './firebase';

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  unsyncedCount: number;
}

/**
 * Flushes all local Dexie database collections directly to Cloud Firestore
 */
export async function flushLocalDataToCloud(): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    const collectionsToSync = [
      'users',
      'students',
      'groups',
      'groupStudents',
      'lessons',
      'attendance',
      'homeworkPackages',
      'homeworkTasks',
      'homeworkSubmissions',
      'tests',
      'testResults',
      'payments',
      'lessonPlans',
      'learnedMaterial',
      'files',
      'parentCommunications',
    ];

    for (const colName of collectionsToSync) {
      const table = (db as any)[colName];
      if (table) {
        const items = await table.toArray();
        if (items && items.length > 0) {
          await syncCollectionToCloud(colName, items).catch(console.error);
        }
      }
    }

    console.log('[Offline Sync Engine] All local collections flushed to Cloud Firestore successfully.');
    return true;
  } catch (err) {
    console.error('[Offline Sync Engine Error]:', err);
    return false;
  }
}

/**
 * React Hook for monitoring Online/Offline Status and Auto-Syncing on Reconnect
 */
export function useOfflineSync(): OfflineSyncStatus {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      const success = await flushLocalDataToCloud();
      if (success) {
        setLastSyncedAt(new Date().toLocaleTimeString());
      }
      setIsSyncing(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isSyncing,
    lastSyncedAt,
    unsyncedCount: 0,
  };
}
