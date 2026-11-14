import { useState } from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { Panel, Screen, styles } from "@/components/ui";
import { Text } from "@/components/typography";
import { setLanguagePreference, useLanguagePreference, useTranslation } from "@/lib/i18n";

export default function Language() {
  const t = useTranslation();
  const preference = useLanguagePreference();
  const [failed, setFailed] = useState(false);
  return (
    <Screen showNotifications={false} title={t("language")} back>
      <Panel style={{ padding: 0, gap: 0 }}>
        <View accessibilityRole="radiogroup" accessibilityLabel={t("language")}>
          {(["system", "ja", "en"] as const).map((value) => {
            const label =
              value === "system" ? t("deviceLanguage") : value === "ja" ? "日本語" : "English";
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ checked: value === preference }}
                aria-checked={value === preference}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                }}
                onPress={() => {
                  try {
                    setLanguagePreference(value);
                    setFailed(false);
                  } catch {
                    setFailed(true);
                  }
                }}
              >
                <Text style={styles.text}>{label}</Text>
                {value === preference && <Check size={18} color="#0284c7" />}
              </Pressable>
            );
          })}
        </View>
      </Panel>
      {failed && <Text accessibilityRole="alert">{t("operationFailed")}</Text>}
    </Screen>
  );
}
