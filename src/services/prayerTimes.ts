import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";

export const PrayerTimeService = {
  fetchMonthlyTimes: async () => {
    try {
      const lat = await AsyncStorage.getItem("userLat");
      const lon = await AsyncStorage.getItem("userLon");

      if (!lat || !lon) return null;

      const now = new Date();
      const month = now.getMonth() + 1; // JS months are 0-11
      const year = now.getFullYear();

      // Aladhan API - Method 13 is Diyanet (Turkey standard)
      const url = `https://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lon}&method=13&month=${month}&year=${year}`;

      const response = await fetch(url);
      const json = await response.json();

      if (json.code === 200) {
        // We save the entire month array to storage
        await AsyncStorage.setItem(
          "monthly_timings",
          JSON.stringify(json.data)
        );
        return json.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      return null;
    }
  },

  getTodayTimes: async () => {
    try {
      const stored = await AsyncStorage.getItem("monthly_timings");
      if (!stored) {
        console.log("⚠️ No stored timings found in AsyncStorage");
        return null;
      }

      const monthlyData = JSON.parse(stored);

      // Safety check: Is monthlyData an array?
      if (!Array.isArray(monthlyData)) {
        console.log("⚠️ monthly_timings is not an array");
        return null;
      }

      const todayDay = new Date().getDate();
      const todayData = monthlyData[todayDay - 1];

      if (todayData && todayData.timings) {
        // Log this to verify the structure in your terminal
        console.log("✅ Today's Timings Raw:", todayData.timings);

        return {
          // We use split(" ")[0] to remove any "(+03)" timezone strings
          dawn: todayData.timings.Fajr.split(" ")[0],
          noon: todayData.timings.Dhuhr.split(" ")[0],
          afternoon: todayData.timings.Asr.split(" ")[0],
          sunset: todayData.timings.Maghrib.split(" ")[0],
          night: todayData.timings.Isha.split(" ")[0],
        };
      }

      console.log("⚠️ Could not find timings for day:", todayDay);
      return null;
    } catch (e) {
      console.error("❌ Error in getTodayTimes:", e);
      return null;
    }
  },
};
