// The hands of the tour: a fake pointer that moves, clicks and types into the app's real screens. Every action waits
// while the tour is paused and stops at once when the run is cancelled (a step click, a scroll to another step).

export class Cancelled extends Error {
  constructor() {
    super("The tour moved on");
  }
}

type PlayerOptions = {
  // The scaled app box: the pointer lives inside it, so its moves are in the app's own pixels.
  root: HTMLElement;
  pointer: HTMLElement;
  readScale: () => number;
  isPaused: () => boolean;
  // Resolves when the tour is played again.
  waitForPlay: () => Promise<void>;
};

const POINTER_MOVE_MS = 650;
const KEY_MS = 38;

export class Player {
  private readonly options: PlayerOptions;
  private isCancelled = false;

  constructor(options: PlayerOptions) {
    this.options = options;
  }

  cancel() {
    this.isCancelled = true;
  }

  private check() {
    if (this.isCancelled) throw new Cancelled();
  }

  // Wait, counting only the time the tour is playing.
  async wait(ms: number) {
    let left = ms;
    while (left > 0) {
      this.check();
      if (this.options.isPaused()) {
        await this.options.waitForPlay();
        continue;
      }
      const slice = Math.min(left, 50);
      await new Promise((resolve) => setTimeout(resolve, slice));
      left -= slice;
    }
    this.check();
  }

  // Waits until the screen shows the element (a page change renders on the next frame).
  async find(selector: string, timeoutMs = 3000): Promise<HTMLElement> {
    const started = performance.now();
    for (;;) {
      this.check();
      const element = this.options.root.querySelector<HTMLElement>(selector);
      if (element) return element;
      if (performance.now() - started > timeoutMs) throw new Error(`The tour found no ${selector}`);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  private place(x: number, y: number, ms: number) {
    const { pointer } = this.options;
    pointer.style.transitionDuration = `${ms}ms`;
    pointer.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    pointer.classList.add("is-on");
  }

  // The element's centre (or a point near its left edge for a field), in the app's own pixels.
  private target(element: HTMLElement, isField: boolean) {
    const box = this.options.root.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const scale = this.options.readScale();
    const x = isField ? rect.left + Math.min(36, rect.width / 2) : rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return { x: (x - box.left) / scale + this.options.root.scrollLeft, y: (y - box.top) / scale + this.options.root.scrollTop };
  }

  // Scroll the app (it scrolls as one page inside its box) so the element is in view, then move the pointer to it.
  async point(selector: string, { isField = false } = {}) {
    const element = await this.find(selector);
    await this.reveal(element);
    const { x, y } = this.target(element, isField);
    this.place(x, y, POINTER_MOVE_MS);
    await this.wait(POINTER_MOVE_MS + 120);
    return element;
  }

  async reveal(element: HTMLElement) {
    const { root } = this.options;
    const scale = this.options.readScale();
    const box = root.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const top = (rect.top - box.top) / scale;
    const bottom = (rect.bottom - box.top) / scale;
    const height = box.height / scale;
    if (top >= 40 && bottom <= height - 40) return;
    const goal = Math.max(0, root.scrollTop + top - height * 0.3);
    root.scrollTo({ top: goal, behavior: "smooth" });
    await this.wait(550);
  }

  async scrollTo(top: number) {
    this.options.root.scrollTo({ top, behavior: "smooth" });
    await this.wait(600);
  }

  // A press: the pointer dips and a ring shows where it landed.
  private async press() {
    const { pointer } = this.options;
    pointer.classList.add("is-down");
    await this.wait(160);
    pointer.classList.remove("is-down");
  }

  // Point at it and click it for real: the app's own handler runs.
  async click(selector: string) {
    const element = await this.point(selector);
    await this.press();
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, view: window }));
    await this.wait(250);
  }

  // Point at it and press, without running it: the tour never sends anything.
  async tap(selector: string) {
    await this.point(selector);
    await this.press();
    await this.wait(250);
  }

  // Type into a field the way a person does, one key at a time, through the app's own change handler.
  async type(selector: string, text: string) {
    const field = (await this.point(selector, { isField: true })) as HTMLInputElement | HTMLTextAreaElement;
    await this.press();
    field.classList.add("tour-typing");
    try {
      for (let index = 1; index <= text.length; index += 1) {
        setFieldValue(field, text.slice(0, index));
        await this.wait(KEY_MS);
      }
    } finally {
      field.classList.remove("tour-typing");
    }
  }

  // Submit the form the field sits in, as Enter does.
  async submit(selector: string) {
    const element = await this.find(selector);
    const form = element.closest("form");
    if (!form) throw new Error(`The tour found no form around ${selector}`);
    form.requestSubmit();
    await this.wait(300);
  }

  // Set a field at once, for a still (no pointer, no typing).
  async fill(selector: string, text: string) {
    setFieldValue((await this.find(selector)) as HTMLInputElement | HTMLTextAreaElement, text);
  }

  // For a still (no pointer, no motion; the visitor can't scroll the screen): unless `whole` is already all in view,
  // scroll at once so `selector` sits near the top. A screen that fits isn't moved.
  async show(selector: string, whole = selector) {
    const element = await this.find(selector);
    const { root } = this.options;
    const box = root.getBoundingClientRect();
    const needed = (await this.find(whole)).getBoundingClientRect();
    if (needed.top >= box.top && needed.bottom <= box.bottom) return;
    const top = (element.getBoundingClientRect().top - box.top) / this.options.readScale();
    root.scrollTop = Math.max(0, root.scrollTop + top - 16);
  }

  hide() {
    this.options.pointer.classList.remove("is-on");
  }
}

// React tracks a field's value itself: set it through the element's own setter, then tell React with an input event.
export function setFieldValue(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
}
