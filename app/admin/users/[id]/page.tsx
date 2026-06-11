"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ShieldCheck, ShieldOff, Gift, ExternalLink, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AdminUserDetail {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_admin: boolean;
  created_at: string;
  projects: {
    id: number; name: string; status: string; type: string; is_premium: boolean; created_at: string;
  }[];
  payments: {
    id: number; amount_eur: number; project?: { id: number; name: string };
    stripe_session: string; paid_at: string;
  }[];
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState("");

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

  const offerPremium = useMutation({
    mutationFn: () =>
      api.post(`/admin/users/${id}/offer-premium`, { project_id: Number(selectedProjectId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success("Premium accordé !");
      setSelectedProjectId("");
    },
    onError: () => toast.error("Erreur lors de l'attribution premium"),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const user = (data as { data: AdminUserDetail })?.data;
  if (!user) return null;

  const nonPremiumProjects = user.projects.filter((p) => !p.is_premium);

  return (
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
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
                {user.is_admin
                  ? <><ShieldOff className="h-3.5 w-3.5" /> Révoquer admin</>
                  : <><ShieldCheck className="h-3.5 w-3.5" /> Passer admin</>
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Offer premium */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-500" />
              Offrir Premium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {nonPremiumProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tous les projets sont déjà premium.</p>
            ) : (
              <>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet…" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonPremiumProjects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="gap-2 w-full"
                  onClick={() => offerPremium.mutate()}
                  disabled={!selectedProjectId || offerPremium.isPending}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Accorder Premium
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
                <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="outline" className="text-xs">{p.type}</Badge>
                      <Badge
                        variant={p.status === "active" ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {p.status === "active" ? "Actif" : "Archivé"}
                      </Badge>
                      {p.is_premium && (
                        <Badge className="text-xs bg-amber-500 text-white border-0">Premium</Badge>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/admin/projects/${p.id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
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
    </div>
  );
}
