import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./en.json";
import tr from "./tr.json";

const resources = {
  en: { translation: en },
  tr: { translation: tr },
};

async function initI18n() {
  const storedLang = await AsyncStorage.getItem("language");

  const deviceLang = Localization.getLocales?.()[0]?.languageCode ?? "en";

  const initialLang = storedLang || deviceLang || "en";

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLang,
    fallbackLng: "en",
    compatibilityJSON: "v4",
    interpolation: { escapeValue: false },
  });

  return i18n;
}

initI18n();

export default i18n;
