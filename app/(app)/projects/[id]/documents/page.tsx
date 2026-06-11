"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Upload, Trash2, ExternalLink, FolderOpen, Image as ImageIcon, FileText, Camera, ClipboardList, BookOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Document, Project } from "@/lib/types";
import PremiumGate from "@/components/project/PremiumGate";

const DOCTYPE_LABELS: Record<string, string> = {
  photo: "Photo",
  quote: "Devis",
  invoice: "Facture",
  certificate: "Attestation",
  permit: "Permis",
  cil: "CIL",
  other: "Autre",
};

function DocTypeIcon({ type }: { type: Document["type"] }) {
  if (type === "photo") return <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />;
  if (type === "quote") return <FileText className="h-5 w-5 text-orange-500 shrink-0" />;
  if (type === "invoice") return <FileText className="h-5 w-5 text-emerald-500 shrink-0" />;
  if (type === "permit") return <ClipboardList className="h-5 w-5 text-purple-500 shrink-0" />;
  return <FileText className="h-5 w-5 text-slate-500 shrink-0" />;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function DocItem({
  doc,
  onDelete,
}: {
  doc: Document;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <DocTypeIcon type={doc.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.name}</p>
        <Badge variant="secondary" className="text-xs mt-0.5">
          {DOCTYPE_LABELS[doc.type] ?? doc.type}
        </Badge>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <a href={doc.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(doc.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ProjectDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileRef    = useRef<HTMLInputElement>(null);
  const coverRef   = useRef<HTMLInputElement>(null);
  const permitRef  = useRef<HTMLInputElement>(null);
  const cilRef     = useRef<HTMLInputElement>(null);
  const [docType, setDocType]     = useState<Document["type"]>("other");
  const [docName, setDocName]     = useState("");
  const [coverFailed, setCoverFailed] = useState(false);
  const [coverUrl, setCoverUrl]   = useState<string | null>(null);

  const { data: projectData } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<{ data: Project }>(`/projects/${id}`),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["project-documents", id],
    queryFn: () => api.get<{ data: Document[] }>(`/projects/${id}/documents`),
  });

  const project   = projectData?.data;
  const documents = data?.data ?? [];

  const permitDocs = documents.filter((d) => d.type === "permit");
  const cilDocs    = documents.filter((d) => d.type === "cil");
  const otherDocs  = documents.filter((d) => d.type !== "permit" && d.type !== "cil");

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("type", docType);
      if (docName.trim()) form.append("name", docName.trim());
      return api.upload(`/projects/${id}/documents`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", id] });
      setDocName("");
      toast.success("Document ajouté");
    },
    onError: () => toast.error("Erreur lors de l'upload"),
  });

  const uploadPermit = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "permit");
      form.append("name", file.name);
      return api.upload(`/projects/${id}/documents`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", id] });
      toast.success("Document ajouté");
    },
    onError: () => toast.error("Erreur lors de l'upload"),
  });

  const uploadCil = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "cil");
      form.append("name", file.name);
      return api.upload(`/projects/${id}/documents`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", id] });
      toast.success("Document CIL ajouté");
    },
    onError: () => toast.error("Erreur lors de l'upload"),
  });

  const uploadCover = useMutation({
    mutationFn: async (file: File) => {
      if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
        throw new Error("heic");
      }
      const base64 = await fileToBase64(file);
      return api.post(`/projects/${id}/cover-photo`, { cover_photo: base64 });
    },
    onSuccess: (res) => {
      const url = (res as { data?: { cover_photo_url?: string } })?.data?.cover_photo_url;
      if (url) setCoverUrl(url + "?t=" + Date.now());
      setCoverFailed(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Photo de couverture mise à jour");
    },
    onError: (err: Error) => {
      if (err.message === "heic") {
        toast.error("Format HEIC non supporté — veuillez convertir en JPG ou PNG");
      } else {
        toast.error("Erreur lors de l'upload");
      }
    },
  });

  const remove = useMutation({
    mutationFn: (docId: number) => api.delete(`/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", id] });
      toast.success("Document supprimé");
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    e.target.value = "";
  }

  function handlePermitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadPermit.mutate(file);
    e.target.value = "";
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadCover.mutate(file);
    e.target.value = "";
  }

  function handleCilChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadCil.mutate(file);
    e.target.value = "";
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-6">
      <h2 className="text-2xl font-bold">Documents</h2>

      {/* Cover photo section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Photo de couverture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(coverUrl ?? project?.cover_photo_url) && !coverFailed ? (
            <div className="relative w-full h-40 rounded-lg overflow-hidden">
              <img
                src={coverUrl ?? project!.cover_photo_url!}
                alt="Couverture"
                className="w-full h-full object-cover"
                onError={() => setCoverFailed(true)}
              />
            </div>
          ) : (
            <div className="w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Aucune photo de couverture</p>
            </div>
          )}
          <input
            ref={coverRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={handleCoverChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => coverRef.current?.click()}
            disabled={uploadCover.isPending}
          >
            <Camera className="h-4 w-4" />
            {uploadCover.isPending
              ? "Upload…"
              : project?.cover_photo_url
              ? "Changer la photo"
              : "Ajouter une photo"}
          </Button>
        </CardContent>
      </Card>

      {/* Permis de construire section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Permis de construire ({permitDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {permitDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun document de permis
            </p>
          ) : (
            <div className="space-y-2">
              {permitDocs.map((doc) => (
                <DocItem key={doc.id} doc={doc} onDelete={(id) => remove.mutate(id)} />
              ))}
            </div>
          )}
          {project?.is_premium ? (
            <>
              <input
                ref={permitRef}
                type="file"
                className="hidden"
                onChange={handlePermitChange}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full"
                onClick={() => permitRef.current?.click()}
                disabled={uploadPermit.isPending}
              >
                <Upload className="h-4 w-4" />
                {uploadPermit.isPending ? "Upload…" : "Ajouter un document"}
              </Button>
            </>
          ) : (
            <PremiumGate isPremium={false} projectId={Number(id)} feature="Upload de documents — Premium requis">
              <Button variant="outline" size="sm" className="gap-2 w-full" disabled>
                <Lock className="h-4 w-4" />
                Ajouter un document
              </Button>
            </PremiumGate>
          )}
        </CardContent>
      </Card>

      {/* CIL section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            Carnet d&apos;Information du Logement — CIL ({cilDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            Obligatoire depuis le 1er janvier 2023 (Loi Climat et Résilience, Art. 167). Déposez ici : DPE, attestation RE2020, plans, notices des équipements, liste des matériaux isolants.
          </p>
          {cilDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun document CIL
            </p>
          ) : (
            <div className="space-y-2">
              {cilDocs.map((doc) => (
                <DocItem key={doc.id} doc={doc} onDelete={(docId) => remove.mutate(docId)} />
              ))}
            </div>
          )}
          {project?.is_premium ? (
            <>
              <input
                ref={cilRef}
                type="file"
                className="hidden"
                onChange={handleCilChange}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full"
                onClick={() => cilRef.current?.click()}
                disabled={uploadCil.isPending}
              >
                <Upload className="h-4 w-4" />
                {uploadCil.isPending ? "Upload…" : "Ajouter un document CIL"}
              </Button>
            </>
          ) : (
            <PremiumGate isPremium={false} projectId={Number(id)} feature="Upload de documents — Premium requis">
              <Button variant="outline" size="sm" className="gap-2 w-full" disabled>
                <Lock className="h-4 w-4" />
                Ajouter un document CIL
              </Button>
            </PremiumGate>
          )}
        </CardContent>
      </Card>

      {/* Documents section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Autres documents ({otherDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload form */}
          {project?.is_premium ? (
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select
                  value={docType}
                  onValueChange={(v) => setDocType(v as Document["type"])}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["photo", "quote", "invoice", "certificate", "other"] as Document["type"][]).map(
                      (k) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          {DOCTYPE_LABELS[k]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                <Label className="text-xs">Nom (optionnel)</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Nom du document"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                />
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
              <Button
                size="sm"
                className="gap-2 h-8"
                onClick={() => fileRef.current?.click()}
                disabled={upload.isPending}
              >
                <Upload className="h-4 w-4" />
                {upload.isPending ? "Upload…" : "Ajouter"}
              </Button>
            </div>
          ) : (
            <PremiumGate isPremium={false} projectId={Number(id)} feature="Upload de documents — Premium requis">
              <div className="flex items-end gap-3 flex-wrap pointer-events-none">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={docType} onValueChange={() => {}}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1 min-w-[150px]">
                  <Label className="text-xs">Nom (optionnel)</Label>
                  <Input className="h-8 text-xs" placeholder="Nom du document" disabled />
                </div>
                <Button size="sm" className="gap-2 h-8" disabled>
                  <Upload className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </PremiumGate>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : otherDocs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun document</p>
            </div>
          ) : (
            <div className="space-y-2">
              {otherDocs.map((doc) => (
                <DocItem key={doc.id} doc={doc} onDelete={(id) => remove.mutate(id)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
