import type { Metadata } from "next";
import { Chakra_Petch } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScoreQueryProvider } from "@/components/ScoreQueryProvider";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Skybound Survival",
  description: "Single-player arcade airplane survival",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={chakraPetch.variable}>
      <body
        className="antialiased min-h-screen bg-background text-foreground"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="theme-military"
          enableSystem
          disableTransitionOnChange
        >
          <ScoreQueryProvider>{children}</ScoreQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
