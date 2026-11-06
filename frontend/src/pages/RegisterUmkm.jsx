import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Waves } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const initialForm = {
  owner_name: "",
  store_name: "",
  email: "",
  phone: "",
  business_address: "",
  password: "",
};

export default function RegisterUmkm() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/umkm-registration", form);
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Pendaftaran gagal dikirim.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#073778] via-[#0A438D] to-[#073778] p-4 sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-32 h-64 w-[30rem] -rotate-45 rounded-full bg-blue-400/10" />
      <Card className="relative z-10 w-full max-w-xl rounded-2xl border-white/80 p-6 shadow-[0_24px_70px_rgba(2,20,55,0.28)] sm:p-8">
        <Link to="/login" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#0A3663] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Kembali ke login
        </Link>
        <div className="mb-5 flex items-center gap-3">
          <img src="/hawupay-logo.svg" alt="Logo HawuPay" className="h-12 w-12 rounded-xl" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#0C2340]">Daftar sebagai UMKM</h1>
            <p className="text-sm text-slate-500">Isi data awal usaha untuk ditinjau admin.</p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <h2 className="font-semibold">Pendaftaran berhasil dikirim</h2>
            <p>
              Admin akan meninjau data Anda. Jika disetujui, tautan untuk melanjutkan pendaftaran
              akan dikirim ke <strong>{form.email}</strong>.
            </p>
            <Link to="/login" className="inline-flex font-semibold text-[#0A3663] hover:underline">
              Kembali ke halaman login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="registration-owner">Nama pemilik</Label>
              <Input id="registration-owner" autoComplete="name" required maxLength={255} value={form.owner_name} onChange={update("owner_name")} />
            </div>
            <div>
              <Label htmlFor="registration-store">Nama usaha</Label>
              <Input id="registration-store" autoComplete="organization" required maxLength={255} value={form.store_name} onChange={update("store_name")} />
            </div>
            <div>
              <Label htmlFor="registration-email">Email</Label>
              <Input id="registration-email" type="email" autoComplete="email" required maxLength={255} value={form.email} onChange={update("email")} />
            </div>
            <div>
              <Label htmlFor="registration-phone">Nomor telepon</Label>
              <Input id="registration-phone" type="tel" autoComplete="tel" required minLength={6} maxLength={64} value={form.phone} onChange={update("phone")} />
            </div>
            <div>
              <Label htmlFor="registration-address">Alamat tempat usaha</Label>
              <textarea
                id="registration-address"
                required
                minLength={4}
                maxLength={2000}
                value={form.business_address}
                onChange={update("business_address")}
                className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0A3663] focus:outline-none"
              />
            </div>
            <div>
              <Label htmlFor="registration-password">Kata sandi</Label>
              <Input id="registration-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={update("password")} />
              <p className="mt-1 text-xs text-slate-500">Minimal 8 karakter.</p>
            </div>
            <Button type="submit" disabled={submitting} className="h-11 w-full rounded-lg bg-[#FFC91D] font-semibold text-[#123B76] hover:bg-[#F0B900]">
              {submitting ? "Mengirim..." : "Kirim pendaftaran"}
            </Button>
          </form>
        )}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Waves className="h-3.5 w-3.5" /> HawuPay
        </div>
      </Card>
    </div>
  );
}
