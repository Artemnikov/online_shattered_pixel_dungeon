const DEFAULT_API_URL = "https://online-pixel-dungeon-765991295854.europe-west1.run.app";

export const getApiBaseUrl = () => {
  const runtimeApiUrl =
    typeof window !== "undefined" ? window.__APP_CONFIG__?.API_URL : "";
  const candidates = [
    runtimeApiUrl,
    import.meta.env.VITE_API_URL,
    DEFAULT_API_URL,
  ];

  for (const candidate of candidates) {
    const normalized = typeof candidate === "string" ? candidate.trim() : "";
    if (normalized) return normalized.replace(/\/$/, "");
  }

  return DEFAULT_API_URL;
};

export const getWsBaseUrl = () => {
  return getApiBaseUrl()
    .replace(/^http:\/\//, "ws://")
    .replace(/^https:\/\//, "wss://");
};
