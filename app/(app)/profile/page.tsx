"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { LogOut, User, Mail, CalendarDays, Phone, FolderOpen, CreditCard, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { User as UserType } from "@/lib/types";

export default function ProfilePage() {
  const { user: authUser, clearAuth } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");

  const { data } = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => api.get<{ data: UserType }>("/user/profile"),
  });

  const profile = data?.data ?? authUser;

  const updateProfile = useMutation({
    mutationFn: (body: { phone?: string; name?: string }) =>
      api.put("/user/profile", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditingPhone(false);
      toast.success("Profil mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const initials =
    profile?.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {}
    clearAuth();
    router.push("/");
  }

  function startEditPhone() {
    setPhoneValue(profile?.phone ?? "");
    setEditingPhone(true);
  }

  async function handleStripePortal() {
    try {
      const res = await api.post<{ url: string }>("/stripe/checkout");
      window.location.href = res.url;
    } catch {
      toast.error("Erreur lors de l'ouverture du portail de facturation");
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Mon profil</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{profile?.name}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              {profile?.is_premium && (
                <Badge className="mt-1 text-xs bg-amber-500 text-white border-0">Premium</Badge>
              )}
            </div>
          </div>

          <Separator className="mb-4" />

          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs">Nom</dt>
                <dd className="font-medium">{profile?.name}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs">Email</dt>
                <dd className="font-medium">{profile?.email}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <dt className="text-muted-foreground text-xs">Téléphone</dt>
                {editingPhone ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      className="h-7 text-sm"
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      placeholder="+33 6 00 00 00 00"
                    />
                    <Button
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateProfile.mutate({ phone: phoneValue })}
                      disabled={updateProfile.isPending}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingPhone(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd className="font-medium">{profile?.phone ?? "Non renseigné"}</dd>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground"
                      onClick={startEditPhone}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs">Projets</dt>
                <dd className="font-medium">{profile?.projects_count ?? 0} projet{(profile?.projects_count ?? 0) !== 1 ? "s" : ""}</dd>
              </div>
            </div>
            {profile?.created_at && (
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs">Membre depuis</dt>
                  <dd className="font-medium">
                    {format(new Date(profile.created_at), "d MMMM yyyy", { locale: fr })}
                  </dd>
                </div>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abonnement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {profile?.is_premium ? "Premium" : "Gratuit"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.is_premium
                  ? "Accès à toutes les fonctionnalités"
                  : "Passez à Premium pour débloquer toutes les fonctionnalités"}
              </p>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleStripePortal}>
              <CreditCard className="h-4 w-4" />
              {profile?.is_premium ? "Gérer" : "Upgrader"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compte</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
