import {
  StyleSheet,
  Text,
  Pressable,
  ImageBackground, // Make sure ImageBackground is imported
  View,
} from "react-native";
import React, { FC } from "react";

// The path to your local button frame image
const BUTTON_FRAME_SOURCE = require("../../assets/main-button.png"); // Using local for now as per your code

type MainButtonProps = {
  children: string;
  // We'll add back onPress, style, innerColor, textColor later
  // For now, let's keep it minimal
};

const MainButton: FC<MainButtonProps> = ({ children }) => {
  return (
    <Pressable
      // We'll add onPress later
      style={({ pressed }) => [
        styles.pressableWrapper,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {/* Re-introducing ImageBackground here */}
      <ImageBackground
        source={BUTTON_FRAME_SOURCE} // Use your frame image
        style={styles.imageBackground}
        resizeMode="stretch" // Adjust as needed, 'cover' or 'contain' might also work
      >
        {/* The inner view for the background color and content */}
        <View style={[styles.innerContent]}>
          <Text style={[styles.text]}>{children}</Text>
          <Text style={[styles.sub]}>Namazımı kıldım.</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
};

export default MainButton;

const styles = StyleSheet.create({
  pressableWrapper: {
    width: 400,
    height: 100,
    marginBottom: -30,
  },
  imageBackground: {
    flex: 1, // Make ImageBackground fill its parent (pressableWrapper)
    justifyContent: "center",
    alignItems: "center",
  },
  innerContent: {
    // These width/height values might need tweaking depending on your frame image
    // You'll want to adjust them so the green rectangle fits perfectly inside the transparent part of your frame.
    width: "70%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 0,
  },
  text: {
    fontWeight: "bold",
    fontSize: 18,
  },
  sub: {
    fontSize: 12,
  },
});
