"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HardHat, LayoutDashboard, LogOut, ArrowLeft, Settings } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PRO_CATEGORY_LABELS: Record<string, string> = {
  constructeur: "Constructeur",
  architecte: "Architecte",
  maitre_oeuvre: "Maître d'œuvre",
  cmiste: "C.M.I.",
};

export default function ProLayout({ children }: { children: React.ReactNode }) {
  const { token, user, _hasHydrated, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token) { router.replace("/auth/login"); return; }
    if (user?.account_type !== "pro") { router.replace("/dashboard"); return; }
  }, [token, user, _hasHydrated, router]);

  if (!_hasHydrated || !token || user?.account_type !== "pro") return null;

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    clearAuth();
    router.replace("/auth/login");
  };

  const categoryLabel = user.pro_category ? (PRO_CATEGORY_LABELS[user.pro_category] ?? "Pro") : "Pro";

  const navItems = [
    { href: "/pro", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    { href: "/pro/settings", label: "Paramètres", icon: Settings, exact: false },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card/50">
        <div className="p-4 border-b flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">Espace {categoryLabel}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.name}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour app client
          </Link>
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2 text-sm text-muted-foreground" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
