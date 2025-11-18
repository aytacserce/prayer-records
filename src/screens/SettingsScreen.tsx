import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import AppSafeView from "../components/AppSafeView";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { Picker } from "@react-native-picker/picker";
import uuid from "react-native-uuid";

const SettingsScreen = () => {
  const { t } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || "en");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionModal, setSubscriptionModal] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const initSettings = async () => {
      const savedLang = await AsyncStorage.getItem("language");
      if (savedLang) {
        i18n.changeLanguage(savedLang);
        setCurrentLang(savedLang);
      }

      // check subscription
      const subscribed = await AsyncStorage.getItem("subscribed");
      const storedEmail = await AsyncStorage.getItem("email");
      if (subscribed === "true" && storedEmail) {
        setIsSubscribed(true);
        setEmail(storedEmail);
      }

      // ensure user ID exists
      let userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        userId = uuid.v4() as string;
        await AsyncStorage.setItem("userId", userId);
      }
    };
    initSettings();
  }, []);

  const changeLanguage = async (lang: string) => {
    setCurrentLang(lang);
    await AsyncStorage.setItem("language", lang);
    await i18n.changeLanguage(lang);
  };

  const handleSubscribe = () => {
    setSubscriptionModal(true);
  };

  const confirmSubscription = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    const userId = await AsyncStorage.getItem("userId");

    // ✅ simulate DB update call
    console.log("Updating DB:", { email, userId });

    await AsyncStorage.setItem("email", email);
    await AsyncStorage.setItem("subscribed", "true");

    setIsSubscribed(true);
    setSubscriptionModal(false);

    Alert.alert("Success", "You are now subscribed!");
  };

  return (
    <AppSafeView>
      <View style={styles.container}>
        <Text style={styles.header}>{t("settings")}</Text>

        {/* Language Row */}
        <View style={styles.rowContainer}>
          <View style={styles.rowTop}>
            <Text style={styles.label}>{t("language")}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={currentLang}
                onValueChange={(value) => changeLanguage(value)}
                style={styles.picker}
                dropdownIconColor="#333"
              >
                <Picker.Item label="🇬🇧 English" value="en" />
                <Picker.Item label="🇹🇷 Türkçe" value="tr" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Subscription Row */}
        <View style={styles.rowContainer}>
          <View style={styles.rowTop}>
            <Text style={styles.label}>{t("subscription")}</Text>
            <Pressable
              style={[
                styles.subscribeButton,
                isSubscribed ? styles.subscribed : styles.notSubscribed,
              ]}
              onPress={handleSubscribe}
              disabled={isSubscribed}
            >
              <Text style={styles.subscribeText}>
                {isSubscribed ? t("subscribed") : t("subscribe")}
              </Text>
            </Pressable>
          </View>

          {/* Small descriptive text below */}
          <Text style={styles.rowDescription}>{t("subscribeText")}</Text>
        </View>

        {/* Subscription Modal */}
        <Modal
          transparent
          visible={subscriptionModal}
          animationType="fade"
          onRequestClose={() => setSubscriptionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("subscribe")}</Text>
              <Text style={styles.modalText}>{t("subscribeInfo")}</Text>

              <TextInput
                style={styles.input}
                placeholder={t("enterEmail")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />

              <Text style={styles.modalText}>{t("userConsent")}</Text>

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: "#22C55E" }]}
                  onPress={confirmSubscription}
                >
                  <Text style={styles.modalBtnText}>{t("accept")}</Text>
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
  container: { flex: 1, padding: 20, marginTop: 40 },
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
  rowDescription: {
    marginTop: 6,
    color: "#555",
    fontSize: 14,
    lineHeight: 18,
  },
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
  modalBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
