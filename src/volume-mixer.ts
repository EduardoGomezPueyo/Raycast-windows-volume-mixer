import SoundMixer, { AudioSessionState, DeviceType } from "native-sound-mixer";

export interface SessionInfo {
  id: string;
  displayName: string;
  appName: string;
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

export function getAudioSessions(): SessionInfo[] {
  const device = getDefaultOutputDevice();
  if (!device) return [];

  return device.sessions
    .filter((s) => s.state !== AudioSessionState.EXPIRED && (s.name || s.appName))
    .map((s) => ({
      id: s.appName || s.name,
      displayName: cleanName(s.name || "") || s.appName || "Unknown",
      appName: s.appName,
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
