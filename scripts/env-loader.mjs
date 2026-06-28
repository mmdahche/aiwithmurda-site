import fs from "node:fs";
import path from "node:path";

export const rootDir = path.resolve(import.meta.dirname, "..");
export const defaultEnvPath = path.join(rootDir, ".secrets", "aiwithmurda.render.env");

export function parseEnvFile(filePath = defaultEnvPath) {
  const env = {};
  const text = fs.readFileSync(filePath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

export function loadEnv(filePath = process.argv[2] ? path.resolve(process.argv[2]) : defaultEnvPath) {
  return { ...process.env, ...parseEnvFile(filePath), ENV_PATH: filePath };
}

export function requireEnv(env, key) {
  if (env[key]) return env[key];
  throw new Error(`Missing ${key} in ${env.ENV_PATH || "environment"}`);
}

export function getSiteUrl(env) {
  return (env.SMOKE_SITE_URL || env.SITE_URL || "https://aiwithmurda.com").replace(/\/+$/, "");
}
