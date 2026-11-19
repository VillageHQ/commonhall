"use client";

import { z } from "zod";

import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";
import { forgetThisBrowser } from "@/platform/notifications/browser";
import { DEVICE_TYPES, NOTIFICATION_API_ROUTES, SERVICE_WORKER_PATH } from "@/platform/notifications/contract";

// The browser's side of alerts: the service worker, permission and the push subscription. The browser asks for
// permission only from `turnOnAlerts`, which runs only when the member presses the button.

export const DEVICE_STATES = {
  unsupported: "unsupported",
  // iPhone and iPad: Web Push works only once the app is on the home screen.
  needsInstall: "needs_install",
  blocked: "blocked",
  off: "off",
  on: "on",
} as const;

export type DeviceState = (typeof DEVICE_STATES)[keyof typeof DEVICE_STATES];

export function isAppleMobile() {
  const { userAgent, maxTouchPoints } = navigator;
  return /iPhone|iPad|iPod/.test(userAgent) || (userAgent.includes("Macintosh") && maxTouchPoints > 1);
}

export function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: "/" });
}

async function readSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function readDeviceState(): Promise<DeviceState> {
  if (!isPushSupported()) return isAppleMobile() && !isInstalled() ? DEVICE_STATES.needsInstall : DEVICE_STATES.unsupported;
  if (Notification.permission === "denied") return DEVICE_STATES.blocked;
  if (Notification.permission !== "granted") return DEVICE_STATES.off;
  return (await readSubscription()) ? DEVICE_STATES.on : DEVICE_STATES.off;
}

// VAPID public keys travel as URL-safe base64; the browser wants the raw bytes.
function toKeyBytes(publicKey: string) {
  const padded = `${publicKey}${"=".repeat((4 - (publicKey.length % 4)) % 4)}`.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export async function turnOnAlerts(vapidPublicKey: string): Promise<DeviceState> {
  if (!isPushSupported()) return readDeviceState();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? DEVICE_STATES.blocked : DEVICE_STATES.off;
  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKeyBytes(vapidPublicKey) }));
  await postRequest(NOTIFICATION_API_ROUTES.devices, { type: DEVICE_TYPES.webpush, subscription: subscription.toJSON() }, acknowledgedResponseSchema);
  return DEVICE_STATES.on;
}

export async function turnOffAlerts(): Promise<DeviceState> {
  await forgetThisBrowser();
  return DEVICE_STATES.off;
}

export function sendTestAlert() {
  return postRequest(NOTIFICATION_API_ROUTES.test, {}, acknowledgedResponseSchema.extend({ sent: z.number().optional() }));
}
