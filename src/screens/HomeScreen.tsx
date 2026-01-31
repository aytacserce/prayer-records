import React, { useState, useEffect, useRef } from "react";
import {
  Image,
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
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

// --- HELPER FUNCTION ---
const getCurrentPrayerDate = (times: any) => {
  const now = new Date();
  const currentHour = now.getHours();

  if (!times || !times.dawn) {
    if (currentHour < 4) {
      return format(addDays(now, -1), "yyyy-MM-dd");
    }
    return format(now, "yyyy-MM-dd");
  }

  const currentTimeMins = now.getHours() * 60 + now.getMinutes();
  const [dawnH, dawnM] = times.dawn.split(":").map(Number);
  const dawnMins = dawnH * 60 + dawnM;

  if (currentTimeMins < dawnMins) {
    return format(addDays(now, -1), "yyyy-MM-dd");
  }

  return format(now, "yyyy-MM-dd");
};

const PulseDot = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
      ]),
    ).start();
  }, [opacity]);

  return <Animated.View style={[styles.pulseDot, { opacity: opacity }]} />;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmallDevice = SCREEN_HEIGHT < 700;

const PRAYERS = [
  { key: "dawn", label: "dawn" },
  { key: "noon", label: "noon" },
  { key: "afternoon", label: "afternoon" },
  { key: "sunset", label: "sunset" },
  { key: "night", label: "night" },
];

const HomeScreen = () => {
  const { t } = useTranslation();
  const isFocused = useIsFocused();

  // --- STATE ---
  const [todayPrayers, setTodayPrayers] = useState<{ [key: string]: any }>({});
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [cityName, setCityName] = useState<string | null>(null);

  // Modals
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [voluntaryModalVisible, setVoluntaryModalVisible] = useState(false);
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Selections
  const [voluntaryUnits, setVoluntaryUnits] = useState("0");
  const [selectedPrayerKey, setSelectedPrayerKey] = useState<string | null>(
    null,
  );
  const [pickedDate, setPickedDate] = useState<Date>(new Date());

  const confettiRef = useRef<ConfettiCannon>(null);

  // --- 1. SINGLE SOURCE OF TRUTH LOADING EFFECT ---
  useEffect(() => {
    if (isFocused) {
      const loadScreenData = async () => {
        try {
          // A. Fetch Prayer Times
          let times = await PrayerTimeService.getTodayTimes();

          if (!times) {
            await PrayerTimeService.fetchMonthlyTimes();
            times = await PrayerTimeService.getTodayTimes();
          }

          setPrayerTimes(times);

          // B. Fetch City Name
          const savedName = await AsyncStorage.getItem("userLocationName");
          setCityName(savedName);

          // C. Load Records
          const smartDate = getCurrentPrayerDate(times);
          const records = await DatabaseService.getDayRecord(smartDate);
          setTodayPrayers(records || {});

          await BackupService.runBackup();
        } catch (err) {
          console.log("❌ Error refreshing HomeScreen:", err);
        }
      };
      loadScreenData();
    }
  }, [isFocused]);

  // --- 2. TIMER ---
  useEffect(() => {
    const interval = setInterval(() => {
      setPrayerTimes((prev: any) => (prev ? { ...prev } : null));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- 3. CONFETTI ---
  useEffect(() => {
    if (milestoneVisible && confettiRef.current) {
      setTimeout(() => confettiRef?.current?.start(), 50);
    }
  }, [milestoneVisible]);

  // --- HELPERS ---
  const toMins = (str: string) => {
    if (!str) return 0;
    const [h, m] = str.split(":").map(Number);
    return h * 60 + m;
  };

  const activeKey = (() => {
    if (!prayerTimes) return null;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const d = toMins(prayerTimes.dawn);
    const n = toMins(prayerTimes.noon);
    const a = toMins(prayerTimes.afternoon);
    const s = toMins(prayerTimes.sunset);
    const i = toMins(prayerTimes.night);

    if (currentTime >= i) return "night";
    if (currentTime >= s) return "sunset";
    if (currentTime >= a) return "afternoon";
    if (currentTime >= n) return "noon";
    if (currentTime >= d) return "dawn";
    return "night";
  })();

  const getPrayerTimeColor = (prayerKey: string, timeStr: string) => {
    if (!timeStr || timeStr === "--:--") return "#9CA3AF";
    if (prayerKey === activeKey) return "#16A34A";

    // "Night" special logic: grey if before dawn (e.g. 3 AM)
    if (activeKey === "night") {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const dawnMins = toMins(prayerTimes?.dawn);
      if (currentTime < dawnMins) return "#9CA3AF";
    }

    const order = ["dawn", "noon", "afternoon", "sunset", "night"];
    const currentIndex = order.indexOf(activeKey || "");
    const thisIndex = order.indexOf(prayerKey);

    if (thisIndex < currentIndex) return "#EF4444";
    return "#9CA3AF";
  };

  // NEW: Logic to decide if we should show the PulseDot
  const shouldPulse = (prayerKey: string) => {
    if (!prayerTimes) return false;

    // Special Logic for Dawn: Stop pulsing if passed Sunrise
    if (prayerKey === "dawn") {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const sunriseMins = toMins(prayerTimes.sunrise);

      // If we are past sunrise, DO NOT pulse (even if activeKey is still 'dawn')
      if (currentTime >= sunriseMins) return false;
    }

    return true;
  };

  const checkPerfectDay = (currentData: any) => {
    const mandatoryKeys = ["dawn", "noon", "afternoon", "sunset", "night"];
    return mandatoryKeys.every((key) => currentData[key] === "ontime");
  };

  // --- ACTIONS ---
  const updatePrayerLocal = async (
    field: string,
    value: any,
    customDate?: string,
  ) => {
    const targetDate = customDate || getCurrentPrayerDate(prayerTimes);
    await DatabaseService.saveDayRecord(targetDate, { [field]: value });
    const currentlyDisplayedDate = getCurrentPrayerDate(prayerTimes);

    if (targetDate === currentlyDisplayedDate) {
      const updatedPrayers = { ...todayPrayers, [field]: value };
      setTodayPrayers(updatedPrayers);

      if (field === "night" && value === "ontime") {
        if (checkPerfectDay(updatedPrayers)) setMilestoneVisible(true);
      }
    }
    await BackupService.markDataAsDirty();
    BackupService.runBackup();
  };

  // ... (handlePress, handleTypeSelect, handleDateOption, onDatePicked, handleVoluntarySave are unchanged) ...
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
      const targetDate = getCurrentPrayerDate(prayerTimes);
      await updatePrayerLocal(selectedPrayerKey, "makeup", targetDate);
    } else if (option === "last") {
      let checkDate = addDays(new Date(), -1);
      const allData = await DatabaseService.getAllRecords();
      let foundDate = format(new Date(), "yyyy-MM-dd");
      for (let i = 0; i < 365; i++) {
        const dStr = format(checkDate, "yyyy-MM-dd");
        if (!allData[dStr]?.[selectedPrayerKey]) {
          foundDate = dStr;
          break;
        }
        checkDate = addDays(checkDate, -1);
      }
      await updatePrayerLocal(selectedPrayerKey, "makeup", foundDate);
    } else if (option === "choose") {
      setDatePickerVisible(true);
    }
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

        {cityName ? (
          <View style={styles.locationBadge}>
            <MaterialIcons name="location-on" size={s(12)} color="#666" />
            <Text style={styles.locationText}>{cityName}</Text>
          </View>
        ) : (
          <View style={{ height: s(20) }} />
        )}

        <Image
          source={require("../../assets/home-image.png")}
          style={styles.image}
          resizeMode="contain"
        />

        <View style={styles.content}>
          {PRAYERS.map((p) => {
            const hasTimes = !!prayerTimes;
            const timeStr = hasTimes ? prayerTimes[p.key] : null;
            const timeColor = getPrayerTimeColor(p.key, timeStr || "");
            const isActive = hasTimes && p.key === activeKey;

            // Pulse check logic
            const showPulse =
              isActive && !todayPrayers[p.key] && shouldPulse(p.key);

            return (
              <MainButton key={p.key} onPress={() => handlePress(p.key)}>
                <View
                  style={[
                    styles.buttonInner,
                    !hasTimes && { justifyContent: "center" },
                  ]}
                >
                  {/* Left: Label + Check */}
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

                  {/* Right: Time + Pulse */}
                  {hasTimes && (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {/* 1. Pulse Dot */}
                      {showPulse && <PulseDot />}

                      {/* 2. Logic for Displaying Time */}
                      {p.key === "dawn" ? (
                        // DAWN LAYOUT: Stacked vertically
                        <View
                          style={{
                            alignItems: "flex-end",
                            justifyContent: "center",
                          }}
                        >
                          {/* Fajr Time */}
                          <Text
                            style={[styles.timeLabel, { color: timeColor }]}
                          >
                            {timeStr}
                          </Text>
                          {/* Sunrise Time (Smaller) */}
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginTop: -2,
                            }}
                          >
                            <MaterialIcons
                              name="wb-sunny"
                              size={s(10)}
                              color="#F59E0B"
                              style={{ marginRight: 2 }}
                            />
                            <Text
                              style={[
                                styles.timeLabel,
                                { fontSize: s(11), color: "#666" },
                              ]}
                            >
                              {prayerTimes.sunrise}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        // STANDARD LAYOUT: Single Line
                        <Text style={[styles.timeLabel, { color: timeColor }]}>
                          {timeStr}
                        </Text>
                      )}
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

        {/* --- MODALS (Unchanged) --- */}
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
        {/* Date Modal, Voluntary Modal, Celebration Modal kept same as before... */}
        {/* (I am abbreviating the repetitive modal code here to save space, paste your existing modals here) */}

        {/* ... Paste your previous Date/Voluntary/Confetti Modals here ... */}

        {/* 2. Date Modal */}
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

        {/* 3. Voluntary Modal */}
        <Modal transparent visible={voluntaryModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("voluntary")}</Text>
              <Text style={{ marginBottom: 10 }}>{t("enterUnits")}</Text>
              <View style={styles.inputContainer}>
                <WheelPickerExpo
                  height={s(150)}
                  width={s(120)}
                  initialSelectedIndex={Number(voluntaryUnits) || 0}
                  items={Array.from({ length: 21 }, (_, i) => ({
                    label: i.toString(),
                    value: i.toString(),
                  }))}
                  onChange={({ item }) => item && setVoluntaryUnits(item.value)}
                  renderItem={(item) => (
                    <Text
                      style={{
                        fontSize: s(24),
                        fontWeight: "bold",
                        color: "#333",
                      }}
                    >
                      {item.label}
                    </Text>
                  )}
                />
              </View>
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

        {/* 4. Celebration Modal */}
        <Modal transparent visible={milestoneVisible} animationType="slide">
          <View style={styles.modalOverlay}>
            <ConfettiCannon
              ref={confettiRef}
              count={200}
              origin={{ x: -10, y: 0 }}
              autoStart={false}
              fadeOut={true}
              fallSpeed={3000}
              colors={["#FFD700", "#10B981", "#3B82F6", "#F59E0B"]}
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

// Styles remain exactly the same as before
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", marginTop: s(-25) },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: s(12),
    paddingVertical: s(4),
    borderRadius: s(15),
    marginTop: s(4),
    alignSelf: "center",
  },
  locationText: {
    fontSize: s(11),
    color: "#666",
    fontWeight: "bold",
    marginLeft: s(3),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  header: {
    fontSize: isSmallDevice ? 36 : 40,
    fontWeight: "bold",
    color: "#333",
  },
  image: {
    height: isSmallDevice ? s(130) : s(180),
    width: isSmallDevice ? s(130) : s(180),
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    width: "100%",
    paddingBottom: s(10),
  },
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
    fontVariant: ["tabular-nums"],
  },
  pulseDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: "#EF4444",
    marginRight: s(8),
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
