import { NavigationContainer } from "@react-navigation/native";
import AppSafeView from "./src/components/AppSafeView";
import AppStack from "./src/navigation/AppStack";
import "react-native-get-random-values";
import "./src/i18n";

export default function App() {
  return (
    <NavigationContainer>
      <AppSafeView>
        <AppStack />
      </AppSafeView>
    </NavigationContainer>
  );
}
