import axios from "axios";

export function getBackendUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location.hostname) {
      const h = window.location.hostname;
      if (h !== "localhost" && h !== "127.0.0.1" && (clean.includes("localhost") || clean.includes("127.0.0.1"))) {
        clean = clean.replace(/localhost|127\.0\.0\.1/, h);
      }
    }
    return clean;
  }

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (import.meta.env.PROD) {
      return "";
    }
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:8001`;
    }
  }

  return "http://localhost:8001";
}

const BACKEND_URL = getBackendUrl();
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

export const api = axios.create({ baseURL: API, timeout: 15000 });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const isLoginRequest = err.config?.url?.includes("/auth/login");
      if (!isLoginRequest) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

export async function signTransaction({ clientTxnId, total, deviceId, nonce }) {
  const { data } = await api.post("/umkm/transactions/signature", {
    client_txn_id: clientTxnId,
    total,
    device_id: deviceId,
    nonce,
  });
  return data.signature;
}

export function getDeviceId() {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = "DEV-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    localStorage.setItem("device_id", id);
  }
  return id;
}
