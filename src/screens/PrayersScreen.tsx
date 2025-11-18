import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { s } from "react-native-size-matters";
import { db } from "../config/firebase";
import { collection, getDocs } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  parseISO,
  subDays,
  subMonths,
  subYears,
  isAfter,
  format,
} from "date-fns";
import AppSafeView from "../components/AppSafeView";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import CardFrame from "../components/CardFrame";
import { useNavigation } from "@react-navigation/native";

type PrayerValue = "ontime" | "makeup" | number;
type PrayerData = Record<string, PrayerValue>;
type AllData = Record<string, PrayerData>;
type RangeType = "week" | "month" | null;

interface CountResult {
  ontime: number;
  makeup: number;
  voluntary: number;
}

const countPrayers = (data: AllData, startDate?: Date): CountResult => {
  let ontime = 0,
    makeup = 0,
    voluntary = 0;

  for (const [dateStr, prayers] of Object.entries(data)) {
    const date = parseISO(dateStr);
    if (startDate && !isAfter(date, startDate)) continue;

    for (const [key, value] of Object.entries(prayers)) {
      if (key === "voluntary" && typeof value === "number") {
        voluntary += value;
      } else if (value === "ontime") {
        ontime++;
      } else if (value === "makeup") {
        makeup++;
      }
    }
  }
  return { ontime, makeup, voluntary };
};

const getDetailData = (data: AllData, startDate: Date) => {
  const result: Record<string, PrayerData> = {};
  for (const [dateStr, prayers] of Object.entries(data)) {
    const date = parseISO(dateStr);
    if (isAfter(date, startDate)) {
      result[dateStr] = { ...prayers };
    }
  }
  return result;
};

const PrayersScreen: React.FC = () => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<AllData>({});
  const [selectedRange, setSelectedRange] = useState<RangeType>(null);
  const [detailData, setDetailData] = useState<Record<string, PrayerData>>({});

  const navigation = useNavigation<any>();

  const today = new Date();

  useEffect(() => {
    const initUser = async () => {
      const id = await AsyncStorage.getItem("userId");
      setUserId(id);
    };
    initUser();
  }, []);

  const goToSettings = () => {
    navigation.getParent()?.navigate("SettingsScreen");
  };

  const fetchAllData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const querySnap = await getDocs(collection(db, userId));
      const all: AllData = {};
      querySnap.forEach((docSnap) => {
        all[docSnap.id] = docSnap.data() as PrayerData;
      });
      setAllData(all);
    } catch (err) {
      console.error("❌ Error fetching prayers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userId]);

  const overall = countPrayers(allData);
  const lastYear = countPrayers(allData, subYears(today, 1));
  const lastMonth = countPrayers(allData, subMonths(today, 1));
  const lastWeek = countPrayers(allData, subDays(today, 7));

  const handleRangeSelect = (range: RangeType) => {
    if (!range) return;
    setSelectedRange(range);
    const startDate =
      range === "week" ? subDays(today, 7) : subMonths(today, 1);
    const details = getDetailData(allData, startDate);
    setDetailData(details);
  };

  if (loading) {
    return (
      <AppSafeView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>{t("loading")}</Text>
        </View>
      </AppSafeView>
    );
  }

  return (
    <AppSafeView>
      <View style={styles.screen}>
        <Text style={styles.header}>{t("myPrayers")}</Text>

        <Image
          source={require("../../assets/prayers-image.png")}
          style={styles.image}
        />

        <View style={styles.buttonsContainer}>
          <View style={styles.settingsContainer}>
            <Pressable onPress={goToSettings} style={styles.refreshButton}>
              <MaterialIcons name="settings" size={s(22)} color="#4B5563" />
            </Pressable>
            <Text style={styles.title}>{t("settings")}</Text>
          </View>
          <View style={styles.refreshContainer}>
            <Text style={styles.title}>{t("refresh")}</Text>
            <Pressable onPress={fetchAllData} style={styles.refreshButton}>
              {loading ? (
                <ActivityIndicator size="small" color="#4B5563" />
              ) : (
                <MaterialIcons name="refresh" size={s(22)} color="#4B5563" />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.cardsArea}>
          <View style={styles.cardsGrid}>
            {/* --- Overall --- */}
            <CardFrame width="48%" height="48%">
              <Text style={styles.cardTitle}>{t("overall")}</Text>
              <Text style={styles.statText}>
                ✅ {t("ontime")}: {overall.ontime}
              </Text>
              <Text style={styles.statText}>
                🟠 {t("makeup")}: {overall.makeup}
              </Text>
              <Text style={styles.statText}>
                ➕ {t("voluntary")}: {overall.voluntary}
              </Text>
            </CardFrame>

            {/* --- Last Year --- */}
            <CardFrame width="48%" height="48%">
              <Text style={styles.cardTitle}>{t("lastYear")}</Text>
              <Text style={styles.statText}>
                ✅ {t("ontime")}: {lastYear.ontime}
              </Text>
              <Text style={styles.statText}>
                🟠 {t("makeup")}: {lastYear.makeup}
              </Text>
              <Text style={styles.statText}>
                ➕ {t("voluntary")}: {lastYear.voluntary}
              </Text>
            </CardFrame>

            {/* --- Last Month --- */}
            <CardFrame
              width="48%"
              height="48%"
              onPress={() => handleRangeSelect("month")}
            >
              <Text style={styles.cardTitle}>{t("lastMonth")}</Text>

              <Text style={styles.statText}>
                ✅ {t("ontime")}: {lastMonth.ontime}
              </Text>
              <Text style={styles.statText}>
                🟠 {t("makeup")}: {lastMonth.makeup}
              </Text>
              <Text style={styles.statText}>
                ➕ {t("voluntary")}: {lastMonth.voluntary}
              </Text>

              <Text style={styles.detailsLink}>{t("seeDetails")}</Text>
            </CardFrame>

            {/* --- Last Week --- */}
            <CardFrame
              width="48%"
              height="48%"
              onPress={() => handleRangeSelect("week")}
            >
              <Text style={styles.cardTitle}>{t("lastWeek")}</Text>

              <Text style={styles.statText}>
                ✅ {t("ontime")}: {lastWeek.ontime}
              </Text>
              <Text style={styles.statText}>
                🟠 {t("makeup")}: {lastWeek.makeup}
              </Text>
              <Text style={styles.statText}>
                ➕ {t("voluntary")}: {lastWeek.voluntary}
              </Text>

              <Text style={styles.detailsLink}>{t("seeDetails")}</Text>
            </CardFrame>
          </View>
        </View>

        {/* --- Detail Modal --- */}
        <Modal transparent visible={!!selectedRange} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {selectedRange === "week"
                  ? t("lastWeekDetails")
                  : t("lastMonthDetails")}
              </Text>

              {/* Table Header */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#ccc",
                  borderBottomWidth: 1,
                  borderBottomColor: "#ccc",
                  marginBottom: s(6),
                }}
              >
                <View style={{ flexDirection: "row", paddingTop: s(4) }}>
                  <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                  {["daw", "noon", "aft", "sun", "nig"].map((p) => (
                    <Text
                      key={p}
                      style={[styles.tableCell, { fontSize: s(12) }]}
                    >
                      {t(p)}
                    </Text>
                  ))}
                </View>
                <View
                  style={[
                    styles.tableRow,
                    {
                      borderColor: "#ccc",
                      paddingBottom: s(4),
                      marginTop: s(2),
                    },
                  ]}
                >
                  <Text style={[styles.tableCell, { flex: 1 }]}>📆</Text>
                  <Text style={styles.tableCell}>🌅</Text>
                  <Text style={styles.tableCell}>☀️</Text>
                  <Text style={styles.tableCell}>🌇</Text>
                  <Text style={styles.tableCell}>🌆</Text>
                  <Text style={styles.tableCell}>🌙</Text>
                </View>
              </View>

              <ScrollView style={{ maxHeight: s(300) }}>
                {Object.entries(detailData).length === 0 ? (
                  <Text>{t("noData")}</Text>
                ) : (
                  Object.entries(detailData)
                    .sort(([a], [b]) => (parseISO(a) > parseISO(b) ? 1 : -1))
                    .map(([date, prayers]) => (
                      <View key={date} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1 }]}>
                          {format(parseISO(date), "dd/MM")}
                        </Text>
                        {["dawn", "noon", "afternoon", "sunset", "night"].map(
                          (p) => (
                            <Text key={p} style={styles.tableCell}>
                              {prayers[p] === "ontime"
                                ? "✅"
                                : prayers[p] === "makeup"
                                ? "🟠"
                                : "➖"}
                            </Text>
                          )
                        )}
                      </View>
                    ))
                )}
              </ScrollView>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#007AFF" }]}
                onPress={() => setSelectedRange(null)}
              >
                <Text style={styles.modalButtonText}>{t("close")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </AppSafeView>
  );
};

export default PrayersScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: s(16),
    paddingBottom: s(12),
  },
  header: { fontSize: 40, fontWeight: "bold", color: "#333", marginTop: -20 },
  image: { height: s(180), width: s(180) },
  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: s(-16),
  },
  settingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "50%",
  },
  refreshContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "50%",
  },
  title: {
    fontSize: s(18),
    fontWeight: "bold",
    color: "#2C2C2C",
  },
  refreshButton: {
    marginLeft: s(8),
    marginRight: s(8),
    padding: s(4),
    borderRadius: s(8),
    backgroundColor: "rgba(217, 229, 178, 0.7)",
  },
  cardsArea: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "space-between",
    width: "100%",
    height: "100%",
    paddingHorizontal: s(4),
  },
  detailsLink: {
    color: "#007AFF",
    textAlign: "center",
    marginTop: s(6),
    fontWeight: "600",
    fontSize: s(14),
  },
  cardTitle: {
    flex: 0,
    fontSize: s(18),
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  statText: {
    fontSize: s(16),
    color: "#333",
    marginVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: s(10),
    padding: s(16),
    width: "80%",
    maxHeight: "70%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: s(18),
    fontWeight: "bold",
    marginBottom: s(10),
  },
  modalButton: {
    paddingVertical: s(10),
    paddingHorizontal: s(20),
    borderRadius: s(8),
    marginTop: s(10),
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: s(2),
    width: "100%",
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
    fontSize: s(14),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
