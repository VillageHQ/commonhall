import { useFonts } from "expo-font";

import { FONTS } from "./theme";

// The site's faces in the app (mobile/assets/fonts, licence OFL.txt there): Newsreader for titles, IBM Plex Sans for
// everything else, one family per weight. Text drawn before they load uses the phone's own face for a moment.
const FONT_FILES = {
  [FONTS.serif]: require("../assets/fonts/Newsreader-SemiBold.ttf"),
  [FONTS.sans]: require("../assets/fonts/IBMPlexSans-Regular.ttf"),
  [FONTS.sansMedium]: require("../assets/fonts/IBMPlexSans-Medium.ttf"),
  [FONTS.sansSemiBold]: require("../assets/fonts/IBMPlexSans-SemiBold.ttf"),
};

// Loads them once (later calls share the load) and re-renders the caller when they're in.
export function useAppFonts() {
  const [isLoaded] = useFonts(FONT_FILES);
  return isLoaded;
}
