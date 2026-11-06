import type { ReactNode } from "react";
import { Modal, Pressable, View, ScrollView, useWindowDimensions } from "react-native";
import { X } from "lucide-react-native";
import { Text } from "./typography";
export function BattleSheet({
  visible,
  title,
  onClose,
  children,
  top,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  top?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const { height, width } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          alignItems: "center",
          backgroundColor: "rgba(15,23,42,.45)",
        }}
      >
        <Pressable onPress={onClose} style={{ position: "absolute", inset: 0 }} />
        <View
          style={{
            width: "100%",
            maxWidth: 672,
            maxHeight: height * 0.92,
            backgroundColor: "white",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderBottomLeftRadius: width >= 640 ? 24 : 0,
            borderBottomRightRadius: width >= 640 ? 24 : 0,
            marginBottom: width >= 640 ? 16 : 0,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#f1f5f9",
            }}
          >
            <Text
              style={{ fontSize: 18, lineHeight: 28, fontWeight: "700", color: "#0f172a", flex: 1 }}
            >
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="閉じる"
              onPress={onClose}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <X size={20} color="#0f172a" />
            </Pressable>
          </View>
          {top}
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ padding: 20, gap: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer && (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#f1f5f9",
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              {footer}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
