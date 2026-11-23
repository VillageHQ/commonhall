import { useCallback, useRef, useState, type ReactNode } from "react";

import type { PortalHandle } from "../components/portal-types";
import type { RoomClosedReason } from "../lib/bridge";
import { MiniPlayer } from "./MiniPlayer";
import { RoomScreen, type RoomControls, type RoomState } from "./RoomScreen";

// The live room in the app, whole: the room's sheet (RoomScreen) over everything, and while it is minimised the mini
// bar (MiniPlayer), which the screen docks in PortalTabs' slot right above the tab bar. PortalTabs moves the slot, hides
// it while a page sheet, menu or the keyboard is up, and tells every page its height (--mini), so the page makes room.
//
//   const dock = useRoomDock({ portal, origin, onRenamed: portal.reload });
//   <PortalTabs onOpenRoom={dock.openRoom} bottomSlot={dock.miniBar} … />
//   {dock.sheet}
//
// One room at a time: opening another leaves the one playing.

type OpenRoom = { roomId: string; title: string; notice: string };

const IDLE: RoomState = { isLive: false, isOnStage: false, isMuted: true, isHandRaised: false, isBusy: false };

export type RoomDock = {
  // The page's "voice.open": opens the room's sheet (and joins, for a new room).
  openRoom: (roomId: string, title: string, notice: string) => void;
  // The mini bar while the room is minimised, else null.
  miniBar: ReactNode;
  // The room's sheet (kept while minimised, so the room keeps playing), else null.
  sheet: ReactNode;
};

export function useRoomDock({ portal, origin, onRenamed }: { portal: PortalHandle; origin: string; onRenamed?: () => void }): RoomDock {
  const [room, setRoom] = useState<OpenRoom | null>(null);
  const [isRoomShown, setIsRoomShown] = useState(false);
  const [state, setState] = useState<RoomState>(IDLE);
  const controls = useRef<RoomControls>(null);
  const roomRef = useRef<OpenRoom | null>(null);

  const openRoom = useCallback(
    (roomId: string, title: string, notice: string) => {
      const current = roomRef.current;
      if (current?.roomId !== roomId) {
        if (current) void portal.call("POST", "/api/voice/leave", { roomId: current.roomId });
        roomRef.current = { roomId, title: title || "Voice room", notice };
        setRoom(roomRef.current);
        setState(IDLE);
      }
      setIsRoomShown(true);
    },
    [portal],
  );

  // The page under the room learns why it closed (it says so and offers Join again).
  const close = useCallback(
    (reason: RoomClosedReason) => {
      const closing = roomRef.current;
      roomRef.current = null;
      setRoom(null);
      setIsRoomShown(false);
      if (closing) portal.roomClosed(closing.roomId, reason);
    },
    [portal],
  );

  // The host renamed the room on its sheet: the mini bar follows, and the page under it reads the new title.
  const renamed = useCallback(
    (title: string) => {
      setRoom((current) => (current ? { ...current, title } : current));
      if (roomRef.current) roomRef.current = { ...roomRef.current, title };
      onRenamed?.();
    },
    [onRenamed],
  );

  const minimise = useCallback(() => setIsRoomShown(false), []);

  return {
    openRoom,
    miniBar:
      room && !isRoomShown ? (
        <MiniPlayer title={room.title} state={state} onMain={() => controls.current?.toggleMain()} onLeave={() => controls.current?.leave()} onOpen={() => setIsRoomShown(true)} />
      ) : null,
    sheet: room ? (
      <RoomScreen
        key={room.roomId}
        ref={controls}
        portal={portal}
        origin={origin}
        roomId={room.roomId}
        title={room.title}
        notice={room.notice}
        isShown={isRoomShown}
        onMinimize={minimise}
        onClose={close}
        onState={setState}
        onRenamed={renamed}
      />
    ) : null,
  };
}
