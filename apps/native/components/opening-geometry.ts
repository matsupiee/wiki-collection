import { interpolate } from "react-native-reanimated";
import { OPENING_PACK_RATIO } from "./opening-pack";

export const carouselPitch = 0.61;
export const restingPackCenter = 0.5;
export const selectedWidth = 0.74;
export const seamHeight = 0.56;
export const sealFraction = 0.18;
export function wrapperPosition(ms: number, width: number, height: number) {
  "worklet";
  const approach = interpolate(ms, [0, 440], [0, 1], "clamp");
  const drop = interpolate(ms, [1190, 1510], [0, 1], "clamp");
  const scale = 1 + approach * (selectedWidth / 0.48 - 1);
  const packHeight = width * 0.48 * OPENING_PACK_RATIO;
  const selectedCenter =
    height * seamHeight + packHeight * (selectedWidth / 0.48) * (0.5 - sealFraction);
  const y = approach * (selectedCenter - height * restingPackCenter) + drop * height * 0.57;
  const mouth = height * restingPackCenter + y - packHeight * (0.5 - sealFraction) * scale;
  return { scale, y, mouth };
}

// Five identical wrappers pass to the right, before the selected one settles.
// Each slot wraps only after it is well outside both edges of the viewport.
export function carouselOffset(ms: number, side = 0) {
  "worklet";
  const p = carouselPitch;
  const shift =
    interpolate(
      ms,
      [
        0, 405, 438, 471, 504, 537, 570, 603, 636, 669, 702, 735, 768, 801, 834, 867, 934, 1000,
        1100, 1200, 1300, 1380,
      ],
      [
        -5 * p,
        -5 * p,
        -5 * p + 0.19,
        -4 * p - 0.035,
        -4 * p + 0.17,
        -3 * p - 0.125,
        -3 * p + 0.14,
        -2 * p - 0.19,
        -2 * p + 0.07,
        -p - 0.16,
        -p - 0.025,
        -p + 0.26,
        -0.075,
        0.15,
        0.215,
        0.212,
        0.164,
        0.11,
        0.055,
        0.022,
        0.007,
        0,
      ],
      "clamp",
    ) +
    side * p;
  return shift - Math.round(shift / (5 * p)) * 5 * p;
}
export function carouselScale(ms: number) {
  "worklet";
  return interpolate(
    ms,
    [0, 33, 67, 100, 133, 167, 200, 233, 333],
    [0.26, 0.55, 0.68, 0.86, 0.99, 1.04, 1.055, 1.055, 1],
    "clamp",
  );
}
