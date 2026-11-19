import { Platform, useColorScheme } from "react-native";

// The Commonhall kit (.ai/features/app-kit/NOTES.md): paper and ink, serif titles, rust only for warnings.
const LIGHT = { paper: "#fafaf7", ink: "#111110", muted: "#5f5d57", line: "#e4e2dc", sheet: "#ffffff", rust: "#a4442a", live: "#1f7a4d" };
const DARK = { paper: "#0e0e0d", ink: "#f4f2ec", muted: "#a5a29a", line: "#2a2926", sheet: "#171715", rust: "#e0805f", live: "#5cc28d" };

export type Colors = typeof LIGHT;

export const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, 'Times New Roman', serif" });
export const SANS = Platform.select({ ios: "System", android: "sans-serif", default: "system-ui, -apple-system, 'Segoe UI', sans-serif" });

export function useColors(): Colors {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}
