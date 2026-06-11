"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Plus, Phone, Mail, Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Contact } from "@/lib/types";
import Link from "next/link";

interface NewContactForm {
  name: string;
  company: string;
  role: string;
  specialty: string;
  phone: string;
  email: string;
  siret: string;
  notes: string;
}

const emptyForm: NewContactForm = { name: "", company: "", role: "", specialty: "", phone: "", email: "", siret: "", notes: "" };

export default function ContactsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<NewContactForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["project-contacts", id],
    queryFn: () => api.get<{ data: Contact[] }>(`/projects/${id}/contacts`),
  });

  const create = useMutation({
    mutationFn: (body: Partial<NewContactForm>) =>
      api.post(`/projects/${id}/contacts`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-contacts", id] });
      setOpen(false);
      setForm(emptyForm);
      toast.success("Intervenant ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const contacts = (data?.data ?? []).filter(c =>
    search === "" ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase())
  );

  function set(field: keyof NewContactForm, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold">Intervenants</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher un intervenant…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun intervenant pour l&apos;instant</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {contacts.map(contact => {
            const initials = contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <Link key={contact.id} href={`/projects/${id}/contacts/${contact.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contact.name}</p>
                        {contact.company && <p className="text-sm text-muted-foreground truncate">{contact.company}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {contact.role && <Badge variant="secondary" className="text-xs">{contact.role}</Badge>}
                          {contact.specialty && <Badge variant="outline" className="text-xs">{contact.specialty}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                      {contact.phone && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>
                      )}
                      {contact.email && (
                        <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{contact.email}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel intervenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input placeholder="Jean Martin" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Société</Label>
                <Input placeholder="SARL Maçonnerie" value={form.company} onChange={e => set("company", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Input placeholder="Maçon" value={form.role} onChange={e => set("role", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input placeholder="06 12 34 56 78" value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>SIRET</Label>
              <Input placeholder="14 chiffres" maxLength={14} value={form.siret} onChange={e => set("siret", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Informations complémentaires</Label>
              <Textarea
                placeholder="Notes libres sur cet intervenant…"
                className="resize-none min-h-[80px]"
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => create.mutate(form)} disabled={!form.name.trim() || create.isPending}>
              {create.isPending ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
