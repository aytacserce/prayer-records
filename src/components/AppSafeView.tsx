import { Platform, StatusBar, StyleSheet, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { s } from "react-native-size-matters";

const AppSafeView: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return <SafeAreaView style={styles.safeArea}>{children}</SafeAreaView>;
};

export default AppSafeView;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ecfbed",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
    paddingHorizontal: s(12),
  },
});
