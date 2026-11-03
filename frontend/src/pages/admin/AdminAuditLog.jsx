import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const today = new Date();
const localDateValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const periodKey = (date, grouping) => {
  if (Number.isNaN(date.getTime())) return "unknown";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  if (grouping === "day") {
    return `${year}-${month}-${String(date.getDate()).padStart(2, "0")}`;
  }
  if (grouping === "month") return `${year}-${month}`;
  return String(year);
};

const periodLabel = (key, grouping) => {
  if (key === "unknown") return "Tanggal tidak diketahui";
  if (grouping === "day") {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (grouping === "month") {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  }
  return key;
};

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [grouping, setGrouping] = useState("day");
  const [selectedPeriod, setSelectedPeriod] = useState(localDateValue);
  useEffect(() => { api.get("/admin/audit-logs").then(r => setLogs(r.data)); }, []);

  const groupedLogs = useMemo(() => {
    const groups = new Map();
    logs.forEach(log => {
      const date = new Date(log.created_at);
      const key = periodKey(date, grouping);
      if (key !== selectedPeriod) return;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: periodLabel(key, grouping),
          logs: [],
        });
      }
      groups.get(key).logs.push(log);
    });
    return [...groups.values()];
  }, [logs, grouping, selectedPeriod]);

  const changeGrouping = (value) => {
    setGrouping(value);
    setSelectedPeriod(current => {
      const year = current.slice(0, 4) || String(today.getFullYear());
      const month = current.length >= 7 ? current.slice(5, 7) : "01";
      const day = current.length >= 10 ? current.slice(8, 10) : "01";
      if (value === "day") return `${year}-${month}-${day}`;
      if (value === "month") return `${year}-${month}`;
      return year;
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Audit Log</h1>
      <Card className="border-[#E5DEC9] p-4">
        <div className="flex flex-wrap items-end gap-5">
          <div>
            <div className="mb-2 text-sm font-semibold text-[#0C2340]">Kelompokkan:</div>
            <div role="group" aria-label="Kelompokkan audit log" className="inline-flex rounded-lg border border-[#E5DEC9] bg-white p-1">
              {[
                { value: "day", label: "Per Hari" },
                { value: "month", label: "Per Bulan" },
                { value: "year", label: "Per Tahun" },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={grouping === option.value}
                  onClick={() => changeGrouping(option.value)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    grouping === option.value
                      ? "bg-[#0A3663] text-white"
                      : "text-[#0C2340] hover:bg-slate-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="audit-period" className="mb-2 block text-sm font-semibold text-[#0C2340]">
              {grouping === "day" ? "Pilih tanggal" : grouping === "month" ? "Pilih bulan" : "Pilih tahun"}
            </label>
            <input
              id="audit-period"
              type={grouping === "day" ? "date" : grouping === "month" ? "month" : "number"}
              min={grouping === "year" ? "2000" : undefined}
              max={grouping === "year" ? String(today.getFullYear() + 1) : undefined}
              value={selectedPeriod}
              onChange={event => setSelectedPeriod(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0A3663]"
            />
          </div>
        </div>
      </Card>
      <div className="space-y-3">
        {groupedLogs.map((group, index) => (
          <Card key={group.key} className="border-[#E5DEC9] overflow-hidden">
            <details open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-[#0C2340] marker:hidden">
                <span>{group.label}</span>
                <Badge variant="outline">{group.logs.length} aktivitas</Badge>
              </summary>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>UMKM</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{new Date(log.created_at).toLocaleTimeString("id-ID")}</TableCell>
                      <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{log.user_id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs font-mono">{log.umkm_id?.slice(0, 8) || "-"}</TableCell>
                      <TableCell className="text-xs text-slate-600">{JSON.stringify(log.meta)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </details>
          </Card>
        ))}
        {groupedLogs.length === 0 && (
          <Card className="border-[#E5DEC9] p-8 text-center text-sm text-slate-500">
            Tidak ada catatan audit pada periode ini.
          </Card>
        )}
      </div>
    </div>
  );
}