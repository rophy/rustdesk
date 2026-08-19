let HOST = "";
let RELAY_HOST = "";
let CONFIG_KEY = "";

export function setConfig(host: string, relay: string, key: string) {
  HOST = host;
  RELAY_HOST = relay;
  CONFIG_KEY = key;
}

export function getHost(): string {
  return HOST;
}

export function getRelayHost(): string {
  return RELAY_HOST;
}

export function getConfigKey(): string {
  return CONFIG_KEY;
}

export function getDefaultUri(isRelay: Boolean = false): string {
  if (isRelay) {
    return RELAY_HOST || HOST;
  }
  return HOST;
}

export async function loadConfig(): Promise<void> {
  try {
    const resp = await fetch("config.json");
    if (resp.ok) {
      const config = await resp.json();
      if (config.host) HOST = config.host;
      if (config.relay) RELAY_HOST = config.relay;
      if (config.key) CONFIG_KEY = config.key;
      console.log("Loaded config: host=" + HOST + ", relay=" + (RELAY_HOST || HOST));
    }
  } catch (e) {
    console.log("Failed to load config.json (" + e + "), using defaults (host=" + HOST + ")");
  }
}
