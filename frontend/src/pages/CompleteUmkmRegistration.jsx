import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function CompleteUmkmRegistration() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitDetails = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/umkm-registration/details", {
        token,
        bank_name: bankName,
        bank_account_number: accountNumber,
        bank_account_name: accountName,
      });
      setCodeSent(true);
      toast.success("Kode verifikasi dikirim ke email Anda.");
    } catch (error) {
      if (error.response?.status === 502) setCodeSent(true);
      toast.error(error.response?.data?.detail || "Data rekening gagal dikirim.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyEmail = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/umkm-registration/verify-email", { token, code });
      setCompleted(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Verifikasi email gagal.");
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setSubmitting(true);
    try {
      await api.post("/auth/umkm-registration/resend-code", { token });
      toast.success("Kode verifikasi baru telah dikirim.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Kode verifikasi gagal dikirim ulang.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#073778] via-[#0A438D] to-[#073778] p-4 sm:p-8">
      <Card className="w-full max-w-xl rounded-2xl border-white/80 p-6 shadow-[0_24px_70px_rgba(2,20,55,0.28)] sm:p-8">
        <Link to="/login" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#0A3663] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Kembali ke login
        </Link>

        {completed ? (
          <div className="space-y-4">
            <h1 className="font-display text-2xl font-bold text-[#0C2340]">Pendaftaran selesai</h1>
            <p className="text-sm leading-6 text-slate-600">
              Email berhasil diverifikasi dan akun kasir Anda sudah aktif. Rekening pencairan tetap
              menunggu verifikasi admin sebelum digunakan.
            </p>
            <Link to="/login" className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#0A3663] px-4 font-medium text-white transition-colors hover:bg-[#0C2340]">
              Masuk ke akun kasir
            </Link>
          </div>
        ) : !token ? (
          <div className="space-y-3">
            <h1 className="font-display text-2xl font-bold text-[#0C2340]">Tautan tidak valid</h1>
            <p className="text-sm text-slate-600">Tautan pendaftaran tidak ditemukan. Silakan hubungi admin.</p>
          </div>
        ) : !codeSent ? (
          <>
            <h1 className="font-display text-2xl font-bold text-[#0C2340]">Lengkapi pendaftaran</h1>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Isi rekening tujuan pencairan. Setelah dikirim, kode OTP akan dikirim ke email Anda.
            </p>
            <form onSubmit={submitDetails} className="space-y-4">
              <div>
                <Label htmlFor="registration-bank">Bank / E-wallet</Label>
                <select
                  id="registration-bank"
                  required
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-[#0A3663] focus:outline-none"
                >
                  <option value="">Pilih bank tujuan</option>
                  <option value="BRI">Bank BRI</option>
                  <option value="Bank NTT">Bank NTT</option>
                  <option value="DANA">DANA</option>
                </select>
              </div>
              <div>
                <Label htmlFor="registration-account-number">{bankName === "DANA" ? "Nomor HP DANA" : "Nomor rekening"}</Label>
                <Input
                  id="registration-account-number"
                  inputMode={bankName === "DANA" ? "tel" : "numeric"}
                  autoComplete="off"
                  required
                  minLength={6}
                  maxLength={64}
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="registration-account-name">{bankName === "DANA" ? "Nama pemilik akun DANA" : "Nama pemilik rekening"}</Label>
                <Input id="registration-account-name" autoComplete="off" required minLength={2} maxLength={255} value={accountName} onChange={(event) => setAccountName(event.target.value)} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Mengirim..." : "Simpan dan kirim kode OTP"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-[#0C2340]">Verifikasi email</h1>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Masukkan kode 6 digit yang dikirim ke email pendaftaran. Kode berlaku selama 10 menit.
            </p>
            <form onSubmit={verifyEmail} className="space-y-4">
              <div>
                <Label htmlFor="registration-code">Kode OTP</Label>
                <Input
                  id="registration-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  minLength={6}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Memverifikasi..." : "Verifikasi dan aktifkan akun"}
              </Button>
            </form>
            <button type="button" onClick={resendCode} disabled={submitting} className="mt-4 w-full text-sm font-medium text-[#0A3663] hover:underline disabled:opacity-50">
              Kirim ulang kode OTP
            </button>
          </>
        )}
      </Card>
    </div>
  );
}
