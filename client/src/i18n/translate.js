import { en } from "./en.js";
import { am } from "./am.js";

export const LOCALES = ["en", "am"];
export const STORAGE_KEY = "hospital_locale";

export const dictionaries = { en, am };

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Resolve `key` (dot path) for locale, falling back to English then the key string. */
export function translate(locale, key) {
  const primary = getByPath(dictionaries[locale], key);
  if (primary !== undefined) return primary;
  const fallback = getByPath(dictionaries.en, key);
  if (fallback !== undefined) return fallback;
  return key;
}
