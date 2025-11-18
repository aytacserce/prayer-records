import React, { useState, useEffect } from "react";
import { Image, StyleSheet, View, Text, Modal, Pressable } from "react-native";
import MainButton from "../components/MainButton";
import AppSafeView from "../components/AppSafeView";
import { s } from "react-native-size-matters";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, format } from "date-fns";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import WheelPickerExpo from "react-native-wheel-picker-expo";

const PRAYERS = [
  { key: "dawn", label: "dawn" },
  { key: "noon", label: "noon" },
  { key: "afternoon", label: "afternoon" },
  { key: "sunset", label: "sunset" },
  { key: "night", label: "night" },
];

const HomeScreen = () => {
  const { t } = useTranslation();

  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
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

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  const [currentLang, setCurrentLang] = useState(i18n.language || "en");

  // --- Initialize anonymous user ---
  useEffect(() => {
    const initUser = async () => {
      let id = await AsyncStorage.getItem("userId");
      if (!id) {
        id = uuidv4();
        await AsyncStorage.setItem("userId", id);
      }
      setUserId(id);
      setLoadingUser(false);
    };
    initUser();
  }, []);

  useEffect(() => {
    const loadLanguage = async () => {
      const savedLang = await AsyncStorage.getItem("language");
      if (savedLang) {
        i18n.changeLanguage(savedLang);
        setCurrentLang(savedLang);
      }
    };
    loadLanguage();
  }, []);

  // --- Fetch today's prayers ---
  useEffect(() => {
    if (!userId) return;
    const fetchToday = async () => {
      try {
        const docRef = doc(db, userId, dateStr);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setTodayPrayers(docSnap.data());
        else setTodayPrayers({});
      } catch (error: any) {
        console.error("Failed to fetch today's prayers:", error.message);
      }
    };
    fetchToday();
  }, [userId]);

  // --- Update prayer doc ---
  const updatePrayer = async (
    field: string,
    value: any,
    customDate?: string
  ) => {
    if (!userId) return;
    const docDate = customDate || dateStr;
    try {
      const docRef = doc(db, userId, docDate);
      await setDoc(docRef, { [field]: value }, { merge: true });
      if (!customDate || customDate === dateStr) {
        setTodayPrayers((prev) => ({ ...prev, [field]: value }));
      }
    } catch (error: any) {
      console.error("❌ Failed to update prayer:", error.message);
    }
  };

  // --- Find last unmarked date ---
  const findLastUnmarkedDate = async (prayerKey: string) => {
    if (!userId) return dateStr;
    let checkDate = addDays(today, -1);
    while (true) {
      const dateString = format(checkDate, "yyyy-MM-dd");
      const docRef = doc(db, userId, dateString);
      const docSnap = await getDoc(docRef);
      const data = docSnap.exists() ? docSnap.data() : {};
      if (!data[prayerKey]) return dateString;
      checkDate = addDays(checkDate, -1);
    }
  };

  // --- Handle normal prayers ---
  const handlePress = (prayerKey: string) => {
    setSelectedPrayerKey(prayerKey);
    setTypeModalVisible(true);
  };

  const handleTypeSelect = async (type: "ontime" | "makeup") => {
    setTypeModalVisible(false);
    if (!selectedPrayerKey) return;
    if (type === "ontime") {
      updatePrayer(selectedPrayerKey, "ontime");
    } else {
      setDateModalVisible(true);
    }
  };

  const handleDateOption = async (option: "today" | "last" | "choose") => {
    setDateModalVisible(false);
    if (!selectedPrayerKey) return;
    if (option === "today") updatePrayer(selectedPrayerKey, "makeup");
    else if (option === "last") {
      const lastDate = await findLastUnmarkedDate(selectedPrayerKey);
      updatePrayer(selectedPrayerKey, "makeup", lastDate);
    } else if (option === "choose") setDatePickerVisible(true);
  };

  const onDatePicked = (event: any, date?: Date) => {
    setDatePickerVisible(false);
    if (date && selectedPrayerKey) {
      const pickedStr = date.toISOString().split("T")[0];
      updatePrayer(selectedPrayerKey, "makeup", pickedStr);
    }
  };

  // --- Voluntary prayers logic ---
  const handleVoluntarySave = async () => {
    const units = parseInt(voluntaryUnits);
    if (isNaN(units) || units <= 0) return;

    // Get the current voluntary count (default 0 if none)
    const currentUnits = todayPrayers.voluntary
      ? Number(todayPrayers.voluntary)
      : 0;

    // Add the new units
    const newTotal = currentUnits + units;

    // Save the new total
    await updatePrayer("voluntary", newTotal);

    // Reset modal state
    setVoluntaryUnits("0");
    setVoluntaryModalVisible(false);
  };

  if (loadingUser || !userId) {
    return (
      <AppSafeView>
        <View style={[styles.container, { justifyContent: "center" }]}>
          <Text>Loading...</Text>
        </View>
      </AppSafeView>
    );
  }

  return (
    <AppSafeView>
      <View style={styles.container}>
        <Text style={styles.header}>{t("title")}</Text>

        <Image
          source={require("../../assets/home-image.png")}
          style={styles.image}
        />

        <View style={styles.content}>
          {PRAYERS.map((p) => (
            <MainButton key={p.key} onPress={() => handlePress(p.key)}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{ fontWeight: "bold", fontSize: s(16), color: "#333" }}
                >
                  {t(p.key)}
                </Text>
                {todayPrayers[p.key] && (
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={
                      todayPrayers[p.key] === "ontime" ? "green" : "orange"
                    }
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
            </MainButton>
          ))}

          {/* Voluntary Button */}
          <MainButton onPress={() => setVoluntaryModalVisible(true)}>
            <Text
              style={{ fontWeight: "bold", fontSize: s(16), color: "#333" }}
            >
              {t("voluntary")}
              {todayPrayers.voluntary && (
                <Text style={{ color: "#3B82F6" }}>
                  {" "}
                  ({todayPrayers.voluntary})
                </Text>
              )}
            </Text>
          </MainButton>
        </View>

        {/* ✅ Prayer Type Modal */}
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

        {/* ✅ Date Selection Modal */}
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
                <Text style={styles.modalButtonText}>{t("lastUnmarked")}</Text>
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

        {/* ✅ Voluntary Modal (wheel picker stays) */}
        <Modal transparent visible={voluntaryModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("voluntary")}</Text>
              <Text style={{ marginBottom: 10 }}>{t("enterUnits")}</Text>

              <View style={styles.inputContainer}>
                <WheelPickerExpo
                  height={150}
                  width={100}
                  initialSelectedIndex={Number(voluntaryUnits) || 0}
                  items={Array.from({ length: 21 }, (_, i) => ({
                    label: i.toString(),
                    value: i.toString(),
                  }))}
                  onChange={({ item }) => setVoluntaryUnits(item.value)}
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
  container: { flex: 1, alignItems: "center", marginTop: -20 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
  },
  image: { height: s(180), width: s(180) },
  header: { fontSize: 40, fontWeight: "bold", color: "#333" },
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
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  langSelector: {
    position: "absolute",
    top: 60,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  langButton: { flexDirection: "row", alignItems: "center" },
  flagText: { fontSize: 16, fontWeight: "600" },
});
