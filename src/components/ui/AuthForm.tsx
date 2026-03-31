"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, User, Lock, Loader2 } from "lucide-react";

export function AuthForm() {
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // Supabase needs email, we can use username@game.com
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const setUser = useGameStore((s) => s.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simple hack to support "username" only: we use username@skybound.io as email
    const emailToUse = `${username.toLowerCase()}@skybound.io`;

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setUser({ id: data.user.id, username: username });
        }
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: emailToUse,
          password,
          options: {
            data: { username },
          },
        });
        if (error) throw error;
        if (data.user) {
          setUser({ id: data.user.id, username: username });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-black/80 border-primary/30 backdrop-blur-xl shadow-[0_0_50px_rgba(var(--primary),0.1)]">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-3xl font-black tracking-tighter text-white">
          PILOT IDENTIFICATION
        </CardTitle>
        <CardDescription className="text-primary/60 font-bold uppercase text-[10px] tracking-widest">
          {isLogin ? "Authorization Required" : "Register New Pilot Unit"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-primary/50" />
              <Input
                placeholder="PILOT NAME"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-white/10 pl-10 h-12 font-bold tracking-widest"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-primary/50" />
              <Input
                type="password"
                placeholder="ACCESS CODE"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 pl-10 h-12 font-bold tracking-widest"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-destructive/20 border border-destructive text-destructive text-[10px] p-2 font-bold text-center animate-shake">
              ERROR: {error.toUpperCase()}
            </div>
          )}

          <Button 
            className="w-full h-14 text-lg font-black tracking-widest skew-x-[-10deg] rounded-none transition-all hover:scale-[1.02]"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : (isLogin ? "AUTHORIZE" : "REGISTER UNIT")}
          </Button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-[10px] font-bold text-white/40 hover:text-primary transition-colors py-2 uppercase tracking-widest"
          >
            {isLogin ? "Create New Pilot ID »" : "Existing Unit Login »"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
