import React, { type CSSProperties, type ReactNode } from "react";
import type { TrustKind } from "./data/dataset";

export function Badge({ kind }: { kind: TrustKind }) {
  const cls = kind === "GOAL IMPACT" ? "GOAL" : kind;
  return <span className={`badge ${cls}`}>{kind}</span>;
}

export function DecisionBadge({ verdict, label }: { verdict: "safe" | "caution" | "neutral"; label: string }) {
  return (
    <span className={`decision-badge ${verdict}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

export function Why({ onClick, label = "How was this calculated?" }: { onClick: () => void; label?: string }) {
  return (
    <button className="why" onClick={onClick} type="button">
      {label}
    </button>
  );
}

export function Card({
  children,
  dark,
  style,
  onClick,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      className={`card ${dark ? "dark" : ""} ${className}`}
      style={{ ...style, textAlign: "left", width: "100%" }}
      onClick={onClick}
    >
      {children}
    </Comp>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className={`toggle ${on ? "on" : ""}`} aria-pressed={on} aria-label={label} onClick={() => onChange(!on)} type="button">
      <i />
    </button>
  );
}

export function Sheet({
  title,
  children,
  onClose,
  dark,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  dark?: boolean;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className={`sheet ${dark ? "dark" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="handle" />
        <div className="sheet-header">
          <h3>{title}</h3>
          <button className="btn-close" onClick={onClose} aria-label="Close dialog" type="button">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function SkeletonLoader({ type = "card", count = 1 }: { type?: "card" | "row" | "text" | "hero"; count?: number }) {
  return (
    <div className="skeleton-wrap" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skel-item skel-${type}`}>
          <div className="skel-line title" />
          <div className="skel-line sub" />
        </div>
      ))}
    </div>
  );
}

// Custom Clean SVG Icons
export const Icons = {
  Home: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 01-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 013 20v-9.5z" />
    </svg>
  ),
  Activity: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 6h16M4 12h16M4 18h10" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  ),
  Sim: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 8h16M4 16h16" />
      <circle cx="9" cy="8" r="2.5" fill="currentColor" />
      <circle cx="15" cy="16" r="2.5" fill="currentColor" />
    </svg>
  ),
  Assistant: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3a7 7 0 00-7 7c0 2.5 1.4 4.8 3.5 5.9V18a1 1 0 001 1h5a1 1 0 001-1v-2.1c2.1-1.1 3.5-3.4 3.5-5.9a7 7 0 00-7-7z" />
      <path d="M9.5 21h5" />
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  Search: (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  Bell: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  Upload: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242" />
      <path d="M12 12v9" />
      <path d="M8.5 15.5L12 12l3.5 3.5" />
    </svg>
  ),
  Share: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  ),
  Goal: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  ArrowRight: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Check: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  Info: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  Laptop: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 20h20" />
    </svg>
  ),
};
