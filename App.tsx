import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";

import AppSafeView from "./src/components/AppSafeView";
import AppStack from "./src/navigation/AppStack";
import { auth } from "./src/config/firebase";
import "react-native-get-random-values";
import "./src/i18n";

export default function App() {
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("🔗 Raw URL received:", url);

      // 1. Force convert custom scheme to the HTTPS format Firebase expects
      let firebaseLink = url;
      if (url.startsWith("prayer-records-app://")) {
        firebaseLink = url.replace(
          "prayer-records-app://",
          "https://prayer-records-app.firebaseapp.com/"
        );
      }

      // 2. Validate the link
      if (isSignInWithEmailLink(auth, firebaseLink)) {
        try {
          const email = await AsyncStorage.getItem("emailForSignIn");
          console.log("📧 Attempting sign-in for:", email);

          if (!email) {
            Alert.alert("Hata", "Lütfen bağlantıyı aynı cihazda açın.");
            return;
          }

          // 3. Complete Sign-In
          await signInWithEmailLink(auth, email, firebaseLink);

          // 4. Persistence
          await AsyncStorage.setItem("subscribed", "true");
          await AsyncStorage.setItem("email", email);
          await AsyncStorage.removeItem("emailForSignIn");

          Alert.alert("Başarılı", "Bulut yedekleme artık aktif!");
          console.log("✅ Sign-in Successful!");
        } catch (error: any) {
          console.error("❌ Auth Error:", error.code, error.message);
          Alert.alert("Giriş Hatası", "Bağlantı geçersiz veya süresi dolmuş.");
        }
      } else {
        console.log("⚠️ Received link is not a valid Firebase Auth link.");
      }
    };

    // Listener for when the app is already open in the background
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    // Check if the app was opened directly from a link (Cold Start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer>
      <AppSafeView>
        <AppStack />
      </AppSafeView>
    </NavigationContainer>
  );
}
