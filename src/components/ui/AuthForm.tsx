"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, User, Lock, Loader2, Cpu } from "lucide-react";

export function AuthForm() {
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const setUser = useGameStore((s) => s.setUser);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let emailToUse = username.toLowerCase();
    if (!emailToUse.includes('@')) {
      emailToUse = `${emailToUse}@skybound.io`;
    }

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });
        if (error) throw error;
        if (data.user) {
          const profile = await fetchProfile(data.user.id);
          setUser(profile);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: emailToUse,
          password,
          options: {
            data: { username },
          },
        });
        if (error) throw error;
        if (data.user) {
          // Profile is created by trigger in DB
          const profile = await fetchProfile(data.user.id);
          setUser(profile);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-2xl shadow-2xl rounded-2xl relative overflow-hidden border-t-white/20">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      <CardHeader className="text-center pt-8">
        <div className="mx-auto bg-primary/10 p-4 rounded-2xl border border-primary/20 w-fit mb-6 shadow-[0_0_20px_rgba(var(--primary),0.15)]">
          <Cpu className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-4xl font-black tracking-tight text-white mb-1">
          {isLogin ? "IDENTITY LINK" : "NEW UPLINK"}
        </CardTitle>
        <CardDescription className="text-primary/60 font-bold uppercase text-[10px] tracking-[0.3em]">
          {isLogin ? "System Access Authorization" : "Register Pilot Biometrics"}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="group relative">
              <User className="absolute left-4 top-4 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="PILOT DESIGNATION"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-white/10 pl-12 h-14 rounded-xl font-bold tracking-wider text-white placeholder:text-white/20 focus:border-primary/50 transition-all"
                required
              />
            </div>
            <div className="group relative">
              <Lock className="absolute left-4 top-4 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
              <Input
                type="password"
                placeholder="SECURE ACCESS CODE"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 pl-12 h-14 rounded-xl font-bold tracking-wider text-white placeholder:text-white/20 focus:border-primary/50 transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[11px] p-3 rounded-xl font-bold text-center animate-in fade-in zoom-in-95">
              CRITICAL ERROR: {error.toUpperCase()}
            </div>
          )}

          <Button 
            className="w-full h-14 text-sm font-black tracking-[0.2em] rounded-xl transition-all shadow-xl bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : (isLogin ? "ESTABLISH LINK" : "INITIALIZE UNIT")}
          </Button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-[10px] font-black text-white/30 hover:text-primary transition-all py-2 uppercase tracking-[0.2em]"
          >
            {isLogin ? "Generate New ID" : "Return to Login"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
