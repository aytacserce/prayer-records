import AsyncStorage from "@react-native-async-storage/async-storage";

export const PrayerTimeService = {
  fetchMonthlyTimes: async () => {
    try {
      const lat = await AsyncStorage.getItem("userLat");
      const lon = await AsyncStorage.getItem("userLon");

      if (!lat || !lon) return null;

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Aladhan API - Method 13 (Diyanet)
      const url = `https://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lon}&method=13&month=${month}&year=${year}`;

      const response = await fetch(url);
      const json = await response.json();

      if (json.code === 200) {
        // FIX: Store an object containing the Month/Year tag AND the data
        const storagePayload = {
          month: month,
          year: year,
          data: json.data,
        };

        await AsyncStorage.setItem(
          "monthly_timings",
          JSON.stringify(storagePayload),
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
      if (!stored) return null;

      const parsedStorage = JSON.parse(stored);

      // FIX: Check if the stored data matches the CURRENT month/year
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // If the stored data is from an old month (e.g., Dec 2025 vs Jan 2026)
      if (
        parsedStorage.month !== currentMonth ||
        parsedStorage.year !== currentYear
      ) {
        console.log(
          "⚠️ Stored data is stale (wrong month). Triggering refetch...",
        );
        // Option A: Return null to force your UI to trigger a fetch
        return null;

        // Option B: You could call fetchMonthlyTimes() here directly,
        // but it's usually safer to return null and let the UI handle the loading state.
      }

      const monthlyData = parsedStorage.data;

      if (!Array.isArray(monthlyData)) return null;

      const todayDay = now.getDate();
      const todayData = monthlyData[todayDay - 1];

      if (todayData && todayData.timings) {
        return {
          dawn: todayData.timings.Fajr.split(" ")[0],
          sunrise: todayData.timings.Sunrise.split(" ")[0],
          noon: todayData.timings.Dhuhr.split(" ")[0],
          afternoon: todayData.timings.Asr.split(" ")[0],
          sunset: todayData.timings.Maghrib.split(" ")[0],
          night: todayData.timings.Isha.split(" ")[0],
        };
      }

      return null;
    } catch (e) {
      console.error("❌ Error in getTodayTimes:", e);
      return null;
    }
  },
};
