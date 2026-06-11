"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Users, FolderOpen, CreditCard, FileText, Settings,
  HardHat, LogOut, Menu, X, Sun, Moon, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin",           icon: LayoutDashboard, label: "Dashboard",     exact: true },
  { href: "/admin/users",     icon: Users,            label: "Utilisateurs" },
  { href: "/admin/projects",  icon: FolderOpen,       label: "Projets"      },
  { href: "/admin/revenues",  icon: CreditCard,       label: "Revenus"      },
  { href: "/admin/legal",     icon: FileText,         label: "Pages légales"},
  { href: "/admin/settings",  icon: Settings,         label: "Paramètres"   },
];

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    try { await api.post("/auth/logout"); } catch {}
    clearAuth();
    router.push("/");
  }

  return (
    <div className="flex flex-col h-full w-64 bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between p-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          <span className="font-bold text-sm">Admin</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <HardHat className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-400 truncate">{user?.email}</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700 space-y-1">
        <button
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Mode clair" : "Mode sombre"}
        </button>
        <button
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          ← Retour à l'app
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, user, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token) { router.replace("/auth/login"); return; }
    if (user && user.is_admin === false) { router.replace("/dashboard"); return; }
    setChecked(true);
  }, [_hasHydrated, token, user, router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Vérification des droits…</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex shrink-0">
            <AdminSidebar onClose={() => setMobileOpen(false)} />
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-slate-900 text-white">
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-sm">Admin</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
