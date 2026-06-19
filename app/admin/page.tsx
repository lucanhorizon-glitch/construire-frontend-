"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Users, FolderOpen, CreditCard, CheckSquare, TrendingUp, HardHat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DashboardData {
  users: { total: number; today: number; this_week: number; this_month: number };
  projects: { total: number; active: number; archived: number; neuf: number; renovation: number; premium: number };
  revenue: { total: number; count: number };
  tasks_done: number;
  pro_accounts?: { total: number; constructeur: number; architecte: number; maitre_oeuvre: number; cmiste: number };
  charts: {
    daily: { date: string; count: number; amount: number }[];
    types: { name: string; value: number }[];
  };
}

const PIE_COLORS = ["#3b82f6", "#f59e0b"];

function StatCard({ title, value, sub, icon: Icon, color = "text-primary" }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(d: string) {
  try {
    return format(new Date(d), "d MMM", { locale: fr });
  } catch {
    return d;
  }
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get<DashboardData>("/admin/dashboard"),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const d = data as DashboardData;
  const chartData = (d?.charts?.daily ?? []).map((item) => ({
    ...item,
    label: formatDate(item.date),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm">Vue globale de Suivi Construction</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Utilisateurs"
          value={d?.users.total ?? 0}
          sub={`+${d?.users.today ?? 0} aujourd'hui · +${d?.users.this_month ?? 0} ce mois`}
          icon={Users}
          color="text-blue-500"
        />
        <StatCard
          title="Projets"
          value={d?.projects.total ?? 0}
          sub={`${d?.projects.active ?? 0} actifs · ${d?.projects.archived ?? 0} archivés`}
          icon={FolderOpen}
          color="text-emerald-500"
        />
        <StatCard
          title="Projets premium"
          value={d?.projects.premium ?? 0}
          sub={`${d?.projects.neuf ?? 0} neuf · ${d?.projects.renovation ?? 0} rénov`}
          icon={TrendingUp}
          color="text-amber-500"
        />
        <StatCard
          title="Revenus"
          value={`${(d?.revenue.total ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}
          sub={`${d?.revenue.count ?? 0} paiements`}
          icon={CreditCard}
          color="text-violet-500"
        />
        <StatCard
          title="Tâches faites"
          value={d?.tasks_done ?? 0}
          icon={CheckSquare}
          color="text-slate-500"
        />
        <StatCard
          title="Comptes pro"
          value={d?.pro_accounts?.total ?? 0}
          sub={`${d?.pro_accounts?.constructeur ?? 0} const. · ${d?.pro_accounts?.architecte ?? 0} arch.`}
          icon={HardHat}
          color="text-blue-500"
        />
      </div>

      {/* Sub-stats row */}
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-lg font-bold">{d?.users.today ?? 0}</p>
          <p className="text-xs text-muted-foreground">Inscrits aujourd'hui</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-lg font-bold">{d?.users.this_week ?? 0}</p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-lg font-bold">{d?.users.this_month ?? 0}</p>
          <p className="text-xs text-muted-foreground">Ce mois</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Registrations line chart */}
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inscriptions — 30 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, "Inscriptions"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue bar chart */}
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenus — 30 derniers jours (€)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(2)} €`, "Revenus"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project type pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Types de projets</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={d?.charts.types ?? []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {(d?.charts.types ?? []).map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => [v, "Projets"]} contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick project stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Répartition projets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Projets actifs",    value: d?.projects.active ?? 0,    color: "bg-emerald-500" },
              { label: "Projets archivés",  value: d?.projects.archived ?? 0,  color: "bg-slate-400"   },
              { label: "Projets neuf",      value: d?.projects.neuf ?? 0,      color: "bg-blue-500"    },
              { label: "Projets rénovation",value: d?.projects.renovation ?? 0,color: "bg-amber-500"   },
              { label: "Projets premium",   value: d?.projects.premium ?? 0,   color: "bg-violet-500"  },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", row.color)} />
                <span className="text-sm flex-1">{row.label}</span>
                <span className="text-sm font-bold">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
