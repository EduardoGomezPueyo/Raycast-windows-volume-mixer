import { ActionPanel, Action, Icon, Image, List, showToast, Toast, Color, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getAudioSessions, setSessionVolume, toggleSessionMute, SessionInfo } from "./volume-mixer";

function getVolumeIcon(session: SessionInfo): { source: Icon; tintColor?: Color } {
  if (session.muted) {
    return { source: Icon.SpeakerOff, tintColor: Color.Red };
  }
  if (session.volumePercent === 0) return { source: Icon.SpeakerOff };
  if (session.volumePercent < 34) return { source: Icon.SpeakerLow };
  if (session.volumePercent < 67) return { source: Icon.SpeakerOn };
  return { source: Icon.SpeakerHigh };
}

export default function Command() {
  const { data: sessions, isLoading, revalidate, error } = usePromise(async () => getAudioSessions());

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to load audio sessions", message: String(error) });
  }

  async function handleVolumeChange(session: SessionInfo, newPercent: number) {
    try {
      setSessionVolume(session.appName, newPercent);
      const clamped = Math.max(0, Math.min(100, newPercent));
      await showToast({ style: Toast.Style.Success, title: `${session.displayName}: ${clamped}%` });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to set volume", message: String(e) });
    }
    revalidate();
  }

  async function handleToggleMute(session: SessionInfo) {
    try {
      toggleSessionMute(session.appName);
      const newState = !session.muted;
      await showToast({
        style: Toast.Style.Success,
        title: `${session.displayName}: ${newState ? "Muted" : "Unmuted"}`,
      });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to toggle mute", message: String(e) });
    }
    revalidate();
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && (!sessions || sessions.length === 0) ? (
        <List.EmptyView icon={Icon.SpeakerOff} title="No Audio Sessions" description="No active audio sessions found. Play some audio and refresh." />
      ) : (
        sessions?.map((session) => (
          <List.Item
            key={session.id}
            icon={{ fileIcon: session.appName }}
            title={session.displayName}
            subtitle={`${session.volumePercent}%`}
            accessories={[
              ...(session.muted ? [{ tag: { value: "Muted", color: Color.Red } }] : []),
              { icon: getVolumeIcon(session) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Volume Up (+10%)"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["shift"], key: "arrowRight" }}
                  onAction={() => handleVolumeChange(session, session.volumePercent + 10)}
                />
                <Action
                  title="Volume Down (-10%)"
                  icon={Icon.Minus}
                  shortcut={{ modifiers: ["shift"], key: "arrowLeft" }}
                  onAction={() => handleVolumeChange(session, session.volumePercent - 10)}
                />
                <Action
                  title="Volume Up (+5%)"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["ctrl"], key: "arrowRight" }}
                  onAction={() => handleVolumeChange(session, session.volumePercent + 5)}
                />
                <Action
                  title="Volume Down (-5%)"
                  icon={Icon.Minus}
                  shortcut={{ modifiers: ["ctrl"], key: "arrowLeft" }}
                  onAction={() => handleVolumeChange(session, session.volumePercent - 5)}
                />
          {/*       <Action
                  title="Volume Up (+1%)"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "arrowRight" }}
                  onAction={() => handleVolumeChange(session, session.volumePercent + 1)}
                />
                <Action
                  title="Volume Down (-1%)"
                  icon={Icon.Minus}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "arrowLeft" }}
                  onAction={() => handleVolumeChange(session, session.volumePercent - 1)}
                /> */}
                <Action
                  title="Toggle Mute"
                  icon={Icon.SpeakerOff}
                  shortcut={{ modifiers: ["ctrl"], key: "m"} as Keyboard.Shortcut}
                  onAction={() => handleToggleMute(session)}
                />
                <Action
                  title="Volume to 100%"
                  icon={Icon.SpeakerHigh}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "arrowUp"}}
                  onAction={() => handleVolumeChange(session, 100)}
                />
                <Action
                  title="Volume to 0%"
                  icon={Icon.SpeakerOff}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "arrowDown"}}
                  onAction={() => handleVolumeChange(session, 0)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["ctrl"], key: "r"}}
                  onAction={() => revalidate()}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
