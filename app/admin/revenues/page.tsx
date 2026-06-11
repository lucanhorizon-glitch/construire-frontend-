"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Payment {
  id: number;
  amount_eur: number;
  currency: string;
  stripe_session_id: string;
  stripe_payment_intent_id?: string;
  paid_at: string;
  user?: { id: number; name: string; email: string };
  project?: { id: number; name: string };
}

interface RevenuesData {
  data: Payment[];
  total_revenue: number;
  meta: { total: number; current_page: number; last_page: number };
}

function exportCSV() {
  window.open(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/admin/revenues/export`, "_blank");
}

export default function AdminRevenuesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-revenues"],
    queryFn: () => api.get<RevenuesData>("/admin/revenues"),
  });

  const payments = data?.data ?? [];
  const totalRevenue = data?.total_revenue ?? 0;
  const total = data?.meta?.total ?? 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Revenus</h1>
          <p className="text-sm text-muted-foreground">{total} paiements</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Total revenue card */}
      <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
          <TrendingUp className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Revenu total</p>
          <p className="text-3xl font-bold">
            {totalRevenue.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{total} paiement{total !== 1 ? "s" : ""} Stripe</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Projet</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Montant</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Stripe Session ID</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {format(new Date(pay.paid_at), "d MMM yyyy HH:mm", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{pay.user?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{pay.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {pay.project ? (
                          <a href={`/admin/projects/${pay.project.id}`} className="hover:underline">
                            {pay.project.name}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold">{pay.amount_eur.toFixed(2)} €</span>
                        <Badge variant="outline" className="text-xs ml-1">{pay.currency}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground font-mono text-xs truncate max-w-[200px]">
                        {pay.stripe_session_id ?? "—"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && payments.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Aucun paiement enregistré
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
