"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, ShieldCheck, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect } from "react";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_admin: boolean;
  projects_count: number;
  created_at: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch],
    queryFn: () =>
      api.get<{ data: AdminUser[]; meta: { total: number } }>(
        `/admin/users${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ""}`
      ),
  });

  const users = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{total} au total</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou email…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Téléphone</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Projets</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Inscrit le</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{user.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.name}</span>
                          {user.is_admin && (
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{user.email}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{user.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{user.projects_count ?? 0}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                        {format(new Date(user.created_at), "d MMM yyyy", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${user.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun utilisateur trouvé
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
