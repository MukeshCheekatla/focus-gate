"use client";

import { useState } from "react";
import apiClient, { type ApiKey } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Key, RotateCcw, Eye, EyeOff, Copy, Check, Clock, Tag } from "lucide-react";
import axios from "axios";

interface KeyCardProps {
  apiKey: ApiKey;
  onRotated?: () => void;
}

export function KeyCard({ apiKey, onRotated }: KeyCardProps): JSX.Element {
  const [revealed, setRevealed] = useState(false);
  const [decryptedValue, setDecryptedValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateNote, setRotateNote] = useState("");
  const [showRotateForm, setShowRotateForm] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleReveal(): Promise<void> {
    if (revealed) {
      setRevealed(false);
      setDecryptedValue(null);
      return;
    }
    try {
      const { data } = await apiClient.get<{ decrypted_value: string }>(
        `/projects/${apiKey.project_id}/keys/${apiKey.id}`
      );
      setDecryptedValue(data.decrypted_value);
      setRevealed(true);
    } catch (err) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.detail ?? "Failed to reveal key");
    }
  }

  async function handleCopy(): Promise<void> {
    if (!decryptedValue) return;
    await navigator.clipboard.writeText(decryptedValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRotate(): Promise<void> {
    if (!newKeyValue.trim()) return;
    setRotating(true);
    setError(null);
    try {
      await apiClient.post(`/projects/${apiKey.project_id}/keys/${apiKey.id}/rotate`, {
        new_value: newKeyValue,
        notes: rotateNote || undefined,
      });
      setShowRotateForm(false);
      setNewKeyValue("");
      setRotateNote("");
      onRotated?.();
    } catch (err) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.detail ?? "Rotation failed");
    } finally {
      setRotating(false);
    }
  }

  const expiryLabel = apiKey.expires_at
    ? new Date(apiKey.expires_at).toLocaleDateString()
    : null;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Key className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{apiKey.name}</p>
            <p className="text-xs text-slate-500">{apiKey.service}</p>
          </div>
        </div>
        <StatusBadge status={apiKey.status} />
      </div>

      {apiKey.tags && apiKey.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {apiKey.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              <Tag className="h-2.5 w-2.5" />{tag}
            </span>
          ))}
        </div>
      )}

      {expiryLabel && (
        <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Expires {expiryLabel}</span>
        </div>
      )}

      {revealed && decryptedValue && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-50 border px-3 py-2">
          <code className="flex-1 truncate text-xs font-mono text-slate-700">{decryptedValue}</code>
          <button onClick={() => void handleCopy()} className="text-slate-400 hover:text-slate-700">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {showRotateForm && (
        <div className="mb-3 space-y-2">
          <input
            type="text"
            placeholder="New key value"
            value={newKeyValue}
            onChange={(e) => setNewKeyValue(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Rotation notes (optional)"
            value={rotateNote}
            onChange={(e) => setRotateNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void handleRotate()}
              disabled={rotating || !newKeyValue.trim()}
              className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {rotating ? "Rotating..." : "Confirm Rotation"}
            </button>
            <button
              onClick={() => { setShowRotateForm(false); setError(null); }}
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => void handleReveal()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs hover:bg-slate-50"
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {revealed ? "Hide" : "Reveal"}
        </button>
        <button
          onClick={() => { setShowRotateForm((v) => !v); setError(null); }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Rotate
        </button>
      </div>
    </div>
  );
}
