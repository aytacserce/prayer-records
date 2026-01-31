import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import AppSafeView from "../components/AppSafeView";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { Picker } from "@react-native-picker/picker";
import { auth } from "../config/firebase";
import { sendSignInLinkToEmail } from "firebase/auth";
import { BackupService } from "../services/backup";
import { useIsFocused } from "@react-navigation/native";
import { debounce } from "lodash";
import { PrayerTimeService } from "../services/prayerTimes";
import hadithData from "../data/hadiths.json";
import { MaterialIcons } from "@expo/vector-icons";
import { s } from "react-native-size-matters";

interface Hadith {
  text: string;
  source: string;
}

const SettingsScreen = () => {
  const { t } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || "en");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionModal, setSubscriptionModal] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  const [hadith, setHadith] = useState<Hadith | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Sync-specific states
  const [syncStatus, setSyncStatus] = useState({
    diff: 0,
    shouldShowManual: false,
  });
  const [manualSyncLoading, setManualSyncLoading] = useState(false);
  const [cloudCheckLoading, setCloudCheckLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused) {
      const list =
        hadithData[currentLang as keyof typeof hadithData] || hadithData.en;
      const randomItem = list[Math.floor(Math.random() * list.length)];
      setHadith(randomItem);
    }
  }, [isFocused, currentLang]);

  // 1. Unified Init and Sync Status Check
  const refreshSyncStatus = async () => {
    const status = await BackupService.getSyncStatus();

    // 📝 Log the current status to see exactly what the logic is doing
    console.log("📊 [Sync Status Update]", {
      localDiff: status.diff,
      showManualBtn: status.shouldShowManual,
      threshold: 5, // Keeping track of your current test value
    });

    setSyncStatus({
      diff: status.diff,
      shouldShowManual: status.shouldShowManual,
    });

    const backupDate = await AsyncStorage.getItem("lastBackupDate");
    setLastBackup(
      backupDate ? new Date(backupDate).toLocaleDateString() : null
    );
  };

  useEffect(() => {
    if (isFocused && isSubscribed) {
      console.log("🔄 Settings Focused - Refreshing Sync Status...");
      refreshSyncStatus();
    }
  }, [isFocused, isSubscribed]);

  useEffect(() => {
    const initSettings = async () => {
      const savedLang = await AsyncStorage.getItem("language");
      if (savedLang) {
        i18n.changeLanguage(savedLang);
        setCurrentLang(savedLang);
      }

      const subscribed = await AsyncStorage.getItem("subscribed");
      const storedEmail = await AsyncStorage.getItem("email");

      if (subscribed === "true") {
        setIsSubscribed(true);
        if (storedEmail) setEmail(storedEmail);
        await refreshSyncStatus();
      }
    };
    initSettings();
  }, []);

  // 2. Handlers
  const handleManualSync = async () => {
    setManualSyncLoading(true);
    try {
      // Capture the return value from the service
      const wasSuccessful = await BackupService.runBackup(true);

      if (wasSuccessful) {
        await refreshSyncStatus();
        Alert.alert(t("success"), t("syncComplete"));
      } else {
        // Show an error if the service returned false
        Alert.alert(t("error"), t("backupErrorMessage"));
      }
    } catch (e) {
      Alert.alert(t("error"), t("syncError"));
    } finally {
      setManualSyncLoading(false);
    }
  };

  const handleCheckForBackups = async () => {
    setCloudCheckLoading(true);
    try {
      const cloudData = await BackupService.getCloudData();
      if (cloudData && Object.keys(cloudData).length > 0) {
        Alert.alert(t("restoreTitle"), t("restoreConfirm"), [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("restore"),
            onPress: async () => {
              await BackupService.mergeCloudData(cloudData);
              await refreshSyncStatus();
              Alert.alert(t("success"), t("restoreSuccess"));
            },
          },
        ]);
      } else {
        Alert.alert(t("info"), t("noBackupsFound"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("fetchError"));
    } finally {
      setCloudCheckLoading(false);
    }
  };

  const changeLanguage = async (lang: string) => {
    setCurrentLang(lang);
    await AsyncStorage.setItem("language", lang);
    await i18n.changeLanguage(lang);
  };

  const handleConfirmSubscription = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert(t("error"), t("enterValidEmail"));
      return;
    }
    setLoading(true);
    const actionCodeSettings = {
      url: "https://prayer-records-app.firebaseapp.com",
      handleCodeInApp: true,
      android: { packageName: "com.aytac.prayerrecords", installApp: true },
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      await AsyncStorage.setItem("emailForSignIn", email);
      setSubscriptionModal(false);
      Alert.alert(t("success"), t("checkEmailForLink"));
    } catch (error: any) {
      Alert.alert(t("error"), error.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. Initial Load for Location (Keep this)
  useEffect(() => {
    const loadLocation = async () => {
      const saved = await AsyncStorage.getItem("userLocationName");
      if (saved) setSelectedLocation(saved);
    };
    loadLocation();
  }, []);

  // 2. The Actual API Call (Updated with Headers)
  const fetchLocations = async (text: string) => {
    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          text
        )}&format=json&addressdetails=1&limit=5`,
        {
          headers: {
            // This User-Agent stops the "Unexpected character: <" error
            "User-Agent": "PrayerRecordsApp/1.0",
            "Accept-Language": currentLang,
          },
        }
      );

      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 3. The Debouncer (Uses lodash to wait for the user to stop typing)
  const debouncedFetch = useMemo(
    () => debounce((text: string) => fetchLocations(text), 600),
    [currentLang]
  );

  // 4. Cleanup debouncer on unmount
  useEffect(() => {
    return () => {
      debouncedFetch.cancel();
    };
  }, [debouncedFetch]);

  // 5. Handle Selecting a Location
  const handleSelectLocation = async (item: any) => {
    // 1. Construct a clean name for the UI
    const district = item.display_name.split(",")[0];
    const city =
      item.address.city ||
      item.address.town ||
      item.address.province ||
      item.address.state ||
      "";

    // Create the final string (e.g., "Kadıköy, İstanbul")
    const finalLocationName = city ? `${district}, ${city}` : district;

    try {
      // 2. Save all details to AsyncStorage
      await AsyncStorage.setItem("userLocationName", finalLocationName);
      await AsyncStorage.setItem("userLat", item.lat.toString());
      await AsyncStorage.setItem("userLon", item.lon.toString());

      // 3. Fetch the new prayer times immediately
      await PrayerTimeService.fetchMonthlyTimes();

      // 4. Update the local UI state in the Settings screen
      setSelectedLocation(finalLocationName); // Fixed: was 'name'

      // 5. Clear search results
      setSearchQuery("");
      setSearchResults([]);

      Alert.alert(t("success"), t("locationUpdated"));
    } catch (error) {
      console.error("Failed to save location:", error);
      Alert.alert(t("error"), t("failedToSave"));
    }
  };

  return (
    <AppSafeView>
      <View style={styles.container}>
        <Text style={styles.header}>{t("settings")}</Text>

        {/* HADITH CARD: This will take available space but shrink if needed */}
        {hadith && (
          <View style={styles.hadithCard}>
            <MaterialIcons name="format-quote" size={s(20)} color="#3B82F6" />
            <Text style={styles.hadithText}>"{hadith.text}"</Text>
            <Text style={styles.hadithSource}>{hadith.source}</Text>
          </View>
        )}

        {/* SETTINGS CONTENT: Pushed to the bottom */}
        <View style={styles.settingsFooter}>
          {/* Prayer Times Location Section */}
          <View style={styles.rowContainer}>
            <Text style={styles.label}>{t("location")}</Text>
            <Text style={styles.rowDescription}>
              {selectedLocation
                ? `${t("currently")}: ${selectedLocation}`
                : t("selectLocationInfo")}
            </Text>

            <View style={styles.searchSection}>
              <TextInput
                style={styles.locationInput}
                placeholder={t("searchCityDistrict")}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text); // Immediate UI update for the input
                  debouncedFetch(text); // Delayed API call
                }}
              />
              {isSearching && (
                <ActivityIndicator
                  style={styles.searchLoader}
                  size="small"
                  color="#3B82F6"
                />
              )}
            </View>

            {/* Results Overlay */}
            {searchResults.length > 0 && (
              <View style={styles.resultsContainer}>
                {searchResults.map((item, index) => (
                  <Pressable
                    key={index}
                    style={styles.resultItem}
                    onPress={() => handleSelectLocation(item)}
                  >
                    <Text style={styles.resultText} numberOfLines={1}>
                      {item.display_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Language Selection */}
          <View style={styles.rowContainer}>
            <View style={styles.rowTop}>
              <Text style={styles.label}>{t("language")}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={currentLang}
                  onValueChange={(value) => changeLanguage(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="🇬🇧 English" value="en" />
                  <Picker.Item label="🇹🇷 Türkçe" value="tr" />
                </Picker>
              </View>
            </View>
          </View>

          {/* Cloud Sync Section */}
          <View style={styles.rowContainer}>
            <View style={styles.rowTop}>
              <Text style={styles.label}>{t("cloudBackup")}</Text>
              <Pressable
                style={[
                  styles.subscribeButton,
                  isSubscribed ? styles.subscribed : styles.notSubscribed,
                ]}
                onPress={() => !isSubscribed && setSubscriptionModal(true)}
                disabled={isSubscribed}
              >
                <Text style={styles.subscribeText}>
                  {isSubscribed ? t("active") : t("activate")}
                </Text>
              </Pressable>
            </View>

            {/* Status Description */}
            <Text style={styles.rowDescription}>
              {!isSubscribed
                ? t("subscribeInfo")
                : syncStatus.diff > 0
                ? `${syncStatus.diff} ${t("pendingChanges")}`
                : t("allSynced")}
            </Text>

            {/* Conditional Manual Sync Button */}
            {isSubscribed && syncStatus.shouldShowManual && (
              <Pressable
                style={styles.manualSyncBtn}
                onPress={handleManualSync}
                disabled={manualSyncLoading}
              >
                {manualSyncLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.manualSyncBtnText}>{t("syncNow")}</Text>
                )}
              </Pressable>
            )}

            {/* Discreet Restore Link */}
            {isSubscribed && (
              <View style={styles.restoreLinkWrapper}>
                <Pressable
                  onPress={handleCheckForBackups}
                  disabled={cloudCheckLoading}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  {cloudCheckLoading ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Text style={styles.restoreLinkText}>
                      {t("checkCloudBackup")}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Auth Modal */}
        <Modal transparent visible={subscriptionModal} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("activateBackup")}</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.modalText}>{t("userConsent")}</Text>
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: "#22C55E" }]}
                  onPress={handleConfirmSubscription}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnText}>{t("accept")}</Text>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: "#EF4444" }]}
                  onPress={() => setSubscriptionModal(false)}
                >
                  <Text style={styles.modalBtnText}>{t("cancel")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppSafeView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: -20 },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  rowContainer: {
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    elevation: 1,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowDescription: { marginTop: 6, color: "#555", fontSize: 14, lineHeight: 18 },
  label: { fontSize: 18, fontWeight: "600", color: "#333" },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    width: 140,
    overflow: "hidden",
  },
  picker: { height: 60, width: "100%", marginVertical: -10 },
  subscribeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    width: 140,
    alignItems: "center",
  },
  subscribed: { backgroundColor: "#16A34A" },
  notSubscribed: { backgroundColor: "#3B82F6" },
  subscribeText: { color: "#fff", fontWeight: "bold" },

  // New Styles
  manualSyncBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 15,
    alignItems: "center",
  },
  manualSyncBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  upToDateText: {
    marginTop: 8,
    color: "#16A34A",
    fontWeight: "600",
    fontSize: 14,
  },
  restoreLinkWrapper: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    alignItems: "center",
  },
  restoreLinkText: {
    color: "#3B82F6",
    fontSize: 13,
    textDecorationLine: "underline",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: 280,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  modalText: { textAlign: "center", marginBottom: 15, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    width: "100%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontWeight: "bold" },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    position: "relative",
  },
  locationInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchLoader: {
    position: "absolute",
    right: 10,
  },
  resultsContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultText: {
    fontSize: 13,
    color: "#444",
  },
  hadithCard: {
    flex: 1, // Takes up remaining vertical space
    justifyContent: "center", // Centers the text vertically in that space
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  hadithText: {
    fontSize: s(16),
    fontStyle: "italic",
    textAlign: "center",
    color: "#333",
    lineHeight: s(22),
  },
  hadithSource: {
    fontSize: s(12),
    color: "#999",
    marginTop: 8,
    fontWeight: "600",
  },
  settingsFooter: {
    // This container holds your 3 main setting cards
    justifyContent: "flex-end",
  },
});
