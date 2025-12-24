import AsyncStorage from "@react-native-async-storage/async-storage";
import { DatabaseService } from "./storage";
import { auth } from "../config/firebase";

// Your custom thresholds
const AUTO_SYNC_THRESHOLD = 50;
const MANUAL_VISIBLE_THRESHOLD = 30;
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const BackupService = {
  markDataAsDirty: async () => {
    await AsyncStorage.setItem("isDirty", "true");
  },

  getSyncStatus: async () => {
    const allData = await DatabaseService.getAllRecords();

    // Count total prayer entries across all dates
    const currentCount = Object.values(allData).reduce(
      (acc: number, day: any) => acc + Object.keys(day).length,
      0
    );

    const lastCountStr = await AsyncStorage.getItem("lastSyncCount");
    const lastCount = lastCountStr ? parseInt(lastCountStr) : 0;

    // Using absolute value handles both additions and deletions
    const diff = Math.abs(currentCount - lastCount);

    const lastDateStr = await AsyncStorage.getItem("lastBackupDate");
    const lastDate = lastDateStr ? new Date(lastDateStr).getTime() : null;
    const timeDiff = lastDate ? Date.now() - lastDate : 0;

    return {
      diff,
      // 1. Auto sync happens after 7 changes
      shouldAutoSync: diff >= AUTO_SYNC_THRESHOLD,
      // 2. Manual button appears after 5 changes OR 1 week passed
      shouldShowManual:
        diff >= MANUAL_VISIBLE_THRESHOLD || timeDiff >= WEEK_IN_MS,
      currentCount,
    };
  },

  runBackup: async (force = false): Promise<boolean> => {
    const user = auth.currentUser;
    const isSubscribed = await AsyncStorage.getItem("subscribed");

    // PRODUCTION GATE: Ensure user is authenticated and is a subscriber
    if (!user || isSubscribed !== "true") {
      console.log("⏸️ Backup skipped: Auth or Subscription missing.");
      return false;
    }

    const status = await BackupService.getSyncStatus();

    // Only proceed if forced (button) or if the auto-threshold is met
    if (!force && !status.shouldAutoSync) {
      console.log(`☁️ Sync deferred. Changes: ${status.diff}`);
      return false;
    }

    try {
      const localData = await DatabaseService.getAllRecords();
      const cloudData = await BackupService.getCloudData();

      // Deep Merge to preserve records from multiple devices
      const mergedData = { ...(cloudData || {}) };
      for (const date in localData) {
        mergedData[date] = { ...(mergedData[date] || {}), ...localData[date] };
      }

      const dataString = JSON.stringify(mergedData);
      const bucket = "prayer-records-app.firebasestorage.app";
      const filePath = encodeURIComponent(`backups/${user.uid}/data.json`);
      const token = await user.getIdToken();

      // Reliable POST URL with ?name= parameter
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${filePath}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: dataString,
      });

      if (response.ok) {
        // Update baselines to "reset" the diff back to 0
        await AsyncStorage.setItem(
          "lastSyncCount",
          status.currentCount.toString()
        );
        await AsyncStorage.setItem("isDirty", "false");
        await AsyncStorage.setItem("lastBackupDate", new Date().toISOString());
        console.log("✅ CLOUD BACKUP SUCCESSFUL!");
        return true;
      } else {
        const errorText = await response.text();
        console.error(
          `❌ Cloud Backup Failed (${response.status}):`,
          errorText
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Backup Service Error:", error);
      return false;
    }
  },

  getCloudData: async (): Promise<any | null> => {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const bucket = "prayer-records-app.firebasestorage.app";
      const filePath = encodeURIComponent(`backups/${user.uid}/data.json`);
      const token = await user.getIdToken();
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${filePath}?alt=media`;

      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        return await response.json();
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  mergeCloudData: async (cloudData: any) => {
    if (!cloudData) return;
    const localData = await DatabaseService.getAllRecords();

    const mergedData = { ...cloudData };
    for (const date in localData) {
      mergedData[date] = { ...(mergedData[date] || {}), ...localData[date] };
    }

    const mergedCount = Object.values(mergedData).reduce(
      (acc: number, day: any) => acc + Object.keys(day).length,
      0
    );

    await AsyncStorage.setItem("prayer_records", JSON.stringify(mergedData));
    await AsyncStorage.setItem("lastSyncCount", mergedCount.toString());
    await AsyncStorage.setItem("isDirty", "false");
  },
};
