"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, Building2, Shield, Trash2, AlertTriangle, FileText, ExternalLink, Upload, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Contact, Document } from "@/lib/types";
import Link from "next/link";
import { differenceInDays } from "date-fns";

export default function ContactDetailPage() {
  const { id: projectId, contactId } = useParams<{ id: string; contactId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Contact>>({});
  const quoteRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => api.get<{ data: Contact }>(`/contacts/${contactId}`),
  });

  const contact = data?.data;

  const update = useMutation({
    mutationFn: (body: Partial<Contact>) => api.put(`/contacts/${contactId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      queryClient.invalidateQueries({ queryKey: ["project-contacts", projectId] });
      setEditing(false);
      toast.success("Intervenant mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-contacts", projectId] });
      router.push(`/projects/${projectId}/contacts`);
      toast.success("Intervenant supprimé");
    },
  });

  const uploadDoc = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      return api.upload(`/contacts/${contactId}/documents`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      toast.success("Document ajouté");
    },
    onError: () => toast.error("Erreur lors de l'upload"),
  });

  const deleteDoc = useMutation({
    mutationFn: (docId: number) => api.delete(`/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      toast.success("Document supprimé");
    },
  });

  function startEdit() {
    if (!contact) return;
    setForm({ ...contact });
    setEditing(true);
  }

  function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0];
    if (file) uploadDoc.mutate({ file, type });
    e.target.value = "";
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!contact) return <p className="p-6 text-muted-foreground">Intervenant introuvable</p>;

  const initials = contact.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // Insurance expiry warning
  const insuranceDaysLeft = contact.insurance_expiry
    ? differenceInDays(new Date(contact.insurance_expiry), new Date())
    : null;
  const insuranceExpired = insuranceDaysLeft !== null && insuranceDaysLeft < 0;
  const insuranceExpiringSoon = insuranceDaysLeft !== null && insuranceDaysLeft >= 0 && insuranceDaysLeft <= 60;

  const quoteDocuments = (contact.documents ?? []).filter((d) => d.type === "quote");
  const certDocuments = (contact.documents ?? []).filter((d) => d.type === "certificate");

  function DocItem({ doc }: { doc: Document }) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{doc.name}</p>
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
            onClick={() => deleteDoc.mutate(doc.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}/contacts`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{contact.name}</h1>
          {contact.company && <p className="text-muted-foreground text-sm">{contact.company}</p>}
        </div>
        <div className="flex gap-1">
          {contact.role && <Badge variant="secondary">{contact.role}</Badge>}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modifier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["name", "company", "role", "specialty", "phone", "email", "address", "siret", "insurance_company", "insurance_number"] as (keyof Contact)[]).map((field) => (
              <div key={field} className="space-y-1">
                <Label className="capitalize text-xs">{field.replace(/_/g, " ")}</Label>
                <Input
                  value={(form[field] as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Expiration assurance</Label>
              <Input
                type="date"
                value={(form.insurance_expiry as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, insurance_expiry: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Informations complémentaires</Label>
              <Textarea
                placeholder="Notes libres…"
                className="resize-none min-h-[80px]"
                value={(form.notes as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
              <Button onClick={() => update.mutate(form)} disabled={update.isPending}>
                {update.isPending ? "…" : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Coordonnées</CardTitle>
              <Button variant="ghost" size="sm" onClick={startEdit}>Modifier</Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.address}</span>
                </div>
              )}
              {contact.siret && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>SIRET : {contact.siret}</span>
                </div>
              )}
              {contact.notes && (
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document tabs: Devis + Assurance décennale */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="quote">
                <TabsList className="w-full">
                  <TabsTrigger value="quote" className="flex-1 gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Devis
                    {quoteDocuments.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-4">
                        {quoteDocuments.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="assurance" className="flex-1 gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Assurance
                    {(insuranceExpired || insuranceExpiringSoon) && (
                      <AlertTriangle className="h-3 w-3 text-amber-500 ml-1" />
                    )}
                    {certDocuments.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-4">
                        {certDocuments.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="quote" className="space-y-3 pt-3">
                  {quoteDocuments.map((doc) => <DocItem key={doc.id} doc={doc} />)}
                  {quoteDocuments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun devis</p>
                  )}
                  <input ref={quoteRef} type="file" className="hidden" onChange={(e) => handleDocUpload(e, "quote")} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => quoteRef.current?.click()}
                    disabled={uploadDoc.isPending}
                  >
                    <Upload className="h-4 w-4" />
                    Ajouter un devis
                  </Button>
                </TabsContent>

                <TabsContent value="assurance" className="space-y-3 pt-3">
                  {/* Insurance info */}
                  {(contact.insurance_company || contact.insurance_number || contact.insurance_expiry) && (
                    <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                      {contact.insurance_company && (
                        <p><span className="text-muted-foreground">Assureur :</span> {contact.insurance_company}</p>
                      )}
                      {contact.insurance_number && (
                        <p><span className="text-muted-foreground">N° police :</span> {contact.insurance_number}</p>
                      )}
                      {contact.insurance_expiry && (
                        <div className="flex items-center gap-2">
                          <p>
                            <span className="text-muted-foreground">Expiration :</span>{" "}
                            {new Date(contact.insurance_expiry).toLocaleDateString("fr-FR")}
                          </p>
                          {insuranceExpired && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Expirée
                            </Badge>
                          )}
                          {insuranceExpiringSoon && (
                            <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              {insuranceDaysLeft}j restants
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {certDocuments.map((doc) => <DocItem key={doc.id} doc={doc} />)}
                  {certDocuments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucune attestation</p>
                  )}
                  <input ref={certRef} type="file" className="hidden" onChange={(e) => handleDocUpload(e, "certificate")} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => certRef.current?.click()}
                    disabled={uploadDoc.isPending}
                  >
                    <Upload className="h-4 w-4" />
                    Ajouter une attestation
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer l&apos;intervenant
          </Button>
        </>
      )}
    </div>
  );
}
