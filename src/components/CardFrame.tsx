import React, { FC, ReactNode } from "react";
import {
  StyleSheet,
  Pressable,
  ImageBackground,
  View,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import { s } from "react-native-size-matters";

const CARD_FRAME_SOURCE = require("../../assets/card-frame-vertical.png");

type CardFrameProps = {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  width?: number | string;
  height?: number | string;
};

const CardFrame: FC<CardFrameProps> = ({
  children,
  onPress,
  width = "95%",
  height = undefined,
}) => {
  const baseStyle: ViewStyle = {
    marginVertical: s(6),
    borderRadius: s(12),
    overflow: "hidden",
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        [
          baseStyle,
          { opacity: pressed ? 0.9 : 1, width, height },
        ] as StyleProp<ViewStyle>
      }
    >
      <ImageBackground
        source={CARD_FRAME_SOURCE}
        style={styles.imageBackground}
        resizeMode="stretch"
      >
        <View style={styles.innerContent}>{children}</View>
      </ImageBackground>
    </Pressable>
  );
};

export default CardFrame;

const styles = StyleSheet.create({
  imageBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  innerContent: {
    width: "90%",
    paddingVertical: s(10),
    alignItems: "center",
    justifyContent: "space-around",
  },
});
