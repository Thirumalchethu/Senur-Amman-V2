"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, IndianRupee, Users, CalendarDays, TrendingUp, TrendingDown, Minus,
  Bell, X, Check, Landmark, Phone, Table2, ArrowDownCircle, ArrowUpCircle,
  Download, MessageSquare, Send, LogOut, ShieldCheck, Eye, AlertTriangle, Upload, Crown,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { supabase } from "../lib/supabaseClient";
import { tierFor } from "../lib/patronTiers";
import WelcomeShower from "./WelcomeShower";

const MODES = ["Cash", "UPI", "Card", "Cheque", "Bank Transfer"];
const PURPOSES = ["Temple Hundi Cash", "Kumbabishekam", "Aadi Krithikai", "Village Festival", "Annadanam", "Renovation", "General", "Other"];
const WITHDRAWAL_PURPOSES = ["Electricity Bill", "Maintenance Charges", "Pooja Items", "Priest Honorarium", "Festival Expenses", "Annadanam Expenses", "Renovation", "Other"];

const fmtINR = (n) => {
  const num = Number(n || 0);
  const formatted = "₹" + Math.abs(num).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return num < 0 ? "-" + formatted : formatted;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const isWithdrawal = (t) => t.type === "Withdrawal";

const inputStyle = { background: "#FFFDF7", border: "1px solid #D8C9A3", color: "#241712" };

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium tracking-wide" style={{ color: "#5B4B3E" }}>{label}</span>
      {children}
    </label>
  );
}

export default function Dashboard({ user, role }) {
  const isAdmin = role === "admin";

  const [txns, setTxns] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [settings, setSettings] = useState({ name: "My Temple Trust", tagline: "Hundi & Seva Contributions" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [donorSearch, setDonorSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    type: "Deposit", donorName: "", donorPhone: "", amount: "", mode: "Cash",
    purpose: "General", recordedBy: "", date: todayISO(), note: "", publicRecognition: false,
  });

  const [feedbackForm, setFeedbackForm] = useState({ name: "", message: "" });
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showAllFeedback, setShowAllFeedback] = useState(false);

  const [billModalTxn, setBillModalTxn] = useState(null);
  const [billFile, setBillFile] = useState(null);
  const [billUploading, setBillUploading] = useState(false);
  const [billError, setBillError] = useState("");

  const fetchAll = useCallback(async () => {
    const [{ data: t, error: tErr }, { data: f, error: fErr }, { data: s }] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
      supabase.from("settings").select("*").eq("id", 1).single(),
    ]);
    if (tErr || fErr) {
      setError("Couldn't load live data. Check your connection.");
    } else {
      setError("");
    }
    setTxns(t || []);
    setFeedback(f || []);
    if (s) setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("public:dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchAll]);

  const stats = useMemo(() => {
    const deposits = txns.filter((t) => !isWithdrawal(t));
    const withdrawals = txns.filter((t) => isWithdrawal(t));
    const totalDeposited = deposits.reduce((s, t) => s + Number(t.amount), 0);
    const totalWithdrawn = withdrawals.reduce((s, t) => s + Number(t.amount), 0);
    const net = totalDeposited - totalWithdrawn;

    const today = todayISO();
    const todayDep = deposits.filter((t) => t.txn_date === today).reduce((s, t) => s + Number(t.amount), 0);
    const todayWd = withdrawals.filter((t) => t.txn_date === today).reduce((s, t) => s + Number(t.amount), 0);

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthDep = deposits.filter((t) => t.txn_date?.slice(0, 7) === monthKey).reduce((s, t) => s + Number(t.amount), 0);
    const monthWd = withdrawals.filter((t) => t.txn_date?.slice(0, 7) === monthKey).reduce((s, t) => s + Number(t.amount), 0);

    const count = deposits.length;
    const avg = count ? totalDeposited / count : 0;

    const byMode = {};
    MODES.forEach((m) => (byMode[m] = 0));
    deposits.forEach((t) => (byMode[t.mode] = (byMode[t.mode] || 0) + Number(t.amount)));

    const byPurposeDeposit = {};
    PURPOSES.forEach((p) => (byPurposeDeposit[p] = 0));
    deposits.forEach((t) => (byPurposeDeposit[t.purpose] = (byPurposeDeposit[t.purpose] || 0) + Number(t.amount)));

    const byPurposeWithdrawal = {};
    WITHDRAWAL_PURPOSES.forEach((p) => (byPurposeWithdrawal[p] = 0));
    withdrawals.forEach((t) => (byPurposeWithdrawal[t.purpose] = (byPurposeWithdrawal[t.purpose] || 0) + Number(t.amount)));

    const CHART_CUTOFF_KEY = "2026-07";
    const series = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key < CHART_CUTOFF_KEY) continue;
      const label = d.toLocaleString("en-IN", { month: "short" });
      const dep = deposits.filter((t) => t.txn_date?.slice(0, 7) === key).reduce((s, t) => s + Number(t.amount), 0);
      const wd = withdrawals.filter((t) => t.txn_date?.slice(0, 7) === key).reduce((s, t) => s + Number(t.amount), 0);
      series.push({ month: label, deposits: dep, withdrawals: wd });
    }
    return { totalDeposited, totalWithdrawn, net, todayNet: todayDep - todayWd, monthNet: monthDep - monthWd, count, avg, byMode, byPurposeDeposit, byPurposeWithdrawal, series };
  }, [txns]);

  const pivot = useMemo(() => {
    const CUTOFF_KEY = "2026-07"; // dashboard went live this month — nothing before this is shown
    const now = new Date();

    // Month-over-month: every month from the July 2026 cutoff through now.
    const cutoffDate = new Date(2026, 6, 1);
    const monthsSinceCutoff = Math.max(
      0,
      (now.getFullYear() - cutoffDate.getFullYear()) * 12 + (now.getMonth() - cutoffDate.getMonth())
    );
    const mom = [];
    for (let i = monthsSinceCutoff; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key < CUTOFF_KEY) continue;
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const deposits = txns.filter((t) => !isWithdrawal(t) && t.txn_date?.slice(0, 7) === key).reduce((s, t) => s + Number(t.amount), 0);
      const withdrawals = txns.filter((t) => isWithdrawal(t) && t.txn_date?.slice(0, 7) === key).reduce((s, t) => s + Number(t.amount), 0);
      mom.push({ key, label, deposits, withdrawals, net: deposits - withdrawals });
    }
    mom.forEach((m, i) => {
      if (i === 0) { m.change = null; return; }
      const prev = mom[i - 1].net;
      m.change = prev ? ((m.net - prev) / Math.abs(prev)) * 100 : (m.net > 0 ? 100 : m.net < 0 ? -100 : 0);
    });

    // Year-over-year (net), also clamped so no month before July 2026 shows.
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const years = Array.from(
      new Set(txns.map((t) => t.txn_date?.slice(0, 4)).filter((y) => y && `${y}-12` >= CUTOFF_KEY))
    ).sort();
    const netFor = (key) => {
      if (key < CUTOFF_KEY) return null;
      const dep = txns.filter((t) => !isWithdrawal(t) && t.txn_date?.slice(0, 7) === key).reduce((s, t) => s + Number(t.amount), 0);
      const wd = txns.filter((t) => isWithdrawal(t) && t.txn_date?.slice(0, 7) === key).reduce((s, t) => s + Number(t.amount), 0);
      return dep - wd;
    };
    const grid = monthNames.map((name, idx) => {
      const row = { month: name, cells: {} };
      years.forEach((y) => { row.cells[y] = netFor(`${y}-${String(idx + 1).padStart(2, "0")}`); });
      return row;
    });
    const yearTotals = {};
    years.forEach((y) => {
      const dep = txns.filter((t) => !isWithdrawal(t) && t.txn_date?.slice(0, 4) === y && t.txn_date?.slice(0, 7) >= CUTOFF_KEY).reduce((s, t) => s + Number(t.amount), 0);
      const wd = txns.filter((t) => isWithdrawal(t) && t.txn_date?.slice(0, 4) === y && t.txn_date?.slice(0, 7) >= CUTOFF_KEY).reduce((s, t) => s + Number(t.amount), 0);
      yearTotals[y] = dep - wd;
    });

    return { mom, years, grid, yearTotals };
  }, [txns]);

  const donorSummary = useMemo(() => {
    const now = new Date();
    const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}`;

    const map = {};
    txns.filter((t) => !isWithdrawal(t)).forEach((t) => {
      const name = t.donor_name?.trim() || "Unknown";
      if (!map[name]) map[name] = { name, phone: t.donor_phone, thisMonth: 0, lastMonth: 0, cumulative: 0, lastDate: null };
      map[name].cumulative += Number(t.amount);
      if (t.txn_date?.slice(0, 7) === thisKey) map[name].thisMonth += Number(t.amount);
      if (t.txn_date?.slice(0, 7) === prevKey) map[name].lastMonth += Number(t.amount);
      if (!map[name].lastDate || t.txn_date > map[name].lastDate) {
        map[name].lastDate = t.txn_date;
        map[name].phone = t.donor_phone || map[name].phone;
      }
    });
    return Object.values(map).sort((a, b) => b.cumulative - a.cumulative);
  }, [txns]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch = t.donor_name?.toLowerCase().includes(q) || (t.donor_phone || "").includes(search);
      const matchesMode = modeFilter === "All" || t.mode === modeFilter;
      const matchesType = typeFilter === "All" || (typeFilter === "Withdrawal" ? isWithdrawal(t) : !isWithdrawal(t));
      return matchesSearch && matchesMode && matchesType;
    });
  }, [txns, search, modeFilter, typeFilter]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!isAdmin) return;
    const isWd = form.type === "Withdrawal";
    if (!form.donorName.trim() || !form.amount || Number(form.amount) <= 0) {
      setError(isWd ? "Enter who the funds were paid to and an amount greater than zero." : "Enter a donor name and an amount greater than zero.");
      return;
    }
    if (isWd && !form.note.trim()) {
      setError("Withdrawals need a remark explaining what the funds were used for.");
      return;
    }
    setSaving(true);
    setError("");
    const { data: inserted, error } = await supabase.from("transactions").insert({
      type: form.type,
      donor_name: form.donorName.trim(),
      donor_phone: form.donorPhone.trim() || null,
      amount: Number(form.amount),
      mode: form.mode,
      purpose: form.purpose,
      recorded_by: form.recordedBy.trim() || user.email,
      txn_date: form.date,
      note: form.note.trim() || null,
      created_by: user.id,
      public_recognition: !isWd && form.publicRecognition,
    }).select().single();
    setSaving(false);
    if (error) {
      setError(error.message.includes("row-level security") ? "Only admin accounts can record transactions." : "Couldn't save. Try again.");
      return;
    }
    setForm({
      type: form.type, donorName: "", donorPhone: "", amount: "", mode: "Cash",
      purpose: form.type === "Withdrawal" ? WITHDRAWAL_PURPOSES[0] : "General",
      recordedBy: form.recordedBy, date: todayISO(), note: "", publicRecognition: false,
    });
    setShowForm(false);
    if (isWd && inserted) {
      setBillModalTxn(inserted);
      setBillError("");
    }
  }

  async function handleUploadBill() {
    if (!billModalTxn || !billFile) {
      setBillError("Choose a file first.");
      return;
    }
    setBillUploading(true);
    setBillError("");
    try {
      const ext = billFile.name.split(".").pop();
      const path = `${billModalTxn.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("bills").upload(path, billFile, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("bills").getPublicUrl(path);
      const { error: updErr } = await supabase.from("transactions").update({ bill_url: pub.publicUrl }).eq("id", billModalTxn.id);
      if (updErr) throw updErr;
      setBillModalTxn(null);
      setBillFile(null);
    } catch (err) {
      setBillError(err.message || "Upload failed. Try again.");
    } finally {
      setBillUploading(false);
    }
  }

  async function handleCloseWithoutBill() {
    if (!billModalTxn) return;
    setBillUploading(true);
    setBillError("");
    try {
      const { error } = await supabase.from("transactions").update({ bill_closed: true }).eq("id", billModalTxn.id);
      if (error) throw error;
      setBillModalTxn(null);
      setBillFile(null);
    } catch (err) {
      setBillError(err.message || "Couldn't close this item. Try again.");
    } finally {
      setBillUploading(false);
    }
  }

  async function handleSubmitFeedback(e) {
    e.preventDefault();
    if (!feedbackForm.message.trim()) {
      setError("Write a suggestion or comment before sending.");
      return;
    }
    setFeedbackSaving(true);
    const { error } = await supabase.from("feedback").insert({
      name: feedbackForm.name.trim() || user.email,
      message: feedbackForm.message.trim(),
      created_by: user.id,
    });
    setFeedbackSaving(false);
    if (error) {
      setError("Couldn't send feedback. Try again.");
      return;
    }
    setFeedbackForm({ name: "", message: "" });
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 3000);
  }

  function handleExportCSV() {
    const headers = ["Date", "Type", "Name", "Phone", "Amount", "Mode", "Purpose", "Recorded By", "Remarks", "Recorded At"];
    const esc = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = filtered.map((t) => [
      t.txn_date, isWithdrawal(t) ? "Withdrawal" : "Deposit", t.donor_name, t.donor_phone,
      t.amount, t.mode, t.purpose, t.recorded_by, t.note, new Date(t.created_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${settings.name.replace(/\s+/g, "_")}_transactions_${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const C = { cream: "#F6EEDA", maroonDeep: "#4E141C", maroon: "#6E1F2A", brass: "#B8892B", brassLight: "#D9AD52", green: "#204A3B", ink: "#241712", inkSoft: "#5B4B3E", line: "#D8C9A3" };

  return (
    <div style={{ background: C.cream, color: C.ink, minHeight: "100vh" }}>
      <header className="relative" style={{ background: `linear-gradient(180deg, ${C.maroonDeep} 0%, ${C.maroon} 100%)`, color: C.cream }}>
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${C.brass}, ${C.brassLight}, ${C.brass})` }} />
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-7 pb-9">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.brass, color: C.maroonDeep }}>
                <Landmark size={20} />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl leading-none">{settings.name}</h1>
                <p className="text-sm mt-1" style={{ color: `${C.cream}CC` }}>{settings.tagline}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-xs" style={{ color: C.brassLight }}>
                <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: "#7CD48A" }} /> LIVE
              </div>
              <div className="text-xs mt-1.5 flex items-center gap-1.5 justify-end">
                {isAdmin ? <ShieldCheck size={12} /> : <Eye size={12} />}
                <span>{user.email}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: isAdmin ? C.brass : `${C.cream}22`, color: isAdmin ? C.maroonDeep : C.cream }}>
                  {isAdmin ? "Admin" : "Viewer"}
                </span>
              </div>
              <button onClick={handleLogout} className="mt-1.5 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border" style={{ borderColor: `${C.cream}33`, color: `${C.cream}CC` }}>
                <LogOut size={11} /> Log out
              </button>
              <a href="/donate" target="_blank" rel="noopener noreferrer" className="mt-1.5 ml-1.5 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border" style={{ borderColor: `${C.brass}66`, color: C.brassLight }}>
                View public donate page ↗
              </a>
            </div>
          </div>

          <WelcomeShower />

          <div className="fade-in mt-6 mx-auto max-w-md text-center py-8 px-6 rounded-[999px_999px_18px_18px] hero-arch" style={{ animationDelay: '100ms', background: `radial-gradient(120% 140% at 50% -10%, ${C.brass}33 0%, transparent 60%), ${C.maroonDeep}`, border: `1px solid ${C.brass}55` }}>
            <div className="text-xs tracking-[0.2em] uppercase" style={{ color: C.brassLight }}>Net Balance</div>
            <div className="font-display text-5xl sm:text-6xl mt-2 tabular" style={{ color: C.cream }}>{fmtINR(stats.net)}</div>
            <div className="text-xs mt-2 flex items-center justify-center gap-3" style={{ color: `${C.cream}99` }}>
              <span className="flex items-center gap-1"><ArrowDownCircle size={12} style={{ color: "#7CD48A" }} /> {fmtINR(stats.totalDeposited)} deposited</span>
              <span className="flex items-center gap-1"><ArrowUpCircle size={12} style={{ color: "#E8918F" }} /> {fmtINR(stats.totalWithdrawn)} withdrawn</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 -mt-6 pb-16">
        {error && <div className="mb-4 text-sm px-4 py-2.5 rounded-lg" style={{ background: "#FBE4E4", color: "#8A2C2C" }}>{error}</div>}

        <div className="fade-in grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4" style={{ animationDelay: '0ms' }}>
          {[
            { label: "Today (net)", value: fmtINR(stats.todayNet), tone: stats.todayNet < 0 ? "#8A2C2C" : C.green, icon: CalendarDays },
            { label: "This month (net)", value: fmtINR(stats.monthNet), tone: stats.monthNet < 0 ? "#8A2C2C" : C.green, icon: TrendingUp },
            { label: "Total deposited", value: fmtINR(stats.totalDeposited), tone: C.maroon, icon: ArrowDownCircle },
            { label: "Total withdrawn", value: fmtINR(stats.totalWithdrawn), tone: C.maroon, icon: ArrowUpCircle },
            { label: "Contributors", value: stats.count.toLocaleString("en-IN"), tone: C.maroon, icon: Users },
            { label: "Average gift", value: fmtINR(Math.round(stats.avg)), tone: C.maroon, icon: IndianRupee },
          ].map(({ label, value, tone, icon: Icon }) => (
            <div key={label} className="rounded-2xl p-4 shadow-sm min-w-0 stat-card" style={{ background: "#FFFDF7", border: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: C.inkSoft }}><Icon size={13} className="shrink-0" /> <span className="truncate">{label}</span></div>
              <div className="font-display mt-1.5 tabular leading-tight break-words" style={{ color: tone, fontSize: value.length > 10 ? "1.25rem" : "1.5rem" }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="fade-in grid lg:grid-cols-3 gap-4 mt-5" style={{ animationDelay: '60ms' }}>
          <div className="lg:col-span-2 rounded-2xl p-5 panel-card" style={{ background: "#FFFDF7", border: `1px solid ${C.line}` }}>
            <h3 className="font-display text-lg mb-3" style={{ color: C.maroon }}>Last 6 months — deposits vs withdrawals</h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={stats.series} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid vertical={false} stroke={C.line} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.inkSoft }} axisLine={{ stroke: C.line }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                  <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="deposits" name="Deposits" fill={C.brass} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill={C.maroon} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl p-5 panel-card" style={{ background: "#FFFDF7", border: `1px solid ${C.line}` }}>
            <h3 className="font-display text-lg mb-3" style={{ color: C.maroon }}>Deposits by payment mode</h3>
            <div className="flex flex-col gap-3">
              {MODES.map((m) => {
                const val = stats.byMode[m] || 0;
                const pct = stats.totalDeposited ? (val / stats.totalDeposited) * 100 : 0;
                return (
                  <div key={m}>
                    <div className="flex justify-between text-xs mb-1" style={{ color: C.inkSoft }}><span>{m}</span><span className="tabular">{fmtINR(val)}</span></div>
                    <div className="h-1.5 rounded-full" style={{ background: C.line }}><div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: C.green }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="fade-in grid lg:grid-cols-2 gap-4 mt-5" style={{ animationDelay: '120ms' }}>
          <div className="rounded-2xl p-5 panel-card" style={{ background: "#FFFDF7", border: `1px solid ${C.line}` }}>
            <h3 className="font-display text-lg mb-3 flex items-center gap-2" style={{ color: C.maroon }}><ArrowDownCircle size={16} /> Deposits by category</h3>
            <div className="flex flex-col gap-3">
              {PURPOSES
                .map((p) => ({ p, val: stats.byPurposeDeposit[p] || 0 }))
                .sort((a, b) => b.val - a.val)
                .map(({ p, val }) => {
                  const pct = stats.totalDeposited ? (val / stats.totalDeposited) * 100 : 0;
                  return (
                    <div key={p}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: C.inkSoft }}><span>{p}</span><span className="tabular">{fmtINR(val)}</span></div>
                      <div className="h-1.5 rounded-full" style={{ background: C.line }}><div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: C.green }} /></div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="rounded-2xl p-5 panel-card" style={{ background: "#FFFDF7", border: `1px solid ${C.line}` }}>
            <h3 className="font-display text-lg mb-3 flex items-center gap-2" style={{ color: C.maroon }}><ArrowUpCircle size={16} /> Withdrawals by category</h3>
            <div className="flex flex-col gap-3">
              {WITHDRAWAL_PURPOSES
                .map((p) => ({ p, val: stats.byPurposeWithdrawal[p] || 0 }))
                .sort((a, b) => b.val - a.val)
                .map(({ p, val }) => {
                  const pct = stats.totalWithdrawn ? (val / stats.totalWithdrawn) * 100 : 0;
                  return (
                    <div key={p}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: C.inkSoft }}><span>{p}</span><span className="tabular">{fmtINR(val)}</span></div>
                      <div className="h-1.5 rounded-full" style={{ background: C.line }}><div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "#8A2C2C" }} /></div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="fade-in grid lg:grid-cols-5 gap-4 mt-5" style={{ animationDelay: '180ms' }}>
          <div className="lg:col-span-2 rounded-2xl p-5 panel-card max-h-96 overflow-y-auto overflow-x-auto" style={{ background: "#FFFDF7", border: `1px solid ${C.line}` }}>
            <h3 className="font-display text-lg mb-3 flex items-center gap-2 sticky top-0" style={{ color: C.maroon, background: "#FFFDF7" }}><Table2 size={16} /> Month-over-month</h3>
            <table className="w-full text-sm min-w-[380px]">
              <thead><tr className="text-left" style={{ color: C.inkSoft }}>
                <th className="font-medium pb-2 sticky left-0" style={{ background: "#FFFDF7" }}>Month</th>
                <th className="font-medium pb-2 text-right pl-2">Deposits</th>
                <th className="font-medium pb-2 text-right pl-2">Withdrawn</th>
                <th className="font-medium pb-2 text-right pl-2">Net</th>
                <th className="font-medium pb-2 text-right pl-2">Change</th>
              </tr></thead>
              <tbody>
                {pivot.mom.map((m) => (
                  <tr key={m.key} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="py-1.5 sticky left-0 whitespace-nowrap" style={{ background: "#FFFDF7" }}>{m.label}</td>
                    <td className="py-1.5 pl-2 text-right tabular" style={{ color: C.green }}>{fmtINR(m.deposits)}</td>
                    <td className="py-1.5 pl-2 text-right tabular" style={{ color: "#8A2C2C" }}>{fmtINR(m.withdrawals)}</td>
                    <td className="py-1.5 pl-2 text-right tabular font-medium">{fmtINR(m.net)}</td>
                    <td className="py-1.5 pl-2 text-right tabular">
                      {m.change === null ? <span style={{ color: C.inkSoft }}>—</span> : (
                        <span className="inline-flex items-center gap-0.5 justify-end" style={{ color: m.change > 0 ? C.green : m.change < 0 ? "#8A2C2C" : C.inkSoft }}>
                          {m.change > 0 ? <TrendingUp size={12} /> : m.change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                          {Math.abs(m.change).toFixed(0)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-3 rounded-2xl p-5 panel-card" style={{ background: "#FFFDF7", border: `1px solid ${C.line}` }}>
            <h3 className="font-display text-lg mb-3 flex items-center gap-2" style={{ color: C.maroon }}><Table2 size={16} /> Year-over-year (net)</h3>
            <p className="text-xs mb-3" style={{ color: C.inkSoft }}>Since go-live in July 2026.</p>
            {pivot.years.length === 0 ? (
              <p className="text-sm" style={{ color: C.inkSoft }}>No dated transactions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead><tr className="text-left" style={{ color: C.inkSoft }}>
                    <th className="font-medium pb-2 pr-2 sticky left-0" style={{ background: "#FFFDF7" }}>Month</th>
                    {pivot.years.map((y) => <th key={y} className="font-medium pb-2 text-right pl-3">{y}</th>)}
                  </tr></thead>
                  <tbody>
                    {pivot.grid.map((row) => (
                      <tr key={row.month} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td className="py-1.5 pr-2 sticky left-0" style={{ background: "#FFFDF7" }}>{row.month}</td>
                        {pivot.years.map((y) => <td key={y} className="py-1.5 pl-3 text-right tabular">{row.cells[y] ? fmtINR(row.cells[y]) : <span style={{ color: C.line }}>–</span>}</td>)}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{ borderTop: `2px solid ${C.brass}` }}>
                    <td className="py-2 pr-2 font-semibold sticky left-0" style={{ background: "#FFFDF7", color: C.maroon }}>Total</td>
                    {pivot.years.map((y) => <td key={y} className="py-2 pl-3 text-right font-semibold tabular" style={{ color: C.maroon }}>{fmtINR(pivot.yearTotals[y])}</td>)}
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="fade-in rounded-2xl p-5 mt-5 panel-card" style={{ animationDelay: '220ms',  background: "#FFFDF7", border: `1px solid ${C.line}` }}>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h3 className="font-display text-lg flex items-center gap-2" style={{ color: C.maroon }}><Users size={16} /> Donor summary — monthly & cumulative</h3>
            <input
              value={donorSearch} onChange={(e) => setDonorSearch(e.target.value)}
              placeholder="Search donor…"
              className="px-3 py-1.5 rounded-lg text-sm outline-none border"
              style={{ borderColor: C.line, background: "#FFFDF7" }}
            />
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="text-left" style={{ color: C.inkSoft }}>
                <th className="font-medium pb-2 sticky left-0" style={{ background: "#FFFDF7" }}>Donor</th>
                <th className="font-medium pb-2 text-right pl-2">This month</th>
                <th className="font-medium pb-2 text-right pl-2">Last month</th>
                <th className="font-medium pb-2 text-right pl-2">Cumulative</th>
                <th className="font-medium pb-2 text-right pl-2 whitespace-nowrap">Last deposit</th>
              </tr></thead>
              <tbody>
                {donorSummary
                  .filter((d) => d.name.toLowerCase().includes(donorSearch.toLowerCase()))
                  .slice(0, 100)
                  .map((d) => {
                    const tier = tierFor(d.cumulative);
                    return (
                      <tr key={d.name} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td className="py-1.5 sticky left-0" style={{ background: "#FFFDF7" }}>
                          <div className="font-medium flex items-center gap-1.5 flex-wrap">
                            {d.name}
                            {tier && (
                              <span
                                className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"
                                style={{ background: tier.accent, color: tier.color }}
                              >
                                <Crown size={9} /> {tier.name}
                              </span>
                            )}
                          </div>
                          {d.phone && <div className="text-xs" style={{ color: C.inkSoft }}>{d.phone}</div>}
                        </td>
                        <td className="py-1.5 pl-2 text-right tabular">{fmtINR(d.thisMonth)}</td>
                        <td className="py-1.5 pl-2 text-right tabular">{fmtINR(d.lastMonth)}</td>
                        <td className="py-1.5 pl-2 text-right tabular font-medium" style={{ color: C.maroon }}>{fmtINR(d.cumulative)}</td>
                        <td className="py-1.5 pl-2 text-right whitespace-nowrap">{d.lastDate}</td>
                      </tr>
                    );
                  })}
                {donorSummary.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center" style={{ color: C.inkSoft }}>No deposits recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="fade-in flex flex-col sm:flex-row gap-3 mt-6 items-stretch sm:items-center justify-between" style={{ animationDelay: '260ms' }}>
          <div className="flex gap-2 flex-1 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 sm:max-w-xs" style={{ background: "#FFFDF7", border: `1px solid ${C.line}` }}>
              <Search size={15} style={{ color: C.inkSoft }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone…" className="bg-transparent outline-none text-sm w-full" />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "#FFFDF7", border: `1px solid ${C.line}`, color: C.ink }}>
              <option>All</option><option>Deposit</option><option>Withdrawal</option>
            </select>
            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "#FFFDF7", border: `1px solid ${C.line}`, color: C.ink }}>
              <option>All</option>{MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button onClick={handleExportCSV} disabled={filtered.length === 0} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm border disabled:opacity-50" style={{ borderColor: C.line, color: C.maroon, background: "#FFFDF7" }}>
              <Download size={16} /> Export CSV
            </button>
            {isAdmin && (
              <button onClick={() => setShowForm((s) => !s)} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm" style={{ background: C.maroon, color: C.cream }}>
                {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? "Close" : "Record transaction"}
              </button>
            )}
          </div>
        </div>

        {!isAdmin && (
          <p className="text-xs mt-3" style={{ color: C.inkSoft }}>
            Your account is view-only. Ask a trustee to grant recording access if you need to log deposits or withdrawals.
          </p>
        )}

        {isAdmin && showForm && (
          <form onSubmit={handleAdd} className="mt-4 rounded-2xl p-5 grid sm:grid-cols-2 gap-4" style={{ background: "#FFFDF7", border: `1px solid ${C.line}` }}>
            <div className="sm:col-span-2 flex gap-2">
              {["Deposit", "Withdrawal"].map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t, purpose: t === "Withdrawal" ? WITHDRAWAL_PURPOSES[0] : "General" })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border"
                  style={form.type === t ? { background: t === "Withdrawal" ? C.maroon : C.green, color: C.cream, borderColor: "transparent" } : { background: "transparent", color: C.inkSoft, borderColor: C.line }}>
                  {t === "Withdrawal" ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />} {t}
                </button>
              ))}
            </div>
            <Field label={form.type === "Withdrawal" ? "Paid to / vendor *" : "Donor name *"}>
              <input required value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} className="px-3 py-2 rounded-lg outline-none" style={inputStyle} placeholder={form.type === "Withdrawal" ? "e.g. Sri Flower Suppliers" : "e.g. Lakshmi Iyer"} />
            </Field>
            <Field label="Phone number">
              <input type="tel" value={form.donorPhone} onChange={(e) => setForm({ ...form, donorPhone: e.target.value })} className="px-3 py-2 rounded-lg outline-none" style={inputStyle} placeholder="98765 43210" />
            </Field>
            <Field label="Amount (₹) *">
              <input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 rounded-lg outline-none tabular" style={inputStyle} placeholder="1100" />
            </Field>
            <Field label="Payment mode">
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="px-3 py-2 rounded-lg outline-none" style={inputStyle}>{MODES.map((m) => <option key={m}>{m}</option>)}</select>
            </Field>
            <Field label="Purpose">
              <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="px-3 py-2 rounded-lg outline-none" style={inputStyle}>{(form.type === "Withdrawal" ? WITHDRAWAL_PURPOSES : PURPOSES).map((p) => <option key={p}>{p}</option>)}</select>
            </Field>
            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="px-3 py-2 rounded-lg outline-none" style={inputStyle} />
            </Field>
            <Field label="Recorded by">
              <input value={form.recordedBy} onChange={(e) => setForm({ ...form, recordedBy: e.target.value })} className="px-3 py-2 rounded-lg outline-none" style={inputStyle} placeholder={user.email} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={form.type === "Withdrawal" ? "Remarks — purpose of withdrawal *" : "Note (optional)"}>
                <input required={form.type === "Withdrawal"} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="px-3 py-2 rounded-lg outline-none w-full" style={inputStyle} placeholder={form.type === "Withdrawal" ? "e.g. Paid electrician for hall wiring repair" : "e.g. Annadanam sponsorship"} />
              </Field>
            </div>
            {form.type === "Deposit" && (
              <div className="sm:col-span-2">
                <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: C.inkSoft }}>
                  <input
                    type="checkbox"
                    checked={form.publicRecognition}
                    onChange={(e) => setForm({ ...form, publicRecognition: e.target.checked })}
                    className="mt-0.5"
                  />
                  <span>Recognize this donor on the public Wall of Honor (only with their permission — name and tier only, amount stays private)</span>
                </label>
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl font-medium text-sm disabled:opacity-60" style={{ background: form.type === "Withdrawal" ? C.maroon : C.green, color: C.cream }}>
                {saving ? "Saving…" : form.type === "Withdrawal" ? "Record withdrawal" : "Add to hundi"}
              </button>
            </div>
          </form>
        )}

        <div className="fade-in mt-6" style={{ animationDelay: '300ms' }}>
          <h3 className="font-display text-lg mb-3 flex items-center gap-2" style={{ color: C.maroon }}><Bell size={16} /> Recent transactions <span className="text-xs font-normal" style={{ color: C.inkSoft }}>(last 15)</span></h3>
          {loading ? (
            <div className="text-sm py-10 text-center" style={{ color: C.inkSoft }}>Loading live data…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm py-10 text-center rounded-2xl" style={{ background: "#FFFDF7", border: `1px dashed ${C.line}`, color: C.inkSoft }}>
              {txns.length === 0 ? "No transactions recorded yet." : "No transactions match your search."}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
              {filtered.slice(0, 15).map((t, i, visible) => {
                const wd = isWithdrawal(t);
                const needsBill = wd && !t.bill_url && !t.bill_closed;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm flex-wrap"
                    style={{
                      background: needsBill ? "#FBE4E4" : i % 2 ? "#FBF5E6" : "#FFFDF7",
                      borderBottom: i === visible.length - 1 ? "none" : `1px solid ${C.line}`,
                      borderLeft: `3px solid ${needsBill ? "#B23B3B" : wd ? C.maroon : C.green}`,
                    }}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5 flex-wrap" style={{ color: C.ink }}>
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={wd ? { background: "#F6DFDF", color: "#8A2C2C" } : { background: "#DCEAE3", color: C.green }}>{wd ? "Withdrawal" : "Deposit"}</span>
                        <span className="truncate">{t.donor_name}</span>
                        {t.donor_phone && <span className="text-xs font-normal flex items-center gap-0.5 shrink-0" style={{ color: C.inkSoft }}><Phone size={10} /> {t.donor_phone}</span>}
                        {needsBill && (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5" style={{ background: "#B23B3B", color: "#FFF" }}>
                            <AlertTriangle size={10} /> Bill pending
                          </span>
                        )}
                        {wd && t.bill_closed && (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={{ background: C.line, color: C.inkSoft }}>Closed — no bill</span>
                        )}
                      </div>
                      <div className="text-xs truncate" style={{ color: C.inkSoft }}>{t.txn_date} · {t.mode} · {t.purpose}{t.recorded_by ? ` · by ${t.recorded_by}` : ""}</div>
                      {t.note && <div className="text-xs mt-0.5 italic truncate" style={{ color: wd ? "#8A2C2C" : C.inkSoft }}>{wd ? "Remarks: " : ""}{t.note}</div>}
                      {wd && t.bill_url && (
                        <a href={t.bill_url} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: C.green }}>View uploaded bill ↗</a>
                      )}
                      {isAdmin && needsBill && (
                        <button
                          onClick={() => { setBillModalTxn(t); setBillError(""); }}
                          className="mt-1 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                          style={{ background: "#8A2C2C", color: "#FFF" }}
                        >
                          <Upload size={11} /> Submit bill
                        </button>
                      )}
                    </div>
                    <div className="font-display text-lg tabular shrink-0" style={{ color: wd ? "#8A2C2C" : C.green }}>{wd ? "−" : "+"}{fmtINR(t.amount)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="fade-in mt-8 rounded-2xl p-5 panel-card" style={{ animationDelay: '340ms',  background: "#FFFDF7", border: `1px solid ${C.line}` }}>
          <h3 className="font-display text-lg mb-1 flex items-center gap-2" style={{ color: C.maroon }}><MessageSquare size={16} /> Feedback & suggestions</h3>
          <p className="text-xs mb-3" style={{ color: C.inkSoft }}>Tell us what would make this dashboard more useful.</p>
          <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-3">
            <input value={feedbackForm.name} onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })} placeholder="Your name (optional)" className="px-3 py-2 rounded-lg outline-none text-sm" style={inputStyle} />
            <textarea value={feedbackForm.message} onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })} placeholder="e.g. Add a printable monthly receipt…" rows={3} className="px-3 py-2 rounded-lg outline-none text-sm resize-none" style={inputStyle} />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={feedbackSaving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm disabled:opacity-60" style={{ background: C.brass, color: C.maroonDeep }}>
                <Send size={14} /> {feedbackSaving ? "Sending…" : "Send feedback"}
              </button>
              {feedbackSent && <span className="text-xs flex items-center gap-1" style={{ color: C.green }}><Check size={12} /> Thanks — noted!</span>}
            </div>
          </form>
          {feedback.length > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
              <button onClick={() => setShowAllFeedback((s) => !s)} className="text-xs font-medium" style={{ color: C.inkSoft }}>
                {showAllFeedback ? "Hide" : `View ${feedback.length} suggestion${feedback.length === 1 ? "" : "s"}`}
              </button>
              {showAllFeedback && (
                <div className="mt-3 flex flex-col gap-3">
                  {feedback.map((f) => (
                    <div key={f.id} className="text-sm">
                      <p style={{ color: C.ink }}>{f.message}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.inkSoft }}>— {f.name} · {new Date(f.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-8" style={{ color: C.inkSoft }}>
          Private dashboard — visible only to signed-in trustees and volunteers. Data syncs live for everyone signed in.
        </p>
      </main>

      {billModalTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(36,23,18,0.55)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5 modal-pop" style={{ background: "#FFFDF7" }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} style={{ color: "#B23B3B" }} />
              <h3 className="font-display text-lg" style={{ color: C.maroon }}>Submit bill for this withdrawal</h3>
            </div>
            <p className="text-sm mb-3" style={{ color: C.inkSoft }}>
              {billModalTxn.donor_name} · {fmtINR(billModalTxn.amount)} · {billModalTxn.purpose} · {billModalTxn.txn_date}
            </p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setBillFile(e.target.files?.[0] || null)}
              className="w-full text-sm mb-3"
            />
            {billError && <p className="text-sm mb-2" style={{ color: "#8A2C2C" }}>{billError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleUploadBill}
                disabled={billUploading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                style={{ background: C.green, color: C.cream }}
              >
                <Upload size={14} /> {billUploading ? "Uploading…" : "Upload bill"}
              </button>
              <button
                onClick={() => { setBillModalTxn(null); setBillFile(null); setBillError(""); }}
                disabled={billUploading}
                className="px-3 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: C.line, color: C.inkSoft }}
              >
                Later
              </button>
            </div>
            <button
              onClick={handleCloseWithoutBill}
              disabled={billUploading}
              className="w-full mt-2 py-2 rounded-lg text-xs font-medium border disabled:opacity-60"
              style={{ borderColor: C.line, color: "#8A2C2C" }}
            >
              No bill available — close this item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
