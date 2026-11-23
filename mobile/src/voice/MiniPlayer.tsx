import { Pressable, StyleSheet, Text, View } from "react-native";

import { FONTS, useColors, type Colors } from "../theme";
import { Icon } from "./icons";
import type { RoomState } from "./RoomScreen";

type MiniPlayerProps = {
  title: string;
  state: RoomState;
  onMain: () => void;
  onLeave: () => void;
  onOpen: () => void;
};

// The room's mini bar while its sheet is down (X Spaces), docked in PortalTabs' slot right above the tab bar: full
// width, on ink, 56 px at least (it grows with large text).
// The live dot, the title and Listening or On stage; at the right the main control (the hand or the mic, as on the
// sheet) and Leave. A tap anywhere else opens the room again.
export function MiniPlayer({ title, state, onMain, onLeave, onOpen }: MiniPlayerProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const isMicOn = state.isOnStage && !state.isMuted;
  const mainLabel = state.isOnStage ? (isMicOn ? "Mic on" : "Mic off") : state.isHandRaised ? "Lower hand" : "Raise hand";
  const isMainFilled = state.isOnStage ? isMicOn : state.isHandRaised;
  const isMainDisabled = !state.isLive || state.isBusy;
  return (
    <View style={styles.bar} testID="room-mini-bar">
      <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${title}`} testID="room-mini-open" onPress={onOpen} style={styles.open}>
        <View style={[styles.liveDot, state.isLive ? null : styles.closedDot]} testID="room-mini-dot" />
        <View style={styles.words}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.status} numberOfLines={1}>
            {state.isLive ? (state.isOnStage ? "On stage" : "Listening") : "Joining…"}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mainLabel}
        accessibilityState={{ selected: isMainFilled, disabled: isMainDisabled }}
        testID="room-mini-main"
        disabled={isMainDisabled}
        onPress={onMain}
        style={[styles.button, isMainFilled ? styles.buttonOn : null, isMainDisabled ? styles.disabled : null]}
      >
        <Icon name={state.isOnStage ? (isMicOn ? "mic" : "micOff") : "hand"} color={isMainFilled ? colors.ink : colors.paper} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Leave" testID="room-mini-leave" disabled={state.isBusy} onPress={onLeave} style={styles.button}>
        <Icon name="x" color={colors.paper} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    bar: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 16, paddingRight: 6, backgroundColor: colors.ink },
    open: { flex: 1, minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
    closedDot: { backgroundColor: colors.muted },
    words: { flex: 1, minWidth: 0, paddingVertical: 8 },
    title: { color: colors.paper, fontFamily: FONTS.sansSemiBold, fontSize: 15, lineHeight: 20 },
    status: { color: colors.paper, opacity: 0.75, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 18 },
    button: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    buttonOn: { backgroundColor: colors.paper },
    disabled: { opacity: 0.45 },
  });
}
