"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptState = "hidden" | "android" | "ios";

const STORAGE_KEY = "pwa-prompt-dismissed";
const DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < DISMISSED_TTL_MS;
  } catch {
    return false;
  }
}

function saveDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now() }));
  } catch {}
}

export default function PwaPrompt() {
  const [state, setState] = useState<PromptState>("hidden");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInStandaloneMode() || wasDismissedRecently()) return;

    // Android / Chrome: capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari: show instructions after 30 s
    const timer = setTimeout(() => {
      if (wasDismissedRecently()) return;
      if (isIOS() && !isInStandaloneMode()) {
        setState("ios");
        return;
      }
      // Android prompt fires via the event; show fallback banner if already captured
      if (deferredPrompt) setState("android");
    }, 30_000);

    // If Android prompt fires during the 30-s window, we'll show it when the timer fires
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When deferredPrompt arrives after the timer already fired
  useEffect(() => {
    if (deferredPrompt && state === "hidden" && !wasDismissedRecently()) {
      const timer = setTimeout(() => setState("android"), 30_000);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, state]);

  function dismiss() {
    saveDismissed();
    setState("hidden");
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      setState("hidden");
    } else {
      dismiss();
    }
  }

  if (state === "hidden") return null;

  return (
    <div
      role="dialog"
      aria-label="Installer l'application"
      className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-84 z-50"
    >
      <div className="rounded-2xl border bg-card shadow-xl p-4 flex items-start gap-3">
        {/* iOS instructions */}
        {state === "ios" ? (
          <div className="flex-1 space-y-2">
            <p className="font-semibold text-sm">Installer Construire</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pour installer l&apos;app sur votre iPhone, appuyez sur{" "}
              <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                <Share className="h-3.5 w-3.5" /> Partager
              </span>{" "}
              puis{" "}
              <span className="font-medium text-foreground">
                &laquo;&nbsp;Sur l&apos;écran d&apos;accueil&nbsp;&raquo;
              </span>
              .
            </p>
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground bg-muted rounded-lg">
              <ArrowUp className="h-4 w-4 shrink-0 animate-bounce" />
              <span>Barre Safari → Partager</span>
            </div>
          </div>
        ) : (
          /* Android / Chrome */
          <div className="flex-1">
            <p className="font-semibold text-sm">Installer Construire</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Accédez à votre chantier directement depuis l&apos;écran d&apos;accueil, même hors ligne.
            </p>
            <Button size="sm" className="mt-3 gap-2 w-full" onClick={handleInstall}>
              <Download className="h-4 w-4" />
              Installer
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 -mt-0.5 -mr-0.5"
          onClick={dismiss}
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
