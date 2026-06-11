"use client";

import { WifiOff, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mb-6 relative">
        <HardHat className="h-16 w-16 text-primary" />
        <WifiOff className="h-6 w-6 text-destructive absolute -bottom-1 -right-1 bg-background rounded-full p-0.5" />
      </div>

      <h1 className="text-2xl font-bold mb-2">Vous êtes hors ligne</h1>
      <p className="text-muted-foreground max-w-sm mb-8">
        Construire n&apos;a pas pu se connecter au serveur. Les données mises en cache restent disponibles.
        Les modifications (statuts, notes) seront synchronisées au retour de la connexion.
      </p>

      <Button onClick={() => window.location.reload()}>
        Réessayer
      </Button>

      <p className="text-xs text-muted-foreground mt-6">
        Les exports et l&apos;upload de documents nécessitent une connexion.
      </p>
    </div>
  );
}
