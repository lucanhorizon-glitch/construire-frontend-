"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HardHat, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  legalKey: string;
  title: string;
}

export default function LegalPage({ legalKey, title }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ content: string }>(`/legal/${legalKey}`)
      .then((res) => setContent((res as { content: string }).content ?? ""))
      .catch(() => setContent(""))
      .finally(() => setLoading(false));
  }, [legalKey]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <HardHat className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">Maison Tracker</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold">{title}</h1>

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-muted animate-pulse rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
            ))}
          </div>
        ) : content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {content}
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            Cette page n'a pas encore été rédigée.
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/cgv" className="hover:text-foreground transition-colors">CGV</Link>
          <Link href="/cgu" className="hover:text-foreground transition-colors">CGU</Link>
          <Link href="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
          <Link href="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
        </div>
      </footer>
    </div>
  );
}
