"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { UserPlus, UserX, Share2, Crown, Edit2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Project, ProjectMember } from "@/lib/types";
import PremiumGate from "@/components/project/PremiumGate";

const ROLE_LABELS = { owner: "Propriétaire", editor: "Éditeur", viewer: "Lecteur" } as const;

function RoleIcon({ role }: { role: string }) {
  if (role === "owner") return <Crown className="h-3.5 w-3.5 text-amber-500" />;
  if (role === "editor") return <Edit2 className="h-3.5 w-3.5 text-blue-500" />;
  return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function PartageProjectPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");

  const { data: projectData } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<{ data: Project }>(`/projects/${id}`),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["project-members", id],
    queryFn: () => api.get<{ data: ProjectMember[] }>(`/projects/${id}/members`),
  });

  const isPremium = projectData?.data?.is_premium ?? false;

  const members = data?.data ?? [];

  const invite = useMutation({
    mutationFn: () => api.post(`/projects/${id}/invite`, { email, role }),
    onSuccess: () => {
      setEmail("");
      toast.success("Invitation envoyée !");
    },
    onError: (err: unknown) => {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Erreur lors de l'invitation");
    },
  });

  const revoke = useMutation({
    mutationFn: (memberId: number) =>
      api.post(`/projects/${id}/members/${memberId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", id] });
      toast.success("Membre retiré");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  return (
    <PremiumGate
      isPremium={isPremium}
      projectId={Number(id)}
      feature="Partage du projet — invitez des collaborateurs"
    >
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Share2 className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Partage du projet</h2>
      </div>

      {/* Invite form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Inviter un collaborateur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="collaborateur@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "editor" | "viewer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">
                  <div className="flex items-center gap-2">
                    <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                    Éditeur — peut modifier les tâches
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    Lecteur — lecture seule
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full gap-2"
            onClick={() => invite.mutate()}
            disabled={!email.trim() || invite.isPending}
          >
            <UserPlus className="h-4 w-4" />
            {invite.isPending ? "Envoi…" : "Envoyer l'invitation"}
          </Button>
        </CardContent>
      </Card>

      {/* Members list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Membres ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun membre partagé pour l'instant.
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-sm bg-muted">
                      {initials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="gap-1 text-xs">
                      <RoleIcon role={member.role} />
                      {ROLE_LABELS[member.role]}
                    </Badge>
                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => revoke.mutate(member.id)}
                        disabled={revoke.isPending}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </PremiumGate>
  );
}
