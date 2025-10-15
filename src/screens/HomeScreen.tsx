import { ImageBackground, StyleSheet, View, Text, Image } from "react-native";
import MainButton from "../components/MainButton";
import AppSafeView from "../components/AppSafeView";
import { s } from "react-native-size-matters";

const HomeScreen = () => (
  <AppSafeView>
    <View style={styles.container}>
      <View>
        <Text style={styles.header}>Namaz Takip</Text>
      </View>
      <View>
        <Image
          source={require("../../assets/home-image.png")}
          style={styles.image}
        />
      </View>
      <View style={styles.content}>
        <MainButton>Sabah</MainButton>
        <MainButton>Öğle</MainButton>
        <MainButton>İkindi</MainButton>
        <MainButton>Akşam</MainButton>
        <MainButton>Yatsı</MainButton>
      </View>
    </View>
  </AppSafeView>
);

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },

  content: {
    flex: 1,
    alignItems: "center",
  },

  image: {
    height: s(200),
    width: s(200),
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    alignItems: "center",
    fontSize: 40,
    fontWeight: "bold",
  },
});
