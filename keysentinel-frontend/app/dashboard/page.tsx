"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient, { type ApiKey, type Project, type GlobalAuditReport } from "@/lib/api";
import { isAuthenticated, getUserProfile, logout } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Shield, Key, FolderOpen, AlertTriangle, LogOut,
  TrendingUp, Search, Plus, RefreshCw
} from "lucide-react";
import axios from "axios";

interface DashboardStats {
  totalKeys: number;
  activeKeys: number;
  expiringKeys: number;
  expiredKeys: number;
  leakedKeys: number;
  healthScore: number;
}

export default function DashboardPage(): JSX.Element {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allKeys, setAllKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalKeys: 0, activeKeys: 0, expiringKeys: 0,
    expiredKeys: 0, leakedKeys: 0, healthScore: 100,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userProfile = getUserProfile();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    void loadDashboard();
  }, []);

  async function loadDashboard(): Promise<void> {
    try {
      setLoading(true);
      const { data: projectList } = await apiClient.get<Project[]>("/projects/");
      setProjects(projectList);

      const keyResults = await Promise.all(
        projectList.map((p) =>
          apiClient.get<ApiKey[]>(`/projects/${p.id}/keys/`).then((r) => r.data)
        )
      );
      const keys = keyResults.flat();
      setAllKeys(keys);

      const active = keys.filter((k) => k.status === "active").length;
      const expiring = keys.filter((k) => k.status === "expiring").length;
      const expired = keys.filter((k) => k.status === "expired").length;
      const leaked = keys.filter((k) => k.status === "leaked").length;
      const issues = expiring + expired + leaked;
      const score = keys.length > 0 ? Math.max(0, 100 - Math.round((issues / keys.length) * 100)) : 100;

      setStats({
        totalKeys: keys.length,
        activeKeys: active,
        expiringKeys: expiring,
        expiredKeys: expired,
        leakedKeys: leaked,
        healthScore: score,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? "Failed to load dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: "Total Keys", value: stats.totalKeys, icon: Key, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active", value: stats.activeKeys, icon: Shield, color: "text-green-600", bg: "bg-green-50" },
    { label: "Expiring Soon", value: stats.expiringKeys, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Expired / Leaked", value: stats.expiredKeys + stats.leakedKeys, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
            <Shield className="h-5 w-5 text-blue-600" />
            KeySentinel
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/keys" className="text-sm text-slate-600 hover:text-slate-900">All Keys</Link>
            <Link href="/projects" className="text-sm text-slate-600 hover:text-slate-900">Projects</Link>
            <Link href="/audit" className="text-sm text-slate-600 hover:text-slate-900">Audit</Link>
            <Link href="/scan" className="text-sm text-slate-600 hover:text-slate-900">Scan</Link>
            <Link href="/alerts" className="text-sm text-slate-600 hover:text-slate-900">Alerts</Link>
            <span className="text-sm text-slate-400">{userProfile?.email}</span>
            <button onClick={logout} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Overview of all your API keys and security posture</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void loadDashboard()}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <Link
              href="/projects"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> New Project
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium">Security Health Score</p>
              <p className="text-5xl font-bold mt-1">{stats.healthScore}<span className="text-2xl">/100</span></p>
              <p className="text-blue-200 text-sm mt-1">
                {stats.healthScore >= 80 ? "Great posture" : stats.healthScore >= 60 ? "Needs attention" : "Critical - action required"}
              </p>
            </div>
            <TrendingUp className="h-16 w-16 text-blue-300 opacity-50" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {statCards.map((card) => (
                <div key={card.label} className="rounded-xl border bg-white p-5 shadow-sm">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                  <p className="text-sm text-slate-500">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Recent Keys</h2>
                <Link href="/keys" className="text-sm text-blue-600 hover:underline">View all</Link>
              </div>
              {allKeys.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Key className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-slate-500 text-sm">No API keys yet.</p>
                  <Link href="/projects" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Create a project to get started</Link>
                </div>
              ) : (
                <div className="divide-y">
                  {allKeys.slice(0, 8).map((key) => (
                    <div key={key.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{key.name}</p>
                        <p className="text-xs text-slate-500">{key.service}</p>
                      </div>
                      <StatusBadge status={key.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
