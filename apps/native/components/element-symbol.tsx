import { View } from "react-native";
import {
  UserRound,
  Leaf,
  Building2,
  Palette,
  CircleHelp,
  Atom,
  Flame,
  Droplets,
} from "lucide-react-native";
import { elementLabels, type HistoricalElement } from "@wiki-collection/db/battle";
export const appearances = {
  person: { Icon: UserRound, bg: "#fef3c7", color: "#92400e" },
  nature: { Icon: Leaf, bg: "#d1fae5", color: "#065f46" },
  society: { Icon: Building2, bg: "#e0f2fe", color: "#075985" },
  culture: { Icon: Palette, bg: "#ede9fe", color: "#5b21b6" },
  general: { Icon: CircleHelp, bg: "#f1f5f9", color: "#334155" },
  technology: { Icon: Atom, bg: "#e0e7ff", color: "#3730a3" },
  fire: { Icon: Flame, bg: "#ffedd5", color: "#9a3412" },
  water: { Icon: Droplets, bg: "#dbeafe", color: "#1e40af" },
  grass: { Icon: Leaf, bg: "#ecfccb", color: "#3f6212" },
};
export function ElementSymbol({
  element,
  compact = false,
}: {
  element: HistoricalElement;
  compact?: boolean;
}) {
  const { Icon, bg, color } = appearances[element];
  return (
    <View
      accessibilityLabel={elementLabels[element]}
      style={{
        width: compact ? 20 : 32,
        height: compact ? 20 : 32,
        borderRadius: 99,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={compact ? 14 : 18} color={color} />
    </View>
  );
}
