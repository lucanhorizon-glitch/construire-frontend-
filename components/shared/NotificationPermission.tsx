"use client";

import { useState } from "react";
import { Bell, BellOff, BellRing, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationPermissionProps {
  /** Render as a compact icon button (for sidebar/settings) instead of a full banner */
  compact?: boolean;
}

export default function NotificationPermission({ compact = false }: NotificationPermissionProps) {
  const { permission, loading, subscription, subscribe, unsubscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (permission === "unsupported") return null;

  if (permission === "denied") {
    if (compact) return null;
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-sm flex items-start gap-2">
        <BellOff className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <span className="text-amber-800 dark:text-amber-300">
          Les notifications sont bloquées. Autorisez-les dans les paramètres de votre navigateur.
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={subscription ? unsubscribe : subscribe}
        disabled={loading}
        title={subscription ? "Désactiver les notifications" : "Activer les notifications"}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : subscription ? (
          <BellRing className="h-4 w-4 text-primary" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
      </Button>
    );
  }

  // Already subscribed — no banner needed
  if (subscription) return null;

  // Permission already granted but no subscription yet — handled by compact button
  if (permission === "granted") return null;

  // Permission is "default" and not yet dismissed
  if (dismissed) return null;

  return (
    <div className="rounded-lg border bg-card p-4 flex items-start gap-3 w-full">
      <Bell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Activez les notifications pour vos rappels de chantier</p>
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            className="gap-2"
            onClick={subscribe}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Activer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            Plus tard
          </Button>
        </div>
      </div>
      <button
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
