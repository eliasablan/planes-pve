import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default async function Leaderboard() {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("ranking_points", { ascending: false })
    .limit(10);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <Card className="w-full max-w-4xl border-primary/20 shadow-2xl">
        <CardHeader className="text-center">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <CardTitle className="text-4xl font-black tracking-tighter">GLOBAL PILOT RANKINGS</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">RANK</TableHead>
                <TableHead>PILOT</TableHead>
                <TableHead className="text-right">KILLS</TableHead>
                <TableHead className="text-right">WINS</TableHead>
                <TableHead className="text-right text-primary">POINTS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles || []).map((profile, index) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-bold">#{index + 1}</TableCell>
                  <TableCell>{profile.username}</TableCell>
                  <TableCell className="text-right">{profile.total_kills}</TableCell>
                  <TableCell className="text-right">{profile.total_wins}</TableCell>
                  <TableCell className="text-right font-black text-primary">{profile.ranking_points}</TableCell>
                </TableRow>
              ))}
              {(!profiles || profiles.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                    No flight records found yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          <div className="mt-8 text-center">
            <a href="/" className="text-primary hover:underline font-bold">← RETURN TO BASE</a>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
