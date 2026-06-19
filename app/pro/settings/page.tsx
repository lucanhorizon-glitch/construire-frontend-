"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface ProfileInner {
  company_name?: string | null;
  company_logo_url?: string | null;
}

interface ProfileData {
  data: ProfileInner;
}

export default function ProSettingsPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState<string | undefined>(undefined);
  const [logoDataUri, setLogoDataUri] = useState<string | null | undefined>(undefined);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["pro-profile-settings"],
    queryFn: () => api.get<ProfileData>("/user/profile"),
    select: (res) => res.data,
  });

  useEffect(() => {
    if (data && companyName === undefined) setCompanyName(data.company_name ?? "");
  }, [data, companyName]);

  const currentName   = companyName    ?? data?.company_name    ?? "";
  const currentLogoUrl = removeLogo ? null : (logoPreview ?? data?.company_logo_url ?? null);

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { company_name: currentName };
      if (removeLogo) payload.company_logo = null;
      else if (logoDataUri !== undefined) payload.company_logo = logoDataUri;
      return api.put("/pro/settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pro-profile-settings"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-sidebar"] });
      toast.success("Paramètres sauvegardés");
      setLogoDataUri(undefined);
      setRemoveLogo(false);
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Erreur lors de la sauvegarde"),
  });

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Format non supporté"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop lourde (max 5 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      setLogoDataUri(dataUri);
      setLogoPreview(dataUri);
      setRemoveLogo(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-lg">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          Paramètres pro
        </h1>
        <p className="text-sm text-muted-foreground">Personnalisez votre marque visible par vos clients</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identité de votre entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Company name */}
          <div className="space-y-1.5">
            <Label>Nom de l&apos;entreprise</Label>
            <Input
              value={currentName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Mon Entreprise BTP"
            />
            <p className="text-xs text-muted-foreground">Affiché dans la sidebar de vos clients</p>
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            {currentLogoUrl ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentLogoUrl}
                  alt="Logo"
                  className="h-16 w-auto max-w-[120px] object-contain rounded border bg-muted/30 p-1"
                />
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Changer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => { setRemoveLogo(true); setLogoPreview(null); setLogoDataUri(undefined); }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Déposez votre logo ici</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG — max 5 Mo</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
            <p className="text-xs text-muted-foreground">Recommandé : carré ou paysage, fond transparent</p>
          </div>

          <Button
            className="gap-2 w-full"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            <Save className="h-4 w-4" />
            {save.isPending ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
