"use client";

import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Play } from "lucide-react";

export function Lobby({ roomName, onStart }: { roomName: string, onStart: () => void }) {
  const players = useGameStore((s) => s.players);

  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-background/80 backdrop-blur-md">
      <Card className="w-full max-w-2xl border-primary/20 shadow-2xl">
        <CardHeader className="text-center border-b border-primary/10">
          <CardTitle className="text-4xl font-black tracking-tighter text-primary">
            SQUAD LOBBY: {roomName.toUpperCase()}
          </CardTitle>
          <CardDescription>
            Waiting for other pilots to join the combat zone.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6 text-xl font-bold">
            <Users className="text-primary" />
            <span>PLAYERS: {Object.keys(players).length + 1}</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PILOT NAME</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">LATENCY</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-primary/5">
                <TableCell className="font-bold">You (Local)</TableCell>
                <TableCell className="text-green-500 font-bold">READY</TableCell>
                <TableCell className="text-right">0ms</TableCell>
              </TableRow>
              {Object.values(players).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.username}</TableCell>
                  <TableCell className="text-muted-foreground italic">Syncing...</TableCell>
                  <TableCell className="text-right">-- ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-8 flex justify-center">
            <Button 
              size="lg" 
              className="px-12 py-8 text-2xl font-black rounded-none skew-x-[-12deg] transition-all hover:scale-105"
              onClick={onStart}
            >
              <Play className="mr-2 fill-current" /> DEPLOY TO ZONE
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
