"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex gap-2 p-4">
      <Button 
        variant={theme === "theme-military" ? "default" : "outline"}
        onClick={() => setTheme("theme-military")}
      >
        Military
      </Button>
      <Button 
        variant={theme === "theme-neon" ? "default" : "outline"}
        onClick={() => setTheme("theme-neon")}
      >
        Neon
      </Button>
      <Button 
        variant={theme === "theme-classic" ? "default" : "outline"}
        onClick={() => setTheme("theme-classic")}
      >
        Classic
      </Button>
    </div>
  );
}
