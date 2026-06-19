"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Search, ShieldCheck, ChevronRight, UserPlus, Eye, EyeOff, HardHat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_admin: boolean;
  account_type?: string;
  pro_category?: string | null;
  projects_count: number;
  created_at: string;
}

const PRO_CATEGORY_LABELS: Record<string, string> = {
  constructeur: "Constructeur",
  architecte: "Architecte",
  maitre_oeuvre: "Maître d'œuvre",
  cmiste: "C.M.I.",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function accountTypeBadge(type?: string, proCategory?: string | null) {
  if (type === "pro") {
    const label = proCategory ? (PRO_CATEGORY_LABELS[proCategory] ?? "Pro") : "Pro";
    return (
      <Badge className="text-xs bg-blue-600 text-white border-0">
        <HardHat className="h-2.5 w-2.5 mr-1" />{label}
      </Badge>
    );
  }
  if (type === "admin") return <Badge className="text-xs bg-amber-500 text-white border-0"><ShieldCheck className="h-2.5 w-2.5 mr-1" />Admin</Badge>;
  return <Badge variant="secondary" className="text-xs">Client</Badge>;
}

interface CreateForm {
  name: string;
  email: string;
  password: string;
  account_type: string;
  pro_category: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [proFilter, setProFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    name: "", email: "", password: "", account_type: "client", pro_category: "constructeur",
  });

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (proFilter !== "all") params.set("pro_category", proFilter);
    const q = params.toString();
    return q ? `?${q}` : "";
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch, proFilter],
    queryFn: () =>
      api.get<{ data: AdminUser[]; meta: { total: number } }>(`/admin/users${buildQuery()}`),
  });

  const createUser = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = {
        name: form.name,
        email: form.email,
        password: form.password,
        account_type: form.account_type,
      };
      if (form.account_type === "pro") payload.pro_category = form.pro_category;
      return api.post("/admin/users", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur créé");
      setOpen(false);
      setForm({ name: "", email: "", password: "", account_type: "client", pro_category: "constructeur" });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Erreur lors de la création"),
  });

  const users = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const canSubmit = form.name && form.email && form.password &&
    (form.account_type !== "pro" || form.pro_category);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{total} au total</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Créer un utilisateur
        </Button>
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={proFilter} onValueChange={setProFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les comptes</SelectItem>
            <SelectItem value="constructeur">Constructeurs</SelectItem>
            <SelectItem value="architecte">Architectes</SelectItem>
            <SelectItem value="maitre_oeuvre">Maîtres d&apos;œuvre</SelectItem>
            <SelectItem value="cmiste">C.M.I.</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Type</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Projets</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Inscrit le</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                  ))
                : users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{user.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.name}</span>
                          {user.is_admin && <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{user.email}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">{accountTypeBadge(user.account_type, user.pro_category)}</td>
                      <td className="px-4 py-3 text-center"><Badge variant="secondary">{user.projects_count ?? 0}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                        {format(new Date(user.created_at), "d MMM yyyy", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${user.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" /></Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">Aucun utilisateur trouvé</div>
          )}
        </div>
      </div>

      {/* Create user dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jean Dupont" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jean@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="8 caractères minimum"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type de compte</Label>
              <Select
                value={form.account_type}
                onValueChange={v => setForm(f => ({ ...f, account_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client (particulier)</SelectItem>
                  <SelectItem value="pro">Professionnel</SelectItem>
                  <SelectItem value="admin">Administrateur plateforme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.account_type === "pro" && (
              <div className="space-y-1.5">
                <Label>Catégorie professionnelle</Label>
                <Select
                  value={form.pro_category}
                  onValueChange={v => setForm(f => ({ ...f, pro_category: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="constructeur">Constructeur</SelectItem>
                    <SelectItem value="architecte">Architecte</SelectItem>
                    <SelectItem value="maitre_oeuvre">Maître d&apos;œuvre</SelectItem>
                    <SelectItem value="cmiste">C.M.I.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              onClick={() => createUser.mutate()}
              disabled={!canSubmit || createUser.isPending}
            >
              {createUser.isPending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
