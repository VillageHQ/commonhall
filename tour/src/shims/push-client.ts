import { DEVICE_STATES, type DeviceState } from "@/components/alerts/push-client";

// The tour's stand-in for `src/components/alerts/push-client.ts`: the visitor's own browser is never asked about
// alerts. The tour's device has alerts on; its buttons wait forever, like every request in the tour.
export { DEVICE_STATES, type DeviceState };

export function isAppleMobile() {
  return false;
}

export function isInstalled() {
  return false;
}

export async function registerServiceWorker() {
  return undefined;
}

export async function readDeviceState(): Promise<DeviceState> {
  return DEVICE_STATES.on;
}

function never<Value>(): Promise<Value> {
  return new Promise(() => undefined);
}

export function turnOnAlerts(_vapidPublicKey: string) {
  return never<DeviceState>();
}

export function turnOffAlerts() {
  return never<DeviceState>();
}

export function sendTestAlert() {
  return never<{ message: string }>();
}
