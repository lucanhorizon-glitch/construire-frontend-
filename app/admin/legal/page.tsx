"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Eye, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";

const LEGAL_PAGES = [
  { key: "cgv",            label: "CGV",                      title: "Conditions Générales de Vente" },
  { key: "cgu",            label: "CGU",                      title: "Conditions Générales d'Utilisation" },
  { key: "confidentialite",label: "Confidentialité",          title: "Politique de confidentialité" },
  { key: "mentions_legales",label: "Mentions légales",        title: "Mentions légales" },
];

type LegalData = Record<string, string>;

function LegalEditor({ legalKey, initialContent }: { legalKey: string; initialContent: string }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(initialContent);
  const [preview, setPreview] = useState(false);

  useEffect(() => { setContent(initialContent); }, [initialContent]);

  const save = useMutation({
    mutationFn: () => api.put(`/admin/legal/${legalKey}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-legal"] });
      toast.success("Page enregistrée");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const isDirty = content !== initialContent;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={preview ? "outline" : "ghost"}
            size="sm"
            className="gap-2 h-8"
            onClick={() => setPreview(false)}
          >
            <Edit2 className="h-3.5 w-3.5" />
            Éditer
          </Button>
          <Button
            variant={preview ? "ghost" : "outline"}
            size="sm"
            className="gap-2 h-8"
            onClick={() => setPreview(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Aperçu
          </Button>
        </div>
        <Button
          size="sm"
          className="gap-2 h-8"
          onClick={() => save.mutate()}
          disabled={!isDirty || save.isPending}
        >
          <Save className="h-3.5 w-3.5" />
          {save.isPending ? "Enregistrement…" : isDirty ? "Enregistrer *" : "Enregistré"}
        </Button>
      </div>

      {preview ? (
        <Card>
          <CardContent className="pt-4 min-h-[400px]">
            {content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {content}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">Aucun contenu</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[400px] font-mono text-sm resize-y"
          placeholder="Rédigez le contenu de la page légale ici (supporte le Markdown)…"
        />
      )}

      <p className="text-xs text-muted-foreground">
        {content.length} caractères · Page publique : /
        {legalKey === "mentions_legales" ? "mentions-legales" : legalKey.replace("_", "-")}
      </p>
    </div>
  );
}

export default function AdminLegalPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-legal"],
    queryFn: () => api.get<LegalData>("/admin/legal"),
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Pages légales</h1>
        <p className="text-sm text-muted-foreground">
          Éditez les pages CGV, CGU, confidentialité et mentions légales.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="cgv">
          <TabsList className="flex-wrap h-auto gap-1">
            {LEGAL_PAGES.map((page) => (
              <TabsTrigger key={page.key} value={page.key} className="text-xs">
                {page.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {LEGAL_PAGES.map((page) => (
            <TabsContent key={page.key} value={page.key} className="mt-4">
              <div className="space-y-3">
                <h2 className="font-semibold">{page.title}</h2>
                <LegalEditor
                  legalKey={page.key}
                  initialContent={(data as LegalData)?.[page.key] ?? ""}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
