"use client";

import { useRef, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Document } from "@/lib/types";

const docTypes = [
  { value: "photo",       label: "Photo" },
  { value: "quote",       label: "Devis" },
  { value: "invoice",     label: "Facture" },
  { value: "certificate", label: "Attestation" },
  { value: "other",       label: "Autre" },
];

interface DocumentUploaderProps {
  taskId: number;
  defaultType?: string;
  onUploaded?: (doc: Document) => void;
}

export default function DocumentUploader({
  taskId,
  defaultType = "other",
  onUploaded,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState(defaultType);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("name", file.name);
    setUploading(true);
    try {
      const res = await api.upload<{ data: Document }>(
        `/tasks/${taskId}/documents`,
        formData
      );
      toast.success("Document ajouté");
      setFile(null);
      setType(defaultType);
      onUploaded?.(res.data);
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
          {file.type.startsWith("image/") ? (
            <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
          ) : (
            <FileText className="h-5 w-5 text-slate-500 shrink-0" />
          )}
          <span className="text-sm truncate flex-1">{file.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Sélectionner un fichier
        </Button>
      )}

      {file && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs mb-1 block">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? "Envoi…" : "Ajouter"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
