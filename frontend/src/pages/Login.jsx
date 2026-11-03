import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Waves, ShieldCheck, Store, ChevronDown } from "lucide-react";

const DEMO_ACCOUNTS = [
  { label: "Super Admin", email: "admin@umkm.id", password: "admin123", role: "admin", desc: "Kelola UMKM, persetujuan produk, dan audit" },
  { label: "Kasir (Snack Hawu)", email: "snack.hawu@umkm.id", password: "umkm123", role: "umkm", desc: "Kasir POS, produk, dan transaksi" },
  { label: "Kasir (Tenun Seba)", email: "tenun.seba@umkm.id", password: "umkm123", role: "umkm", desc: "Toko Tenun Ikat Tradisional" },
  { label: "Kasir (Kopi Mesara)", email: "kopi.mesara@umkm.id", password: "umkm123", role: "umkm", desc: "Kedai Kopi Lontar Mesara" },
  { label: "Kasir (Ukiran Mbaata)", email: "ukiran.mbaata@umkm.id", password: "umkm123", role: "umkm", desc: "Kerajinan Ukiran Woodcraft" },
  { label: "Kasir (Toko Terang)", email: "sinar.raijua@umkm.id", password: "umkm123", role: "umkm", desc: "Toko Sembako Terang Sabu" },
];

export default function Login() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showMoreDemo, setShowMoreDemo] = useState(false);
  const googleButtonRef = useRef(null);
  const googleLoginRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
  const { loginWithGoogle } = useAuth();
  googleLoginRef.current = loginWithGoogle;

  useEffect(() => {
    if (!googleClientId) return undefined;
    let active = true;
    let script = document.getElementById("google-identity-services");

    const renderGoogleButton = () => {
      const identity = window.google?.accounts?.id;
      if (!active || !identity || !googleButtonRef.current) return;

      identity.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          try {
            const signedInUser = await googleLoginRef.current(credential);
            toast.success(`Selamat datang, ${signedInUser.name}`);
          } catch (error) {
            toast.error(error.response?.data?.detail || "Login Google gagal");
          }
        },
      });
      googleButtonRef.current.replaceChildren();
      identity.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 320,
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else if (script) {
      script.addEventListener("load", renderGoogleButton);
    } else {
      script = document.createElement("script");
      script.id = "google-identity-services";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderGoogleButton);
      document.head.appendChild(script);
    }

    return () => {
      active = false;
      script?.removeEventListener("load", renderGoogleButton);
    };
  }, [googleClientId]);

  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/umkm"} replace />;

  const executeLogin = async (loginEmail, loginPassword) => {
    try {
      const cleanEmail = (loginEmail || "").trim();
      const u = await login(cleanEmail, loginPassword);
      toast.success(`Selamat datang, ${u.name}`);
    } catch (err) {
      let message = "Login gagal";
      if (!err.response) {
        message = "Tidak dapat terhubung ke server backend (port 8001). Pastikan server backend sedang aktif.";
      } else if (err.response.status === 401) {
        message = err.response.data?.detail || "Email atau password salah.";
      } else if (typeof err.response.data?.detail === "string") {
        message = err.response.data.detail;
      } else if (Array.isArray(err.response.data?.detail)) {
        message = err.response.data.detail.map((d) => d.msg || d.message).join(", ");
      } else if (err.response.data?.message) {
        message = err.response.data.message;
      }
      toast.error(message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const quickFill = (em, pw, autoLogin = false) => {
    setEmail(em);
    setPassword(pw);
    if (autoLogin) {
      executeLogin(em, pw);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-[#073778] via-[#0A438D] to-[#073778] md:flex-row">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-32 h-64 w-[30rem] -rotate-45 rounded-full bg-blue-400/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -bottom-40 h-64 w-[34rem] -rotate-45 rounded-full bg-blue-400/10" />
      <div aria-hidden="true" className="pointer-events-none absolute left-10 top-0 h-52 w-12 -rotate-45 rounded-full bg-white/[0.04]" />

      {/* left visual */}
      <div className="relative z-10 hidden items-center justify-center p-12 md:flex md:w-1/2">
        <div className="relative z-10 max-w-md text-white md:translate-x-[11vw]">
          <img src="/hawupay-logo.svg" alt="Logo HawuPay" className="mb-7 h-24 w-24 rounded-[1.4rem] shadow-lg" />
          <h1 className="font-display mb-4 text-4xl font-extrabold leading-[1.05] md:text-5xl">
            Hawu<span className="text-[#E6A100]">Pay</span>
          </h1>
          <p className="mb-8 max-w-sm text-lg leading-relaxed text-white/85">
            Transaksi UMKM, Lebih Mudah dan Terpercaya
          </p>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Waves className="w-4 h-4" />
            by : TRPL 25 POLIJE SABU RAIJUA
          </div>
        </div>
      </div>

      {/* login form */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-8 md:w-1/2">
        <Card className="w-full max-w-md rounded-2xl border-white/80 p-6 shadow-[0_24px_70px_rgba(2,20,55,0.28)] sm:p-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-2xl font-bold text-[#0C2340]">Masuk ke akun</h2>
            <div className="md:hidden">
              <img src="/hawupay-logo.svg" alt="Logo HawuPay" className="h-10 w-10 rounded-lg" />
            </div>
          </div>
          <p className="mb-5 text-sm text-slate-500">Silakan login untuk melanjutkan ke sistem.</p>

          {/* Quick Login / Fill Selector */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-[#0C2340] mb-2 flex items-center justify-between">
              <span>Akses Cepat (1-Klik Masuk)</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-normal">Pilih Peran</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => quickFill(DEMO_ACCOUNTS[0].email, DEMO_ACCOUNTS[0].password, true)}
                className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#0A3663]/20 hover:border-[#0A3663] hover:bg-blue-50/50 transition-all text-left text-xs font-medium text-[#0A3663]"
                title="Masuk langsung sebagai Super Admin"
              >
                <div className="w-6 h-6 rounded-md bg-[#0A3663] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="font-bold">Super Admin</div>
                  <div className="text-[10px] text-slate-500">admin@umkm.id</div>
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => quickFill(DEMO_ACCOUNTS[1].email, DEMO_ACCOUNTS[1].password, true)}
                className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#E6A100]/30 hover:border-[#E6A100] hover:bg-amber-50/50 transition-all text-left text-xs font-medium text-[#8A5F00]"
                title="Masuk langsung sebagai Kasir UMKM"
              >
                <div className="w-6 h-6 rounded-md bg-[#E6A100] text-white flex items-center justify-center shrink-0">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="font-bold">Kasir UMKM</div>
                  <div className="text-[10px] text-slate-500">snack.hawu@umkm.id</div>
                </div>
              </button>
            </div>

            {/* Expandable more demo accounts */}
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => setShowMoreDemo((v) => !v)}
                className="text-[11px] text-[#0A3663] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>{showMoreDemo ? "Sembunyikan akun demo lainnya" : "Lihat akun UMKM lainnya"}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showMoreDemo ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showMoreDemo && (
              <div className="mt-2 pt-2 border-t border-[#E5DEC9] space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {DEMO_ACCOUNTS.slice(2).map((item) => (
                  <button
                    key={item.email}
                    type="button"
                    disabled={loading}
                    onClick={() => quickFill(item.email, item.password, true)}
                    className="w-full flex items-center justify-between p-1.5 rounded-md bg-white/80 hover:bg-white border border-[#E5DEC9] text-xs text-left text-slate-700 hover:text-[#0A3663]"
                  >
                    <span className="font-medium truncate">{item.label}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{item.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@umkm.id"
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  data-testid="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-11"
                />
                <button
                  type="button"
                  data-testid="toggle-password-visibility"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0A3663]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="-mt-2 flex justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-[#0A3663] hover:underline">
                Lupa Password?
              </Link>
            </div>
            <Button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-lg bg-[#FFC91D] font-semibold text-[#123B76] hover:bg-[#F0B900]"
            >
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <div className="mt-5 border-t border-[#E5DEC9] pt-4">
            {googleClientId ? (
              <div ref={googleButtonRef} className="flex min-h-10 justify-center" aria-label="Login dengan Google" />
            ) : (
              <p className="text-center text-xs text-slate-500">Login Google belum aktif. Client ID Google perlu dikonfigurasi.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
