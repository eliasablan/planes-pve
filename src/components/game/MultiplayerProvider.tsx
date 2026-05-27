"use client";

import React, { useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { recordKill, resolveIncomingHit } from "@/lib/combatResolution";
import { joinRealtimeRoom } from "@/lib/realtimeRoom";

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
  const { updatePlayer, removePlayer } = useGameStore();

  useEffect(() => {
    return joinRealtimeRoom(roomName, userId, username, {
      onMove: (snapshot) => {
        updatePlayer(snapshot.id, {
          position: snapshot.position,
          rotation: snapshot.rotation,
          hp: snapshot.hp,
          username: snapshot.username,
        });
      },
      onHit: (hit) => {
        void resolveIncomingHit(roomName, { id: userId, username }, hit);
      },
      onKill: (kill) => {
        recordKill(kill, userId);
      },
      onLeave: removePlayer,
    });
  }, [roomName, userId, username, updatePlayer, removePlayer]);

  return <>{children}</>;
}
