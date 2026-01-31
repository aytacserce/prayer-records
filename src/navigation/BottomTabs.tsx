import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import PrayersScreen from "../screens/PrayersScreen";
import { s, vs } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next"; // <-- 1. Import this
import { Dimensions } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmallDevice = SCREEN_HEIGHT < 700;

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  // 2. Destructure i18n from the hook
  const { t, i18n } = useTranslation();

  return (
    <Tab.Navigator
      // 3. THIS IS THE MAGIC FIX FOR PLAY STORE
      key={i18n.language}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#333333",
        tabBarActiveBackgroundColor: "#d9e5b2",
        tabBarInactiveBackgroundColor: "#f2f8d8",
        tabBarStyle: { height: isSmallDevice ? vs(54) : vs(46) },
        tabBarLabelStyle: {
          marginBottom: vs(2),
          paddingBottom: vs(4),
          fontSize: s(12),
        },
      }}
    >
      <Tab.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          title: t("home"),
        }}
      />
      <Tab.Screen
        name="PrayersScreen"
        component={PrayersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          title: t("prayers"),
        }}
      />
    </Tab.Navigator>
  );
}
