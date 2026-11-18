import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { setTourAddress } from "./shims/next-navigation";
import { Cancelled, Player } from "./player";
import { createTourQueryClient, seedTourData, TourScreens } from "./screens";
import { TOUR_STEPS, type TourHands } from "./steps";

// The landing page's live tour (#demo). The build put the tabs, the captions and a still of step 1 in the page
// (index.html, between the tour markers); this script brings the still to life:
// - roomy desktop window, motion allowed: the stage pins in the middle of the window and the scroll picks the step;
//   each step plays once when reached.
// - phone, short window: it plays by itself, step after step, while it is in view.
// - reduced motion: each step shows still; a tap on a tab changes it.
// Pause / Play stops and resumes the pointer. A tab click jumps to that step and stops the auto-advance.

const PHONE_LAYOUT_BELOW = 700;
// The app's width when the stage is wide enough for its desktop layout (sidebar from 1000 px), shown scaled.
const DESKTOP_APP_WIDTH = 1200;
const SCROLL_MIN_WIDTH = 1000;
const SCROLL_MIN_HEIGHT = 700;
const SCROLL_HOLD_MS = 900;

function setUpTour() {
  const root = document.getElementById("demo-root");
  const host = document.getElementById("tour-screen");
  if (!root || !host) return;
  const stage = root.querySelector<HTMLElement>(".demo-stage");
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>(".demo-tab"));
  const captions = Array.from(root.querySelectorAll<HTMLElement>(".tour-caption"));
  const toggle = root.querySelector<HTMLButtonElement>(".tour-toggle");
  if (!stage) return;

  // The still came as a declarative shadow root; an older browser left it as a template.
  let shadow = host.shadowRoot;
  if (!shadow) {
    const template = host.querySelector("template");
    shadow = host.attachShadow({ mode: "open" });
    if (template) {
      shadow.append(template.content.cloneNode(true));
      template.remove();
    }
  }
  const app = shadow.querySelector<HTMLElement>(".tour-app");
  const mount = shadow.querySelector<HTMLElement>(".tour-mount");
  if (!app || !mount) return;
  const pointer = document.createElement("div");
  pointer.className = "tour-pointer";
  pointer.setAttribute("aria-hidden", "true");
  app.append(pointer);

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = { step: 0, scale: 1, isPaused: false, isAutoAdvance: true, isInView: false, mode: "timer" as "timer" | "scroll" | "still", holdScrollUntil: 0, run: 0, isRunning: false };
  let player: Player | null = null;
  let resumers: (() => void)[] = [];

  // ---------- the app, its theme and its size ----------
  const client = createTourQueryClient();
  const reactRoot = createRoot(mount);

  function readTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }
  function applyTheme() {
    app!.classList.toggle("dark", readTheme());
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  applyTheme();

  function layout() {
    const width = host!.clientWidth;
    const height = host!.clientHeight;
    const appWidth = width >= PHONE_LAYOUT_BELOW ? DESKTOP_APP_WIDTH : width;
    state.scale = width / appWidth;
    app!.style.width = `${appWidth}px`;
    app!.style.height = `${height / state.scale}px`;
    app!.style.transform = state.scale === 1 ? "" : `scale(${state.scale})`;
  }

  // ---------- steps ----------
  function markStep(index: number) {
    state.step = index;
    tabs.forEach((tab, position) => {
      const isOn = position === index;
      tab.classList.toggle("is-on", isOn);
      tab.setAttribute("aria-selected", String(isOn));
      tab.tabIndex = isOn ? 0 : -1;
    });
    captions.forEach((caption, position) => {
      caption.hidden = position !== index;
    });
    centreTab(index);
  }

  function centreTab(index: number) {
    const tab = tabs[index];
    const row = tab?.parentElement;
    if (!tab || !row || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2, behavior: state.mode === "still" ? "auto" : "smooth" });
  }

  function open(href: string) {
    seedTourData(client);
    flushSync(() => setTourAddress(href));
    app!.scrollTop = 0;
  }

  function waitForPlay() {
    return new Promise<void>((resolve) => resumers.push(resolve));
  }

  function makeHands(run: Player): TourHands {
    return Object.assign(run, {
      go: async (href: string) => {
        flushSync(() => setTourAddress(href));
        await run.wait(50);
      },
    });
  }

  function newPlayer() {
    player?.cancel();
    state.isRunning = false;
    pointer.classList.remove("is-on");
    player = new Player({ root: app!, pointer, readScale: () => state.scale, isPaused: () => state.isPaused, waitForPlay });
    return player;
  }

  async function showStill(index: number) {
    const step = TOUR_STEPS[index];
    if (!step) return;
    const hands = makeHands(newPlayer());
    open(step.still);
    markStep(index);
    try {
      await step.settle?.(hands);
    } catch (error) {
      if (!(error instanceof Cancelled)) throw error;
    }
  }

  async function playStep(index: number) {
    const step = TOUR_STEPS[index];
    if (!step) return;
    const hands = makeHands(newPlayer());
    const run = ++state.run;
    state.isRunning = true;
    open(step.start);
    markStep(index);
    try {
      await step.play(hands);
    } catch (error) {
      if (error instanceof Cancelled) return;
      // A step that cannot finish (a screen changed under it) shows its still instead of stopping the tour.
      console.warn(error);
      await showStill(index);
    }
    if (run !== state.run) return;
    state.isRunning = false;
    hands.hide();
    if (state.mode === "timer" && state.isAutoAdvance && !state.isPaused) {
      void playStep((index + 1) % TOUR_STEPS.length);
    } else if (state.mode === "timer") {
      setPlaying(false);
    }
  }

  // ---------- Pause / Play ----------
  function setPlaying(isPlaying: boolean) {
    state.isPaused = !isPlaying;
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(!isPlaying));
      toggle.classList.toggle("is-paused", !isPlaying);
      const words = toggle.querySelector(".tour-toggle-words");
      if (words) words.textContent = isPlaying ? "Pause" : "Play";
    }
    if (isPlaying) {
      const waiting = resumers;
      resumers = [];
      waiting.forEach((resume) => resume());
    }
  }

  toggle?.addEventListener("click", () => {
    if (!state.isPaused) {
      setPlaying(false);
      return;
    }
    setPlaying(true);
    // Play after the tour stopped (a step played out after a tab click): carry on with auto-advance from there.
    if (state.mode === "timer" && !isRunning()) {
      state.isAutoAdvance = true;
      void playStep((state.step + 1) % TOUR_STEPS.length);
    } else if (state.mode === "timer") {
      state.isAutoAdvance = true;
    }
  });

  function isRunning() {
    return state.isRunning;
  }

  // ---------- modes ----------
  function readMode(): typeof state.mode {
    if (motionQuery.matches) return "still";
    if (window.innerWidth >= SCROLL_MIN_WIDTH && window.innerHeight >= SCROLL_MIN_HEIGHT) return "scroll";
    return "timer";
  }

  function applyMode() {
    const mode = readMode();
    const changed = mode !== state.mode;
    state.mode = mode;
    root!.classList.toggle("is-scroll", mode === "scroll");
    root!.classList.toggle("is-still", mode === "still");
    placeStage();
    layout();
    if (!changed) return;
    newPlayer();
    if (mode === "still") {
      setPlaying(false);
      void showStill(state.step);
    } else if (mode === "scroll") {
      setPlaying(true);
      syncScroll(true);
    } else {
      setPlaying(true);
      state.isAutoAdvance = true;
      if (state.isInView) void playStep(state.step);
      else void showStill(state.step);
    }
  }

  // The pinned stage sits in the middle of the window.
  function placeStage() {
    if (state.mode !== "scroll") {
      stage!.style.top = "";
      return;
    }
    stage!.style.top = `${Math.max(12, Math.round((window.innerHeight - stage!.offsetHeight) / 2))}px`;
  }

  // Progress through the tall track: 0 when the stage first pins, 1 when it lets go.
  function readProgress() {
    const rect = root!.getBoundingClientRect();
    const pinTop = parseFloat(stage!.style.top) || 0;
    const travel = root!.offsetHeight - stage!.offsetHeight;
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, (pinTop - rect.top) / travel));
  }

  function syncScroll(force = false) {
    if (state.mode !== "scroll" || performance.now() < state.holdScrollUntil) return;
    const index = Math.min(TOUR_STEPS.length - 1, Math.floor(readProgress() * TOUR_STEPS.length));
    if (index === state.step && !force) return;
    void playStep(index);
  }

  function scrollToStep(index: number) {
    const pinTop = parseFloat(stage!.style.top) || 0;
    const travel = root!.offsetHeight - stage!.offsetHeight;
    const goal = window.scrollY + root!.getBoundingClientRect().top - pinTop + ((index + 0.5) / TOUR_STEPS.length) * travel;
    state.holdScrollUntil = performance.now() + SCROLL_HOLD_MS;
    window.scrollTo({ top: goal, behavior: "smooth" });
  }

  // ---------- tabs ----------
  function choose(index: number) {
    if (state.mode === "still") {
      void showStill(index);
      return;
    }
    if (state.mode === "scroll") {
      scrollToStep(index);
      setPlaying(true);
      void playStep(index);
      return;
    }
    state.isAutoAdvance = false;
    setPlaying(true);
    void playStep(index);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => choose(index));
    tab.addEventListener("keydown", (event) => {
      const last = tabs.length - 1;
      const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? Math.min(last, index + 1) : event.key === "ArrowLeft" || event.key === "ArrowUp" ? Math.max(0, index - 1) : event.key === "Home" ? 0 : event.key === "End" ? last : null;
      if (next === null || next === index) return;
      event.preventDefault();
      tabs[next]?.focus({ preventScroll: true });
      choose(next);
    });
  });

  // ---------- in view ----------
  new IntersectionObserver(
    ([entry]) => {
      const isInView = Boolean(entry?.isIntersecting);
      if (isInView === state.isInView) return;
      state.isInView = isInView;
      if (state.mode === "timer") {
        if (isInView && !state.isPaused) {
          if (!isRunning()) void playStep(state.step);
        } else if (!isInView) {
          newPlayer();
        }
      }
    },
    { threshold: 0.35 },
  ).observe(host);

  window.addEventListener("scroll", () => syncScroll(), { passive: true });
  window.addEventListener("resize", () => {
    applyMode();
    syncScroll();
    centreTab(state.step);
  });
  motionQuery.addEventListener("change", applyMode);

  // ---------- start: the still of step 1 is on screen; render the same address, then pick the mode ----------
  flushSync(() => {
    setTourAddress(TOUR_STEPS[0]!.still);
    reactRoot.render(<TourScreens client={client} />);
  });
  root.classList.add("is-live");
  state.mode = "timer";
  state.step = 0;
  const mode = readMode();
  if (mode !== "timer") {
    applyMode();
  } else {
    root.classList.remove("is-scroll", "is-still");
    layout();
    setPlaying(true);
  }
}

setUpTour();
