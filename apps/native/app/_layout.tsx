import {
  useFonts,
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
  MPLUSRounded1c_900Black,
} from "@expo-google-fonts/m-plus-rounded-1c";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, Button, Platform, Text, View } from "react-native";
import { Stack, useSegments, type ErrorBoundaryProps } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Providers } from "../lib/client";
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
      <Text accessibilityRole="alert">画面を表示できませんでした。</Text>
      <Button title="再試行" onPress={() => void retry()} />
    </View>
  );
}

export default function Layout() {
  const segments = useSegments();
  const opening = segments[1] === "openings";
  const nativeTabs = Platform.OS === "ios" && segments.some((segment) => segment === "(tabs)");
  const [loaded, error] = useFonts({
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_700Bold,
    MPLUSRounded1c_800ExtraBold,
    MPLUSRounded1c_900Black,
  });
  if (!loaded && !error) return <ActivityIndicator />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Providers>
          <SafeAreaView
            style={{ flex: 1, backgroundColor: opening ? "#030405" : "white" }}
            edges={nativeTabs ? ["top"] : ["top", "bottom"]}
          >
            <StatusBar style={opening ? "light" : "dark"} />
            <Stack screenOptions={{ headerShown: false }} />
          </SafeAreaView>
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
