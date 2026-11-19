import "server-only";

import { AUDIT_ACTIONS } from "@/platform/audit/actions";
import { withAdminTransaction } from "@/platform/audit/admin-transaction";
import { recordAdminAction } from "@/platform/audit/record";
import { isPreview } from "@/platform/database/migration-plan";
import type { DatabaseOrTransaction } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";
import type { RequestContext } from "@/platform/http/request-context";
import { RequestError } from "@/platform/http/request-error";
import { looksSealed, openSealedSecret, OPEN_OUTCOMES, sealSecret } from "@/platform/secrets/sealed";
import { readSetupToken } from "@/platform/secrets/setup-token";
import { readSettings, saveSettings } from "@/platform/settings/store";

import type { VoiceConfig } from "./client";
import { VOICE_ERROR_CODES, VOICE_MESSAGES, VOICE_SETTING_KEYS, VOICE_SOURCES, type VoiceSettingsBody, type VoiceSettingsView } from "./contract";

const UNPROCESSABLE_STATUS = 422;
const SECRET_LABEL = VOICE_SETTING_KEYS.apiSecret;

// The server's own LiveKit (the installer and docker-compose set these) wins; else the keys an admin saved, like
// LiveKit Cloud's. LIVEKIT_URL is what browsers connect to; LIVEKIT_API_URL is how this server reaches LiveKit when
// that differs (inside docker), else the same address over http.
function readServerConfig(environment: Environment): VoiceConfig | null {
  const serverUrl = environment.LIVEKIT_URL?.trim();
  const apiKey = environment.LIVEKIT_API_KEY?.trim();
  const apiSecret = environment.LIVEKIT_API_SECRET?.trim();
  if (!serverUrl || !apiKey || !apiSecret) return null;
  return { serverUrl, apiUrl: environment.LIVEKIT_API_URL?.trim() || toApiUrl(serverUrl), apiKey, apiSecret };
}

function toApiUrl(serverUrl: string) {
  return serverUrl.replace(/^ws(s?):\/\//, "http$1://");
}

async function openSecret(environment: Environment, stored: string | undefined) {
  if (!stored) return null;
  if (!looksSealed(stored)) return stored;
  const token = readSetupToken(environment);
  if (!token) return null;
  const result = await openSealedSecret(stored, token, SECRET_LABEL);
  return result.outcome === OPEN_OUTCOMES.opened ? result.secret : null;
}

async function readSaved(database: DatabaseOrTransaction) {
  const settings = await readSettings(database, Object.values(VOICE_SETTING_KEYS));
  return { url: settings.get(VOICE_SETTING_KEYS.url) || null, apiKey: settings.get(VOICE_SETTING_KEYS.apiKey) || null, secret: settings.get(VOICE_SETTING_KEYS.apiSecret) };
}

export async function readVoiceConfig(database: DatabaseOrTransaction, environment: Environment): Promise<VoiceConfig | null> {
  const server = readServerConfig(environment);
  if (server) return server;
  const saved = await readSaved(database);
  const apiSecret = await openSecret(environment, saved.secret);
  if (!saved.url || !saved.apiKey || !apiSecret) return null;
  return { serverUrl: saved.url, apiUrl: toApiUrl(saved.url), apiKey: saved.apiKey, apiSecret };
}

export async function requireVoiceConfig(database: DatabaseOrTransaction, environment: Environment) {
  const config = await readVoiceConfig(database, environment);
  if (!config) throw new RequestError(UNPROCESSABLE_STATUS, VOICE_ERROR_CODES.notConfigured, VOICE_MESSAGES.notConfigured);
  return config;
}

function readSecretStorage(environment: Environment): VoiceSettingsView["secretStorage"] {
  if (isPreview(environment)) return "refused";
  return readSetupToken(environment) ? "sealed" : "unencrypted";
}

// What Set up › Rooms shows. Never the secret.
export async function readVoiceSettingsView(database: DatabaseOrTransaction, environment: Environment): Promise<VoiceSettingsView> {
  const secretStorage = readSecretStorage(environment);
  const server = readServerConfig(environment);
  if (server) return { source: VOICE_SOURCES.server, url: server.serverUrl, apiKey: server.apiKey, hasSecret: true, secretStorage };
  const saved = await readSaved(database);
  const isComplete = Boolean(saved.url && saved.apiKey && (await openSecret(environment, saved.secret)));
  return { source: isComplete ? VOICE_SOURCES.saved : VOICE_SOURCES.none, url: saved.url, apiKey: saved.apiKey, hasSecret: Boolean(saved.secret), secretStorage };
}

// Saves LiveKit Cloud keys. The secret is sealed with SETUP_TOKEN like the Village secret; empty keeps the saved one.
export async function saveVoiceSettings({ database, environment, member }: RequestContext, body: VoiceSettingsBody) {
  if (isPreview(environment)) {
    throw new RequestError(UNPROCESSABLE_STATUS, VOICE_ERROR_CODES.notConfigured, "LiveKit keys can't be saved from a preview. Save them on your live site.");
  }
  const token = readSetupToken(environment);
  const settings: Record<string, string> = { [VOICE_SETTING_KEYS.url]: body.url, [VOICE_SETTING_KEYS.apiKey]: body.apiKey };
  if (body.apiSecret) settings[VOICE_SETTING_KEYS.apiSecret] = token ? await sealSecret(body.apiSecret, token, SECRET_LABEL) : body.apiSecret;
  if (!body.url && !body.apiKey) settings[VOICE_SETTING_KEYS.apiSecret] = "";
  await withAdminTransaction(database, member.id, async (transaction) => {
    await saveSettings(transaction, settings);
    await recordAdminAction(transaction, member.id, { action: AUDIT_ACTIONS.voiceSettingsSaved });
  });
}
