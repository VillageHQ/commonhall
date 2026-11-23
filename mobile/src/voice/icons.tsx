import Svg, { Path } from "react-native-svg";

// The site's own icons (Lucide, ISC licence: Copyright (c) Lucide Icons and Contributors), drawn the same way: a 24 px
// box, round caps and joins, a 1.5 px line. Copied as paths from lucide-react 1.67.0 so the app needs no icon package;
// circles and rects are written as paths.
const ICON_PATHS = {
  chevronDown: ["m6 9 6 6 6-6"],
  ellipsis: ["M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0", "M18 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0", "M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0"],
  hand: [
    "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",
    "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",
    "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",
    "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
  ],
  mic: ["M12 19v3", "M19 10v2a7 7 0 0 1-14 0v-2", "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0Z"],
  micOff: ["M12 19v3", "M15 9.34V5a3 3 0 0 0-5.68-1.33", "M16.95 16.95A7 7 0 0 1 5 12v-2", "M18.89 13.23A7 7 0 0 0 19 12v-2", "m2 2 20 20", "M9 9v3a3 3 0 0 0 5.12 2.12"],
  smilePlus: ["M13.267 2.08a10 10 0 108.653 8.653", "M15 10V9", "M16 5h6", "M16.472 15a6 6 0 01-8.943 0", "M19 2v6", "M9 10V9"],
  x: ["M18 6 6 18", "m6 6 12 12"],
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, size = 24, color, strokeWidth = 1.5 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ICON_PATHS[name].map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
