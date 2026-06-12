import Link from "next/link";
import { HardHat, CheckCircle, BarChart2, FileDown, Users, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: CheckCircle, title: "Suivi des tâches", desc: "90 étapes pré-remplies pour une construction standard, de l'achat du terrain à la conformité." },
  { icon: BarChart2, title: "Budget en temps réel", desc: "Comparez devis et factures, surveillez votre enveloppe budgétaire phase par phase." },
  { icon: FileDown, title: "Exports PDF / Excel", desc: "Générez des rapports complets pour votre banque, notaire ou maître d'œuvre." },
  { icon: Users, title: "Annuaire intervenants", desc: "Centralisez architectes, entreprises et artisans avec leurs attestations d'assurance." },
  { icon: Smartphone, title: "Application mobile", desc: "Installez l'app sur votre téléphone pour un accès offline au chantier." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Suivi Construction</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild><Link href="/auth/login">Connexion</Link></Button>
            <Button asChild><Link href="/auth/register">Commencer</Link></Button>
          </div>
        </div>
      </header>

      <section className="container py-24 text-center">
        <Badge variant="secondary" className="mb-4">Bêta gratuite</Badge>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          Pilotez votre construction<br className="hidden md:block" /> de A à Z
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Suivi Construction accompagne les particuliers qui font construire : checklist complète, suivi budgétaire, planning et documents centralisés.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild><Link href="/auth/register">Créer mon projet gratuitement</Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/auth/login">{"J'ai déjà un compte"}</Link></Button>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-2xl font-bold text-center mb-10">Tout ce dont vous avez besoin</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground py-20 text-center">
        <div className="container">
          <Badge className="mb-4 bg-white/20 text-white border-white/30">Premium — 14,99 € / mois</Badge>
          <h2 className="text-3xl font-bold mb-4">Passez à la vitesse supérieure</h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Projets illimités, exports avancés, planification Gantt et support prioritaire.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/register">{"Démarrer l'essai gratuit"}</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Suivi Construction — Fait avec ❤️ pour les futurs propriétaires
      </footer>
    </div>
  );
}
