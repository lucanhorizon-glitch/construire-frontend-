"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import PwaPrompt from "@/components/shared/PwaPrompt";
import { useAuthStore } from "@/store/authStore";

function AppFooter() {
  return (
    <footer className="hidden lg:flex items-center justify-center gap-4 py-2 px-4 border-t text-xs text-muted-foreground/60">
      <Link href="/cgv" className="hover:text-muted-foreground transition-colors">CGV</Link>
      <Link href="/cgu" className="hover:text-muted-foreground transition-colors">CGU</Link>
      <Link href="/confidentialite" className="hover:text-muted-foreground transition-colors">Confidentialité</Link>
      <Link href="/mentions-legales" className="hover:text-muted-foreground transition-colors">Mentions légales</Link>
    </footer>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { token, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token) router.replace("/auth/login");
  }, [token, _hasHydrated, router]);

  if (!_hasHydrated || !token) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>
        <AppFooter />
      </div>
      <BottomNav />
      <PwaPrompt />
    </div>
  );
}
