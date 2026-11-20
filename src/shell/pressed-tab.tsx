"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { renderTabOutline, toPathname } from "./tab-outlines";

// How long a tapped item stays lit when its page never comes (a failed request, a press that wasn't a tap).
export const PRESSED_TIMEOUT_MS = 5000;

// The menu item a finger is on or just tapped (smooth-app Part A). `from` is the address shown when it was pressed:
// once the address changes, the press is over (the real current item and the new page take over). `isTapped` turns
// true on the click, so a finger that touches a tab and slides away never swaps the page for an outline.
type Pressed = { key: string; href: string; from: string; isTapped: boolean };

type PressedTab = {
  pressed: Pressed | null;
  press: (key: string, href: string, isTapped: boolean) => void;
  release: () => void;
};

const PressedTabContext = createContext<PressedTab | null>(null);

function usePressedState(): PressedTab {
  const pathname = usePathname();
  const [state, setState] = useState<Pressed | null>(null);
  // A press ends for good when the address changes: coming back to the page it was made on (Back, the iOS back
  // swipe, the fund mark) never brings its outline back. Adjusted while rendering, so the frame that shows the new
  // page shows no press.
  if (state && state.from !== pathname) setState(null);
  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(() => setState(null), PRESSED_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state]);
  const press = useCallback(
    (key: string, href: string, isTapped: boolean) => {
      // The page already shown: nothing to light or wait for.
      if (toPathname(href) === pathname) return;
      setState((current) => (current?.key === key && current.from === pathname && current.isTapped === isTapped ? current : { key, href, from: pathname, isTapped }));
    },
    [pathname],
  );
  const release = useCallback(() => setState(null), []);
  const pressed = state && state.from === pathname ? state : null;
  return useMemo(() => ({ pressed, press, release }), [pressed, press, release]);
}

// One press for the tab bar, the sidebar and the page area, so the page can show the tapped tab's outline.
export function PressedTabProvider({ children }: { children: ReactNode }) {
  return <PressedTabContext.Provider value={usePressedState()}>{children}</PressedTabContext.Provider>;
}

// The shared press, or this menu's own when it is drawn without the shell (the parts page, a test).
export function usePressedTab(): PressedTab {
  const own = usePressedState();
  return useContext(PressedTabContext) ?? own;
}

// Where the page sits: the tapped tab's outline while its page is on the way, else the page. The page stays mounted
// (only hidden), so a press that never arrives gives back the page as it was.
export function PendingTabPage({ children }: { children: ReactNode }) {
  const { pressed } = usePressedTab();
  const pathname = usePathname();
  const outline = pressed?.isTapped && toPathname(pressed.href) !== pathname ? renderTabOutline(pressed.href) : null;
  const isPending = outline !== null;
  useEffect(() => {
    if (isPending) window.scrollTo(0, 0);
  }, [isPending]);
  return (
    <>
      {outline}
      <div data-slot="page" style={isPending ? { display: "none" } : { display: "contents" }}>
        {children}
      </div>
    </>
  );
}
