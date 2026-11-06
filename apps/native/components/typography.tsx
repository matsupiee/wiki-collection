import { Text as NativeText, TextInput as NativeTextInput, StyleSheet } from "react-native";
import type { TextProps, TextInputProps, TextStyle } from "react-native";
const families = {
  400: "MPLUSRounded1c_400Regular",
  700: "MPLUSRounded1c_700Bold",
  800: "MPLUSRounded1c_800ExtraBold",
  900: "MPLUSRounded1c_900Black",
};
function face(style: TextProps["style"]) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const weight = Number(flat?.fontWeight === "bold" ? 700 : (flat?.fontWeight ?? 400));
  return {
    fontFamily: families[weight >= 900 ? 900 : weight >= 800 ? 800 : weight >= 600 ? 700 : 400],
    fontWeight: "normal" as const,
  };
}
export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ color: "#1e293b" }, style, face(style)]} />;
}
export function TextInput({ style, ...props }: TextInputProps) {
  return <NativeTextInput {...props} style={[style, face(style)]} />;
}
