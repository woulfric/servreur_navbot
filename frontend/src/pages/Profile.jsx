import { useState, useEffect } from 'react';
import './profile.css';

// ─── Mini Card wrapper (remplace l'import Card si besoin) ───────────────────
function Card({ children, title, span = 1, className = '' }) {
  return (
    <div
      className={`nb-card ${className}`}
      style={{ gridColumn: `span ${span}` }}
    >
      {title && (
        <div className="nb-card-header">
          <span className="nb-card-title">{title}</span>
          <span className="nb-card-line" />
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Avatar animé ────────────────────────────────────────────────────────────
function Avatar({ initials }) {
  return (
    <div className="nb-avatar">
      <div className="nb-avatar-ring" />
      <div className="nb-avatar-inner">{initials}</div>
      <div className="nb-avatar-pulse" />
    </div>
  );
}

// ─── Badge de statut ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return (
    <span className="nb-status-badge">
      <span className="nb-status-dot" />
      {status}
    </span>
  );
}

// ─── Stat chip ───────────────────────────────────────────────────────────────
function StatChip({ label, value, icon }) {
  return (
    <div className="nb-stat-chip">
      <span className="nb-stat-icon">{icon}</span>
      <div>
        <div className="nb-stat-value">{value}</div>
        <div className="nb-stat-label">{label}</div>
      </div>
    </div>
  );
}

// ─── Info row ────────────────────────────────────────────────────────────────
function InfoRow({ label, value, accent }) {
  return (
    <div className="nb-info-row">
      <span className="nb-info-label">{label}</span>
      <span className={`nb-info-value ${accent ? 'accent' : ''}`}>{value}</span>
    </div>
  );
}

// ─── Activity item ───────────────────────────────────────────────────────────
function ActivityItem({ type, text, sub, index }) {
  return (
    <div className="nb-activity-item" style={{ animationDelay: `${0.05 * index}s` }}>
      <div className={`nb-activity-dot dot-${type}`} />
      <div className="nb-activity-content">
        <span className="nb-activity-text" dangerouslySetInnerHTML={{ __html: text }} />
        <span className="nb-activity-sub">{sub}</span>
      </div>
      <div className="nb-activity-arrow">›</div>
    </div>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────
function ProgressBar({ value, label, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 300);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="nb-progress-row">
      <span className="nb-progress-label">{label}</span>
      <div className="nb-progress-track">
        <div
          className="nb-progress-fill"
          style={{ width: `${width}%`, background: color, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)' }}
        />
      </div>
      <span className="nb-progress-val">{value}%</span>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function Profile() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const user = {
    name: 'Operator NavBot',
    role: 'Robotics Supervisor',
    email: 'operator@navbot.io',
    organisation: 'NavBot Robotics Lab',
    location: 'Paris, France',
    phone: '+33 6 12 34 56 78',
    avatarInitials: 'ON',
    lastLogin: 'Today · 15:42',
  };

  return (
    <div className={`nb-profile-page ${mounted ? 'mounted' : ''}`}>

      {/* ── HERO CARD ─────────────────────────────────────────────────────── */}
      <Card span={2} className="nb-hero-card">
        <div className="nb-hero-bg" />
        <div className="nb-hero-content">
          <Avatar initials={user.avatarInitials} />

          <div className="nb-hero-info">
            <div className="nb-hero-top">
              <div>
                <h2 className="nb-hero-name">{user.name}</h2>
                <p className="nb-hero-role">{user.role}</p>
                <p className="nb-hero-meta">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {user.organisation} · {user.location}
                </p>
              </div>
              <div className="nb-hero-actions">
                <button className="nb-btn-primary">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit Profile
                </button>
                <button className="nb-btn-ghost">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Log Out
                </button>
              </div>
            </div>

            <div className="nb-tags-row">
              <span className="nb-tag admin">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Admin
              </span>
              <span className="nb-tag robots">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M9 11V7a3 3 0 016 0v4"/><circle cx="12" cy="5" r="1"/></svg>
                4 Robots
              </span>
              <span className="nb-tag missions">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                12 Missions / day
              </span>
            </div>
          </div>
        </div>

        <div className="nb-hero-stats">
          <StatChip label="Last login" value={user.lastLogin} icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          } />
          <StatChip label="Active sessions" value="2 devices" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          } />
          <StatChip label="Member since" value="Feb 2025" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          } />
        </div>
      </Card>

      {/* ── ACCOUNT OVERVIEW ─────────────────────────────────────────────── */}
      <Card title="Account Overview">
        <div className="nb-overview-status">
          <StatusBadge status="Active" />
          <span className="nb-overview-access">Full control</span>
        </div>
        <div className="nb-info-list">
          <InfoRow label="Status" value="Active" accent />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Access Level" value="Full control" accent />
          <InfoRow label="Member since" value="Feb 2025" />
        </div>
        <div className="nb-divider" />
        <div className="nb-perf-section">
          <span className="nb-perf-title">Mission success rate</span>
          <ProgressBar value={94} label="Completed" color="var(--nb-success)" />
          <ProgressBar value={3} label="Failed" color="var(--nb-warning)" />
          <ProgressBar value={3} label="Pending" color="var(--nb-blue-mid)" />
        </div>
      </Card>

      {/* ── CONTACT INFO ─────────────────────────────────────────────────── */}
      <Card title="Contact Information" span={2}>
        <div className="nb-contact-grid">
          {[
            { label: 'Email', value: user.email, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
            { label: 'Phone', value: user.phone, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.28-1.29a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> },
            { label: 'Location', value: user.location, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> },
            { label: 'Organisation', value: user.organisation, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          ].map(({ label, value, icon }) => (
            <div className="nb-contact-item" key={label}>
              <div className="nb-contact-icon">{icon}</div>
              <div>
                <div className="nb-contact-label">{label}</div>
                <div className="nb-contact-value">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── PREFERENCES & SECURITY ───────────────────────────────────────── */}
      <Card title="Preferences & Security">
        <div className="nb-info-list">
          <InfoRow label="Theme" value="Dark · NavBot" />
          <InfoRow label="Notifications" value="Critical only" />
          <InfoRow
            label="Two-factor auth"
            value={<span className="nb-2fa-badge">✓ Enabled</span>}
          />
          <InfoRow label="Sessions" value="2 active devices" />
        </div>
        <div className="nb-divider" />
        <div className="nb-security-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <span>Last password change: <strong>12 Jan 2025</strong></span>
        </div>
      </Card>

      {/* ── RECENT ACTIVITY ──────────────────────────────────────────────── */}
      <Card title="Recent Activity" span={3}>
        <div className="nb-activity-grid">
          <ActivityItem index={0} type="success"
            text="Mission <strong>#M-204</strong> completed successfully"
            sub="Today · 15:21 · Robot TurtleBot4"
          />
          <ActivityItem index={1} type="warning"
            text="Battery low warning acknowledged"
            sub="Today · 14:03 · Robot NavBot-02"
          />
          <ActivityItem index={2} type="info"
            text="Profile settings updated"
            sub="Yesterday · 19:44 · Web dashboard"
          />
        </div>
      </Card>

    </div>
  );
}