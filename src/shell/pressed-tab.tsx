"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useSyncExternalStore, type MouseEvent, type PointerEvent } from "react";

import { hasTabOutline, renderTabOutline, toPathname } from "./tab-outlines";

// A tapped tab answers at once (smooth-app Part A): the tab lights up on the finger-down (`data-pressed="true"` on the
// link, `data-pressing` on its menu, so the current tab lets go), and on the tap the page area shows that tab's outline
// (`data-pending-tab` on <html>; TabOutlines' rules show the outline and hide the page) until the new page commits.
//
// Plain DOM attributes, not React state, on purpose: tap a tab and then the tab you are on before the first page
// comes, and the router keeps a render waiting for a page it dropped; React state updates in the shell then never
// reach the screen, and a press kept in state would leave the outline over the page. Attributes set here always do.

// How long a tapped item stays lit when its page never comes (a failed request, a press that wasn't a tap).
export const PRESSED_TIMEOUT_MS = 5000;

const PENDING_TAB_ATTRIBUTE = "data-pending-tab";

// The tab switch on a phone (ui-polish Part 2): the next page (its outline first) comes in this far from the tapped
// tab's side while it fades in. The web and reduced motion get no slide.
export const TAB_SLIDE = { distancePx: 40, durationMs: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" } as const;
const PHONE_QUERY = "(max-width: 999.98px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
// The bar's indicator follows a pressed tab through this variable (frame.css, .fh-tab-ind).
const PRESS_INDEX_PROPERTY = "--tab-press-i";

function matches(query: string) {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

// The page area, which holds the page and the tapped tab's outline (app-shell.tsx); it stays across pages, so a slide
// that is still running when the page lands finishes on the page.
function readPageArea() {
  return document.querySelector<HTMLElement>('[data-slot="page-width"]');
}

// Slides the page area in from the tapped tab's side: a tab to the right of the current one comes from the right.
function slideIn(link: HTMLElement) {
  const bar = link.closest<HTMLElement>('[data-slot="tab-bar"]');
  const area = readPageArea();
  if (!bar || !area || typeof area.animate !== "function" || !matches(PHONE_QUERY) || matches(REDUCED_MOTION_QUERY)) return;
  const links = Array.from(bar.querySelectorAll<HTMLElement>("a[data-index]"));
  const from = links.findIndex((item) => item.getAttribute("aria-current") === "page");
  const side = from === -1 || links.indexOf(link) > from ? 1 : -1;
  for (const animation of area.getAnimations()) animation.cancel();
  area.animate([{ transform: `translateX(${side * TAB_SLIDE.distancePx}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], {
    duration: TAB_SLIDE.durationMs,
    easing: TAB_SLIDE.easing,
  });
}

let pressedLink: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

// Ends the press: the address changed (the new page, Back, the iOS back swipe), the tab shown was tapped, the finger
// slid away, or the page never came.
export function endPress() {
  clearTimeout(timer);
  timer = undefined;
  pressedLink = null;
  // Wherever they are: switching between the member and console views swaps the menu's links, so the pressed one may
  // be gone while its menu is still on the page.
  for (const element of document.querySelectorAll<HTMLElement>("[data-pressed], [data-pressing]")) {
    element.removeAttribute("data-pressed");
    element.removeAttribute("data-pressing");
    element.style.removeProperty(PRESS_INDEX_PROPERTY);
  }
  document.documentElement.removeAttribute(PENDING_TAB_ATTRIBUTE);
}

// `isTapped`: the click (not just a finger on the tab) also swaps the page for the tab's outline.
export function pressTab(link: HTMLElement, href: string, isTapped: boolean) {
  const target = toPathname(href);
  // The page already shown: nothing to light or wait for, and a tab tapped just before it is given up.
  if (target === window.location.pathname) {
    endPress();
    return;
  }
  if (pressedLink !== link) endPress();
  pressedLink = link;
  link.dataset.pressed = "true";
  const menu = link.closest<HTMLElement>("nav");
  menu?.setAttribute("data-pressing", "true");
  if (link.dataset.index !== undefined) menu?.style.setProperty(PRESS_INDEX_PROPERTY, link.dataset.index);
  if (isTapped && hasTabOutline(target)) {
    document.documentElement.setAttribute(PENDING_TAB_ATTRIBUTE, target);
    window.scrollTo(0, 0);
    slideIn(link);
  }
  clearTimeout(timer);
  timer = setTimeout(endPress, PRESSED_TIMEOUT_MS);
}

function hasModifier(event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

// Tapping the tab already shown takes its page back to the top, smoothly, without loading it again.
function isShown(href: string) {
  return href === window.location.pathname + window.location.search;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: matches(REDUCED_MOTION_QUERY) ? "auto" : "smooth" });
}

// The handlers a tab-bar or sidebar link spreads. A ⌘- or Ctrl-click opens a new tab and leaves this page as it is.
export function readPressHandlers(href: string) {
  return {
    onPointerDown: (event: PointerEvent<HTMLAnchorElement>) => {
      if (event.button === 0 && !hasModifier(event)) pressTab(event.currentTarget, href, false);
    },
    onPointerCancel: endPress,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.button !== 0 || hasModifier(event)) return endPress();
      if (isShown(href)) {
        event.preventDefault();
        endPress();
        return scrollToTop();
      }
      pressTab(event.currentTarget, href, true);
    },
  };
}

// Ends a press whenever the address changes, before the new page paints.
export function PressEnd() {
  const pathname = usePathname();
  useLayoutEffect(() => endPress(), [pathname]);
  return null;
}

const subscribeToNothing = () => () => {};

// The outlines of the menu's tabs, drawn once after the page loads and hidden (globals.css) until their tab is tapped:
// the rules below show the tapped one and hide the page while `data-pending-tab` names it. Not in the server's page: they cost a tap nothing, and the first load nothing either.
export function TabOutlines({ hrefs }: { hrefs: readonly string[] }) {
  const isHydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  if (!isHydrated) return null;
  const paths = [...new Set(hrefs.map(toPathname))].filter(hasTabOutline);
  return (
    <>
      {paths.map((path) => (
        <div key={path} data-slot="tab-outline" data-for={path}>
          {renderTabOutline(path)}
        </div>
      ))}
      {/* Only for outlines drawn here: a tab with none never hides the page. */}
      <style>{paths.map((path) => `html[${PENDING_TAB_ATTRIBUTE}="${path}"] [data-slot="tab-outline"][data-for="${path}"]{display:block}html[${PENDING_TAB_ATTRIBUTE}="${path}"] [data-slot="page"]{display:none}`).join("\n")}</style>
    </>
  );
}
