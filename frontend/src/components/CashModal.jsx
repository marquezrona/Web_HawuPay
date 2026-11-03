import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banknote, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function CashModal({ open, onOpenChange, total, onPay }) {
  const [cashReceived, setCashReceived] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const receivedAmount = Number(cashReceived);
  const validPayment = cashReceived !== "" && Number.isFinite(receivedAmount) && receivedAmount >= total;
  const changeAmount = validPayment
    ? Math.round((receivedAmount - total) * 100) / 100
    : 0;

  useEffect(() => {
    if (open) {
      setCashReceived("");
      setError("");
    }
  }, [open]);

  const confirmPayment = async () => {
    if (!validPayment) return;
    setProcessing(true);
    setError("");
    try {
      await onPay({ paymentMethod: "TUNAI", cashReceived: receivedAmount, changeAmount });
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Pembayaran gagal. Silakan coba lagi.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-700" /> Pembayaran Tunai
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total yang harus dibayar</div>
          <div className="font-display text-4xl font-extrabold text-[#0A3663] mt-1">{rp(total)}</div>
          <div className="mt-5 text-left">
            <label htmlFor="cash-received" className="text-sm font-semibold text-slate-700">Uang diterima</label>
            <Input
              id="cash-received"
              data-testid="cash-received-input"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={cashReceived}
              onChange={event => setCashReceived(event.target.value)}
              placeholder="Masukkan jumlah uang"
              className="mt-1"
              autoFocus
            />
          </div>
          <div className="mt-3 flex justify-between rounded-lg bg-slate-50 p-3 text-sm">
            <span className="font-semibold text-slate-700">Kembalian</span>
            <span data-testid="cash-change" className={`font-bold ${validPayment ? "text-emerald-700" : "text-slate-500"}`}>
              {validPayment ? rp(changeAmount) : "Uang belum mencukupi"}
            </span>
          </div>
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-2" />
            Pastikan pembayaran tunai telah diterima dari pelanggan.
          </div>
          {error && <div role="alert" className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <Button
            data-testid="confirm-cash-payment"
            disabled={processing || !validPayment}
            onClick={confirmPayment}
            className="w-full mt-5 bg-emerald-700 hover:bg-emerald-800"
          >
            {processing ? "Memproses..." : "Konfirmasi Pembayaran Tunai"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={() => onOpenChange(false)}
            className="w-full mt-2"
          >
            Kembali
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
