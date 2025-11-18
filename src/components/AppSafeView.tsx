import { Platform, StatusBar, StyleSheet, ImageBackground } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { s } from "react-native-size-matters";

const AppSafeView: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return (
    <ImageBackground
      source={require("../../assets/background-image.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>{children}</SafeAreaView>
    </ImageBackground>
  );
};

export default AppSafeView;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
});
