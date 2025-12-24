import React, { useState, useCallback } from "react";
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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { DatabaseService } from "../services/storage"; // Import the local service

type PrayerValue = "ontime" | "makeup" | number;
type PrayerData = Record<string, PrayerValue>;
type AllData = Record<string, PrayerData>;
type RangeType = "week" | "month" | null;

interface CountResult {
  ontime: number;
  makeup: number;
  voluntary: number;
}

// Helper logic stays the same but processes local JSON
const countPrayers = (data: AllData, startDate?: Date): CountResult => {
  let ontime = 0,
    makeup = 0,
    voluntary = 0;
  for (const [dateStr, prayers] of Object.entries(data)) {
    const date = parseISO(dateStr);
    if (startDate && !isAfter(date, startDate)) continue;
    for (const [key, value] of Object.entries(prayers)) {
      if (key === "voluntary" && typeof value === "number") voluntary += value;
      else if (value === "ontime") ontime++;
      else if (value === "makeup") makeup++;
    }
  }
  return { ontime, makeup, voluntary };
};

const getDetailData = (data: AllData, startDate: Date) => {
  const result: Record<string, PrayerData> = {};
  for (const [dateStr, prayers] of Object.entries(data)) {
    const date = parseISO(dateStr);
    if (isAfter(date, startDate)) result[dateStr] = { ...prayers };
  }
  return result;
};

const PrayersScreen: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<AllData>({});
  const [selectedRange, setSelectedRange] = useState<RangeType>(null);
  const [detailData, setDetailData] = useState<Record<string, PrayerData>>({});

  const navigation = useNavigation<any>();
  const today = new Date();

  // useFocusEffect refreshes stats every time you open this tab
  useFocusEffect(
    useCallback(() => {
      const loadLocalData = async () => {
        setLoading(true);
        const data = await DatabaseService.getAllRecords();
        setAllData(data || {});
        setLoading(false);
      };
      loadLocalData();
    }, [])
  );

  const goToSettings = () => {
    navigation.getParent()?.navigate("SettingsScreen");
  };

  const overall = countPrayers(allData);
  const lastYear = countPrayers(allData, subYears(today, 1));
  const lastMonth = countPrayers(allData, subMonths(today, 1));
  const lastWeek = countPrayers(allData, subDays(today, 7));

  const handleRangeSelect = (range: RangeType) => {
    if (!range) return;
    setSelectedRange(range);
    const startDate =
      range === "week" ? subDays(today, 7) : subMonths(today, 1);
    setDetailData(getDetailData(allData, startDate));
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

  const StatRow = ({
    icon,
    label,
    value,
  }: {
    icon: string;
    label: string;
    value: number | string;
  }) => (
    <View style={styles.statRow}>
      <Text style={styles.iconCell}>{icon}</Text>
      <Text style={styles.labelCell}>{label}:</Text>
      <Text style={styles.valueCell}>{value}</Text>
    </View>
  );

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
            <Pressable onPress={goToSettings} style={styles.settingsButton}>
              <MaterialIcons name="settings" size={s(22)} color="#4B5563" />
            </Pressable>
          </View>
        </View>

        <View style={styles.cardsArea}>
          <View style={styles.cardsGrid}>
            {/* --- Overall --- */}
            <CardFrame width="48%" height="48%">
              <Text style={styles.cardTitle}>{t("overall")}</Text>
              <View style={styles.statsContainer}>
                <StatRow icon="✅" label={t("ontime")} value={overall.ontime} />
                <StatRow icon="🟠" label={t("makeup")} value={overall.makeup} />
                <StatRow
                  icon="➕"
                  label={t("voluntary")}
                  value={overall.voluntary}
                />
              </View>
            </CardFrame>

            {/* --- Last Year --- */}
            <CardFrame width="48%" height="48%">
              <Text style={styles.cardTitle}>{t("lastYear")}</Text>
              <View style={styles.statsContainer}>
                <StatRow
                  icon="✅"
                  label={t("ontime")}
                  value={lastYear.ontime}
                />
                <StatRow
                  icon="🟠"
                  label={t("makeup")}
                  value={lastYear.makeup}
                />
                <StatRow
                  icon="➕"
                  label={t("voluntary")}
                  value={lastYear.voluntary}
                />
              </View>
            </CardFrame>

            {/* --- Last Month --- */}
            <CardFrame
              width="48%"
              height="48%"
              onPress={() => handleRangeSelect("month")}
            >
              <Text style={styles.cardTitle}>{t("lastMonth")}</Text>
              <View style={styles.statsContainer}>
                <StatRow
                  icon="✅"
                  label={t("ontime")}
                  value={lastMonth.ontime}
                />
                <StatRow
                  icon="🟠"
                  label={t("makeup")}
                  value={lastMonth.makeup}
                />
                <StatRow
                  icon="➕"
                  label={t("voluntary")}
                  value={lastMonth.voluntary}
                />
              </View>
              <Text style={styles.detailsLink}>{t("seeDetails")}</Text>
            </CardFrame>

            {/* --- Last Week --- */}
            <CardFrame
              width="48%"
              height="48%"
              onPress={() => handleRangeSelect("week")}
            >
              <Text style={styles.cardTitle}>{t("lastWeek")}</Text>
              <View style={styles.statsContainer}>
                <StatRow
                  icon="✅"
                  label={t("ontime")}
                  value={lastWeek.ontime}
                />
                <StatRow
                  icon="🟠"
                  label={t("makeup")}
                  value={lastWeek.makeup}
                />
                <StatRow
                  icon="➕"
                  label={t("voluntary")}
                  value={lastWeek.voluntary}
                />
              </View>
              <Text style={styles.detailsLink}>{t("seeDetails")}</Text>
            </CardFrame>
          </View>
        </View>

        <Modal transparent visible={!!selectedRange} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {selectedRange === "week"
                  ? t("lastWeekDetails")
                  : t("lastMonthDetails")}
              </Text>
              <ScrollView style={{ maxHeight: s(300), width: "100%" }}>
                {Object.entries(detailData).length === 0 ? (
                  <Text>{t("noData")}</Text>
                ) : (
                  Object.entries(detailData)
                    .sort(([a], [b]) => (parseISO(a) > parseISO(b) ? -1 : 1))
                    .map(([date, prayers]) => (
                      <View key={date} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1.2 }]}>
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
    marginTop: s(-30),
  },
  header: { fontSize: 40, fontWeight: "bold", color: "#333", marginTop: -30 },
  image: { height: s(180), width: s(180) },
  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: s(-24),
  },
  settingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
  },
  title: {
    fontSize: s(18),
    fontWeight: "bold",
    color: "#2C2C2C",
  },
  settingsButton: {
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
  statsContainer: {
    width: "100%",
    paddingHorizontal: s(10),
    marginTop: s(4),
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: s(3),
  },
  iconCell: {
    width: s(22),
    fontSize: s(14),
    textAlign: "left",
  },
  labelCell: {
    flex: 1,
    fontSize: s(14),
    color: "#333",
    textAlign: "left",
  },
  valueCell: {
    width: s(28),
    fontSize: s(14),
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
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
