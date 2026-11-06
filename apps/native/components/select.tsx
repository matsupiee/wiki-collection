import { useState } from "react";
import { Modal, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { Text } from "./typography";
export function Select({
  label,
  value,
  options,
  onChange,
  style,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            backgroundColor: "white",
            borderRadius: 12,
            padding: 8,
          },
          style,
        ]}
      >
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, lineHeight: 20, color: "#334155" }}>
          {options.find((o) => o.value === value)?.label ?? "カードを選ぶ"}
        </Text>
        <ChevronDown size={16} color="#64748b" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "#0f172a66", justifyContent: "center", padding: 24 }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              maxWidth: 400,
              width: "100%",
              maxHeight: "75%",
              alignSelf: "center",
              backgroundColor: "white",
              borderRadius: 20,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 12 }}>{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  disabled={o.disabled}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    flexDirection: "row",
                    gap: 8,
                    opacity: o.disabled ? 0.4 : 1,
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 14, color: "#334155" }}>{o.label}</Text>
                  {value === o.value && <Check size={16} color="#0284c7" />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
