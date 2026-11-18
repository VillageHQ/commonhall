"use client";

import { useSyncExternalStore } from "react";

// The tour's stand-in for `next/navigation`: the app's screens read the address and push new ones, and the tour keeps
// that address in memory, so nothing ever changes the landing page's own address.

type Listener = () => void;

let current = new URL("https://tour.invalid/");
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function setTourAddress(href: string) {
  current = new URL(href, "https://tour.invalid/");
  emit();
}

export function readTourAddress() {
  return `${current.pathname}${current.search}`;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useAddress() {
  return useSyncExternalStore(subscribe, readTourAddress, readTourAddress);
}

const router = {
  push: (href: string) => setTourAddress(href),
  replace: (href: string) => setTourAddress(href),
  refresh: () => undefined,
  back: () => undefined,
  forward: () => undefined,
  prefetch: () => undefined,
};

export function useRouter() {
  return router;
}

export function usePathname() {
  return new URL(useAddress(), "https://tour.invalid/").pathname;
}

export function useSearchParams() {
  return new URL(useAddress(), "https://tour.invalid/").searchParams;
}

export function useParams() {
  return {};
}

export function redirect(href: string): never {
  throw new Error(`The tour has no page at ${href}`);
}

export const permanentRedirect = redirect;

export function notFound(): never {
  throw new Error("The tour has no such page");
}
