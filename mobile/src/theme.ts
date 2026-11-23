import { useColorScheme } from "react-native";

// The Commonhall kit (.ai/features/app-kit/NOTES.md), with the site's own token values (src/app/globals.css): paper and
// ink, hairlines, graphite for quiet text, and the live colour (the site's --ribbon) only for live and warnings.
// `muted` and `line` keep their old names for the screens that read them; they hold graphite and the rule.
const LIGHT = { paper: "#fafaf7", ink: "#111110", muted: "#4a4a46", line: "#d6d5cf", sheet: "#ffffff", vellum: "#f2f1ec", rust: "#9c4e22", live: "#9c4e22" };
const DARK = { paper: "#0e0e0d", ink: "#f4f2ec", muted: "#b8b6ae", line: "#33332f", sheet: "#161615", vellum: "#1e1e1c", rust: "#e7a57e", live: "#e7a57e" };

export type Colors = typeof LIGHT;

// The site's faces, loaded with expo-font (useAppFonts, fonts.ts) from mobile/assets/fonts. Each weight is its own
// family: Android can't pick a weight from one file, so never set fontWeight with these.
export const FONTS = {
  serif: "Newsreader-SemiBold",
  sans: "IBMPlexSans-Regular",
  sansMedium: "IBMPlexSans-Medium",
  sansSemiBold: "IBMPlexSans-SemiBold",
} as const;

// Older screens read these two: the title face and the text face.
export const SERIF = FONTS.serif;
export const SANS = FONTS.sans;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}
