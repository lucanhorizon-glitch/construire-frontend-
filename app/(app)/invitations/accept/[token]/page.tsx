"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function accept() {
      try {
        const res = await api.post<{ message: string; project_id: number }>(
          `/invitations/${token}/accept`
        );
        setProjectId(res.project_id);
        setStatus("success");
        toast.success("Invitation acceptée !");
      } catch (err: unknown) {
        const e = err as { message?: string };
        setErrorMsg(e?.message ?? "Invitation invalide ou expirée.");
        setStatus("error");
      }
    }
    accept();
  }, [token]);

  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Invitation au projet</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Validation de l'invitation…</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-medium text-center">Invitation acceptée avec succès !</p>
              <p className="text-sm text-muted-foreground text-center">
                Vous avez maintenant accès au projet.
              </p>
              <Button onClick={() => router.push(projectId ? `/projects/${projectId}` : "/dashboard")}>
                Accéder au projet
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="font-medium text-center">Invitation invalide</p>
              <p className="text-sm text-muted-foreground text-center">{errorMsg}</p>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Retour au tableau de bord
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
