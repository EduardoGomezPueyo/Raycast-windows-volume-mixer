import SoundMixer, { AudioSessionState, DeviceType } from "native-sound-mixer";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

export interface SessionInfo {
  id: string;
  displayName: string;
  appName: string;
  iconPath: string;
  volumePercent: number;
  volumeRaw: number;
  muted: boolean;
}

function getDefaultOutputDevice() {
  return SoundMixer.getDefaultDevice(DeviceType.RENDER);
}

// native-sound-mixer encodes each UTF-16 unit separately, so emojis (surrogate pairs)
// arrive as runs of U+FFFD. The original characters are unrecoverable; strip them.
function cleanName(name: string): string {
  return name.replace(/�+/g, "").replace(/\s{2,}/g, " ").trim();
}

const resolvedPaths = new Map<string, string>();

// Process paths come back ANSI-encoded, so non-ASCII characters (e.g. "ó" in a username)
// become U+FFFD and the path doesn't exist. Rebuild it by matching each broken segment
// against the real directory entries, treating U+FFFD as a wildcard.
function resolvePath(path: string): string {
  if (!path.includes("�") || existsSync(path)) return path;

  const cached = resolvedPaths.get(path);
  if (cached) return cached;

  const [root, ...segments] = path.split("\\");
  const resolved = resolveSegments(root + "\\", segments);
  if (!resolved) return path;

  resolvedPaths.set(path, resolved);
  return resolved;
}

// Several entries can match a broken segment (e.g. a leftover mojibake folder like
// "GÃ³mez"), so try each one, shortest first, and keep the one whose full path exists.
function resolveSegments(current: string, segments: string[]): string | undefined {
  if (segments.length === 0) return existsSync(current) ? current : undefined;

  const [segment, ...rest] = segments;
  if (!segment.includes("�")) return resolveSegments(join(current, segment), rest);

  const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("^" + escaped.replace(/�/g, ".{1,2}") + "$", "i");
  let candidates: string[];
  try {
    candidates = readdirSync(current).filter((entry) => pattern.test(entry));
  } catch {
    return undefined;
  }

  for (const candidate of candidates.sort((a, b) => a.length - b.length)) {
    const resolved = resolveSegments(join(current, candidate), rest);
    if (resolved) return resolved;
  }
  return undefined;
}

export function getAudioSessions(): SessionInfo[] {
  const device = getDefaultOutputDevice();
  if (!device) return [];

  return device.sessions
    .filter((s) => s.state !== AudioSessionState.EXPIRED && (s.name || s.appName))
    .map((s) => ({
      id: s.appName || s.name,
      displayName: cleanName(s.name || "") || s.appName || "Unknown",
      appName: s.appName,
      iconPath: resolvePath(s.appName),
      volumePercent: Math.round(s.volume * 100),
      volumeRaw: s.volume,
      muted: s.mute,
    }));
}

export function setSessionVolume(appName: string, volumePercent: number): void {
  const device = getDefaultOutputDevice();
  if (!device) throw new Error("No output device found");

  const session = device.sessions.find((s) => s.appName === appName);
  if (!session) throw new Error(`Session "${appName}" not found`);

  const clamped = Math.max(0, Math.min(100, volumePercent));
  session.volume = clamped / 100;
}

export function toggleSessionMute(appName: string): void {
  const device = getDefaultOutputDevice();
  if (!device) throw new Error("No output device found");

  const session = device.sessions.find((s) => s.appName === appName);
  if (!session) throw new Error(`Session "${appName}" not found`);

  session.mute = !session.mute;
}
