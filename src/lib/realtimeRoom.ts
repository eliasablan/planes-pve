import { supabase } from "@/lib/supabase";
import type { HitEvent, KillEvent } from "@/lib/combatResolution";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type LocalPlayerSnapshot = {
  id: string;
  username: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  hp: number;
};

type RealtimeRoomHandlers = {
  onMove: (snapshot: LocalPlayerSnapshot) => void;
  onHit: (hit: HitEvent) => void;
  onKill: (kill: KillEvent) => void;
  onLeave: (playerId: string) => void;
};

const roomChannels = new Map<string, RealtimeChannel>();

export function joinRealtimeRoom(
  roomName: string,
  userId: string,
  username: string,
  handlers: RealtimeRoomHandlers
) {
  const topic = roomTopic(roomName);
  const channel = supabase.channel(topic, {
    config: {
      presence: {
        key: userId,
      },
    },
  });
  roomChannels.set(topic, channel);

  channel
    .on("presence", { event: "sync" }, () => {
      channel.presenceState();
    })
    .on("presence", { event: "join" }, ({ newPresences }) => {
      console.log("Player joined:", newPresences);
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      console.log("Player left:", leftPresences);
      handlers.onLeave(key);
    })
    .on("broadcast", { event: "move" }, ({ payload }) => {
      handlers.onMove(payload as LocalPlayerSnapshot);
    })
    .on("broadcast", { event: "hit" }, ({ payload }) => {
      handlers.onHit(payload as HitEvent);
    })
    .on("broadcast", { event: "kill" }, ({ payload }) => {
      handlers.onKill(payload as KillEvent);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId,
          username,
          online_at: new Date().toISOString(),
        });
      }
    });

  return () => {
    void channel.unsubscribe();
    roomChannels.delete(topic);
  };
}

export async function publishLocalSnapshot(roomName: string, snapshot: LocalPlayerSnapshot) {
  await publish(roomName, "move", snapshot);
}

export async function publishHit(roomName: string, hit: HitEvent) {
  await publish(roomName, "hit", hit);
}

export async function publishKill(roomName: string, kill: KillEvent) {
  await publish(roomName, "kill", kill);
}

async function publish(roomName: string, event: string, payload: unknown) {
  await getRoomChannel(roomName).send({
    type: "broadcast",
    event,
    payload,
  });
}

function getRoomChannel(roomName: string) {
  const topic = roomTopic(roomName);
  const existing = roomChannels.get(topic);
  if (existing) return existing;

  const channel = supabase.channel(topic);
  roomChannels.set(topic, channel);
  return channel;
}

function roomTopic(roomName: string) {
  return `room:${roomName}`;
}
