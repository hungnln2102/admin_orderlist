import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";
import { HealthCheckScreen } from "./src/features/health-check/screens/HealthCheckScreen";

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <HealthCheckScreen />
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
});
