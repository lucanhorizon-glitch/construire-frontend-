"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, ExternalLink, ShieldCheck, ShieldOff, Zap, ZapOff, HardHat, Gift } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";

interface CreditHistoryEntry {
  id: number;
  type: string;
  amount: number;
  pack_type?: string;
  price_eur?: number;
  created_at: string;
}

const PRO_CATEGORY_LABELS: Record<string, string> = {
  constructeur: "Constructeur",
  architecte: "Architecte",
  maitre_oeuvre: "Maître d'œuvre",
  cmiste: "C.M.I.",
};

interface AdminUserDetail {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_admin: boolean;
  account_type: string;
  pro_category?: string | null;
  company_name?: string | null;
  company_logo_url?: string | null;
  created_at: string;
  projects: {
    id: number;
    name: string;
    status: string;
    type: string;
    is_premium: boolean;
    premium_granted_by_admin: boolean;
    created_at: string;
  }[];
  payments: {
    id: number;
    amount_eur: number;
    project?: { id: number; name: string };
    stripe_session: string;
    paid_at: string;
  }[];
  credits?: {
    remaining: number;
    total_purchased: number;
    total_gifted: number;
    total_used: number;
    history: CreditHistoryEntry[];
  } | null;
}

function creditTypeBadge(type: string) {
  if (type === "purchase") return <Badge className="text-xs bg-blue-600 text-white border-0">Achat</Badge>;
  if (type === "gift")     return <Badge className="text-xs bg-emerald-600 text-white border-0">Offert</Badge>;
  if (type === "usage")    return <Badge variant="secondary" className="text-xs">Utilisation</Badge>;
  return <Badge variant="outline" className="text-xs">{type}</Badge>;
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [giftAmount, setGiftAmount] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => api.get<{ data: AdminUserDetail }>(`/admin/users/${id}`),
  });

  const toggleAdmin = useMutation({
    mutationFn: () => api.post(`/admin/users/${id}/toggle-admin`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Statut admin mis à jour");
    },
    onError: (e: Error) => toast.error(e.message ?? "Erreur"),
  });

  const grantPremium = useMutation({
    mutationFn: (projectId: number) =>
      api.post(`/admin/projects/${projectId}/grant-premium`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success("Premium accordé !");
    },
    onError: () => toast.error("Erreur lors de l'attribution premium"),
  });

  const revokePremium = useMutation({
    mutationFn: (projectId: number) =>
      api.post(`/admin/projects/${projectId}/revoke-premium`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success("Premium révoqué");
    },
    onError: () => toast.error("Erreur lors de la révocation premium"),
  });

  const giftCredits = useMutation({
    mutationFn: () => api.post(`/admin/users/${id}/gift-credits`, { amount: giftAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success(`${giftAmount} crédit(s) offert(s)`);
      setGiftAmount(1);
    },
    onError: () => toast.error("Erreur lors de l'attribution des crédits"),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const user = (data as { data: AdminUserDetail })?.data;
  if (!user) return null;

  const credits = user.credits;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          {user.is_admin && (
            <Badge className="gap-1 bg-amber-500 text-white border-0">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </Badge>
          )}
          {user.account_type === "pro" && (
            <Badge className="gap-1 bg-blue-600 text-white border-0">
              <HardHat className="h-3 w-3" />
              {user.pro_category ? (PRO_CATEGORY_LABELS[user.pro_category] ?? "Pro") : "Pro"}
            </Badge>
          )}
        </div>

        {/* User info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Téléphone</span>
              <span>{user.phone ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type de compte</span>
              <span className="capitalize">{user.account_type ?? "client"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inscrit le</span>
              <span>{format(new Date(user.created_at), "d MMM yyyy", { locale: fr })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Projets</span>
              <span className="font-bold">{user.projects.length}</span>
            </div>
            <Separator />
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={user.is_admin ? "destructive" : "outline"}
                className="gap-2"
                onClick={() => toggleAdmin.mutate()}
                disabled={toggleAdmin.isPending}
              >
                {user.is_admin ? (
                  <><ShieldOff className="h-3.5 w-3.5" /> Révoquer admin</>
                ) : (
                  <><ShieldCheck className="h-3.5 w-3.5" /> Passer admin</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Projets ({user.projects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {user.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun projet</p>
            ) : (
              <div className="divide-y">
                {user.projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3 text-sm gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">{p.type}</Badge>
                        <Badge
                          variant={p.status === "active" ? "success" : "secondary"}
                          className="text-xs"
                        >
                          {p.status === "active" ? "Actif" : "Archivé"}
                        </Badge>
                        {p.is_premium && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="text-xs bg-amber-500 text-white border-0 cursor-default">
                                Premium
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {p.premium_granted_by_admin ? "Offert par admin" : "Payé"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.is_premium && p.premium_granted_by_admin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7 text-destructive border-destructive/50 hover:bg-destructive/10"
                          onClick={() => revokePremium.mutate(p.id)}
                          disabled={revokePremium.isPending}
                        >
                          <ZapOff className="h-3 w-3" />
                          Révoquer
                        </Button>
                      ) : !p.is_premium ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7"
                          onClick={() => grantPremium.mutate(p.id)}
                          disabled={grantPremium.isPending}
                        >
                          <Zap className="h-3 w-3" />
                          Offrir premium
                        </Button>
                      ) : null}
                      <a
                        href={`/admin/projects/${p.id}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Paiements Stripe ({user.payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {user.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun paiement</p>
            ) : (
              <div className="divide-y">
                {user.payments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">{pay.project?.name ?? "Projet supprimé"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{pay.stripe_session}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{pay.amount_eur.toFixed(2)} €</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(pay.paid_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credits — pro only */}
        {user.account_type === "pro" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardHat className="h-4 w-4 text-blue-600" />
                Crédits pro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Balance summary */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Restants",  value: credits?.remaining      ?? 0, highlight: true },
                  { label: "Achetés",   value: credits?.total_purchased ?? 0, highlight: false },
                  { label: "Utilisés",  value: credits?.total_used      ?? 0, highlight: false },
                  { label: "Offerts",   value: credits?.total_gifted    ?? 0, highlight: false },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
                    <p className={`text-xl font-bold ${s.highlight && s.value === 0 ? "text-destructive" : ""}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* History */}
              {credits?.history && credits.history.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Historique</p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Date</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Type</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Pack</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs">Crédits</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Prix</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {credits.history.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), "d MMM yyyy", { locale: fr })}
                            </td>
                            <td className="px-3 py-2">{creditTypeBadge(entry.type)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{entry.pack_type ?? "—"}</td>
                            <td className="px-3 py-2 text-right font-medium text-xs">
                              {entry.type === "usage" ? `−${entry.amount}` : `+${entry.amount}`}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-muted-foreground hidden sm:table-cell">
                              {entry.price_eur != null ? `${entry.price_eur.toFixed(2)} €` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Gift credits form */}
              <div>
                <Separator className="mb-4" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Offrir des crédits</p>
                <div className="flex items-end gap-3">
                  <div className="space-y-1.5 flex-1 max-w-[120px]">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={giftAmount}
                      onChange={e => setGiftAmount(Math.max(1, Math.min(100, Number(e.target.value))))}
                      className="h-9"
                    />
                  </div>
                  <Button
                    className="gap-2 h-9"
                    onClick={() => giftCredits.mutate()}
                    disabled={giftCredits.isPending || giftAmount < 1}
                  >
                    <Gift className="h-4 w-4" />
                    {giftCredits.isPending ? "En cours…" : `Offrir ${giftAmount} crédit${giftAmount > 1 ? "s" : ""}`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
