import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import PrayersScreen from "../screens/PrayersScreen";
import { s, vs } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor:'#333333', tabBarActiveBackgroundColor: '#d9e5b2', tabBarInactiveBackgroundColor: '#f2f8d8', tabBarStyle:{height:vs(46)}, tabBarLabelStyle:{marginVertical:vs(2), paddingBottom:vs(4), fontSize:s(12)} }}>
      <Tab.Screen name="HomeScreen" component={HomeScreen} options={{tabBarIcon:({color, size}) =>(<Ionicons name="home" size={size} color={color}/>), title:t("home") }}/>
      <Tab.Screen name="PrayersScreen" component={PrayersScreen} options={{tabBarIcon:({color, size}) =>(<Ionicons name="person" size={size} color={color}/>), title:t("prayers") }}/>
    </Tab.Navigator>
  );
}
