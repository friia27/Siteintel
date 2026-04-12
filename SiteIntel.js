"use client";
import { useState, useRef, useCallback } from "react";
import styles from "./SiteIntel.module.css";

const STATUS_CONFIG = {
  complete:      { border: "#2ECC71", fill: "#2ECC71", bg: "rgba(46,204,113,0.12)",  color: "#2ECC71" },
  partial:       { border: "#E67E22", fill: "#E67E22", bg: "rgba(230,126,34,0.12)",  color: "#E67E22" },
  "not-started": { border: "#E74C3C", fill: "#E74C3C", bg: "rgba(231,76,60,0.12)",   color: "#E74C3C" },
  "not-visible": { border: "#333",    fill: "#444",    bg: "rgba(136,136,136,0.12)", color: "#888"    },
};

function TradeCard({ trade, index }) {
  const rawStatus = (trade.status || "not-visible").toLowerCase().replace(/\s+/g, "-");
  const valid = ["complete", "partial", "not-started", "not-visible"];
  const status = valid.includes(rawStatus) ? rawStatus : "not-visible";
  const cfg = STATUS_CONFIG[status];
  const pct = typeof trade.pct === "number" ? Math.min(100, Math.max(0, trade.pct)) : 0;

  return (
    <div
      className={styles.tradeCard}
      style={{ borderLeftColor: cfg.border, animationDelay: `${index * 0.07}s` }}
    >
      <div className={styles.tradeTop}>
        <span className={styles.tradeName}>{trade.name}</span>
        <span className={styles.tradeBadge} style={{ background: cfg.bg, color: cfg.color }}>
          {status.replace(/-/g, " ")}
        </span>
      </div>
      <div className={styles.tradePct}>{pct}% complete</div>
      <div className={styles.progressBg}>
        <div className={styles.progressFill} style={{ width: `${pct}%`, background: cfg.fill }} />
      </div>
      <div className={styles.tradeNotes}>{trade.notes}</div>
    </div>
  );
}

export default function SiteIntel() {
  const [imgUrl,  setImgUrl]  = useState(null);
  const [imgB64,  setImgB64]  = useState(null);
  const [imgType, setImgType] = useState(null);
  const [uiState, setUiState] = useState("idle"); // idle | loading | result | error
  const [report,  setReport]  = useState(null);
  const [errMsg,  setErrMsg]  = useState("");
  const [dragOver,setDragOver]= useState(false);
  const [jobName, setJobName] = useState("");
  const [floor,   setFloor]   = useState("");
  const [foreman, setForeman] = useState("");
  const [phase,   setPhase]   = useState("rough");
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImgUrl(URL.createObjectURL(file));
    let mt = file.type;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mt)) mt = "image/jpeg";
    setImgType(mt);
    const reader = new FileReader();
    reader.onload = (e) => setImgB64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
    setUiState("idle");
    setReport(null);
  }, []);

  const analyze = async () => {
    if (!imgB64) return;
    setUiState("loading");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imgB64, mediaType: imgType, jobName, floor, foreman, phase }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Server error");
      setReport({
        ...data.report,
        jobName: jobName || "Unknown",
        floor:   floor   || "Unspecified",
        foreman: foreman || "Unspecified",
        id: "RPT-" + Math.floor(Math.random() * 900000 + 100000),
        ts: new Date().toLocaleString(),
      });
      setUiState("result");
    } catch (e) {
      setErrMsg(e.message);
      setUiState("error");
    }
  };

  const reset = () => {
    setImgUrl(null); setImgB64(null); setReport(null);
    setErrMsg(""); setUiState("idle");
    if (fileRef.current) fileRef.current.value = "";
  };

  const exportReport = () => {
    if (!report) return;
    let txt = `SITE INTEL — PROGRESS REPORT\n${"=".repeat(42)}\n`;
    txt += `Job:     ${report.jobName}\nZone:    ${report.floor}\nForeman: ${report.foreman}\nDate:    ${report.ts}\nOverall: ${report.overall_pct}%\n\n`;
    txt += `OVERVIEW\n${"─".repeat(30)}\n${report.summary}\n\nTRADE STATUS\n${"─".repeat(30)}\n`;
    report.trades.forEach((t) => {
      txt += `\n[${t.pct}%] ${(t.name || "").toUpperCase()} — ${(t.status || "").toUpperCase()}\n  ${t.notes}\n`;
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" }));
    a.download = `siteintel-${report.id}.txt`;
    a.click();
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ["Report ID", "Job", "Zone", "Foreman", "Date", "Overall %"],
      [report.id, report.jobName, report.floor, report.foreman, report.ts, report.overall_pct + "%"],
      [],
      ["Trade", "Status", "% Complete", "Notes"],
      ...report.trades.map((t) => [t.name, t.status, t.pct + "%", t.notes]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `siteintel-${report.id}.csv`;
    a.click();
  };

  return (
    <div className={styles.app}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.logo}>SITE<span>INTEL</span></div>
        <div className={styles.badge}>AI Progress Logger v1.0</div>
      </header>

      <main className={styles.main}>
        {/* ── INPUT PANEL ── */}
        <section className={styles.panel}>
          {/* Step 01 */}
          <div className={styles.panelHeader}>
            <span className={styles.stepNum}>01</span>
            <span className={styles.panelTitle}>Upload Job Site Photo</span>
          </div>

          <div className={styles.uploadZone}>
            <div
              className={`${styles.dropArea} ${dragOver ? styles.dragOver : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <span className={styles.dropIcon}>📷</span>
              <div className={styles.dropLabel}>
                <strong>Tap to upload</strong> or drag photo here<br />
                From Meta glasses, phone, or tablet<br />
                JPG · PNG · HEIC
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />

            {imgUrl && (
              <div className={styles.previewWrap}>
                <img src={imgUrl} alt="Job site" className={styles.previewImg} />
                <div className={styles.previewLabel}>Captured Frame</div>
                <button className={styles.clearBtn} onClick={reset}>✕ Clear</button>
              </div>
            )}
          </div>

          {/* Step 02 */}
          <div className={styles.panelHeader}>
            <span className={styles.stepNum}>02</span>
            <span className={styles.panelTitle}>Job Info</span>
          </div>

          <div className={styles.metaFields}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Job Name / Address</label>
                <input type="text" placeholder="e.g. 142 W 57th St" value={jobName} onChange={(e) => setJobName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Floor / Zone</label>
                <input type="text" placeholder="e.g. Floor 4 · North" value={floor} onChange={(e) => setFloor(e.target.value)} />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Foreman</label>
                <input type="text" placeholder="Your name" value={foreman} onChange={(e) => setForeman(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Project Phase</label>
                <select value={phase} onChange={(e) => setPhase(e.target.value)}>
                  <option value="rough">Rough / Framing</option>
                  <option value="mep">MEP Rough-In</option>
                  <option value="insulation">Insulation</option>
                  <option value="drywall">Drywall / Finishing</option>
                  <option value="finishes">Finishes / Trim</option>
                  <option value="closeout">Closeout / Punch</option>
                </select>
              </div>
            </div>
          </div>

          <button
            className={styles.analyzeBtn}
            onClick={analyze}
            disabled={!imgB64 || uiState === "loading"}
          >
            {uiState === "loading" ? "⏳  ANALYZING SITE…" : "⚡  ANALYZE PHOTO"}
          </button>
        </section>

        {/* ── RESULTS PANEL ── */}
        <section className={styles.resultsPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.stepNum}>03</span>
            <span className={styles.panelTitle}>AI Progress Report</span>
          </div>

          {uiState === "idle" && (
            <div className={styles.idleState}>
              <div className={styles.idleIcon}>🏗️</div>
              <div className={styles.idleText}>Upload a photo<br />to generate your report</div>
            </div>
          )}

          {uiState === "loading" && (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <div className={styles.loadingLabel}>Analyzing Site Conditions…</div>
            </div>
          )}

          {uiState === "error" && (
            <div className={styles.errorState}>
              <div className={styles.errorBox}>
                <div className={styles.errorTitle}>Analysis Failed</div>
                <div className={styles.errorMsg}>{errMsg}</div>
              </div>
              <button className={styles.retryBtn} onClick={() => setUiState("idle")}>↺ Try Again</button>
            </div>
          )}

          {uiState === "result" && report && (
            <div className={styles.resultContent}>
              <div className={styles.reportMeta}>
                <span className={styles.reportId}>{report.id}</span>
                <span className={styles.reportTs}>{report.ts}</span>
              </div>

              <div className={styles.overallBar}>
                <div className={styles.overallNum}>{report.overall_pct}%</div>
                <div className={styles.overallLabel}>Overall Estimated<br />Completion</div>
              </div>

              <div className={styles.resultBody}>
                <div className={styles.summaryBox}>
                  <div className={styles.summaryLabel}>Foreman's Overview</div>
                  <div className={styles.summaryText}>{report.summary}</div>
                </div>

                {report.trades.map((t, i) => (
                  <TradeCard key={i} trade={t} index={i} />
                ))}
              </div>

              <div className={styles.exportRow}>
                <button className={styles.exportBtn} onClick={exportReport}>⬇ Text Report</button>
                <button className={styles.exportBtn} onClick={exportCSV}>⬇ CSV / Excel</button>
                <button className={styles.exportBtn} onClick={reset}>↺ New Log</button>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className={styles.ticker}>
        <span className={styles.tickerInner}>
          SITEINTEL AI PROGRESS LOGGER &nbsp;·&nbsp; POWERED BY CLAUDE VISION &nbsp;·&nbsp; NYC CONSTRUCTION &nbsp;·&nbsp;
          PROCORE / PLANGRID INTEGRATION ROADMAP &nbsp;·&nbsp; META GLASSES READY &nbsp;·&nbsp; LOG PROGRESS · MARK UP DRAWINGS · SAVE HOURS &nbsp;·&nbsp;
        </span>
      </footer>
    </div>
  );
}
