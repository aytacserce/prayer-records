import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "user_prayer_records";

export interface DailyPrayer {
  dawn?: "ontime" | "makeup";
  noon?: "ontime" | "makeup";
  afternoon?: "ontime" | "makeup";
  sunset?: "ontime" | "makeup";
  night?: "ontime" | "makeup";
  voluntary?: number;
  [key: string]: any;
}

export const DatabaseService = {
  // Save or Update a day
  saveDayRecord: async (date: string, newData: Partial<DailyPrayer>) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const allData = raw ? JSON.parse(raw) : {};

      // Merge new data into existing date record
      allData[date] = { ...(allData[date] || {}), ...newData };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } catch (e) {
      console.error("Local Save Error:", e);
    }
  },

  // Get data for a specific day
  getDayRecord: async (date: string): Promise<DailyPrayer | null> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const allData = JSON.parse(raw);
      return allData[date] || null;
    } catch (e) {
      return null;
    }
  },

  // Get all records (used for "Find Last Unmarked")
  getAllRecords: async (): Promise<Record<string, DailyPrayer>> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  },
};
