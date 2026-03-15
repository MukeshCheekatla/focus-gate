"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient, { type ApiKey, type Project } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { KeyCard } from "@/components/KeyCard";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import axios from "axios";

export default function KeysPage(): JSX.Element {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allKeys, setAllKeys] = useState<ApiKey[]>([]);
  const [filtered, setFiltered] = useState<ApiKey[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    void load();
  }, []);

  async function load(): Promise<void> {
    try {
      setLoading(true);
      const { data: projectList } = await apiClient.get<Project[]>("/projects/");
      setProjects(projectList);
      const keyResults = await Promise.all(
        projectList.map((p) => apiClient.get<ApiKey[]>(`/projects/${p.id}/keys/`).then((r) => r.data))
      );
      const keys = keyResults.flat();
      setAllKeys(keys);
      setFiltered(keys);
    } catch (err) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.detail ?? "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let result = allKeys;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((k) => k.name.toLowerCase().includes(q) || k.service.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter((k) => k.status === statusFilter);
    setFiltered(result);
  }, [search, statusFilter, allKeys]);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">All API Keys</h1>
            <p className="text-sm text-slate-500">{filtered.length} of {allKeys.length} keys</p>
          </div>
          <button
            onClick={() => router.push("/projects")}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Key
          </button>
        </div>

        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search keys by name or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring</option>
            <option value="expired">Expired</option>
            <option value="rotated">Rotated</option>
            <option value="leaked">Leaked</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <p className="text-slate-500">No keys found matching your filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((key) => (
              <KeyCard key={key.id} apiKey={key} onRotated={() => void load()} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
