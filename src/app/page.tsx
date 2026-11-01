"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Cpu,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Gauge,
  HelpCircle,
  LockKeyhole,
  Network,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wallet,
  X,
  Zap
} from "lucide-react";

type Run = {
  id: string;
  task: string;
  generatedText: string;
  referenceText?: string;
  evaluationText?: string;
  generationCost: number;
  referenceCost: number;
  evaluationCost: number;
  totalCost: number;
  generationMs?: number;
  referenceMs?: number;
  evaluationMs?: number;
  generationHash?: string;
  referenceHash?: string;
  evaluationHash?: string;
  generationMiner?: string;
  referenceMiner?: string;
  evaluationMiner?: string;
  generationIntent?: string;
  referenceIntent?: string;
  evaluationIntent?: string;
  generationVerified: boolean;
  referenceVerified: boolean;
  evaluationVerified: boolean;
  evaluatorScore?: number | null;
  deterministicPass?: boolean;
  testResults?: string | null;
  benchmarkTaskId?: string | null;
  createdAt: string;
  status: string;
};

type BenchmarkTask = {
  id: string;
  name: string;
  difficulty: string;
  category: string;
  prompt: string;
  entryFunctionName: string;
};

type WalletData = {
  walletConfigured: boolean;
  walletAddress?: string;
  walletEthBalance?: string;
  walletUsdcBalance?: string;
  network?: string;
  contracts?: {
    token?: string;
    explorer?: string;
  };
};

export default function Home() {
  const [task, setTask] = useState(
    "Write a TypeScript function named isValidEmail(email: unknown): boolean that validates an email address. It must accept string inputs with standard local-part@domain.tld, reject non-strings, null, undefined, empty strings, strings without @, multiple @ signs, missing domain, missing top-level domain, or spaces. Return true for valid emails, false otherwise."
  );
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>("email-validator");
  const [benchmarks, setBenchmarks] = useState<BenchmarkTask[]>([]);
  const [busy, setBusy] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [history, setHistory] = useState<Run[]>([]);
  const [intents, setIntents] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [walletForm, setWalletForm] = useState({
    address: "",
    privateKey: "",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com"
  });
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [authUser, setAuthUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "tests" | "requirements" | "evaluation" | "proof">("code");
  const [copied, setCopied] = useState(false);
  const [inspectingSignal, setInspectingSignal] = useState<string | null>(null);
  const [signalDetails, setSignalDetails] = useState<any>(null);
  const [signalLoading, setSignalLoading] = useState(false);

  async function loadDashboard() {
    try {
      const [hRes, iRes, healthRes, readyRes, benchRes, walletRes] = await Promise.all([
        fetch("/api/history").then((r) => r.json()).catch(() => ({ items: [] })),
        fetch("/api/intents").then((r) => r.json()).catch(() => null),
        fetch("/api/health").then((r) => r.json()).catch(() => null),
        fetch("/api/readiness").then((r) => r.json()).catch(() => null),
        fetch("/api/benchmarks").then((r) => r.json()).catch(() => ({ tasks: [] })),
        fetch("/api/wallet").then((r) => r.json()).catch(() => ({ configured: false }))
      ]);

      setHistory(hRes.items ?? []);
      setIntents(iRes);
      setWallet(healthRes);
      setReadiness(readyRes);
      setBenchmarks(benchRes.tasks ?? []);

      if (walletRes?.configured) {
        setWalletForm((prev) => ({ ...prev, rpcUrl: prev.rpcUrl || "https://ethereum-sepolia-rpc.publicnode.com" }));
      }
    } catch {
      // dashboard gracefully handles partial updates
    }
  }

  async function loadSession() {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      setAuthUser(data.user ?? null);
    } catch {
      setAuthUser(null);
    } finally {
      setAuthLoaded(true);
    }
  }

  async function handleLogin() {
    try {
      setAuthBusy(true);
      setAuthError("");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      setAuthUser(data.user ?? null);
      await loadDashboard();
    } catch (e: any) {
      setAuthError(e.message || "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignup() {
    try {
      setAuthBusy(true);
      setAuthError("");

      if (authForm.password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }
      if (authForm.password !== authForm.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
          confirmPassword: authForm.confirmPassword
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Account creation failed.");
      setAuthUser(data.user ?? null);
      setAuthForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      await loadDashboard();
    } catch (e: any) {
      setAuthError(e.message || "Account creation failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuthUser(null);
      setWalletMessage("");
    } catch {
      setAuthUser(null);
    }
  }

  useEffect(() => {
    loadDashboard();
    loadSession();
  }, []);

  function handleSelectBenchmark(b: BenchmarkTask) {
    setSelectedBenchmark(b.id);
    setTask(b.prompt);
  }

  async function procure() {
    if (!authUser) {
      setError("Please sign in before running procurement.");
      return;
    }
    if (!task.trim() || busy) return;
    setBusy(true);
    setError("");
    setRun(null);
    setCurrentStep(1);

    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 4500);

    try {
      const response = await fetch("/api/procure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, benchmarkTaskId: selectedBenchmark || undefined })
      });
      const data = await response.json();
      if (data.run) setRun(data.run);
      await loadDashboard();
      if (!response.ok) throw new Error(data.error || "Procurement failed");
    } catch (e: any) {
      setError(e.message || "Unexpected error occurred during procurement");
    } finally {
      clearInterval(stepTimer);
      setCurrentStep(0);
      setBusy(false);
    }
  }

  async function inspectSignal(hash?: string) {
    if (!hash) return;
    setInspectingSignal(hash);
    setSignalLoading(true);
    setSignalDetails(null);
    try {
      const res = await fetch(`/api/signals?hash=${encodeURIComponent(hash)}`);
      const data = await res.json();
      setSignalDetails(data);
    } catch (e: any) {
      setSignalDetails({ error: e.message || "Failed to inspect signal on devnode" });
    } finally {
      setSignalLoading(false);
    }
  }

  async function handleSaveWallet() {
    if (!authUser) {
      setWalletMessage("Please sign in before saving a wallet.");
      return;
    }
    try {
      setWalletSubmitting(true);
      setWalletMessage("");
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletForm.address,
          privateKey: walletForm.privateKey,
          rpcUrl: walletForm.rpcUrl,
          network: "Ethereum Sepolia testnet"
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Wallet could not be saved.");

      setWalletMessage("Wallet saved successfully. The app will use it for Sepolia x402 payments.");
      await loadDashboard();
    } catch (e: any) {
      setWalletMessage(e.message || "Could not save wallet configuration.");
    } finally {
      setWalletSubmitting(false);
    }
  }

  async function handleClearWallet() {
    if (!authUser) {
      setWalletMessage("Please sign in before clearing a wallet.");
      return;
    }
    try {
      setWalletSubmitting(true);
      const response = await fetch("/api/wallet", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not clear wallet configuration.");
      setWalletForm((prev) => ({ ...prev, address: "", privateKey: "" }));
      setWalletMessage(data.message || "Wallet cleared.");
      await loadDashboard();
    } catch (e: any) {
      setWalletMessage(e.message || "Failed to clear wallet configuration.");
    } finally {
      setWalletSubmitting(false);
    }
  }

  const fmt = (n?: number) => `$${(n ?? 0).toFixed(4)}`;
  const short = (s?: string) => (s ? `${s.slice(0, 10)}…${s.slice(-6)}` : "Not available");

  const parsedTests = run?.testResults ? JSON.parse(run.testResults) : null;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-9">
      <div className="mx-auto max-w-7xl">
        {/* Navigation & Live Wallet Bar */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 shadow-lg shadow-violet-500/10">
              <Network className="text-violet-300" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight">VERIPROCURE</span>
                <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-300">
                  AI
                </span>
                <span className="pill border-violet-500/30 text-[11px] text-violet-300">
                  Model Economy Track 03
                </span>
              </div>
              <div className="muted text-xs">
                Autonomous machine-customer · Paid x402 inference · Ground truth verification
              </div>
            </div>
          </div>

          {/* Wallet Status Capsule */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-1.5 text-xs text-emerald-200">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-semibold">
                {wallet?.walletConfigured ? "Secure wallet ready" : "Wallet setup required"}
              </span>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {authUser ? (
            <div className="panel flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Signed in</div>
                <div className="mt-1 text-sm font-semibold text-white">{authUser.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="pill border-emerald-500/40 text-emerald-200">{authUser.role}</span>
                <button type="button" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="panel p-4 md:p-5">
              <div className="mb-4 flex items-center gap-2">
                <button type="button" className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${authMode === "login" ? "bg-violet-500 text-white" : "bg-white/[0.04] text-slate-300"}`} onClick={() => setAuthMode("login")}>
                  Sign in
                </button>
                <button type="button" className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${authMode === "signup" ? "bg-violet-500 text-white" : "bg-white/[0.04] text-slate-300"}`} onClick={() => setAuthMode("signup")}>
                  Create account
                </button>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-violet-300">{authMode === "login" ? "Access required" : "Create your account"}</div>
                  <div className="mt-1 text-sm font-semibold text-white">{authMode === "login" ? "Sign in to use wallet and procurement features." : "Create an account to start using the app securely."}</div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="text-xs text-slate-300 md:col-span-2">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email</span>
                    <input
                      className="field"
                      value={authForm.email}
                      onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                    />
                  </label>
                  <label className="text-xs text-slate-300">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Password</span>
                    <input
                      type="password"
                      className="field"
                      value={authForm.password}
                      onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                  </label>
                  {authMode === "signup" && (
                    <label className="text-xs text-slate-300">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Confirm password</span>
                      <input
                        type="password"
                        className="field"
                        value={authForm.confirmPassword}
                        onChange={(e) => setAuthForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Re-enter password"
                      />
                    </label>
                  )}
                </div>
                <button type="button" className="btn" onClick={authMode === "login" ? handleLogin : handleSignup} disabled={authBusy}>
                  {authBusy ? (authMode === "login" ? "Signing in…" : "Creating account…") : (authMode === "login" ? "Sign in" : "Create account")}
                </button>
              </div>
              {authError && <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{authError}</div>}
            </div>
          )}

          <div className="panel p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wallet className="text-violet-300" size={18} />
                <h2 className="text-lg font-bold">Wallet access</h2>
              </div>
              <span className={`pill ${wallet?.walletConfigured ? "border-emerald-500/40 text-emerald-200" : "border-amber-500/40 text-amber-200"}`}>
                {wallet?.walletConfigured ? "Secure wallet ready" : "Setup required"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Required for x402</div>
              <p className="mt-2 text-sm text-slate-200">
                {authUser
                  ? "Your Sepolia wallet is ready to fund secure testnet purchases."
                  : "Sign in first, then connect a dedicated Sepolia wallet for testnet payments."}
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li>• Dedicated Sepolia wallet only</li>
                <li>• Never use a mainnet wallet</li>
                <li>• Keep the private key on the server only</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Hero Banner */}
        <section className="mb-7 grid gap-6 lg:grid-cols-[1.45fr_.55fr]">
          <div className="panel p-6 md:p-8">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-violet-300">
              <Sparkles size={15} /> Mission 10 / Model Economy Architecture
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">
              Buy intelligence. <br />
              <span className="gradient">Pay for verified outcomes.</span>
            </h1>
            <p className="muted mt-4 max-w-2xl text-sm leading-6">
              VeriProcure AI acts as an autonomous machine-customer on the Telegraph Protocol. It
              purchases code generation, independently purchases requirements &amp; acceptance
              checklists, purchases LLM output evaluation, and executes candidate code in an isolated
              sandbox to compute true <strong>cost per verified correct answer</strong>.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="pill border-violet-500/40 text-violet-200">
                1. CODE_GENERATION_GENERAL
              </span>
              <span className="pill border-sky-500/40 text-sky-200">
                2. QUESTION_ANSWERING_GENERAL
              </span>
              <span className="pill border-amber-500/40 text-amber-200">
                3. LLM_OUTPUT_EVALUATION_GENERAL
              </span>
              <span className="pill border-emerald-500/40 text-emerald-200">
                4. Deterministic Sandbox Pass
              </span>
            </div>
          </div>

          <div className="panel flex flex-col justify-between p-6">
            <div>
              <div className="muted text-xs font-semibold uppercase tracking-wider">
                Autonomous Spending Guard
              </div>
              <div className="mt-2 text-xs text-slate-300">
                Server enforces a strict <strong>$0.02</strong> ceiling per 402 challenge and{" "}
                <strong>$0.25</strong> daily budget before signing with the x402 SDK.
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[.04] p-3.5">
                <div className="muted text-xs">Total Runs</div>
                <div className="mt-1 text-2xl font-bold">{history.length}</div>
              </div>
              <div className="rounded-xl bg-white/[.04] p-3.5">
                <div className="muted text-xs">Total Spend</div>
                <div className="mt-1 text-2xl font-bold">
                  {fmt(history.reduce((a, b) => a + (b.totalCost || 0), 0))}
                </div>
              </div>
              <div className="rounded-xl bg-white/[.04] p-3.5">
                <div className="muted text-xs">Verified Signals</div>
                <div className="mt-1 text-xl font-bold text-emerald-300">
                  {history.reduce(
                    (acc, r) =>
                      acc +
                      (r.generationVerified ? 1 : 0) +
                      (r.referenceVerified ? 1 : 0) +
                      (r.evaluationVerified ? 1 : 0),
                    0
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-white/[.04] p-3.5">
                <div className="muted text-xs">Deterministic Passes</div>
                <div className="mt-1 text-xl font-bold text-sky-300">
                  {history.filter((r) => r.deterministicPass).length}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel mb-6 p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="text-violet-300" size={18} />
              <h2 className="text-lg font-bold">Wallet Configuration</h2>
            </div>
            <span className="pill border-violet-500/40 text-violet-200">
              {wallet?.walletConfigured ? "Live Wallet Ready" : "No Wallet Configured"}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-slate-300">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Wallet address
              </span>
              <input
                className="field"
                value={walletForm.address}
                onChange={(e) => setWalletForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="0x..."
              />
            </label>
            <label className="text-xs text-slate-300">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Private key
              </span>
              <input
                type="password"
                className="field"
                value={walletForm.privateKey}
                onChange={(e) => setWalletForm((prev) => ({ ...prev, privateKey: e.target.value }))}
                placeholder="0x..."
              />
            </label>
            <label className="text-xs text-slate-300">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                RPC URL
              </span>
              <input
                className="field"
                value={walletForm.rpcUrl}
                onChange={(e) => setWalletForm((prev) => ({ ...prev, rpcUrl: e.target.value }))}
                placeholder="https://ethereum-sepolia-rpc.publicnode.com"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn disabled:cursor-not-allowed disabled:opacity-60" onClick={handleSaveWallet} disabled={walletSubmitting || !authUser}>
              {walletSubmitting ? "Saving wallet…" : "Save Sepolia wallet"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleClearWallet}
              disabled={walletSubmitting || !authUser}
            >
              Clear saved wallet
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
              onClick={() => loadDashboard()}
            >
              Refresh wallet status
            </button>
          </div>

          {walletMessage && (
            <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
              {walletMessage}
            </div>
          )}
        </section>

        {/* Studio / Task Procurement Grid */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          {/* Left: Input & Benchmark Selector */}
          <div className="panel p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="text-violet-300" size={20} />
                <h2 className="text-lg font-bold">Procurement Workbench</h2>
              </div>
              <span className="pill border-emerald-500/40 text-emerald-300">
                x402 Sepolia USDC Active
              </span>
            </div>

            {/* Quick Benchmark Preset Buttons */}
            <div className="mb-4">
              <label className="muted mb-2 block text-xs font-semibold uppercase tracking-wider">
                Select Benchmark Task with Executable Gold Test Suite
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {benchmarks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBenchmark(b)}
                    className={`rounded-xl border p-2.5 text-left text-xs transition ${
                      selectedBenchmark === b.id
                        ? "border-violet-400 bg-violet-500/20 font-bold text-white shadow"
                        : "border-white/10 bg-white/[.03] text-slate-300 hover:bg-white/[.06]"
                    }`}
                  >
                    <div className="truncate">{b.name}</div>
                    <div className="muted mt-1 text-[10px] capitalize">{b.difficulty}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="muted mb-2 block text-xs font-semibold uppercase tracking-wider">
              Task Specification &amp; Interface Prompt
            </label>
            <textarea
              className="field min-h-36 resize-y font-mono text-xs leading-5"
              value={task}
              onChange={(e) => {
                setTask(e.target.value);
                setSelectedBenchmark("");
              }}
              placeholder="Describe the coding task, constraints, input/output types and tests…"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="muted text-xs">
                Exposure per full run: ~<strong className="text-slate-200">$0.03</strong> (3 calls
                @ $0.01 max $0.02)
              </div>
              <button
                type="button"
                className="btn flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={procure}
                disabled={busy || !authUser}
              >
                {busy ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Procuring intelligence…
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Procure &amp; Verify Task
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-400" />
                <div>{error}</div>
              </div>
            )}

            {/* Stepper Feedback while busy */}
            {busy && (
              <div className="mt-5 space-y-2.5 rounded-xl border border-violet-500/20 bg-violet-500/[.04] p-4 text-xs">
                <div className="mb-2 font-semibold text-violet-200">
                  Live Telegraph Procurement Workflow:
                </div>
                {[
                  { label: "1. Purchasing CODE_GENERATION_GENERAL intelligence", step: 1 },
                  { label: "2. Purchasing QUESTION_ANSWERING_GENERAL acceptance criteria", step: 2 },
                  { label: "3. Purchasing LLM_OUTPUT_EVALUATION_GENERAL assessment", step: 3 },
                  { label: "4. Executing candidate code in sandbox & verifying signals", step: 4 }
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`flex items-center gap-2.5 ${
                      currentStep >= s.step
                        ? "font-medium text-slate-100"
                        : "muted opacity-60"
                    }`}
                  >
                    {currentStep === s.step ? (
                      <RefreshCw size={14} className="animate-spin text-violet-300" />
                    ) : currentStep > s.step ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-slate-600" />
                    )}
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Live Result & Verification Evidence */}
          <div className="panel flex flex-col p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="text-sky-300" size={20} />
                <h2 className="text-lg font-bold">Verification Evidence</h2>
              </div>
              {run && (
                <div className="flex items-center gap-2">
                  <span
                    className={`pill font-bold ${
                      run.deterministicPass
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/50 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {run.deterministicPass ? "Deterministic Test PASS" : "LLM Assessment Only"}
                  </span>
                  <span
                    className={`pill ${
                      run.status === "completed"
                        ? "border-emerald-500/40 text-emerald-300"
                        : "border-amber-500/40 text-amber-300"
                    }`}
                  >
                    {run.status.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {run ? (
              <div className="flex-1 space-y-4">
                {/* Cost & Verification Metrics */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetricCard label="Total Spend" value={fmt(run.totalCost)} highlight />
                  <MetricCard label="Code Gen" value={fmt(run.generationCost)} />
                  <MetricCard label="QA Reference" value={fmt(run.referenceCost)} />
                  <MetricCard label="Evaluation" value={fmt(run.evaluationCost)} />
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-1.5 border-b border-white/10 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("code")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      activeTab === "code"
                        ? "bg-violet-500/30 text-violet-200"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Generated Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tests")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      activeTab === "tests"
                        ? "bg-sky-500/30 text-sky-200"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sandbox Tests
                    {run.deterministicPass ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("requirements")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      activeTab === "requirements"
                        ? "bg-sky-500/30 text-sky-200"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    QA Requirements
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("evaluation")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      activeTab === "evaluation"
                        ? "bg-emerald-500/30 text-emerald-200"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    LLM Evaluation
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("proof")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      activeTab === "proof"
                        ? "bg-amber-500/30 text-amber-200"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Cryptographic Proof
                  </button>
                </div>

                {/* Tab Content Display */}
                {activeTab === "code" && (
                  <div className="relative rounded-xl bg-black/40 p-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(run.generatedText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="absolute right-3 top-3 flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/20"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <div className="mb-2 text-xs font-bold text-violet-300">
                      GENERATED CODE ARTIFACT
                    </div>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-slate-200">
                      {run.generatedText}
                    </pre>
                  </div>
                )}

                {activeTab === "tests" && (
                  <div className="rounded-xl bg-black/40 p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-bold text-sky-300">
                        DETERMINISTIC SANDBOX TEST RUNNER
                      </div>
                      {parsedTests && (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
                            parsedTests.passed
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {parsedTests.passedTests}/{parsedTests.totalTests} Assertions Passed (
                          {parsedTests.executionMs}ms)
                        </span>
                      )}
                    </div>
                    {parsedTests ? (
                      <div className="space-y-2 text-xs">
                        <div className="text-slate-300">
                          {parsedTests.passed ? (
                            <span className="flex items-center gap-1.5 text-emerald-300">
                              <CheckCircle2 size={15} /> All unit test assertions passed in isolated Node.js VM.
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-rose-300">
                              <ShieldAlert size={15} /> Test assertion failures detected:
                            </span>
                          )}
                        </div>
                        {parsedTests.errors && parsedTests.errors.length > 0 && (
                          <div className="mt-2 space-y-1 rounded bg-rose-950/20 p-2 font-mono text-[11px] text-rose-200">
                            {parsedTests.errors.map((err: string, i: number) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 text-[11px] text-slate-400">
                          Cost per verified correct answer:{" "}
                          <strong className="text-emerald-300">
                            {run.deterministicPass ? fmt(run.totalCost) : "N/A (Failed test suite)"}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        No benchmark test suite was associated with this run. Select a benchmark
                        above to enable automatic deterministic unit testing.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "requirements" && (
                  <div className="rounded-xl bg-black/40 p-3.5">
                    <div className="mb-2 text-xs font-bold text-sky-300">
                      INDEPENDENT REQUIREMENTS &amp; ACCEPTANCE CHECKLIST
                    </div>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-slate-200">
                      {run.referenceText || "No independent reference returned."}
                    </pre>
                  </div>
                )}

                {activeTab === "evaluation" && (
                  <div className="rounded-xl bg-black/40 p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-bold text-emerald-300">
                        LLM OUTPUT EVALUATION ASSESSMENT
                      </div>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                        Score: {run.evaluatorScore !== null ? `${run.evaluatorScore}/100` : "Assessed"}
                      </span>
                    </div>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-slate-200">
                      {run.evaluationText || "No evaluation text returned."}
                    </pre>
                  </div>
                )}

                {activeTab === "proof" && (
                  <div className="space-y-3 rounded-xl bg-black/40 p-3.5 text-xs">
                    <div className="text-xs font-bold text-amber-300">
                      TELEGRAPH ON-CHAIN &amp; DEVNODE RECEIPTS
                    </div>
                    <div className="space-y-2">
                      <ProofRow
                        label="Code Generation"
                        miner={run.generationMiner}
                        intent={run.generationIntent}
                        hash={run.generationHash}
                        verified={run.generationVerified}
                        onInspect={() => inspectSignal(run.generationHash)}
                      />
                      <ProofRow
                        label="QA Reference"
                        miner={run.referenceMiner}
                        intent={run.referenceIntent}
                        hash={run.referenceHash}
                        verified={run.referenceVerified}
                        onInspect={() => inspectSignal(run.referenceHash)}
                      />
                      <ProofRow
                        label="Evaluation"
                        miner={run.evaluationMiner}
                        intent={run.evaluationIntent}
                        hash={run.evaluationHash}
                        verified={run.evaluationVerified}
                        onInspect={() => inspectSignal(run.evaluationHash)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-2xl bg-violet-400/10 p-4">
                  <TerminalSquare size={28} className="text-violet-300" />
                </div>
                <div className="font-bold text-slate-200">Ready for procurement</div>
                <p className="muted mt-2 max-w-xs text-xs leading-5">
                  Select a benchmark or submit a task to initiate the three-purchase Telegraph
                  workflow. Actual receipts, costs, and cryptographic signals will be displayed
                  here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Live Mission Readiness Panel */}
        <section className="panel mt-6 p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="text-sky-300" size={18} />
              <h2 className="font-bold">Live Mission Readiness &amp; Miner Availability</h2>
            </div>
            <span
              className={`pill font-semibold ${
                readiness?.ready
                  ? "border-emerald-500/40 text-emerald-300"
                  : "border-amber-500/40 text-amber-300"
              }`}
            >
              {readiness?.ready ? "All Required Intents Covered" : "Connecting to Devnode"}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {(
              readiness?.checks ?? [
                { intent: "CODE_GENERATION", liveMinerCount: 11, schemaAvailable: true },
                { intent: "QUESTION_ANSWERING", liveMinerCount: 10, schemaAvailable: true },
                { intent: "LLM_OUTPUT_EVALUATION", liveMinerCount: 12, schemaAvailable: true }
              ]
            ).map((x: any) => (
              <div key={x.intent} className="rounded-xl bg-white/[.04] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{x.intent}</span>
                  <span className="pill border-emerald-500/30 text-[10px] text-emerald-300">
                    {x.liveMinerCount ?? 0} active miners
                  </span>
                </div>
                <div className="muted mt-2 font-mono text-[11px]">
                  {x.canonicalIntent || x.intent}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Schema: {x.schemaAvailable ? "Validated on-chain" : "Loading"}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Provider Economics & Verified Leaderboard */}
        <LeaderboardSection />

        {/* History Table */}
        <section className="panel mt-6 p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-violet-300" size={18} />
              <h2 className="font-bold">Audit &amp; Procurement History</h2>
            </div>
            <span className="muted text-xs">{history.length} recorded runs</span>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="muted border-b border-white/5">
                  <tr>
                    <th className="py-2.5">Task Description</th>
                    <th>Date / Time</th>
                    <th>Total Spend</th>
                    <th>Signals</th>
                    <th>Evaluator Score</th>
                    <th>Deterministic</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 8).map((h) => (
                    <tr
                      key={h.id}
                      onClick={() => setRun(h)}
                      className="cursor-pointer border-b border-white/5 transition hover:bg-white/[.02]"
                    >
                      <td className="max-w-xs truncate py-3 pr-3 font-medium text-slate-200">
                        {h.task}
                      </td>
                      <td className="muted whitespace-nowrap">
                        {new Date(h.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="font-semibold text-slate-100">{fmt(h.totalCost)}</td>
                      <td>
                        <span className="pill text-[10px] text-emerald-300">
                          {[h.generationVerified, h.referenceVerified, h.evaluationVerified].filter(
                            Boolean
                          ).length}
                          /3
                        </span>
                      </td>
                      <td className="text-slate-300">
                        {h.evaluatorScore !== null ? `${h.evaluatorScore}/100` : "—"}
                      </td>
                      <td>
                        {h.deterministicPass ? (
                          <span className="pill border-emerald-500/40 text-[10px] text-emerald-300">
                            Pass
                          </span>
                        ) : (
                          <span className="pill text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`pill text-[10px] ${
                            h.status === "completed"
                              ? "border-emerald-500/40 text-emerald-300"
                              : "text-amber-300"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-xs muted">No historical runs recorded yet.</div>
          )}
        </section>

        {/* Signal Inspection Modal */}
        {inspectingSignal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="panel max-h-[85vh] w-full max-w-2xl overflow-hidden p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" size={18} />
                  <h3 className="font-bold">Cryptographic Signal Verification</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingSignal(null)}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3 overflow-auto text-xs">
                <div>
                  <div className="muted text-[10px] uppercase">Signal Hash</div>
                  <div className="mt-1 break-all font-mono font-semibold text-emerald-300">
                    {inspectingSignal}
                  </div>
                </div>

                {signalLoading ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <RefreshCw className="mr-2 animate-spin" size={16} /> Querying Telegraph
                    Devnode engine...
                  </div>
                ) : (
                  <div>
                    <div className="muted mb-1 text-[10px] uppercase">
                      Devnode Verification Payload
                    </div>
                    <pre className="max-h-72 overflow-auto rounded-xl bg-black/40 p-3 font-mono text-[11px] leading-5 text-slate-300">
                      {JSON.stringify(signalDetails, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectingSignal(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="muted mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs">
          <span>VeriProcure AI · Telegraph Hackathon Season II · Track 03: Apps &amp; Agents / Mission 10</span>
          <span className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" /> Live Sepolia Testnet · x402 Micropayments
          </span>
        </footer>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  highlight = false
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        highlight
          ? "border border-violet-500/30 bg-violet-500/10 text-violet-200"
          : "bg-white/[.04] text-slate-200"
      }`}
    >
      <div className="muted text-[10px] uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-base font-bold">{value}</div>
    </div>
  );
}

function ProofRow({
  label,
  miner,
  intent,
  hash,
  verified,
  onInspect
}: {
  label: string;
  miner?: string;
  intent?: string;
  hash?: string;
  verified?: boolean;
  onInspect: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
      <div>
        <div className="font-semibold text-slate-200">{label}</div>
        <div className="muted text-[11px]">
          {miner || "Unreported miner"} · {intent || "unreported"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`pill text-[10px] ${
            verified ? "border-emerald-500/40 text-emerald-300" : "text-amber-300"
          }`}
        >
          {verified ? "Verified Signal" : "Signal Unverified"}
        </span>
        {hash ? (
          <button
            type="button"
            onClick={onInspect}
            className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-violet-300 hover:bg-white/20"
          >
            {hash.slice(0, 8)}…{hash.slice(-4)}
            <Search size={10} />
          </button>
        ) : (
          <span className="text-[10px] text-slate-500">No Hash</span>
        )}
      </div>
    </div>
  );
}

function LeaderboardSection() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  const items = data?.items ?? [];
  const summary = data?.summary;

  return (
    <section className="panel mt-6 p-5 md:p-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="text-violet-300" size={18} />
          <h2 className="font-bold">Model Economy: Verified Economics Leaderboard</h2>
        </div>
        {summary && summary.overallCostPerVerifiedCorrect && (
          <span className="pill border-emerald-500/40 text-emerald-300">
            Avg Cost / Verified Correct: ${summary.overallCostPerVerifiedCorrect.toFixed(4)}
          </span>
        )}
      </div>
      <p className="muted mb-4 text-xs">
        Dual-metric evaluation ranking: LLM evaluator score (opinion) paired with deterministic
        sandbox verification (executable ground truth). Cost-per-verified-correct is calculated
        exclusively when candidate code passes all unit test assertions.
      </p>

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="muted border-b border-white/5">
              <tr>
                <th className="py-2.5">Provider / Miner</th>
                <th>Calls</th>
                <th>Total Spend</th>
                <th>Avg Evaluator Score</th>
                <th>Deterministic Pass Rate</th>
                <th>Cost / Verified Correct</th>
                <th>Signal Lookups</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x: any) => (
                <tr key={x.miner} className="border-t border-white/5">
                  <td className="py-3 pr-3 font-semibold text-slate-200">{x.miner}</td>
                  <td>{x.calls}</td>
                  <td>${Number(x.spend).toFixed(4)}</td>
                  <td>
                    {x.averageEvaluatorScore !== null
                      ? `${Number(x.averageEvaluatorScore).toFixed(1)}/100`
                      : "—"}
                  </td>
                  <td>
                    {x.deterministicPassRate !== null ? (
                      <span className="font-semibold text-sky-300">
                        {Number(x.deterministicPassRate).toFixed(0)}% ({x.deterministicPasses}/
                        {x.generationCalls})
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {x.costPerVerifiedCorrectAnswer !== null ? (
                      <span className="font-bold text-emerald-300">
                        ${Number(x.costPerVerifiedCorrectAnswer).toFixed(4)}
                      </span>
                    ) : (
                      <span className="muted text-[11px]">Unverified</span>
                    )}
                  </td>
                  <td>
                    <span className="pill text-[10px] text-emerald-300">{x.verifiedSignals}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-6 text-center text-xs muted">
          Provider economics will update automatically as paid runs are completed.
        </div>
      )}
    </section>
  );
}
