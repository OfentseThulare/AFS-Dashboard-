import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

/* ── AFS brand tokens ─────────────────────────────────── */
const C = {
  bg: "#FAF9F7",
  surface: "#ffffff",
  dark: "#1b1716",
  darkAlt: "#2a2220",
  red: "#ac0904",
  redDark: "#7a0603",
  text: "#1b1716",
  textMid: "#555555",
  textFaint: "#999999",
  border: "#F0EEEE",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  amber: "#d97706",
  amberBg: "#fffbeb",
};

/* ── Helpers ──────────────────────────────────────────── */
const age = (dob) => {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / 31557600000);
};

const TEST_EMAILS = ["test@test.com", "john@test.com"];
const isTest = (row) => {
  const name = `${row.first_name || row.team_name || row.coach_first_name || ""}`.trim().toLowerCase();
  const email = (row.email || row.coach_email || "").toLowerCase();
  return TEST_EMAILS.includes(email) || (name === "test" && email.includes("atlascg"));
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";

/* ── Inline styles ────────────────────────────────────── */
const sPage = { minHeight: "100vh", background: C.bg, fontFamily: "'Helvetica Neue', Arial, sans-serif", color: C.text };
const sHeader = { background: `linear-gradient(135deg, ${C.dark} 0%, ${C.darkAlt} 100%)`, padding: "20px 32px", display: "flex", alignItems: "center", gap: 16 };
const sLogo = { width: 40, height: 40, borderRadius: 8 };
const sTitle = { margin: 0, fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" };
const sSubtitle = { margin: 0, fontSize: 10, color: C.textFaint, letterSpacing: "0.16em", textTransform: "uppercase" };
const sRedBar = { height: 3, background: `linear-gradient(to right, ${C.red}, ${C.redDark})` };
const sBody = { maxWidth: 1400, margin: "0 auto", padding: "24px 24px 60px" };
const sStats = { display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" };
const sStatCard = (accent) => ({ background: C.surface, borderRadius: 8, padding: "20px 24px", flex: "1 1 160px", minWidth: 160, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", borderLeft: `4px solid ${accent}` });
const sStatNum = { margin: 0, fontSize: 28, fontWeight: 800, color: C.dark };
const sStatLabel = { margin: "4px 0 0", fontSize: 11, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 };
const sTabs = { display: "flex", gap: 0, borderBottom: `2px solid ${C.border}` };
const sTab = (active) => ({ padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em", color: active ? C.red : C.textFaint, borderBottom: active ? `3px solid ${C.red}` : "3px solid transparent", marginBottom: -2, background: "none", border: "none", transition: "all .15s" });
const sCard = { background: C.surface, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" };
const sSearch = { width: "100%", padding: "12px 16px", border: `1px solid ${C.border}`, borderRadius: 0, borderBottom: "none", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const sTh = { padding: "10px 14px", fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left", borderBottom: `2px solid ${C.border}`, background: C.bg, position: "sticky", top: 0, zIndex: 1 };
const sTd = { padding: "12px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, color: C.textMid, verticalAlign: "top" };
const sAvatar = { width: 36, height: 36, borderRadius: "50%", objectFit: "cover", background: C.border };
const sBadge = (bg, fg) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, color: fg, background: bg, textTransform: "uppercase", letterSpacing: "0.04em" });
const sLive = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.green, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" };
const sPulse = { width: 8, height: 8, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" };
const sModal = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 };
const sModalContent = { background: C.surface, borderRadius: 12, maxWidth: 600, width: "100%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" };

/* ── Global CSS ───────────────────────────────────────── */
const GlobalCSS = () => (
  <style>{`
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    *{margin:0;box-sizing:border-box}
    table{border-collapse:collapse;width:100%}
    input:focus{border-color:${C.red}!important}
    .row:hover td{background:${C.bg}!important}
    ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
  `}</style>
);

/* ── Player detail modal ──────────────────────────────── */
function PlayerModal({ player: p, onClose, onDelete }) {
  if (!p) return null;
  const Field = ({ label, val }) =>
    val && String(val).trim() && val !== "N/A" && val !== "NA" ? (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: C.text }}>{val}</div>
      </div>
    ) : null;

  return (
    <div style={sModal} onClick={onClose}>
      <div style={sModalContent} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: `linear-gradient(135deg, ${C.dark}, ${C.darkAlt})`, padding: "24px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          {p.photo_url ? (
            <img src={p.photo_url} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.2)" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>{p.first_name?.[0]}</div>
          )}
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 800 }}>{p.first_name} {p.last_name}</h2>
            <p style={{ margin: "4px 0 0", color: C.textFaint, fontSize: 12 }}>{p.email}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer", padding: "4px 8px" }}>&times;</button>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <Field label="Phone" val={p.phone} />
            <Field label="Date of Birth" val={p.dob ? `${fmt(p.dob)} (age ${age(p.dob)})` : null} />
            <Field label="ID / Passport" val={p.id_number} />
            <Field label="Height" val={p.height} />
            <Field label="Weight" val={p.weight} />
            <Field label="Offensive Position" val={p.off_position} />
            <Field label="Defensive Position" val={p.def_position} />
            <Field label="40-Yard Dash" val={p.forty_yard} />
            <Field label="Vertical Jump" val={p.vertical} />
            <Field label="Bench Reps" val={p.bench_reps} />
            <Field label="Broad Jump" val={p.broad_jump} />
            <Field label="Years Playing" val={p.years_playing} />
            <Field label="Previous League" val={p.prev_league} />
            <Field label="Awards" val={p.awards} />
          </div>
          {p.bio && (
            <div style={{ marginTop: 16, padding: 16, background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Bio</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: C.textMid, whiteSpace: "pre-wrap" }}>{p.bio}</div>
            </div>
          )}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: C.textFaint }}>Registered {fmt(p.created_at)}</div>
            <button
              onClick={() => { if (window.confirm(`Delete ${p.first_name} ${p.last_name}? This cannot be undone.`)) onDelete(p.id, "player"); }}
              style={{ background: "none", border: `1px solid ${C.red}30`, borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, color: C.red, cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              Delete Player
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Team detail modal ────────────────────────────────── */
function TeamModal({ team: t, players, onClose, onDelete }) {
  if (!t) return null;
  const roster = players.filter((p) => p.team_id === t.id);
  return (
    <div style={sModal} onClick={onClose}>
      <div style={sModalContent} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: `linear-gradient(135deg, ${C.dark}, ${C.darkAlt})`, padding: "24px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          {t.logo_url ? (
            <img src={t.logo_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 8, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>{t.team_name?.[0]}</div>
          )}
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 800 }}>{t.team_name}</h2>
            <p style={{ margin: "4px 0 0", color: C.textFaint, fontSize: 12 }}>{t.city} &middot; {t.colours}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer", padding: "4px 8px" }}>&times;</button>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Coach</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {t.coach_photo_url && <img src={t.coach_photo_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.coach_first_name} {t.coach_last_name}</div>
                <div style={{ fontSize: 12, color: C.textFaint }}>{t.coach_email} &middot; {t.coach_phone}</div>
                <div style={{ fontSize: 12, color: C.textMid }}>{t.coach_position} &middot; DOB: {fmt(t.coach_dob)}</div>
              </div>
            </div>
            {t.coach_bio && <p style={{ fontSize: 13, color: C.textMid, marginTop: 8 }}>{t.coach_bio}</p>}
          </div>
          {t.bio && (
            <div style={{ padding: 16, background: C.bg, borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Team Bio</div>
              <div style={{ fontSize: 13, color: C.textMid }}>{t.bio}</div>
            </div>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Roster ({roster.length} players)</div>
          {roster.length === 0 ? (
            <p style={{ fontSize: 13, color: C.textFaint }}>No players assigned to this team yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {roster.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: C.bg, borderRadius: 6 }}>
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" style={{ ...sAvatar, width: 32, height: 32 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.textFaint }}>{p.first_name?.[0]}</div>
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                    <div style={{ fontSize: 11, color: C.textFaint }}>{p.off_position} / {p.def_position}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {t.proof_of_payment_url && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Proof of Payment</div>
              <a href={t.proof_of_payment_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: C.red }}>View document</a>
            </div>
          )}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: C.textFaint }}>Registered {fmt(t.created_at)} &middot; Status: {t.status}</div>
            <button
              onClick={() => { if (window.confirm(`Delete team "${t.team_name}"? This cannot be undone.`)) onDelete(t.id, "team"); }}
              style={{ background: "none", border: `1px solid ${C.red}30`, borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, color: C.red, cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              Delete Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main App ─────────────────────────────────────────── */
export default function App() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tab, setTab] = useState("players");
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const pollRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [{ data: p, error: pErr }, { data: t, error: tErr }] = await Promise.all([
        supabase.from("afs_players").select("*").order("created_at", { ascending: false }),
        supabase.from("afs_teams").select("*").order("created_at", { ascending: false }),
      ]);
      if (pErr || tErr) {
        console.error("Fetch error:", pErr || tErr);
        setFetchError((pErr || tErr).message);
        return;
      }
      if (p) setPlayers(p.filter((r) => !isTest(r)));
      if (t) setTeams(t.filter((r) => !isTest(r)));
      setLastUpdate(new Date());
      setFetchError(null);
    } catch (err) {
      console.error("fetchAll exception:", err);
      setFetchError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // Polling fallback every 30 seconds in case realtime drops
    pollRef.current = setInterval(fetchAll, 30000);

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "afs_players" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "afs_teams" }, () => fetchAll())
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollRef.current);
    };
  }, [fetchAll]);

  const handleDelete = async (id, type) => {
    const table = type === "player" ? "afs_players" : "afs_teams";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    setSelectedPlayer(null);
    setSelectedTeam(null);
    fetchAll();
  };

  const filtered = (tab === "players" ? players : teams).filter((r) => {
    if (!search) return true;
    return JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
  });

  const freeAgents = players.filter((p) => !p.team_id);
  const assigned = players.filter((p) => p.team_id);

  return (
    <div style={sPage}>
      <GlobalCSS />

      {/* ── Header ──────────────────────────── */}
      <div style={sHeader}>
        <img src="https://zrxdnpabbkhiljpdemwc.supabase.co/storage/v1/object/public/afs_media/branding/afs-logo.png" alt="AFS" style={sLogo} />
        <div>
          <h1 style={sTitle}>AFS Dashboard</h1>
          <p style={sSubtitle}>Internal Administration</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={fetchAll}
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            Refresh
          </button>
          <div>
            <div style={sLive}>
              <div style={{ ...sPulse, background: connected ? C.green : C.amber }} />
              {connected ? "Live" : "Polling"}
            </div>
            {lastUpdate && <div style={{ fontSize: 10, color: C.textFaint, marginTop: 2 }}>Updated {lastUpdate.toLocaleTimeString()}</div>}
          </div>
        </div>
      </div>
      {fetchError && (
        <div style={{ background: "#fef2f2", borderBottom: "2px solid #fca5a5", padding: "10px 32px", fontSize: 12, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
          <strong>Connection error:</strong> {fetchError} — data may be outdated. Check Supabase credentials.
        </div>
      )}
      <div style={sRedBar} />

      <div style={sBody}>
        {/* ── Stat cards ────────────────────── */}
        <div style={sStats}>
          <div style={sStatCard(C.red)}>
            <p style={sStatNum}>{players.length}</p>
            <p style={sStatLabel}>Total Players</p>
          </div>
          <div style={sStatCard(C.green)}>
            <p style={sStatNum}>{teams.length}</p>
            <p style={sStatLabel}>Teams</p>
          </div>
          <div style={sStatCard(C.amber)}>
            <p style={sStatNum}>{freeAgents.length}</p>
            <p style={sStatLabel}>Free Agents</p>
          </div>
          <div style={sStatCard(C.dark)}>
            <p style={sStatNum}>{assigned.length}</p>
            <p style={sStatLabel}>On a Team</p>
          </div>
          <div style={sStatCard("#6366f1")}>
            <p style={{ ...sStatNum, fontSize: 14 }}>{players[0] ? `${players[0].first_name} ${players[0].last_name}` : "—"}</p>
            <p style={sStatLabel}>Latest Signup</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: C.textFaint }}>{players[0] ? fmt(players[0].created_at) : ""}</p>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────── */}
        <div style={sTabs}>
          <button style={sTab(tab === "players")} onClick={() => { setTab("players"); setSearch(""); }}>Players ({players.length})</button>
          <button style={sTab(tab === "teams")} onClick={() => { setTab("teams"); setSearch(""); }}>Teams ({teams.length})</button>
        </div>

        {/* ── Table ─────────────────────────── */}
        <div style={sCard}>
          <input style={sSearch} placeholder={`Search ${tab}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
          <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
            {tab === "players" ? (
              <table>
                <thead>
                  <tr>
                    <th style={sTh}>#</th>
                    <th style={sTh}>Player</th>
                    <th style={sTh}>Email</th>
                    <th style={sTh}>Phone</th>
                    <th style={sTh}>Age</th>
                    <th style={sTh}>Offense</th>
                    <th style={sTh}>Defense</th>
                    <th style={sTh}>Team</th>
                    <th style={sTh}>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ ...sTd, textAlign: "center", padding: 40, color: C.textFaint }}>No players found</td></tr>
                  )}
                  {filtered.map((p, i) => {
                    const team = teams.find((t) => t.id === p.team_id);
                    return (
                      <tr key={p.id} className="row" style={{ cursor: "pointer" }} onClick={() => setSelectedPlayer(p)}>
                        <td style={{ ...sTd, color: C.textFaint, fontSize: 11 }}>{i + 1}</td>
                        <td style={sTd}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {p.photo_url ? (
                              <img src={p.photo_url} alt="" style={sAvatar} />
                            ) : (
                              <div style={{ ...sAvatar, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.textFaint }}>{p.first_name?.[0]}{p.last_name?.[0]}</div>
                            )}
                            <div style={{ fontWeight: 700, color: C.dark, fontSize: 13 }}>{p.first_name} {p.last_name}</div>
                          </div>
                        </td>
                        <td style={{ ...sTd, fontSize: 12 }}>{p.email}</td>
                        <td style={{ ...sTd, fontSize: 12 }}>{p.phone}</td>
                        <td style={sTd}>{age(p.dob)}</td>
                        <td style={sTd}><span style={sBadge(`${C.red}15`, C.red)}>{p.off_position || "—"}</span></td>
                        <td style={sTd}><span style={sBadge(`${C.dark}15`, C.dark)}>{p.def_position || "—"}</span></td>
                        <td style={sTd}>
                          {team ? <span style={sBadge(C.greenBg, C.green)}>{team.team_name}</span> : <span style={sBadge(C.amberBg, C.amber)}>Free Agent</span>}
                        </td>
                        <td style={{ ...sTd, fontSize: 12, color: C.textFaint }}>{fmt(p.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={sTh}>#</th>
                    <th style={sTh}>Team</th>
                    <th style={sTh}>City</th>
                    <th style={sTh}>Colours</th>
                    <th style={sTh}>Coach</th>
                    <th style={sTh}>Coach Email</th>
                    <th style={sTh}>Players</th>
                    <th style={sTh}>Status</th>
                    <th style={sTh}>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ ...sTd, textAlign: "center", padding: 40, color: C.textFaint }}>No teams found</td></tr>
                  )}
                  {filtered.map((t, i) => {
                    const roster = players.filter((p) => p.team_id === t.id);
                    return (
                      <tr key={t.id} className="row" style={{ cursor: "pointer" }} onClick={() => setSelectedTeam(t)}>
                        <td style={{ ...sTd, color: C.textFaint, fontSize: 11 }}>{i + 1}</td>
                        <td style={sTd}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {t.logo_url ? (
                              <img src={t.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: 6, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>{t.team_name?.[0]}</div>
                            )}
                            <div style={{ fontWeight: 700, color: C.dark, fontSize: 13 }}>{t.team_name}</div>
                          </div>
                        </td>
                        <td style={sTd}>{t.city}</td>
                        <td style={sTd}>{t.colours}</td>
                        <td style={sTd}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.coach_first_name} {t.coach_last_name}</div>
                          <div style={{ fontSize: 11, color: C.textFaint }}>{t.coach_position}</div>
                        </td>
                        <td style={{ ...sTd, fontSize: 12 }}>{t.coach_email}</td>
                        <td style={sTd}><span style={sBadge(C.bg, C.dark)}>{roster.length}</span></td>
                        <td style={sTd}>
                          <span style={sBadge(t.status === "Approved" ? C.greenBg : C.amberBg, t.status === "Approved" ? C.green : C.amber)}>{t.status}</span>
                        </td>
                        <td style={{ ...sTd, fontSize: 12, color: C.textFaint }}>{fmt(t.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────── */}
      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} onDelete={handleDelete} />}
      {selectedTeam && <TeamModal team={selectedTeam} players={players} onClose={() => setSelectedTeam(null)} onDelete={handleDelete} />}
    </div>
  );
}
