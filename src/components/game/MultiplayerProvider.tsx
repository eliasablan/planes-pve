"use client";

import React, { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useGameStore } from "@/store/useGameStore";

interface MultiplayerProviderProps {
  roomName: string;
  userId: string;
  username: string;
  children: React.ReactNode;
}

export function MultiplayerProvider({
  roomName,
  userId,
  username,
  children,
}: MultiplayerProviderProps) {
  const { updatePlayer, removePlayer, setGameStatus, addKill } = useGameStore();

  useEffect(() => {
    const channel = supabase.channel(`room:${roomName}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        // Handle initial sync
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("Player joined:", newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("Player left:", leftPresences);
        removePlayer(key);
      })
      .on("broadcast", { event: "move" }, ({ payload }) => {
        updatePlayer(payload.id, {
          position: payload.position,
          rotation: payload.rotation,
          hp: payload.hp,
          username: payload.username,
        });
      })
      .on("broadcast", { event: "hit" }, ({ payload }) => {
        // Handle being hit or someone else being hit
        if (payload.victimId === userId) {
          useGameStore.getState().reduceHp(payload.damage);
        }
      })
      .on("broadcast", { event: "kill" }, ({ payload }) => {
        addKill(payload.killerName, payload.victimName);
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
      channel.unsubscribe();
    };
  }, [roomName, userId, username, updatePlayer, removePlayer, addKill]);

  return <>{children}</>;
}
