import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AS_OF,
  CATEGORIES,
  DEMO_PRODUCT,
  GOAL,
  SAMPLE_CSV_A_FOOD,
  SAMPLE_CSV_B_SHOPPING,
  SAMPLE_CSV_C_BALANCED,
  TRANSACTIONS,
  USER,
  type Category,
  type Goal,
  type SharedProduct,
  type Transaction,
  type TrustKind,
} from "./data/dataset";
import {
  buildFutureSim,
  buildGoalView,
  buildPurchaseImpact,
  buildSnapshot,
  filterTransactions,
  type Snapshot,
  type TrustValue,
} from "./engine/finance";
import { formatDays, formatINR, formatMonths, formatPct } from "./engine/stats";
import { classifyProduct, classifyTx } from "./ai/localIntelligence";
import {
  EXPLAIN_DISCLAIMER,
  explainAnomaly,
  explainPurchase,
  explainTrust,
  renderExplanation,
} from "./ai/explanation";
import { parseTransactionCsv, type CsvParseResult } from "./services/csvParser";
import { Badge, Card, DecisionBadge, Icons, Sheet, SkeletonLoader, Toggle, Why } from "./ui";
import "./styles.css";

type Tab = "home" | "activity" | "whatif" | "assistant" | "settings";
type Screen =
  | Tab
  | "tx-detail"
  | "purchase-impact"
  | "browser-demo"
  | "goal-edit"
  | "privacy-modal"
  | "terms-modal"
  | "about-modal";

function getGreeting(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Onboarding & Auth States
  const [authComplete, setAuthComplete] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"welcome" | "login" | "signup">("welcome");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [showIncomePrompt, setShowIncomePrompt] = useState(false);
  const [incomeInput, setIncomeInput] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);

  // Core App Navigation State
  const [tab, setTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>("home");

  // Financial State
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS);
  const [isUsingUploadedData, setIsUsingUploadedData] = useState(false);
  const [uploadedDatasetMeta, setUploadedDatasetMeta] = useState<{
    count: number;
    profile: string;
    filename: string;
  } | null>(null);

  const [goal, setGoal] = useState<Goal>(GOAL);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(TRANSACTIONS[0]);
  const [product, setProduct] = useState<SharedProduct>(DEMO_PRODUCT);
  const [whatIfAmount, setWhatIfAmount] = useState<number>(DEMO_PRODUCT.price);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [filterRange, setFilterRange] = useState<"all" | "7d" | "30d" | "month">("month");

  // UI Modals & Loading
  const [sheet, setSheet] = useState<{ title: string; body: string; extra?: React.ReactNode } | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  // Hidden File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme class to root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Toast Timer
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Compute Financial Snapshot dynamically from active transactions
  const snapshot = useMemo(() => {
    return buildSnapshot(AS_OF, transactions);
  }, [transactions]);

  const goalView = useMemo(() => {
    return buildGoalView(goal);
  }, [goal]);

  const purchaseImpact = useMemo(() => {
    return buildPurchaseImpact(snapshot, goal, product, whatIfAmount);
  }, [snapshot, goal, product, whatIfAmount]);

  const futureSim = useMemo(() => {
    return buildFutureSim(goal, {
      dining: -1200,
      subscriptions: -450,
      shopping: -800,
    });
  }, [goal]);

  // Handle CSV file selection
  function handleCsvFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingAnalysis(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processCsvText(text, file.name);
    };

    reader.onerror = () => {
      setIsLoadingAnalysis(false);
      setToastMessage("Could not read the selected CSV file.");
    };

    reader.readAsText(file);
    if (e.target) e.target.value = "";
  }

  // Process and ingest CSV string
  function processCsvText(csvText: string, datasetLabel: string) {
    setIsLoadingAnalysis(true);
    setTimeout(() => {
      const parsed: CsvParseResult = parseTransactionCsv(csvText);

      if (!parsed.success || parsed.transactions.length === 0) {
        setIsLoadingAnalysis(false);
        setToastMessage(parsed.errorMessage ?? "Invalid CSV file format.");
        return;
      }

      setTransactions(parsed.transactions);
      setIsUsingUploadedData(true);
      setUploadedDatasetMeta({
        count: parsed.validRows,
        profile: parsed.spendingProfile,
        filename: datasetLabel,
      });

      setIsLoadingAnalysis(false);
      setToastMessage(`Imported ${parsed.validRows} transactions successfully.`);
    }, 450);
  }

  // Reset to default demo data
  function resetToDemoData() {
    setIsLoadingAnalysis(true);
    setTimeout(() => {
      setTransactions(TRANSACTIONS);
      setIsUsingUploadedData(false);
      setUploadedDatasetMeta(null);
      setIsLoadingAnalysis(false);
      setToastMessage("Reset to baseline demo dataset.");
    }, 300);
  }

  // Navigation handlers
  function navigateToTab(newTab: Tab) {
    setTab(newTab);
    setScreen(newTab);
  }

  function navigateToScreen(newScreen: Screen) {
    setScreen(newScreen);
  }

  function goBack() {
    setScreen(tab);
  }

  function openTrustExplanation(tv: TrustValue) {
    const p = explainTrust(tv);
    setSheet({
      title: tv.label,
      body: `${p.template}\n\n${p.disclaimer}`,
    });
  }

  function openExplainSheet(kind: "purchase" | "anomaly") {
    if (aiUnavailable) {
      setSheet({
        title: "Explanation Service",
        body: "Explanation is temporarily unavailable. Your verified financial calculations remain accessible.",
      });
      return;
    }

    if (kind === "purchase") {
      const p = explainPurchase(purchaseImpact);
      setSheet({
        title: "Purchase Impact Explanation",
        body: `${renderExplanation(p)}\n\n${p.disclaimer}`,
        extra: (
          <div style={{ marginTop: 14 }}>
            <div className="card" style={{ backgroundColor: "var(--surface-subtle)" }}>
              <strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>Calculation Transparency</strong>
              <p className="muted-text" style={{ fontSize: 12 }}>
                Goal Delay = Purchase Price ({formatINR(whatIfAmount)}) / Daily Savings Rate ({formatINR(goalView.dailySavings)}/day) = {formatDays(purchaseImpact.delayDays.value)}.
              </p>
            </div>
          </div>
        ),
      });
    } else if (snapshot.anomalies[0]) {
      const p = explainAnomaly(snapshot.anomalies[0]);
      setSheet({
        title: "Unusual Spending Explanation",
        body: `${renderExplanation(p)}\n\n${p.disclaimer}`,
      });
    }
  }

  function handleSimulateShareReceive() {
    setShareSheetOpen(false);
    setProduct(DEMO_PRODUCT);
    setWhatIfAmount(DEMO_PRODUCT.price);
    setScreen("purchase-impact");
    setToastMessage("Received product via simulated share.");
  }

  return (
    <div className="app-shell">
      {/* Hidden File Input for Real CSV Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleCsvFileSelect}
      />

      {/* Top Phone Status Bar (Template Reference) */}
      <div className="phone-status">
        <span>9:41</span>
        <div className="status-island" />
        <div className="status-pips">
          <span>5G</span>
          <div className="battery-icon">
            <div className="battery-fill" />
          </div>
        </div>
      </div>

      <div className="screen">
        {/* Fresh Launch Auth Modal (Log In, Sign Up, Guest) */}
        {!authComplete ? (
          <div className="scroll-container no-nav" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "85%" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div className="brand-logo" style={{ width: 56, height: 56, margin: "0 auto 14px", fontSize: 22, borderRadius: 16 }}>
                FS
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>Welcome to FINSCIENT</h1>
              <p className="muted-text" style={{ fontSize: 13, marginTop: 6 }}>
                Your money, before it becomes a problem.
              </p>
            </div>

            <Card style={{ padding: 20 }}>
              {authMode === "welcome" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setAuthComplete(true);
                      setShowIncomePrompt(true);
                    }}
                  >
                    Continue as Guest
                  </button>
                  <button className="btn-secondary" onClick={() => setAuthMode("login")}>
                    Log In with Email
                  </button>
                  <button className="btn-outline" onClick={() => setAuthMode("signup")}>
                    Create New Account
                  </button>
                  <p className="muted-text" style={{ textAlign: "center", fontSize: 11, marginTop: 4 }}>
                    Hackathon Demo: Guest mode enters immediately without credentials.
                  </p>
                </div>
              )}

              {(authMode === "login" || authMode === "signup") && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setAuthComplete(true);
                    setShowIncomePrompt(true);
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <strong style={{ fontSize: 15 }}>{authMode === "login" ? "Log In" : "Sign Up"}</strong>
                  <input
                    className="search-input"
                    style={{ padding: "0 14px", height: 42 }}
                    placeholder="Email address"
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                  <input
                    className="search-input"
                    style={{ padding: "0 14px", height: 42 }}
                    placeholder="Password"
                    type="password"
                    required
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                  />
                  <button className="btn-primary" type="submit">
                    {authMode === "login" ? "Log In" : "Create Account"}
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => setAuthMode("welcome")}>
                    Back
                  </button>
                </form>
              )}
            </Card>
          </div>
        ) : (
          <>
            {/* Top Bar for Home View */}
            {screen === "home" && (
              <div className="top-bar">
                <div className="brand-section">
                  <div className="brand-logo">FS</div>
                  <div className="brand-titles">
                    <div className="brand-name">FINSCIENT</div>
                    <div className="brand-tag">Phone-first money sense</div>
                  </div>
                </div>
                <div className="top-actions">
                  <button
                    className="icon-button"
                    aria-label="Toggle notifications"
                    onClick={() => setToastMessage("No active spending alerts.")}
                  >
                    {Icons.Bell}
                    <span className="notification-dot" />
                  </button>
                  <button
                    className="user-avatar-button"
                    aria-label="User profile"
                    onClick={() => navigateToTab("settings")}
                  >
                    {USER.name.slice(0, 1)}
                  </button>
                </div>
              </div>
            )}

            {/* View Switching */}
            {screen === "home" && (
              <div className="scroll-container">
                {/* Greeting Section (Direct from visual reference) */}
                <div className="greeting-section" style={{ padding: "0 0 14px" }}>
                  <div className="greeting-kicker">
                    {getGreeting(AS_OF)}, {USER.name}
                  </div>
                  <h1 className="greeting-headline">A Smarter You Today</h1>
                </div>

                {/* Pill Search Bar */}
                <div className="search-bar-wrap">
                  <span className="search-icon-pos">{Icons.Search}</span>
                  <input
                    className="search-input"
                    placeholder="Search transactions, categories, goals..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim().length > 0) {
                        setScreen("activity");
                      }
                    }}
                  />
                </div>

                {/* Row of 4 Quick Squircle Action Cards (Reference Template) */}
                <div className="quick-actions-row">
                  <button
                    className="squircle-action"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload transaction CSV file"
                  >
                    <div className="squircle-icon sage">
                      {Icons.Upload}
                      {isUsingUploadedData && <span className="squircle-badge">Active</span>}
                    </div>
                    <span className="squircle-label">Upload CSV</span>
                  </button>

                  <button
                    className="squircle-action"
                    onClick={() => setScreen("browser-demo")}
                    title="Test sharing a product to FINSCIENT"
                  >
                    <div className="squircle-icon amber">
                      {Icons.Share}
                    </div>
                    <span className="squircle-label">Share Test</span>
                  </button>

                  <button
                    className="squircle-action"
                    onClick={() => navigateToTab("whatif")}
                    title="Open What-if slider simulator"
                  >
                    <div className="squircle-icon blue">
                      {Icons.Sim}
                    </div>
                    <span className="squircle-label">What-If</span>
                  </button>

                  <button
                    className="squircle-action"
                    onClick={() => navigateToTab("assistant")}
                    title="Open AI Decision Advisor"
                  >
                    <div className="squircle-icon slate">
                      {Icons.Assistant}
                    </div>
                    <span className="squircle-label">Advisor</span>
                  </button>
                </div>

                {/* Featured Banner Card (Dark Green Emerald banner from template) */}
                <div className="featured-pulse-banner">
                  <div className="featured-content">
                    <div className="featured-kicker">
                      Financial Pulse · {snapshot.dayOfMonth} of {snapshot.daysInMonth} Days
                    </div>
                    <div className="featured-headline">
                      {formatINR(snapshot.mtd.value)}
                    </div>
                    <div className="featured-subtext">
                      {formatPct(snapshot.vsBaselinePct)} vs your normal spending to date.
                    </div>
                  </div>
                  <button
                    className="featured-arrow-button"
                    aria-label="View financial pulse breakdown"
                    onClick={() => openTrustExplanation(snapshot.mtd)}
                  >
                    {Icons.ArrowRight}
                  </button>
                </div>

                {/* Section: Your Goals (Direct from visual reference) */}
                <div className="section-header-row">
                  <span className="section-title">Your Goals</span>
                  <button className="section-action-link" onClick={() => setScreen("goal-edit")}>
                    Adjust
                  </button>
                </div>

                <Card className="goal-card-item">
                  <div className="goal-top-row">
                    <div className="goal-info-group">
                      <div className="goal-icon-badge">
                        {Icons.Laptop}
                      </div>
                      <div className="goal-title-group">
                        <div className="goal-name">{goalView.goal.name}</div>
                        <div className="goal-details">
                          {formatINR(goalView.goal.saved)} saved of {formatINR(goalView.goal.target)}
                        </div>
                      </div>
                    </div>
                    <div className="goal-pct-badge">{goalView.progressPct.toFixed(0)}%</div>
                  </div>

                  <div className="goal-progress-bar">
                    <div
                      className="goal-progress-fill"
                      style={{ width: `${Math.min(100, goalView.progressPct)}%` }}
                    />
                  </div>

                  <div className="row-between" style={{ marginTop: 2 }}>
                    <span className="muted-text">
                      Remaining {formatINR(goalView.remaining.value)} · ~{goalView.monthsWithoutPurchase.value.toFixed(1)} mo
                    </span>
                    <Badge kind="GOAL IMPACT" />
                  </div>
                </Card>

                {/* Prominent Real CSV Upload & Active Dataset Section */}
                <div className="section-header-row">
                  <span className="section-title">Data Source</span>
                  {isUsingUploadedData ? (
                    <button className="section-action-link" onClick={resetToDemoData}>
                      Reset to demo
                    </button>
                  ) : (
                    <span className="muted-text" style={{ fontSize: 11 }}>Using demo dataset</span>
                  )}
                </div>

                <div className="csv-section-box">
                  <div className="csv-status-header">
                    <div>
                      <strong style={{ fontSize: 13 }}>
                        {isUsingUploadedData ? "Uploaded Dataset Active" : "Import Bank or UPI CSV"}
                      </strong>
                      <div className="muted-text" style={{ fontSize: 12, marginTop: 2 }}>
                        {isUsingUploadedData && uploadedDatasetMeta
                          ? `${uploadedDatasetMeta.count} transactions analyzed · ${uploadedDatasetMeta.profile}`
                          : `${transactions.length} demo records analyzed. Upload your bank or UPI file.`}
                      </div>
                    </div>
                    {isUsingUploadedData ? (
                      <span className="badge OBSERVED">Uploaded</span>
                    ) : (
                      <span className="badge CALCULATED">Demo</span>
                    )}
                  </div>

                  <div className="csv-upload-button-row">
                    <button
                      className="btn-primary"
                      style={{ flex: 1, minHeight: 40, fontSize: 13 }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {Icons.Upload}
                      Choose CSV File
                    </button>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div className="muted-text" style={{ fontSize: 11, marginBottom: 4 }}>
                      One-tap test datasets for judging demo:
                    </div>
                    <div className="sample-csv-pills">
                      <button
                        className="sample-pill"
                        onClick={() => processCsvText(SAMPLE_CSV_A_FOOD, "Sample_Food_Spender.csv")}
                      >
                        Sample A: High Food
                      </button>
                      <button
                        className="sample-pill"
                        onClick={() => processCsvText(SAMPLE_CSV_B_SHOPPING, "Sample_Shopping_Spender.csv")}
                      >
                        Sample B: High Shopping
                      </button>
                      <button
                        className="sample-pill"
                        onClick={() => processCsvText(SAMPLE_CSV_C_BALANCED, "Sample_Balanced_Budget.csv")}
                      >
                        Sample C: Balanced
                      </button>
                    </div>
                  </div>
                </div>

                {/* Spending Insights Section (1 or 2 prioritized, plain English) */}
                <div className="section-header-row">
                  <span className="section-title">Spending Insights</span>
                  <button className="section-action-link" onClick={() => navigateToTab("activity")}>
                    See All
                  </button>
                </div>

                {isLoadingAnalysis ? (
                  <SkeletonLoader type="card" count={2} />
                ) : (
                  <>
                    {snapshot.anomalies[0] && (
                      <Card
                        onClick={() => {
                          setSelectedTx(snapshot.anomalies[0].tx);
                          setScreen("tx-detail");
                        }}
                      >
                        <div className="row-between">
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Unusual Spending Flag
                          </span>
                          <Badge kind="CALCULATED" />
                        </div>
                        <div className="row-between" style={{ margin: "8px 0 4px" }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                              {snapshot.anomalies[0].tx.merchant}
                            </div>
                            <div className="muted-text">
                              {snapshot.anomalies[0].tx.category} · {snapshot.anomalies[0].tx.date}
                            </div>
                          </div>
                          <div className="num-val lg" style={{ color: "var(--text-primary)" }}>
                            {formatINR(snapshot.anomalies[0].tx.amount)}
                          </div>
                        </div>
                        <p className="muted-text" style={{ fontSize: 12, marginTop: 4 }}>
                          {snapshot.anomalies[0].ratio.toFixed(1)}x your normal {snapshot.anomalies[0].tx.category} median.
                        </p>
                        <div className="row-between" style={{ marginTop: 8 }}>
                          <Why onClick={() => openExplainSheet("anomaly")} label="Why this flag?" />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)" }}>Inspect ›</span>
                        </div>
                      </Card>
                    )}

                    <Card>
                      <div className="row-between">
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          End-of-Month Estimate
                        </span>
                        <Badge kind="PREDICTED" />
                      </div>
                      <div className="row-between" style={{ margin: "8px 0 4px" }}>
                        <div>
                          <div className="num-val lg">{formatINR(snapshot.forecast.value)}</div>
                          <div className="muted-text">Projected month-end spending</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="num-val md">{formatINR(snapshot.typicalMonth.value)}</div>
                          <div className="muted-text">Normal spending</div>
                        </div>
                      </div>
                      <p className="muted-text" style={{ fontSize: 12, marginTop: 4 }}>
                        Run-rate estimate based on {snapshot.dayOfMonth} days of spending velocity.
                      </p>
                      <div style={{ marginTop: 6 }}>
                        <Why onClick={() => openTrustExplanation(snapshot.forecast)} label="How was this estimated?" />
                      </div>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* Activity View (Transactions & Scanable Filtered List) */}
            {screen === "activity" && (
              <div className="scroll-container">
                <div className="section-header-row" style={{ marginTop: 4 }}>
                  <span className="section-title">Activity ({transactions.length})</span>
                  {searchQuery && (
                    <button
                      className="section-action-link"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterCategory("All");
                        setFilterRange("month");
                      }}
                    >
                      Clear search
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="search-bar-wrap">
                  <span className="search-icon-pos">{Icons.Search}</span>
                  <input
                    className="search-input"
                    placeholder="Search merchant, category, amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Category Chips Filter */}
                <div className="filter-chips-row">
                  {(["All", ...CATEGORIES] as const).map((cat) => (
                    <button
                      key={cat}
                      className={`chip-btn ${filterCategory === cat ? "active" : ""}`}
                      onClick={() => setFilterCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Range Chips */}
                <div className="filter-chips-row" style={{ marginTop: 4, marginBottom: 12 }}>
                  {[
                    ["month", "This Month"],
                    ["7d", "Last 7 Days"],
                    ["30d", "Last 30 Days"],
                    ["all", "All Dates"],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      className={`chip-btn ${filterRange === val ? "active" : ""}`}
                      onClick={() => setFilterRange(val as any)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Transactions Scannable List */}
                <Card style={{ padding: "4px 16px" }}>
                  {filterTransactions(transactions, searchQuery, filterCategory, filterRange).map((t) => (
                    <button
                      key={t.id}
                      className="tx-item-row"
                      onClick={() => {
                        setSelectedTx(t);
                        setScreen("tx-detail");
                      }}
                    >
                      <div className="tx-cat-avatar">{t.category.slice(0, 2).toUpperCase()}</div>
                      <div className="tx-info">
                        <div className="tx-merchant">{t.merchant}</div>
                        <div className="tx-meta">
                          {t.category} · {t.date} · {t.channel}
                        </div>
                      </div>
                      <div className="tx-amount-group">
                        <div className="tx-amount-val">{formatINR(t.amount)}</div>
                        <Badge kind="OBSERVED" />
                      </div>
                    </button>
                  ))}

                  {filterTransactions(transactions, searchQuery, filterCategory, filterRange).length === 0 && (
                    <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-secondary)" }}>
                      No matching transactions found.
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Transaction Detail View */}
            {screen === "tx-detail" && selectedTx && (
              <div className="scroll-container no-nav">
                <button className="section-action-link" onClick={goBack} style={{ marginBottom: 14 }}>
                  ‹ Back to transactions
                </button>

                <Card dark style={{ padding: 20 }}>
                  <div className="row-between">
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>
                      {selectedTx.category}
                    </span>
                    <Badge kind="OBSERVED" />
                  </div>
                  <div className="num-val xl" style={{ margin: "8px 0 4px" }}>
                    {formatINR(selectedTx.amount)}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedTx.merchant}</div>
                  <div className="muted-text" style={{ marginTop: 2 }}>
                    Date: {selectedTx.date} · Channel: {selectedTx.channel}
                  </div>
                </Card>

                <Card>
                  <div className="row-between">
                    <strong>Your Normal Spending</strong>
                    <Badge kind="CALCULATED" />
                  </div>
                  <p className="muted-text" style={{ marginTop: 6 }}>
                    This transaction was analyzed against your {selectedTx.category} transaction baseline.
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <Why onClick={() => openExplainSheet("anomaly")} label="Explain this transaction" />
                  </div>
                </Card>

                <Card>
                  <div className="row-between">
                    <strong>Goal Impact Reference</strong>
                    <Badge kind="GOAL IMPACT" />
                  </div>
                  <p className="muted-text" style={{ marginTop: 6 }}>
                    If funded from savings rate, this equals ~{formatDays(selectedTx.amount / goalView.dailySavings)} of savings progress.
                  </p>
                </Card>

                <button
                  className="btn-primary"
                  onClick={() => {
                    setWhatIfAmount(selectedTx.amount);
                    setScreen("purchase-impact");
                  }}
                >
                  Simulate as What-If Purchase
                </button>
              </div>
            )}

            {/* What-If Interactive Simulator View */}
            {screen === "whatif" && (
              <div className="scroll-container">
                <div className="section-header-row" style={{ marginTop: 4 }}>
                  <span className="section-title">What-If Spending Simulator</span>
                  <span className="badge CALCULATED">Interactive</span>
                </div>

                <Card>
                  <p className="muted-text" style={{ marginBottom: 12 }}>
                    Explore how changing a potential purchase amount reshapes your laptop goal completion date in real time.
                  </p>

                  <div className="row-between">
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Proposed Purchase Price</span>
                    <span className="num-val lg" style={{ color: "var(--brand)" }}>
                      {formatINR(whatIfAmount)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={100}
                    value={whatIfAmount}
                    onChange={(e) => setWhatIfAmount(Number(e.target.value))}
                  />

                  <div className="row-between" style={{ marginTop: 4 }}>
                    <span className="muted-text">₹0</span>
                    <span className="muted-text">₹5,000</span>
                    <span className="muted-text">₹10,000</span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button className="sample-pill" onClick={() => setWhatIfAmount(1499)}>
                      Budget: ₹1,499
                    </button>
                    <button className="sample-pill" onClick={() => setWhatIfAmount(DEMO_PRODUCT.price)}>
                      Listed: ₹3,999
                    </button>
                    <button className="sample-pill" onClick={() => setWhatIfAmount(6999)}>
                      Premium: ₹6,999
                    </button>
                  </div>
                </Card>

                {/* Instant Calculation Results */}
                <Card dark>
                  <div className="row-between">
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--brand)" }}>
                      Calculated Consequence
                    </span>
                    <Badge kind="GOAL IMPACT" />
                  </div>

                  <div className="row-between" style={{ marginTop: 12 }}>
                    <div>
                      <div className="muted-text">Estimated Goal Delay</div>
                      <div className="num-val xl" style={{ color: whatIfAmount > 3000 ? "var(--danger)" : "var(--brand)" }}>
                        {formatDays(purchaseImpact.delayDays.value)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="muted-text">Relative to Normal Spend</div>
                      <div className="num-val lg">
                        {purchaseImpact.relativeSpend.value.toFixed(1)}x
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10 }}>
                    <div className="row-between">
                      <span className="muted-text">Completion without purchase:</span>
                      <strong>~{purchaseImpact.monthsWithout.value.toFixed(1)} months</strong>
                    </div>
                    <div className="row-between" style={{ marginTop: 4 }}>
                      <span className="muted-text">Completion with ₹{whatIfAmount.toLocaleString("en-IN")}:</span>
                      <strong>~{purchaseImpact.monthsWithPurchase.value.toFixed(1)} months</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <Why onClick={() => openExplainSheet("purchase")} label="How was this calculated?" />
                  </div>
                </Card>

                <button className="btn-primary" onClick={() => openExplainSheet("purchase")}>
                  Explain This Scenario
                </button>
              </div>
            )}

            {/* AI Personal Assistant (Requirement 29: Red / Green Decision Advisor) */}
            {screen === "assistant" && (
              <div className="scroll-container">
                <div className="section-header-row" style={{ marginTop: 4 }}>
                  <span className="section-title">AI Financial Decision Advisor</span>
                  <span className="badge OBSERVED">Live Data</span>
                </div>

                <Card>
                  <p className="muted-text" style={{ marginBottom: 12 }}>
                    Evaluate prospective purchases or budget choices before spending. Gives instant Safe (Green) or Caution (Red) feedback based on your actual data.
                  </p>

                  <div className="search-bar-wrap" style={{ marginBottom: 10 }}>
                    <input
                      className="search-input"
                      style={{ paddingLeft: 16 }}
                      placeholder="e.g. Can I buy ₹4,500 running shoes?"
                      value={incomeInput}
                      onChange={(e) => setIncomeInput(e.target.value)}
                    />
                  </div>

                  <div className="sample-csv-pills" style={{ marginBottom: 12 }}>
                    {[
                      "Buy ₹3,999 Wireless Headphones",
                      "Order ₹1,200 Dinner Party",
                      "Buy ₹8,500 Tablet",
                      "₹350 Movie Ticket",
                    ].map((promptText) => (
                      <button
                        key={promptText}
                        className="sample-pill"
                        onClick={() => {
                          const match = promptText.match(/\d+/g);
                          if (match) {
                            const val = parseInt(match.join(""), 10);
                            setWhatIfAmount(val);
                            setIncomeInput(promptText);
                          }
                        }}
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>

                  {/* AI Decision Evaluation Block */}
                  <div
                    style={{
                      border: `1px solid ${whatIfAmount > 3000 ? "var(--danger)" : "var(--success)"}`,
                      borderRadius: "var(--radius-md)",
                      padding: 16,
                      backgroundColor: whatIfAmount > 3000 ? "var(--danger-bg)" : "var(--success-bg)",
                      marginTop: 10,
                    }}
                  >
                    <div className="row-between">
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Decision Verdict</span>
                      <DecisionBadge
                        verdict={whatIfAmount > 3000 ? "caution" : "safe"}
                        label={whatIfAmount > 3000 ? "Caution: High Goal Delay" : "Safe: Within Buffer"}
                      />
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 13, lineHeight: 1.45, fontWeight: 500 }}>
                        {whatIfAmount > 3000
                          ? `Spending ${formatINR(whatIfAmount)} consumes ${formatDays(purchaseImpact.delayDays.value)} of savings progress towards your ${goal.name}. It represents ${purchaseImpact.relativeSpend.value.toFixed(1)}x your typical monthly shopping baseline.`
                          : `Spending ${formatINR(whatIfAmount)} represents only ${formatDays(purchaseImpact.delayDays.value)} of savings progress. Your laptop goal ETA remains on schedule.`}
                      </p>
                    </div>

                    <div className="row-between" style={{ marginTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 8 }}>
                      <span className="muted-text">Status Check</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {whatIfAmount > 3000 ? "Red Flag (Delay > 10d)" : "Green Light (Acceptable)"}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <strong style={{ fontSize: 14 }}>Advisor Principles</strong>
                  <p className="muted-text" style={{ fontSize: 12, marginTop: 4 }}>
                    FINSCIENT does not block your payment or decide what to buy. It clarifies the consequence while a decision can still be adjusted.
                  </p>
                </Card>
              </div>
            )}

            {/* Settings View */}
            {screen === "settings" && (
              <div className="scroll-container">
                <div className="section-header-row" style={{ marginTop: 4 }}>
                  <span className="section-title">Settings & System</span>
                </div>

                {/* Appearance */}
                <Card>
                  <strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--brand)" }}>
                    Appearance
                  </strong>
                  <div className="row-between" style={{ marginTop: 12 }}>
                    <span>Dark Theme</span>
                    <Toggle
                      on={theme === "dark"}
                      onChange={(isDark) => setTheme(isDark ? "dark" : "light")}
                      label="Toggle dark theme"
                    />
                  </div>
                </Card>

                {/* Data Controls */}
                <Card>
                  <strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--brand)" }}>
                    Data & CSV
                  </strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ width: "100%", justifyContent: "flex-start" }}
                    >
                      {Icons.Upload}
                      Upload Transaction CSV
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={resetToDemoData}
                      style={{ width: "100%", justifyContent: "flex-start" }}
                    >
                      Reset to Default Demo Dataset
                    </button>
                  </div>
                </Card>

                {/* Session & Onboarding */}
                <Card>
                  <strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--brand)" }}>
                    Session
                  </strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setAuthComplete(false);
                        setAuthMode("welcome");
                        setToastMessage("Session reset. Onboarding screen active.");
                      }}
                      style={{ width: "100%", justifyContent: "flex-start" }}
                    >
                      Restart Welcome & Onboarding Demo
                    </button>
                  </div>
                </Card>

                {/* Privacy & Legal Links */}
                <Card>
                  <strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--brand)" }}>
                    Trust & Boundaries
                  </strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    <button
                      className="row-between"
                      style={{ width: "100%", padding: "6px 0", borderBottom: "1px solid var(--border)" }}
                      onClick={() => setScreen("privacy-modal")}
                    >
                      <span>Privacy Policy</span>
                      <span>›</span>
                    </button>
                    <button
                      className="row-between"
                      style={{ width: "100%", padding: "6px 0", borderBottom: "1px solid var(--border)" }}
                      onClick={() => setScreen("terms-modal")}
                    >
                      <span>Terms of Service</span>
                      <span>›</span>
                    </button>
                    <button
                      className="row-between"
                      style={{ width: "100%", padding: "6px 0" }}
                      onClick={() => setScreen("about-modal")}
                    >
                      <span>About FINSCIENT</span>
                      <span>›</span>
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {/* Browser / Share Simulation View */}
            {screen === "browser-demo" && (
              <div className="scroll-container no-nav" style={{ backgroundColor: "#121413", color: "#f2f5f3" }}>
                <button className="section-action-link" onClick={goBack} style={{ color: "#a8bab1", marginBottom: 14 }}>
                  ‹ Exit Product Simulation
                </button>

                <div
                  style={{
                    backgroundColor: "#1e2220",
                    borderRadius: "var(--radius-full)",
                    padding: "8px 14px",
                    fontSize: 12,
                    color: "#a8bab1",
                    marginBottom: 16,
                  }}
                >
                  {product.url}
                </div>

                <div
                  style={{
                    height: 180,
                    borderRadius: "var(--radius-lg)",
                    backgroundColor: "#282e2a",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 48,
                    fontWeight: 800,
                    color: "#a0b5a8",
                    marginBottom: 16,
                  }}
                >
                  WH
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>{product.title}</h2>
                <div style={{ fontSize: 13, color: "#a8bab1", margin: "4px 0 10px" }}>
                  {product.merchant} · {product.category}
                </div>
                <div className="num-val xl" style={{ color: "#ffffff", marginBottom: 14 }}>
                  {formatINR(product.price)}
                </div>

                <p style={{ fontSize: 12, color: "#8a9e94", lineHeight: 1.4, marginBottom: 20 }}>
                  In a real Android experience, tapping "Share" opens FINSCIENT to calculate the purchase consequence before checkout.
                </p>

                <button className="btn-primary" onClick={() => setShareSheetOpen(true)}>
                  Share to FINSCIENT
                </button>
              </div>
            )}

            {/* Purchase Impact Screen */}
            {screen === "purchase-impact" && (
              <div className="scroll-container no-nav">
                <button className="section-action-link" onClick={goBack} style={{ marginBottom: 14 }}>
                  ‹ Back to Dashboard
                </button>

                <div className="greeting-section" style={{ padding: "0 0 10px" }}>
                  <span className="greeting-kicker">Purchase Impact Analysis</span>
                  <h2 style={{ fontSize: 22, fontWeight: 800 }}>{product.title}</h2>
                </div>

                <Card dark>
                  <div className="row-between">
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>Product Price</span>
                    <Badge kind="OBSERVED" />
                  </div>
                  <div className="num-val xl" style={{ margin: "8px 0 4px" }}>
                    {formatINR(whatIfAmount)}
                  </div>
                  <div className="muted-text">{product.merchant} · {product.category}</div>
                </Card>

                <Card>
                  <div className="row-between">
                    <strong>Your Normal Spending</strong>
                    <Badge kind="CALCULATED" />
                  </div>
                  <div className="num-val lg" style={{ margin: "6px 0 2px" }}>
                    {formatINR(purchaseImpact.categoryBaseline.value)}/month
                  </div>
                  <p className="muted-text">
                    This purchase equals {purchaseImpact.relativeSpend.value.toFixed(1)}x your normal monthly Shopping spending.
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <Why onClick={() => openTrustExplanation(purchaseImpact.categoryBaseline)} />
                  </div>
                </Card>

                <Card>
                  <div className="row-between">
                    <strong>Goal Impact</strong>
                    <Badge kind="GOAL IMPACT" />
                  </div>
                  <div className="row-between" style={{ margin: "8px 0 4px" }}>
                    <div>
                      <div className="muted-text">Estimated Goal Delay</div>
                      <div className="num-val lg" style={{ color: "var(--danger)" }}>
                        {formatDays(purchaseImpact.delayDays.value)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="muted-text">Laptop Target</div>
                      <div className="num-val md">{formatINR(goal.target)}</div>
                    </div>
                  </div>
                  <p className="muted-text" style={{ fontSize: 12, marginTop: 4 }}>
                    Delays goal completion from ~{purchaseImpact.monthsWithout.value.toFixed(1)} mo to ~{purchaseImpact.monthsWithPurchase.value.toFixed(1)} mo.
                  </p>
                </Card>

                {/* What-If Slider on Impact Screen */}
                <Card>
                  <div className="row-between">
                    <strong>What-If Amount Slider</strong>
                    <span className="num-val md" style={{ color: "var(--brand)" }}>
                      {formatINR(whatIfAmount)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8000}
                    step={100}
                    value={whatIfAmount}
                    onChange={(e) => setWhatIfAmount(Number(e.target.value))}
                  />
                  <div className="row-between" style={{ marginTop: 6 }}>
                    <button className="sample-pill" onClick={() => setWhatIfAmount(DEMO_PRODUCT.price)}>
                      Original: {formatINR(DEMO_PRODUCT.price)}
                    </button>
                    <button className="sample-pill" onClick={() => setWhatIfAmount(2499)}>
                      Discount: ₹2,499
                    </button>
                  </div>
                </Card>

                <button className="btn-primary" onClick={() => openExplainSheet("purchase")} style={{ marginBottom: 8 }}>
                  Explain This Impact
                </button>
                <button className="btn-secondary" onClick={() => setScreen("home")} style={{ width: "100%" }}>
                  Done
                </button>
              </div>
            )}

            {/* Goal Edit Screen */}
            {screen === "goal-edit" && (
              <div className="scroll-container no-nav">
                <button className="section-action-link" onClick={goBack} style={{ marginBottom: 14 }}>
                  ‹ Back to Dashboard
                </button>

                <div className="section-header-row" style={{ marginTop: 4 }}>
                  <span className="section-title">Adjust Savings Goal</span>
                </div>

                <Card>
                  <label className="muted-text" style={{ display: "block", marginBottom: 6 }}>
                    Goal Name
                  </label>
                  <input
                    className="search-input"
                    style={{ paddingLeft: 14, marginBottom: 14 }}
                    value={goal.name}
                    onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                  />

                  <label className="muted-text" style={{ display: "block", marginBottom: 6 }}>
                    Target Amount (₹)
                  </label>
                  <input
                    className="search-input"
                    style={{ paddingLeft: 14, marginBottom: 14 }}
                    type="number"
                    value={goal.target}
                    onChange={(e) => setGoal({ ...goal, target: Number(e.target.value) || 0 })}
                  />

                  <label className="muted-text" style={{ display: "block", marginBottom: 6 }}>
                    Current Saved Amount (₹)
                  </label>
                  <input
                    className="search-input"
                    style={{ paddingLeft: 14, marginBottom: 14 }}
                    type="number"
                    value={goal.saved}
                    onChange={(e) => setGoal({ ...goal, saved: Number(e.target.value) || 0 })}
                  />

                  <label className="muted-text" style={{ display: "block", marginBottom: 6 }}>
                    Monthly Savings Rate (₹/month)
                  </label>
                  <input
                    className="search-input"
                    style={{ paddingLeft: 14, marginBottom: 16 }}
                    type="number"
                    value={goal.monthlySavingsRate}
                    onChange={(e) => setGoal({ ...goal, monthlySavingsRate: Number(e.target.value) || 1 })}
                  />

                  <button
                    className="btn-primary"
                    onClick={() => {
                      setToastMessage("Goal updated successfully.");
                      goBack();
                    }}
                  >
                    Save Changes
                  </button>
                </Card>
              </div>
            )}

            {/* Privacy Policy View */}
            {screen === "privacy-modal" && (
              <div className="scroll-container no-nav">
                <button className="section-action-link" onClick={goBack} style={{ marginBottom: 14 }}>
                  ‹ Back to Settings
                </button>
                <div className="section-header-row">
                  <span className="section-title">Privacy Policy</span>
                </div>
                <Card>
                  <strong style={{ fontSize: 14 }}>Local-First Financial Intelligence</strong>
                  <p className="muted-text" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    1. <strong>CSV & Transaction Data:</strong> All uploaded bank logs and transaction data are processed locally within your client session. No raw transaction ledgers are permanently retained without consent.
                  </p>
                  <p className="muted-text" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    2. <strong>AI Boundaries:</strong> The AI explanation layer translates verified deterministic metrics into plain English. It is strictly constrained from inventing financial figures.
                  </p>
                  <p className="muted-text" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    3. <strong>Zero Payment Blocking:</strong> FINSCIENT does not intercept UPI payments, block transactions, or replace your bank. You retain complete autonomy over your spending.
                  </p>
                </Card>
              </div>
            )}

            {/* Terms of Service View */}
            {screen === "terms-modal" && (
              <div className="scroll-container no-nav">
                <button className="section-action-link" onClick={goBack} style={{ marginBottom: 14 }}>
                  ‹ Back to Settings
                </button>
                <div className="section-header-row">
                  <span className="section-title">Terms of Service</span>
                </div>
                <Card>
                  <strong style={{ fontSize: 14 }}>Terms of Educational Simulation</strong>
                  <p className="muted-text" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    1. FINSCIENT is a phone-first financial decision companion designed for hackathon demonstration purposes.
                  </p>
                  <p className="muted-text" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    2. Projections, what-if simulations, and completion dates are mathematical estimates based on current run-rates, not financial guarantees.
                  </p>
                  <p className="muted-text" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    3. Users make their own purchasing decisions. FINSCIENT provides decision visibility rather than binding financial advice.
                  </p>
                </Card>
              </div>
            )}

            {/* About Modal */}
            {screen === "about-modal" && (
              <div className="scroll-container no-nav">
                <button className="section-action-link" onClick={goBack} style={{ marginBottom: 14 }}>
                  ‹ Back to Settings
                </button>
                <div className="section-header-row">
                  <span className="section-title">About FINSCIENT</span>
                </div>
                <Card>
                  <strong style={{ fontSize: 15 }}>Team ALT_F4 · PSID: SH-104</strong>
                  <p className="muted-text" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    Built for Convergence 2k26 Hackathon (FinTech & Commerce).
                  </p>
                  <p className="muted-text" style={{ marginTop: 6, lineHeight: 1.5 }}>
                    Thesis: A finance app should explain the next decision before the money leaves, rather than reporting post-payment guilt.
                  </p>
                </Card>
              </div>
            )}

            {/* Bottom Navigation Bar */}
            {(["home", "activity", "whatif", "assistant", "settings"] as Screen[]).includes(screen) && (
              <nav className="bottom-nav" aria-label="Primary navigation">
                <button
                  className={`nav-tab-button ${tab === "home" ? "active" : ""}`}
                  onClick={() => navigateToTab("home")}
                >
                  {Icons.Home}
                  <span>Home</span>
                </button>
                <button
                  className={`nav-tab-button ${tab === "activity" ? "active" : ""}`}
                  onClick={() => navigateToTab("activity")}
                >
                  {Icons.Activity}
                  <span>Activity</span>
                </button>
                <button
                  className={`nav-tab-button ${tab === "whatif" ? "active" : ""}`}
                  onClick={() => navigateToTab("whatif")}
                >
                  {Icons.Sim}
                  <span>What-If</span>
                </button>
                <button
                  className={`nav-tab-button ${tab === "assistant" ? "active" : ""}`}
                  onClick={() => navigateToTab("assistant")}
                >
                  {Icons.Assistant}
                  <span>Advisor</span>
                </button>
                <button
                  className={`nav-tab-button ${tab === "settings" ? "active" : ""}`}
                  onClick={() => navigateToTab("settings")}
                >
                  {Icons.Settings}
                  <span>Settings</span>
                </button>
              </nav>
            )}
          </>
        )}
      </div>

      {/* Income Popup (Requirement 16) */}
      {showIncomePrompt && (
        <Sheet title="Add Your Monthly Income" onClose={() => setShowIncomePrompt(false)}>
          <p className="muted-text" style={{ marginBottom: 14 }}>
            Adding income helps calculate savings buffers. Income is strictly optional and never blocks features.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>₹</span>
            <input
              className="search-input"
              style={{ paddingLeft: 12, height: 44, margin: 0 }}
              placeholder="e.g. 25,000"
              type="number"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              className="btn-primary"
              onClick={() => {
                const val = Number(incomeInput);
                if (val > 0) setMonthlyIncome(val);
                setShowIncomePrompt(false);
                setToastMessage(val > 0 ? "Income saved." : "Proceeding with demo profile.");
              }}
            >
              Save Income
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowIncomePrompt(false);
                setToastMessage("Income skipped. Full features available.");
              }}
            >
              Skip for now
            </button>
          </div>
        </Sheet>
      )}

      {/* Simulated Android Share Sheet */}
      {shareSheetOpen && (
        <Sheet title="Share via" onClose={() => setShareSheetOpen(false)}>
          <p className="muted-text" style={{ marginBottom: 14 }}>
            Select destination app for the shared product:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, paddingBottom: 10 }}>
            {[
              ["FINSCIENT", true],
              ["WhatsApp", false],
              ["Messages", false],
              ["Notes", false],
            ].map(([name, isTarget]) => (
              <button
                key={name as string}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                onClick={() => {
                  if (isTarget) handleSimulateShareReceive();
                  else setToastMessage(`${name} is not the destination for this demo.`);
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: isTarget ? "var(--brand)" : "var(--surface-subtle)",
                    color: isTarget ? "#ffffff" : "var(--text-primary)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 14,
                    border: "1px solid var(--border)",
                  }}
                >
                  {String(name).slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{name as string}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* Explanation Sheet */}
      {sheet && (
        <Sheet title={sheet.title} onClose={() => setSheet(null)}>
          <p style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", color: "var(--text-primary)" }}>
            {sheet.body}
          </p>
          {sheet.extra}
        </Sheet>
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="toast-notice">{toastMessage}</div>}
    </div>
  );
}
