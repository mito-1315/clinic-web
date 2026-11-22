import { useCallback, useEffect, useState } from "react";

const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "") + "/api/v1";
const KEY = "clinic_token";

export const getToken = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* storage blocked */ }
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: { path: string; message: string }[]) {
    super(message);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? "GET",
      headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Please try again.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith("/auth/login")) {
      setToken(null);
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw new ApiError(res.status, data?.error?.message ?? "Request failed", data?.error?.details);
  }
  return data as T;
}

export const errMsg = (e: unknown) =>
  e instanceof ApiError ? (e.details?.length ? e.details.map((d) => `${d.path}: ${d.message}`).join("; ") : e.message) : "Something went wrong";

export function useApi<T = any>(path: string, opts: { every?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    api<T>(path)
      .then((d) => { if (live) { setData(d); setError(""); } })
      .catch((e) => { if (live) setError(errMsg(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [path, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const every = opts.every;
  useEffect(() => {
    if (!every) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") setTick((t) => t + 1); }, every);
    return () => clearInterval(id);
  }, [every]);
  return { data, error, loading, reload };
}
