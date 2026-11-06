import { useId } from "react";
import Svg, { Defs, LinearGradient, Stop, Text, Circle } from "react-native-svg";
export function Brand() {
  const id = useId().replaceAll(":", "");
  return (
    <Svg width={150} height={28} accessibilityLabel="Wiki Collection">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#7c3aed" />
          <Stop offset="1" stopColor="#0ea5e9" />
        </LinearGradient>
      </Defs>
      <Text
        x={0}
        y={21}
        fontFamily="MPLUSRounded1c_900Black"
        fontSize={18}
        fontWeight="normal"
        fill={`url(#${id})`}
      >
        Wiki Collection
      </Text>
    </Svg>
  );
}
export function CoinIcon() {
  const id = useId().replaceAll(":", "");
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffe8a3" />
          <Stop offset="1" stopColor="#f2cc74" />
        </LinearGradient>
      </Defs>
      <Circle cx={12} cy={13} r={10.5} fill="#c3943e" />
      <Circle cx={12} cy={11} r={10.5} fill={`url(#${id})`} stroke="#d5aa52" />
      <Circle cx={12} cy={11} r={7} fill="none" stroke="#d5aa5280" />
    </Svg>
  );
}
