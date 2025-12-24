import {
  StyleSheet,
  Text,
  Pressable,
  ImageBackground,
  View,
  GestureResponderEvent,
} from "react-native";
import React, { FC, ReactNode } from "react";
import { s } from "react-native-size-matters";

const BUTTON_FRAME_SOURCE = require("../../assets/main-button.png");

type MainButtonProps = {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
};

const MainButton: FC<MainButtonProps> = ({ children, onPress }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pressableWrapper,
        { opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onPress}
    >
      <ImageBackground
        source={BUTTON_FRAME_SOURCE}
        style={styles.imageBackground}
        resizeMode="stretch"
      >
        <View style={styles.innerContent}>{children}</View>
      </ImageBackground>
    </Pressable>
  );
};

export default MainButton;

const styles = StyleSheet.create({
  pressableWrapper: {
    width: s(200),
    alignSelf: "center",
    marginVertical: s(3),
  },
  imageBackground: {
    width: "100%",
    aspectRatio: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  innerContent: {
    width: "80%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
