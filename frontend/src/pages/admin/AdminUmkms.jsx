import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Eye, Plus, Power, Search, Store, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const emptyForm = {
  store_name: "",
  email: "",
  password: "",
  address: "",
  phone: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_name: "",
};

function UmkmLogo({ logo, storeName }) {
  const [failedLogo, setFailedLogo] = useState("");
  const showLogo = Boolean(logo && failedLogo !== logo);

  return (
    <div className="w-12 h-12 shrink-0 overflow-hidden rounded-xl bg-[#0A3663] flex items-center justify-center">
      {showLogo ? (
        <img src={logo} alt={`Logo ${storeName}`} className="h-full w-full object-cover" onError={() => setFailedLogo(logo)} />
      ) : (
        <Store className="w-6 h-6 text-[#E6A100]" />
      )}
    </div>
  );
}

export default function AdminUmkms() {
  const [umkms, setUmkms] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [registrationToReject, setRegistrationToReject] = useState(null);
  const [registrationTestLink, setRegistrationTestLink] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    const [umkmResponse, registrationResponse] = await Promise.all([
      api.get("/admin/umkms"),
      api.get("/admin/umkm-registrations"),
    ]);
    setUmkms(umkmResponse.data);
    setRegistrations(registrationResponse.data);
  }, []);
  useEffect(() => {
    const refresh = () => load().catch((err) => toast.error(err.response?.data?.detail || "Gagal memuat data UMKM"));
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/admin/umkms", form);
      toast.success(data.bank_verification_status
        ? "UMKM ditambahkan. Rekening payout menunggu verifikasi."
        : "UMKM berhasil ditambahkan");
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal"); }
  };

  const toggle = async (id) => {
    try {
      await api.patch(`/admin/umkms/${id}/toggle`);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal mengubah status UMKM"); }
  };

  const approveRegistration = async (registration) => {
    try {
      const { data } = await api.post(`/admin/umkm-registrations/${registration.id}/approve`);
      if (data.email_sent === false && data.development_link) {
        setRegistrationTestLink(data.development_link);
        toast.success("Pendaftaran disetujui untuk pengujian lokal.");
      } else {
        toast.success(`Tautan melanjutkan pendaftaran dikirim ke ${registration.email}`);
      }
      load().catch((err) => toast.error(err.response?.data?.detail || "Gagal memuat ulang data UMKM"));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal menyetujui pendaftaran");
    }
  };

  const rejectRegistration = async (registration) => {
    setRegistrationToReject(registration);
    setRejectionReason("");
  };

  const submitRejection = async (event) => {
    event.preventDefault();
    if (!registrationToReject || !rejectionReason.trim()) return;

    setRejecting(true);
    try {
      await api.post(`/admin/umkm-registrations/${registrationToReject.id}/reject`, {
        reason: rejectionReason.trim(),
      });
      toast.success(`Pendaftaran ditolak dan email dikirim ke ${registrationToReject.email}`);
      setRegistrationToReject(null);
      setRejectionReason("");
      load().catch((err) => toast.error(err.response?.data?.detail || "Gagal memuat ulang data UMKM"));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal menolak pendaftaran");
    } finally {
      setRejecting(false);
    }
  };

  const remove = async (umkm) => {
    if (!window.confirm(`Hapus UMKM ${umkm.store_name}? Data akun, produk, pelanggan, dan transaksi toko ini akan dihapus permanen.`)) return;
    try {
      await api.delete(`/admin/umkms/${umkm.id}`);
      toast.success("UMKM berhasil dihapus");
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal menghapus UMKM"); }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredUmkms = umkms.filter((umkm) => {
    if (!normalizedQuery) return true;
    return [umkm.store_name, umkm.email, umkm.address, umkm.phone]
      .some(value => String(value || "").toLowerCase().includes(normalizedQuery));
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Daftar UMKM</h1>
        <Button data-testid="add-umkm-btn" onClick={() => setOpen(true)} className="bg-[#0A3663] hover:bg-[#0C2340] rounded-full">
          <Plus className="w-4 h-4 mr-1.5" /> Tambah UMKM
        </Button>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">Tambah UMKM Baru</h2>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Nama Toko</Label><Input required value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })} /></div>
              <div><Label>Email Login</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Alamat</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="border-t border-slate-200 pt-3">
                <h3 className="text-sm font-semibold text-[#0C2340]">Rekening Tujuan Pencairan</h3>
                <p className="mt-1 text-xs text-slate-500">Rekening disimpan menunggu verifikasi. Transfer belum aktif.</p>
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="umkm-bank-name">Bank / E-wallet</Label>
                    <select
                      id="umkm-bank-name"
                      required
                      value={form.bank_name}
                      onChange={e => setForm({ ...form, bank_name: e.target.value })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-[#0A3663] focus:outline-none"
                    >
                      <option value="">Pilih bank tujuan</option>
                      <option value="BRI">Bank BRI</option>
                      <option value="Bank NTT">Bank NTT</option>
                      <option value="DANA">DANA</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="umkm-bank-account-number">
                      {form.bank_name === "DANA" ? "Nomor HP DANA" : "Nomor Rekening"}
                    </Label>
                    <Input
                      id="umkm-bank-account-number"
                      type="text"
                      inputMode={form.bank_name === "DANA" ? "tel" : "numeric"}
                      autoComplete="off"
                      minLength={6}
                      maxLength={64}
                      required
                      value={form.bank_account_number}
                      onChange={e => setForm({ ...form, bank_account_number: e.target.value })}
                      placeholder={form.bank_name === "DANA" ? "08xxxxxxxxxx" : ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="umkm-bank-account-name">
                      {form.bank_name === "DANA" ? "Nama Pemilik Akun DANA" : "Nama Pemilik Rekening"}
                    </Label>
                    <Input
                      id="umkm-bank-account-name"
                      autoComplete="off"
                      maxLength={255}
                      required
                      value={form.bank_account_name}
                      onChange={e => setForm({ ...form, bank_account_name: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Batal</Button>
                <Button type="submit" className="flex-1 bg-[#0A3663]">Simpan</Button>
              </div>
            </form>
            </div>
          </div>
        )}
      </div>

      {registrationToReject && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !rejecting) {
              setRegistrationToReject(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-registration-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 id="reject-registration-title" className="font-display text-xl font-bold text-[#0C2340]">
              Tolak pendaftaran UMKM
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Tuliskan alasan penolakan untuk <strong>{registrationToReject.store_name}</strong>.
              Alasan ini akan dikirim ke email pendaftar.
            </p>
            <form onSubmit={submitRejection} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="umkm-rejection-reason">Alasan penolakan</Label>
                <textarea
                  id="umkm-rejection-reason"
                  autoFocus
                  required
                  minLength={3}
                  maxLength={1000}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Contoh: Mohon lengkapi alamat usaha dengan lebih jelas."
                  className="mt-1 min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0A3663] focus:outline-none focus:ring-2 focus:ring-[#0A3663]/20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={rejecting}
                  onClick={() => setRegistrationToReject(null)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="destructive" disabled={rejecting || !rejectionReason.trim()}>
                  {rejecting ? "Mengirim..." : "Tolak pendaftaran"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {registrationTestLink && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-test-link-title"
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 id="registration-test-link-title" className="font-display text-xl font-bold text-[#0C2340]">
              Persetujuan uji lokal
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              SMTP belum aktif. Tautan ini hanya ditampilkan untuk pengujian lokal dan tidak
              dikirim ke email pendaftar. Tautan berlaku 48 jam dan hanya dapat digunakan sekali.
            </p>
            <Input className="mt-4" readOnly value={registrationTestLink} onFocus={(event) => event.target.select()} aria-label="Tautan pendaftaran uji lokal" />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(registrationTestLink);
                    toast.success("Tautan berhasil disalin.");
                  } catch {
                    toast.error("Gagal menyalin. Pilih tautan di atas lalu salin secara manual.");
                  }
                }}
              >
                Salin tautan
              </Button>
              <a
                href={registrationTestLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#0A3663] px-4 font-medium text-white transition-colors hover:bg-[#0C2340]"
              >
                Buka tautan
              </a>
              <Button type="button" onClick={() => setRegistrationTestLink("")}>Tutup</Button>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#0C2340]">Pendaftaran menunggu verifikasi</h2>
          <Badge className="bg-amber-100 text-amber-800">{registrations.length}</Badge>
        </div>
        {registrations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
            Tidak ada pendaftaran UMKM yang menunggu verifikasi.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {registrations.map((registration) => (
              <Card key={registration.id} className="space-y-3 border-amber-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-[#0C2340]">{registration.store_name}</h3>
                    <p className="text-sm text-slate-600">Pemilik: {registration.owner_name}</p>
                  </div>
                  <Badge className={`shrink-0 ${registration.status === "EXPIRED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                    {registration.status === "EXPIRED" ? "Tautan kedaluwarsa" : "Menunggu"}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>{registration.email}</p>
                  <p>{registration.phone}</p>
                  <p>{registration.business_address}</p>
                  <p className="text-xs text-slate-400">
                    Didaftarkan {new Date(registration.requested_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <Button onClick={() => approveRegistration(registration)} className="flex-1 bg-emerald-700 hover:bg-emerald-800">
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    {registration.status === "EXPIRED" ? "Kirim ulang tautan" : "Setujui & kirim email"}
                  </Button>
                  <Button variant="destructive" onClick={() => rejectRegistration(registration)} className="flex-1">
                    <XCircle className="mr-1.5 h-4 w-4" /> Tolak
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="relative max-w-xl">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari nama toko, email, alamat, atau telepon..."
          aria-label="Cari UMKM"
          className="pl-9"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUmkms.map(u => (
          <Card key={u.id} className="p-5 border-[#E5DEC9]">
            <div className="flex items-start gap-3">
              <UmkmLogo logo={u.logo} storeName={u.store_name} />
              <div className="flex-1">
                <div className="font-display font-bold text-[#0C2340]">{u.store_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{u.address}</div>
                <div className="text-xs text-slate-500">{u.phone}</div>
                {u.payout_account ? (
                  <div className="mt-2 text-xs text-slate-600">
                    {u.payout_account.bank_name} · {u.payout_account.masked_account_number}
                    <span className="ml-2 text-amber-700">
                      {u.payout_account.verification_status === "VERIFIED" ? "Terverifikasi" : "Menunggu verifikasi"}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-500">Rekening pencairan belum didaftarkan</div>
                )}
              </div>
              <Badge className={u.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                {u.active ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Saldo</div>
                <div className="font-display font-bold text-[#0A3663]">{rp(u.balance)}</div>
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/umkms/${u.id}/products`} className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium transition-colors hover:bg-slate-50">
                  <Eye className="w-3.5 h-3.5 mr-1" /> Produk
                </Link>
                <Button variant="outline" size="sm" onClick={() => toggle(u.id)}>
                  <Power className="w-3.5 h-3.5 mr-1" />
                  {u.active ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => remove(u)} aria-label={`Hapus ${u.store_name}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {filteredUmkms.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Tidak ada UMKM yang cocok dengan pencarian.
        </div>
      )}
    </div>
  );
}