import React, { useState, useEffect, useRef } from "react";
import { Image, StyleSheet, View, Text, Modal, Pressable } from "react-native";
import MainButton from "../components/MainButton";
import AppSafeView from "../components/AppSafeView";
import { s } from "react-native-size-matters";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, format } from "date-fns";
import { useTranslation } from "react-i18next";
import WheelPickerExpo from "react-native-wheel-picker-expo";
import { DatabaseService } from "../services/storage";
import { BackupService } from "../services/backup";
import ConfettiCannon from "react-native-confetti-cannon";
import { PrayerTimeService } from "../services/prayerTimes";
import { useIsFocused } from "@react-navigation/native";

import { Animated, Easing } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PulseDot = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create a looping animation: Fade out -> Fade in
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.pulseDot,
        { opacity: opacity }, // Bind the animated value to style
      ]}
    />
  );
};

const PRAYERS = [
  { key: "dawn", label: "dawn" },
  { key: "noon", label: "noon" },
  { key: "afternoon", label: "afternoon" },
  { key: "sunset", label: "sunset" },
  { key: "night", label: "night" },
];

const HomeScreen = () => {
  // --- 1. ALL HOOKS FIRST (NO EXCEPTIONS) ---
  const { t } = useTranslation();

  const [todayPrayers, setTodayPrayers] = useState<{ [key: string]: any }>({});
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [voluntaryModalVisible, setVoluntaryModalVisible] = useState(false);
  const [voluntaryUnits, setVoluntaryUnits] = useState("0");
  const [selectedPrayerKey, setSelectedPrayerKey] = useState<string | null>(
    null
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date>(new Date());
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const isFocused = useIsFocused();

  // --- 2. DEFINE VARIABLES AFTER ALL HOOKS ---
  const today = new Date();
  const dateStr = format(today, "yyyy-MM-dd");

  const getCurrentPrayerDate = (times: any) => {
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd");

    // FALLBACK: If no times set, just use the calendar day
    if (!times || !times.dawn) return dateStr;

    const currentTimeMins = now.getHours() * 60 + now.getMinutes();
    const [dawnH, dawnM] = times.dawn.split(":").map(Number);
    const dawnMins = dawnH * 60 + dawnM;

    if (currentTimeMins < dawnMins) {
      return format(addDays(now, -1), "yyyy-MM-dd");
    }
    return dateStr;
  };

  const smartDate = getCurrentPrayerDate(prayerTimes);

  // --- 3. ALL EFFECTS ---
  useEffect(() => {
    const loadData = async () => {
      try {
        // Use the smartDate directly
        const data = await DatabaseService.getDayRecord(smartDate);
        setTodayPrayers(data || {});
        await BackupService.runBackup();
      } catch (err) {
        console.log("Load error:", err);
      }
    };

    if (isFocused) {
      loadData();
    }
  }, [isFocused, smartDate]);

  useEffect(() => {
    const checkStore = async () => {
      try {
        const all = await DatabaseService.getAllRecords();
        console.log("-----------------------------------------");
        console.log("📂 LOCAL STORAGE DUMP:", JSON.stringify(all, null, 2));
        console.log("-----------------------------------------");
      } catch (e) {
        console.log("Error reading storage:", e);
      }
    };
    checkStore();
  }, []);

  useEffect(() => {
    if (isFocused) {
      const load = async () => {
        const times = await PrayerTimeService.getTodayTimes();
        setPrayerTimes(times);
      };
      load();
    }
  }, [isFocused]);

  useEffect(() => {
    if (isFocused) {
      const loadScreenData = async () => {
        try {
          // 1. Fetch Prayer Times
          const times = await PrayerTimeService.getTodayTimes();
          setPrayerTimes(times);

          // 2. Fetch the City Name we just saved in Settings
          const savedName = await AsyncStorage.getItem("userLocationName");
          setCityName(savedName);

          // 3. Load Prayer Records for the Smart Date
          const targetDate = getCurrentPrayerDate(times);
          const records = await DatabaseService.getDayRecord(targetDate);
          setTodayPrayers(records || {});
        } catch (err) {
          console.log("Error refreshing HomeScreen:", err);
        }
      };
      loadScreenData();
    }
  }, [isFocused]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Adding (prev: any) solves the implicit error
      setPrayerTimes((prev: any) => (prev ? { ...prev } : null));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getActivePrayerKey = (times: any) => {
    if (!times) return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const toMins = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    const d = toMins(times.dawn);
    const n = toMins(times.noon);
    const a = toMins(times.afternoon);
    const s = toMins(times.sunset);
    const i = toMins(times.night);

    // Logic: "Which was the LAST prayer to start?"
    if (currentTime >= i) return "night"; // It's after Isha
    if (currentTime >= s) return "sunset"; // It's after Maghrib
    if (currentTime >= a) return "afternoon"; // It's after Asr
    if (currentTime >= n) return "noon"; // It's after Dhuhr (This will catch your 14:00)
    if (currentTime >= d) return "dawn"; // It's after Fajr

    return "night"; // If it's before Fajr (e.g., 4 AM), we are still in the Isha/Night window
  };

  const activeKey = getActivePrayerKey(prayerTimes);

  const getPrayerTimeColor = (prayerKey: string, timeStr: string) => {
    if (!timeStr || timeStr === "--:--") return "#9CA3AF";

    // 1. Current Active Prayer is always Green
    if (prayerKey === activeKey) return "#16A34A";

    const order = ["dawn", "noon", "afternoon", "sunset", "night"];
    const currentIndex = order.indexOf(activeKey || "");
    const thisIndex = order.indexOf(prayerKey);

    // 2. The "Night" Scenario Fix
    if (activeKey === "night") {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // Get Dawn time in minutes to see if we are in "Early Morning" or "Late Night"
      const dawnTimeStr = prayerTimes?.dawn || "00:00";
      const [dH, dM] = dawnTimeStr.split(":").map(Number);
      const dawnMins = dH * 60 + dM;

      if (currentTime < dawnMins) {
        // It's 3:00 AM: We are in the Night window, but Dawn/Noon etc. are UPCOMING today.
        return "#9CA3AF"; // Grey
      } else {
        // It's 11:00 PM: We are in the Night window, and all other prayers today are PAST.
        return "#EF4444"; // Red
      }
    }

    // 3. Standard Logic for Dawn, Noon, Afternoon, Sunset
    if (thisIndex < currentIndex) return "#EF4444"; // Red
    return "#9CA3AF"; // Grey
  };

  // 2. Trigger confetti whenever the modal opens
  useEffect(() => {
    if (milestoneVisible && confettiRef.current) {
      // Small delay to let the modal appear first
      setTimeout(() => {
        confettiRef?.current?.start();
      }, 50);
    }
  }, [milestoneVisible]);

  // Function to check if today is "Perfect"
  const checkPerfectDay = (currentData: any) => {
    const mandatoryKeys = ["dawn", "noon", "afternoon", "sunset", "night"];
    // Check if every mandatory prayer is "ontime"
    return mandatoryKeys.every((key) => currentData[key] === "ontime");
  };

  // --- 4. LOGIC FUNCTIONS ---
  const updatePrayerLocal = async (
    field: string,
    value: any,
    customDate?: string
  ) => {
    const targetDate = customDate || getCurrentPrayerDate(prayerTimes);
    await DatabaseService.saveDayRecord(targetDate, { [field]: value });
    const currentlyDisplayedDate = getCurrentPrayerDate(prayerTimes);
    if (targetDate === currentlyDisplayedDate) {
      const updatedPrayers = { ...todayPrayers, [field]: value };
      setTodayPrayers(updatedPrayers);

      // MILESTONE CHECK: Triggered when "night" is marked "ontime"
      if (field === "night" && value === "ontime") {
        if (checkPerfectDay(updatedPrayers)) {
          setMilestoneVisible(true);
        }
      }
    }
    await BackupService.markDataAsDirty();
    await BackupService.runBackup();
  };

  const findLastUnmarkedDateLocal = async (prayerKey: string) => {
    let checkDate = addDays(today, -1);
    const allData = await DatabaseService.getAllRecords();

    for (let i = 0; i < 365; i++) {
      const dateString = format(checkDate, "yyyy-MM-dd");
      const dayData = allData[dateString] || {};
      if (!dayData[prayerKey]) return dateString;
      checkDate = addDays(checkDate, -1);
    }
    return dateStr;
  };

  const handlePress = (prayerKey: string) => {
    setSelectedPrayerKey(prayerKey);
    setTypeModalVisible(true);
  };

  const handleTypeSelect = async (type: "ontime" | "makeup") => {
    setTypeModalVisible(false);
    if (!selectedPrayerKey) return;
    if (type === "ontime") {
      const targetDate = getCurrentPrayerDate(prayerTimes);
      await updatePrayerLocal(selectedPrayerKey, "ontime", targetDate);
    } else {
      setDateModalVisible(true);
    }
  };

  const handleDateOption = async (option: "today" | "last" | "choose") => {
    setDateModalVisible(false);
    if (!selectedPrayerKey) return;
    if (option === "today") {
      // Use the smart date so makeup "today" also respects the midnight gap
      const targetDate = getCurrentPrayerDate(prayerTimes);
      await updatePrayerLocal(selectedPrayerKey, "makeup", targetDate);
    } else if (option === "last") {
      const lastDate = await findLastUnmarkedDateLocal(selectedPrayerKey);
      await updatePrayerLocal(selectedPrayerKey, "makeup", lastDate);
    } else if (option === "choose") setDatePickerVisible(true);
  };

  const onDatePicked = async (event: any, date?: Date) => {
    setDatePickerVisible(false);
    if (date && selectedPrayerKey) {
      const pickedStr = format(date, "yyyy-MM-dd");
      await updatePrayerLocal(selectedPrayerKey, "makeup", pickedStr);
    }
  };

  const handleVoluntarySave = async () => {
    const units = parseInt(voluntaryUnits);
    if (isNaN(units) || units <= 0) return;
    const currentUnits = todayPrayers.voluntary
      ? Number(todayPrayers.voluntary)
      : 0;
    const newTotal = currentUnits + units;

    await updatePrayerLocal("voluntary", newTotal);
    setVoluntaryUnits("0");
    setVoluntaryModalVisible(false);
  };

  return (
    <AppSafeView>
      <View style={styles.container}>
        <Text style={styles.header}>{t("title")}</Text>

        {prayerTimes && cityName ? (
          <View style={styles.locationBadge}>
            <MaterialIcons name="location-on" size={s(12)} color="#666" />
            <Text style={styles.locationText}>{cityName}</Text>
          </View>
        ) : (
          // Tiny spacer to keep layout consistent if badge is hidden
          <View style={{ height: s(20) }} />
        )}

        <Image
          source={require("../../assets/home-image.png")}
          style={styles.image}
        />

        <View style={styles.content}>
          {PRAYERS.map((p) => {
            // 1. Logic check: Do we have valid times to show?
            const hasTimes = !!prayerTimes;
            const timeStr = hasTimes ? prayerTimes[p.key] : null;
            const timeColor = getPrayerTimeColor(p.key, timeStr || "");
            const isActive = hasTimes && p.key === activeKey;

            return (
              <MainButton key={p.key} onPress={() => handlePress(p.key)}>
                <View
                  style={[
                    styles.buttonInner,
                    !hasTimes && { justifyContent: "center" }, // Center if no times
                  ]}
                >
                  {/* Left Side (or Center) Group */}
                  <View style={styles.labelGroup}>
                    <Text style={styles.buttonLabel}>{t(p.key)}</Text>
                    {todayPrayers[p.key] && (
                      <MaterialIcons
                        name="check-circle"
                        size={s(18)}
                        color={
                          todayPrayers[p.key] === "ontime"
                            ? "#16A34A"
                            : "#F59E0B"
                        }
                        style={{ marginLeft: s(6) }}
                      />
                    )}
                  </View>

                  {/* Conditional Right Side: Only show if times are loaded */}
                  {hasTimes && (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {isActive && !todayPrayers[p.key] && <PulseDot />}
                      <Text style={[styles.timeLabel, { color: timeColor }]}>
                        {timeStr}
                      </Text>
                    </View>
                  )}
                </View>
              </MainButton>
            );
          })}

          <MainButton onPress={() => setVoluntaryModalVisible(true)}>
            <View style={[styles.buttonInner, { justifyContent: "center" }]}>
              <Text style={styles.buttonLabel}>
                {t("voluntary")}
                {todayPrayers.voluntary && (
                  <Text style={{ color: "#3B82F6" }}>
                    {" "}
                    ({todayPrayers.voluntary})
                  </Text>
                )}
              </Text>
            </View>
          </MainButton>
        </View>

        {/* Prayer Type Modal */}
        <Modal transparent visible={typeModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("prayerType")}</Text>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "green" }]}
                onPress={() => handleTypeSelect("ontime")}
              >
                <Text style={styles.modalButtonText}>{t("ontime")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "orange" }]}
                onPress={() => handleTypeSelect("makeup")}
              >
                <Text style={styles.modalButtonText}>{t("makeup")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#999" }]}
                onPress={() => setTypeModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>{t("cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Date Selection Modal */}
        <Modal transparent visible={dateModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("whenDidYouMakeup")}</Text>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#EAB308" }]}
                onPress={() => handleDateOption("today")}
              >
                <Text style={styles.modalButtonText}>{t("today")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#3B82F6" }]}
                onPress={() => handleDateOption("last")}
              >
                <Text style={styles.modalButtonText}>{t("lastOne")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#9333EA" }]}
                onPress={() => handleDateOption("choose")}
              >
                <Text style={styles.modalButtonText}>{t("chooseDate")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#999" }]}
                onPress={() => setDateModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>{t("cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Voluntary Modal */}
        <Modal transparent visible={voluntaryModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("voluntary")}</Text>
              <Text style={{ marginBottom: 10 }}>{t("enterUnits")}</Text>
              {voluntaryModalVisible && (
                <View style={styles.inputContainer}>
                  <WheelPickerExpo
                    height={s(150)}
                    width={s(120)}
                    initialSelectedIndex={Number(voluntaryUnits) || 0}
                    items={Array.from({ length: 21 }, (_, i) => ({
                      label: i.toString(),
                      value: i.toString(),
                    }))}
                    onChange={({ item }) =>
                      item && setVoluntaryUnits(item.value)
                    }
                    // Use renderItem to solve the TypeScript error and the size issue
                    renderItem={(item) => (
                      <Text
                        style={{
                          fontSize: s(24), // Large enough to fill the space
                          fontWeight: "bold",
                          color: "#333",
                        }}
                      >
                        {item.label}
                      </Text>
                    )}
                  />
                </View>
              )}
              <Pressable
                style={[styles.modalButton, { backgroundColor: "green" }]}
                onPress={handleVoluntarySave}
              >
                <Text style={styles.modalButtonText}>{t("save")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#999" }]}
                onPress={() => setVoluntaryModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>{t("cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Milestone Celebration Modal */}
        <Modal transparent visible={milestoneVisible} animationType="slide">
          <View style={styles.modalOverlay}>
            {/* Put the cannon here, absolutely positioned to cover the screen */}
            <ConfettiCannon
              ref={confettiRef}
              count={200} // Number of papers
              origin={{ x: -10, y: 0 }} // Start from top-left corner
              autoStart={false} // Wait for our signal
              fadeOut={true}
              fallSpeed={3000}
              colors={["#FFD700", "#10B981", "#3B82F6", "#F59E0B"]} // Gold, Green, Blue, Orange
            />

            <View style={[styles.modalContent, { width: 300, padding: 30 }]}>
              <View style={styles.milestoneIconContainer}>
                <MaterialIcons name="stars" size={80} color="#FFD700" />
              </View>

              <Text style={styles.milestoneTitle}>{t("perfectDayTitle")}</Text>
              <Text style={styles.milestoneText}>{t("perfectDayMsg")}</Text>

              <Pressable
                style={[
                  styles.modalButton,
                  { backgroundColor: "#10B981", marginTop: 20 },
                ]}
                onPress={() => setMilestoneVisible(false)}
              >
                <Text style={styles.modalButtonText}>{t("alhamdulillah")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {datePickerVisible && (
          <DateTimePicker
            value={pickedDate}
            mode="date"
            display="default"
            onChange={onDatePicked}
          />
        )}
      </View>
    </AppSafeView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", marginTop: -65 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    width: "100%",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6", // Subtle grey background
    paddingHorizontal: s(12),
    paddingVertical: s(4),
    borderRadius: s(15),
    marginTop: s(4),
    marginBottom: s(10),
    alignSelf: "center", // Keeps it centered under the title
  },
  locationText: {
    fontSize: s(11),
    color: "#666",
    fontWeight: "bold",
    marginLeft: s(3),
    textTransform: "uppercase", // Gives it a clean, labels-style look
    letterSpacing: 0.5,
  },
  image: { height: s(180), width: s(180) },
  header: { fontSize: 40, fontWeight: "bold", color: "#333" },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: s(15),
    minHeight: s(40),
  },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonLabel: {
    fontWeight: "700",
    fontSize: s(16),
    color: "#333",
  },
  timeLabel: {
    fontSize: s(14),
    fontWeight: "600",
    fontVariant: ["tabular-nums"], // Prevents numbers from shifting
  },
  pulseDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: "#EF4444",
    marginRight: s(8),
    // Glow effect for Android/iOS
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: 250,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalButton: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: "#eee",
    width: "100%",
    alignItems: "center",
    borderRadius: 5,
  },
  modalButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  inputContainer: {
    marginVertical: s(20),
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: s(160),
  },
  milestoneIconContainer: {
    backgroundColor: "#FEF3C7",
    padding: 15,
    borderRadius: 60,
    marginBottom: 15,
  },
  milestoneTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  milestoneText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});
