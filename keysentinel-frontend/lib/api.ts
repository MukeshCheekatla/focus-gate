import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { getToken, clearToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Axios instance with JWT injection and 401 auto-logout. */
const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Response interceptor: clear token on 401
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// -- Typed API helpers --------------------------------------------------------

export interface ApiKey {
  id: string;
  project_id: string;
  created_by: string | null;
  name: string;
  service: string;
  status: "active" | "expiring" | "expired" | "rotated" | "leaked";
  tags: string[] | null;
  expires_at: string | null;
  rotation_reminder_days: number;
  last_rotated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyWithValue extends ApiKey {
  decrypted_value: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface RotationEvent {
  id: string;
  key_id: string;
  rotated_by: string | null;
  notes: string | null;
  rotated_at: string;
}

export interface AlertConfig {
  id: string;
  user_id: string;
  type: "email" | "slack" | "webhook";
  endpoint: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScanResult {
  id: string;
  project_id: string;
  repo: string;
  findings: ScanFinding[];
  scanned_at: string;
}

export interface ScanFinding {
  file: string;
  line: number;
  pattern_name: string;
  matched_text: string;
  commit_sha: string | null;
}

export interface AuditReport {
  project_id: string;
  project_name?: string;
  total_keys: number;
  health_score: number;
  over_aged_keys: Array<{ id: string; name: string; service: string; days_since_last_rotation: number }>;
  no_rotation_policy_keys: Array<{ id: string; name: string; service: string }>;
  expiring_soon_keys: Array<{ id: string; name: string; service: string; days_to_expiry: number }>;
  expired_keys: Array<{ id: string; name: string; service: string; expired_days_ago: number }>;
  duplicate_keys: Array<{ names: string[]; count: number }>;
  generated_at: string;
}

export interface GlobalAuditReport {
  user_id: string;
  total_projects: number;
  total_keys: number;
  average_health_score: number;
  projects: AuditReport[];
  generated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  github_token: string | null;
  created_at: string;
}
