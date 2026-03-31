"use client";

import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Skull, RefreshCw } from "lucide-react";

export function GameOver({ winner, onRestart }: { winner?: string, onRestart: () => void }) {
  const { score, hp } = useGameStore();
  const isWinner = hp > 0;

  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-black/90 backdrop-blur-xl z-50 fixed inset-0">
      <Card className="w-full max-w-md border-primary/20 bg-black/50 text-white">
        <CardHeader className="text-center">
          {isWinner ? (
            <>
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
              <CardTitle className="text-5xl font-black text-yellow-500 tracking-tighter">VICTORY!</CardTitle>
            </>
          ) : (
            <>
              <Skull className="w-16 h-16 text-destructive mx-auto mb-4" />
              <CardTitle className="text-5xl font-black text-destructive tracking-tighter">DEFEATED</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-xl mb-8 text-muted-foreground italic">
            {isWinner ? "You are the ACE of the zone." : `Eliminated by ${winner || "the Zone"}.`}
          </p>
          
          <div className="flex justify-around mb-8 p-4 bg-white/5 rounded border border-white/10">
            <div>
              <div className="text-xs font-bold text-white/50 uppercase">Score</div>
              <div className="text-3xl font-black">{score}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-white/50 uppercase">Kills</div>
              <div className="text-3xl font-black">--</div>
            </div>
          </div>

          <Button 
            size="lg" 
            variant={isWinner ? "default" : "outline"} 
            className="w-full py-8 text-2xl font-bold rounded-none"
            onClick={onRestart}
          >
            <RefreshCw className="mr-2 h-6 w-6" /> RETURN TO HANGAR
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
