import { useState, useEffect, useRef, Component } from "react";
import { supabase } from './supabaseClient';
import {
  sanitize, sanitizeObject, isValidEmail, isValidPhone,
  validateTeamForm, validatePlayerForm, validatePhoto,
  PHOTO_MAX_SIZE_MB,
} from './validation';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('AFS App Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", textAlign: "center", padding: "20px" }}>
          <div>
            <h1 style={{ fontSize: "24px", marginBottom: "12px", color: "#111" }}>Something went wrong</h1>
            <p style={{ color: "#666", marginBottom: "20px" }}>Please refresh the page to try again.</p>
            <button onClick={() => window.location.reload()} style={{ padding: "12px 24px", background: "#C4161C", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── AFS Brand Colours ─── */
const C = {
  red: "#C4161C",
  redDark: "#9B1118",
  redLight: "#E8383E",
  black: "#111111",
  charcoal: "#1A1A2E",
  white: "#ffffff",
  bg: "#FAFAFA",
  card: "#ffffff",
  border: "#E5E5E5",
  borderLight: "#F0F0F0",
  text: "#111111",
  textMid: "#555555",
  textLight: "#888888",
  textFaint: "#BBBBBB",
  accent: "#C4161C",
};

function AccentBar({ height = 4, style }) {
  return (
    <div style={{
      height, width: "100%",
      background: `linear-gradient(90deg, ${C.red} 0%, ${C.redDark} 100%)`,
      ...style,
    }} />
  );
}

function Button({ children, onClick, variant = "primary", disabled, style, type = "button" }) {
  const [h, setH] = useState(false);
  const styles = {
    primary: {
      background: h ? C.redDark : C.red,
      color: C.white,
      boxShadow: h ? `0 6px 20px ${C.red}30` : `0 2px 8px ${C.red}20`,
    },
    dark: {
      background: h ? "#222" : C.black,
      color: C.white,
      boxShadow: h ? "0 6px 20px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.2)",
    },
    ghost: {
      background: h ? "#f5f5f5" : "transparent",
      color: C.text,
      border: `1.5px solid ${C.border}`,
    },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: "13px 28px", borderRadius: "10px", border: "none",
        fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "14px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.25s ease",
        transform: h && !disabled ? "translateY(-1px)" : "none",
        opacity: disabled ? 0.5 : 1, letterSpacing: "0.2px",
        ...styles[variant], ...style,
      }}
    >{children}</button>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, required, options, style }) {
  const [f, setF] = useState(false);
  const base = {
    width: "100%", padding: "12px 16px", borderRadius: "10px",
    border: `1.5px solid ${f ? C.red : C.border}`,
    background: C.white, color: C.text,
    fontFamily: "'Outfit', sans-serif", fontSize: "14px",
    outline: "none", transition: "all 0.2s ease",
    boxShadow: f ? `0 0 0 3px ${C.red}12` : "none",
    boxSizing: "border-box",
  };
  return (
    <div style={{ marginBottom: "18px", ...style }}>
      {label && (
        <label style={{
          display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600,
          color: C.textMid, fontFamily: "'Outfit', sans-serif",
        }}>
          {label} {required && <span style={{ color: C.red }}>*</span>}
        </label>
      )}
      {type === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{
            ...base, cursor: "pointer", appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23888888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
          }}>
          <option value="">{placeholder || "Select..."}</option>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setF(true)} onBlur={() => setF(false)}
          placeholder={placeholder} rows={3}
          style={{ ...base, resize: "vertical" }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setF(true)} onBlur={() => setF(false)}
          placeholder={placeholder} required={required} style={base} />
      )}
    </div>
  );
}

function Section({ title, color = C.red }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "28px 0 16px" }}>
      <div style={{ width: "4px", height: "20px", borderRadius: "2px", background: color }} />
      <span style={{
        fontSize: "14px", fontWeight: 700, color: C.text,
        fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "1px",
      }}>{title}</span>
    </div>
  );
}

function Card({ children, style, hover, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)}
      style={{
        background: C.card, borderRadius: "16px",
        border: `1px solid ${h ? C.red + "40" : C.border}`,
        boxShadow: h
          ? `0 12px 40px rgba(0,0,0,0.08), 0 0 0 1px ${C.red}15`
          : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        transition: "all 0.3s ease",
        transform: h ? "translateY(-3px)" : "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >{children}</div>
  );
}

function Nav({ page, setPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { key: "home", label: "Home" },
    { key: "team", label: "Teams" },
    { key: "player", label: "Players" },
    { key: "admin", label: "Admin" },
  ];

  return (
    <>
      <AccentBar height={3} style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 101 }} />
      <nav style={{
        position: "fixed", top: 3, left: 0, right: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          maxWidth: "1100px", margin: "0 auto", padding: "8px 16px", minHeight: "60px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", minWidth: 0 }}
            onClick={() => { setPage("home"); setMenuOpen(false); }}>
            <img src="/assets/afs-logo.png" alt="AFS Logo" style={{ height: "40px", width: "40px", borderRadius: "8px", flexShrink: 0 }} />
            <span style={{
              fontSize: "14px", fontWeight: 700, color: C.black, fontFamily: "'Outfit', sans-serif",
              borderLeft: `2px solid ${C.red}`, paddingLeft: "10px", marginLeft: "2px",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>Atlas Flag Series</span>
          </div>

          {/* Desktop nav links */}
          <div className="nav-desktop" style={{ display: "flex", gap: "2px" }}>
            {navItems.map(item => (
              <button key={item.key} onClick={() => setPage(item.key)}
                style={{
                  padding: "8px 16px", borderRadius: "8px", border: "none",
                  background: page === item.key ? `${C.red}0d` : "transparent",
                  color: page === item.key ? C.red : C.textLight,
                  fontFamily: "'Outfit', sans-serif", fontWeight: 500, fontSize: "13px",
                  cursor: "pointer", transition: "all 0.2s ease",
                }}>
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            style={{
              display: "none", background: "none", border: "none", cursor: "pointer",
              padding: "8px", fontSize: "22px", color: C.text, lineHeight: 1,
            }}>
            {menuOpen ? "\u2715" : "\u2630"}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="nav-mobile" style={{
            display: "none", padding: "8px 16px 16px",
            borderTop: `1px solid ${C.border}`, background: "rgba(255,255,255,0.98)",
          }}>
            {navItems.map(item => (
              <button key={item.key} onClick={() => { setPage(item.key); setMenuOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "12px 16px", borderRadius: "8px", border: "none",
                  background: page === item.key ? `${C.red}0d` : "transparent",
                  color: page === item.key ? C.red : C.textMid,
                  fontFamily: "'Outfit', sans-serif", fontWeight: 500, fontSize: "15px",
                  cursor: "pointer", transition: "all 0.2s ease", marginBottom: "2px",
                }}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}

function Home({ setPage }) {
  const [v, setV] = useState(false);
  useEffect(() => { setTimeout(() => setV(true), 80); }, []);

  return (
    <div style={{
      minHeight: "100vh", padding: "110px 16px 80px", background: C.bg,
      opacity: v ? 1 : 0, transform: v ? "none" : "translateY(20px)",
      transition: "all 0.6s ease",
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        {/* AFS Logo hero */}
        <div style={{ margin: "0 auto 28px" }}>
          <img src="/assets/afs-logo.png" alt="Atlas Flag Series" style={{
            width: "140px", height: "140px", borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }} />
        </div>

        <div style={{
          display: "inline-flex", padding: "5px 14px", borderRadius: "100px",
          background: `${C.red}0a`, border: `1px solid ${C.red}20`,
          fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 600,
          color: C.red, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "20px",
        }}>Registration Open</div>

        <h1 style={{
          fontFamily: "'Outfit', sans-serif", fontSize: "clamp(40px, 7vw, 68px)",
          fontWeight: 900, margin: "0 0 4px", lineHeight: 1.05,
          color: C.black, letterSpacing: "-1px",
        }}>
          Autumn Bowl
        </h1>
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: "clamp(24px, 4vw, 40px)",
          fontWeight: 800, color: C.red, margin: "0 0 16px", lineHeight: 1.2,
        }}>
          2026
        </div>
        <div style={{
          display: "inline-flex", padding: "4px 12px", borderRadius: "100px",
          background: `${C.black}08`, border: `1px solid ${C.border}`,
          fontFamily: "'Outfit', sans-serif", fontSize: "11px", fontWeight: 500,
          color: C.textLight, letterSpacing: "0.5px", marginBottom: "24px",
        }}>Atlas Flag Series</div>
        <p style={{
          fontFamily: "'Outfit', sans-serif", fontSize: "16px", color: C.textMid,
          maxWidth: "460px", margin: "0 auto 48px", lineHeight: 1.7,
        }}>
          Official registration portal for teams and players. Join the Autumn Bowl 2026 tournament.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "20px", maxWidth: "640px", margin: "0 auto" }}>
          <Card hover onClick={() => setPage("team")} style={{ padding: "36px 28px", textAlign: "left" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "12px", marginBottom: "18px",
              background: `${C.red}0c`, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 700,
              color: C.black, margin: "0 0 8px",
            }}>Team Registration</h3>
            <p style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "13px",
              color: C.textLight, lineHeight: 1.6, margin: "0 0 20px",
            }}>Register your team for the Autumn Bowl. Includes PayFast payment.</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "20px", color: C.red }}>R3,000</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "13px", color: C.red }}>Register &rarr;</span>
            </div>
          </Card>

          <Card hover onClick={() => setPage("player")} style={{ padding: "36px 28px", textAlign: "left" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "12px", marginBottom: "18px",
              background: `${C.black}08`, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 700,
              color: C.black, margin: "0 0 8px",
            }}>Player Registration</h3>
            <p style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "13px",
              color: C.textLight, lineHeight: 1.6, margin: "0 0 20px",
            }}>Register as a player for the Autumn Bowl with photo and position details.</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "20px", color: C.black }}>Free</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "13px", color: C.black }}>Register &rarr;</span>
            </div>
          </Card>
        </div>

        <div style={{
          display: "flex", justifyContent: "center", gap: "40px", marginTop: "56px",
          padding: "20px 0", borderTop: `1px solid ${C.border}`, flexWrap: "wrap",
        }}>
          {[
            { label: "Event", value: "Autumn Bowl" },
            { label: "Division", value: "Adult Mixed" },
            { label: "Season Fee", value: "R3,000" },
            { label: "Sport", value: "Flag Football" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "16px", color: C.black }}>{s.value}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "11px", color: C.textFaint, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamReg({ onSubmit }) {
  const [f, setF] = useState({
    teamName: "", managerName: "", managerEmail: "", managerPhone: "",
    numPlayers: "", homeGround: "", notes: "", terms: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [teamDbId, setTeamDbId] = useState(null);
  const [loading, setLoading] = useState(false);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    const errors = validateTeamForm(f);
    if (errors.length > 0) return alert(errors.join('\n'));
    setLoading(true);
    try {
      const sanitized = sanitizeObject(f);
      const result = await onSubmit({ ...sanitized, status: "Pending Payment", date: new Date().toISOString() });
      if (result?.id) {
        setTeamDbId(result.id);
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", padding: "110px 16px 80px", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: "520px", width: "100%", overflow: "hidden" }}>
          <AccentBar height={4} />
          <div style={{ padding: "clamp(24px, 5vw, 48px) clamp(16px, 4vw, 40px)", textAlign: "center" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%", margin: "0 auto 20px",
              background: `${C.red}10`, display: "flex", alignItems: "center", justifyContent: "center",
              color: C.red, fontSize: "24px", fontWeight: 800,
            }}>&#10003;</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "24px", fontWeight: 800, color: C.black, margin: "0 0 10px" }}>
              Registration Saved
            </h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "14px", color: C.textMid, lineHeight: 1.7, margin: "0 0 28px" }}>
              <strong>{f.teamName}</strong> has been registered. Complete payment below to confirm your spot.
            </p>

            <Section title="Option 1: Pay Online" color={C.red} />
            <form name="PayFastPayNowForm" action="https://payment.payfast.io/eng/process" method="post" target="_blank">
              <input required type="hidden" name="cmd" value="_paynow" />
              <input required type="hidden" name="receiver" value="33250683" />
              <input type="hidden" name="m_payment_id" value={teamDbId || ""} />
              <input type="hidden" name="return_url" value="https://www.atlasflagseries.co.za/" />
              <input type="hidden" name="notify_url" value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payfast-itn`} />
              <input required type="hidden" name="amount" value="3000" />
              <input required type="hidden" name="item_name" maxLength="255" value="Autumn Bowl" />
              <input type="hidden" name="item_description" maxLength="255" value={`AFS Autumn Bowl entry - ${sanitize(f.teamName)}`} />
              <button type="submit" style={{
                width: "100%", padding: "14px", background: C.white, border: `1.5px solid ${C.border}`,
                borderRadius: "10px", cursor: "pointer", transition: "all 0.2s ease",
                display: "flex", justifyContent: "center", alignItems: "center",
              }}>
                <img src="https://my.payfast.io/images/buttons/BuyNow/Primary-Large-BuyNow.png" alt="Buy Now with PayFast" style={{ height: "32px" }} />
              </button>
            </form>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "11px", color: C.textFaint, marginTop: "8px", textAlign: "center" }}>
              Instant confirmation via PayFast
            </p>

            <div style={{
              marginTop: "28px", padding: "20px", borderRadius: "12px",
              background: C.bg, border: `1px solid ${C.border}`,
            }}>
              <p style={{
                fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: C.textMid,
                lineHeight: 1.7, margin: "0 0 18px", textAlign: "center",
              }}>
                In case the above processor does not work, please transfer the funds into the banking details below:
              </p>

              <div style={{
                borderRadius: "10px", border: `1px solid ${C.border}`,
                overflow: "hidden", background: C.white,
              }}>
                <div style={{
                  padding: "14px 16px", background: C.white, borderBottom: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <img src="/assets/acg-logo.png" alt="Atlas Consulting Group" style={{ height: "24px", width: "24px", borderRadius: "4px", objectFit: "contain" }} />
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 600, color: C.black }}>
                    Atlas Consulting Group
                  </span>
                </div>
                <div style={{ padding: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "auto" }}>
                    <tbody>
                      {[
                        { label: "Bank", value: "FNB / RMB" },
                        { label: "Account Holder", value: "Atlas Consulting Group South Africa (Pty) Ltd" },
                        { label: "Account Type", value: "Gold Business Account" },
                        { label: "Account Number", value: "63148559652" },
                        { label: "Branch Code", value: "250655" },
                        { label: "Amount", value: "R3,000.00" },
                        { label: "Reference", value: `${sanitize(f.teamName).substring(0, 3).toUpperCase() || "TEAM"}-FEE` },
                      ].map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < 6 ? `1px solid ${C.border}` : "none" }}>
                          <td style={{
                            padding: "10px 12px", fontFamily: "'Outfit', sans-serif", fontSize: "12px",
                            fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.5px",
                            whiteSpace: "nowrap", width: "140px", verticalAlign: "top",
                          }}>{row.label}</td>
                          <td style={{
                            padding: "10px 12px", fontFamily: "'Outfit', sans-serif", fontSize: "13px",
                            fontWeight: row.label === "Amount" || row.label === "Reference" ? 700 : 500,
                            color: row.label === "Amount" ? C.red : row.label === "Reference" ? C.black : C.textMid,
                            wordBreak: "break-word",
                          }}>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p style={{
                fontFamily: "'Outfit', sans-serif", fontSize: "12px", color: C.textMid,
                lineHeight: 1.6, margin: "14px 0 0", textAlign: "center",
              }}>
                Please email proof of payment to <strong style={{ color: C.black }}>info@atlascg.co.za</strong>
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "110px 16px 80px", background: C.bg }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "28px", fontWeight: 800, color: C.black, margin: "0 0 6px" }}>
            Autumn Bowl &middot; Team Registration
          </h1>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "14px", color: C.textLight }}>
            Adult Mixed Division &middot; R3,000 registration fee
          </p>
        </div>

        <Card style={{ overflow: "hidden" }}>
          <AccentBar height={3} />
          <div style={{ padding: "clamp(16px, 4vw, 32px)" }}>
            <Section title="Team Information" color={C.red} />
            <Input label="Team Name" value={f.teamName} onChange={v => s("teamName", v)} required placeholder="e.g. Joburg Jaguars" />
            <Input label="Home Ground / Venue" value={f.homeGround} onChange={v => s("homeGround", v)} placeholder="e.g. Wanderers Stadium" />
            <Input label="Expected Number of Players" type="number" value={f.numPlayers} onChange={v => s("numPlayers", v)} placeholder="e.g. 12" />

            <Section title="Manager / Contact" color={C.black} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: "0 14px" }}>
              <Input label="Full Name" value={f.managerName} onChange={v => s("managerName", v)} required placeholder="John Smith" />
              <Input label="Email" type="email" value={f.managerEmail} onChange={v => s("managerEmail", v)} required placeholder="john@example.com" />
              <Input label="Phone" type="tel" value={f.managerPhone} onChange={v => s("managerPhone", v)} required placeholder="+27 82 123 4567" />
            </div>

            <Section title="Additional" color={C.textLight} />
            <Input label="Notes" type="textarea" value={f.notes} onChange={v => s("notes", v)} placeholder="Anything else we should know..." />

            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px", margin: "20px 0",
              padding: "14px", borderRadius: "10px", background: "#f8f8f8",
            }}>
              <input type="checkbox" checked={f.terms} onChange={e => s("terms", e.target.checked)}
                style={{ marginTop: "2px", accentColor: C.red, width: "16px", height: "16px" }} />
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: C.textMid, lineHeight: 1.6 }}>
                I acknowledge the risks inherent in flag football and agree to the Atlas Flag Series rules, code of conduct, and liability waiver. I confirm all information provided is accurate and I am authorised to register this team.
              </span>
            </div>

            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px", borderRadius: "10px", margin: "20px 0",
              background: `${C.red}06`, border: `1px solid ${C.red}15`,
            }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "13px", fontWeight: 600, color: C.textMid }}>Registration Fee</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "24px", fontWeight: 800, color: C.red }}>R3,000</span>
            </div>

            <Button variant="primary" onClick={submit} disabled={loading} style={{ width: "100%", padding: "16px", fontSize: "15px" }}>
              {loading ? "Submitting..." : "Continue to Payment \u2192"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlayerReg({ onSubmit, teams }) {
  const OFFPOS = ["Quarterback (QB)", "Wide Receiver (WR)", "Center (C)"];
  const DEFPOS = ["Cornerback (CB)", "Safety (S)", "Rusher", "Middle Linebacker (MLB)"];

  const [f, setF] = useState({
    firstName: "", lastName: "", dob: "", gender: "", nationality: "",
    idNumber: "", email: "", phone: "", emergencyName: "", emergencyPhone: "",
    team: "", offPos: "", defPos: "", medical: "", terms: false,
  });
  const [photo, setPhoto] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  const age = (dob) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const result = validatePhoto(file);
    if (!result.valid) {
      alert(result.error);
      e.target.value = '';
      return;
    }
    const r = new FileReader();
    r.onload = (ev) => setPhoto(ev.target.result);
    r.readAsDataURL(file);
  };

  const submit = async () => {
    const errors = validatePlayerForm(f, photo);
    if (errors.length > 0) return alert(errors.join('\n'));
    setLoading(true);
    try {
      const sanitized = sanitizeObject(f);
      const success = await onSubmit({ ...sanitized, photo, age: age(f.dob), status: "Registered", date: new Date().toISOString() });
      if (success) setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", padding: "110px 16px 80px", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: "440px", width: "100%", overflow: "hidden" }}>
          <AccentBar height={4} />
          <div style={{ padding: "clamp(24px, 5vw, 48px) clamp(16px, 4vw, 40px)", textAlign: "center" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%", margin: "0 auto 20px",
              background: `${C.red}10`, display: "flex", alignItems: "center", justifyContent: "center",
              color: C.red, fontSize: "24px",
            }}>&#10003;</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "24px", fontWeight: 800, color: C.black, margin: "0 0 8px" }}>
              Player Registered
            </h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "14px", color: C.textMid, margin: "0 0 28px" }}>
              Welcome to the Autumn Bowl, {f.firstName}!
            </p>
            <div style={{
              width: "240px", margin: "0 auto", borderRadius: "14px", overflow: "hidden",
              border: `1px solid ${C.border}`, background: C.white,
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}>
              <AccentBar height={4} />
              <div style={{ padding: "24px 20px", textAlign: "center" }}>
                {photo && (
                  <img src={photo} alt="Player" style={{
                    width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover",
                    border: `3px solid ${C.red}40`, margin: "0 auto 14px", display: "block",
                  }} />
                )}
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "17px", fontWeight: 700, color: C.black }}>
                  {f.firstName} {f.lastName}
                </div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "11px", color: C.red, fontWeight: 600, marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {f.team || "Free Agent"}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                  {f.offPos && (
                    <span style={{
                      padding: "3px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 600,
                      background: `${C.red}10`, color: C.red, fontFamily: "'Outfit', sans-serif",
                    }}>OFF &middot; {f.offPos.split("(")[0].trim()}</span>
                  )}
                  {f.defPos && (
                    <span style={{
                      padding: "3px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 600,
                      background: `${C.black}10`, color: C.black, fontFamily: "'Outfit', sans-serif",
                    }}>DEF &middot; {f.defPos.split("(")[0].trim()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "110px 16px 80px", background: C.bg }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "28px", fontWeight: 800, color: C.black, margin: "0 0 6px" }}>
            Autumn Bowl &middot; Player Registration
          </h1>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "14px", color: C.textLight }}>
            Adult Mixed Division &middot; Photo required for player card
          </p>
        </div>

        <Card style={{ overflow: "hidden" }}>
          <AccentBar height={3} />
          <div style={{ padding: "clamp(16px, 4vw, 32px)" }}>
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div onClick={() => ref.current?.click()} style={{
                width: "100px", height: "100px", borderRadius: "50%", margin: "0 auto",
                border: `2px dashed ${photo ? C.red : C.border}`,
                overflow: "hidden", cursor: "pointer", transition: "all 0.2s ease",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: photo ? "none" : "#f8f8f8",
              }}>
                {photo ? (
                  <img src={photo} alt="Player" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "2px" }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "9px", color: C.textFaint }}>Upload</div>
                  </div>
                )}
              </div>
              <input ref={ref} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "11px", color: C.textFaint, marginTop: "6px" }}>
                Headshot for player card * (JPG/PNG, max {PHOTO_MAX_SIZE_MB}MB)
              </div>
            </div>

            <Section title="Personal Details" color={C.red} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: "0 14px" }}>
              <Input label="First Name" value={f.firstName} onChange={v => s("firstName", v)} required placeholder="John" />
              <Input label="Last Name" value={f.lastName} onChange={v => s("lastName", v)} required placeholder="Smith" />
              <Input label="Date of Birth" type="date" value={f.dob} onChange={v => s("dob", v)} required />
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: C.textMid, fontFamily: "'Outfit', sans-serif" }}>Age</label>
                <div style={{
                  padding: "12px 16px", borderRadius: "10px", border: `1.5px solid ${C.border}`,
                  background: "#f8f8f8", color: f.dob ? C.red : C.textFaint,
                  fontFamily: "'Outfit', sans-serif", fontSize: "14px", fontWeight: f.dob ? 600 : 400,
                }}>
                  {f.dob ? `${age(f.dob)} years old` : "Auto-calculated"}
                </div>
              </div>
              <Input label="Gender" type="select" value={f.gender} onChange={v => s("gender", v)} required options={["Male", "Female", "Non-binary", "Prefer not to say"]} />
              <Input label="Nationality" value={f.nationality} onChange={v => s("nationality", v)} placeholder="South African" />
            </div>
            <Input label="ID / Passport Number" value={f.idNumber} onChange={v => s("idNumber", v)} placeholder="9501015800083" />

            <Section title="Contact" color={C.black} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: "0 14px" }}>
              <Input label="Email" type="email" value={f.email} onChange={v => s("email", v)} required placeholder="john@email.com" />
              <Input label="Phone" type="tel" value={f.phone} onChange={v => s("phone", v)} required placeholder="+27 82 123 4567" />
              <Input label="Emergency Contact" value={f.emergencyName} onChange={v => s("emergencyName", v)} placeholder="Jane Smith" />
              <Input label="Emergency Phone" type="tel" value={f.emergencyPhone} onChange={v => s("emergencyPhone", v)} placeholder="+27 82 987 6543" />
            </div>

            <Section title="Playing Details" color={C.red} />
            <Input label="Team" type="select" value={f.team} onChange={v => s("team", v)}
              options={[...teams.filter(t => t.team_name).map(t => t.team_name), "Free Agent / Looking for a team"]}
              placeholder="Select your team..." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: "0 14px" }}>
              <Input label="Offensive Position" type="select" value={f.offPos} onChange={v => s("offPos", v)} options={OFFPOS} placeholder="Select..." />
              <Input label="Defensive Position" type="select" value={f.defPos} onChange={v => s("defPos", v)} options={DEFPOS} placeholder="Select..." />
            </div>

            <Section title="Medical" color={C.textLight} />
            <Input label="Medical Conditions / Allergies" type="textarea" value={f.medical} onChange={v => s("medical", v)} placeholder="Anything we should be aware of..." />

            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px", margin: "20px 0",
              padding: "14px", borderRadius: "10px", background: "#f8f8f8",
            }}>
              <input type="checkbox" checked={f.terms} onChange={e => s("terms", e.target.checked)}
                style={{ marginTop: "2px", accentColor: C.red, width: "16px", height: "16px" }} />
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: C.textMid, lineHeight: 1.6 }}>
                I acknowledge the risks inherent in flag football and agree to the Atlas Flag Series rules, code of conduct, and liability waiver. I confirm all information is accurate and consent to my photo being used for player identification.
              </span>
            </div>

            <Button variant="primary" onClick={submit} disabled={loading} style={{ width: "100%", padding: "16px", fontSize: "15px" }}>
              {loading ? "Submitting..." : "Complete Registration \u2192"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Admin({ teams, players }) {
  const [auth, setAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState("teams");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuth(true);
    });
  }, []);

  const handleLogin = async () => {
    if (!isValidEmail(email)) { setAuthError("Please enter a valid email."); return; }
    if (!pw) { setAuthError("Please enter your password."); return; }
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: sanitize(email), password: pw });
    setAuthLoading(false);
    if (error) {
      setAuthError("Invalid credentials. Contact AFS admin for access.");
    } else {
      setAuth(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuth(false);
    setEmail("");
    setPw("");
  };

  if (!auth) {
    return (
      <div style={{ minHeight: "100vh", padding: "110px 16px 80px", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: "380px", width: "100%", overflow: "hidden" }}>
          <AccentBar height={3} />
          <div style={{ padding: "40px", textAlign: "center" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px" }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "22px", fontWeight: 800, color: C.black, margin: "0 0 6px" }}>Admin Access</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: C.textLight, margin: "0 0 24px" }}>Sign in with your admin account</p>
            {authError && (
              <div style={{
                padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
                background: `${C.red}10`, border: `1px solid ${C.red}30`,
                fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: C.red, textAlign: "left",
              }}>{authError}</div>
            )}
            <Input type="email" value={email} onChange={setEmail} placeholder="admin@atlasflagseries.co.za" label="Email" />
            <Input type="password" value={pw} onChange={setPw} placeholder="Password" label="Password" />
            <Button variant="primary" onClick={handleLogin} disabled={authLoading} style={{ width: "100%" }}>
              {authLoading ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const ft = teams.filter(t => (t.team_name || '').toLowerCase().includes(search.toLowerCase()) || `${t.coach_first_name || ''} ${t.coach_last_name || ''}`.toLowerCase().includes(search.toLowerCase()));
  const fp = players.filter(p => `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(search.toLowerCase()) || (p.email || "").toLowerCase().includes(search.toLowerCase()));

  const thStyle = {
    padding: "12px 18px", textAlign: "left", fontFamily: "'Outfit', sans-serif",
    fontSize: "11px", fontWeight: 700, color: C.textFaint,
    textTransform: "uppercase", letterSpacing: "1px", borderBottom: `1px solid ${C.border}`,
  };
  const tdStyle = { padding: "12px 18px", fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: C.textMid };

  return (
    <div style={{ minHeight: "100vh", padding: "110px 16px 80px", background: C.bg }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "28px", fontWeight: 800, color: C.black, margin: "0 0 6px" }}>Dashboard</h1>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "14px", color: C.textLight }}>Manage registrations</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} style={{ fontSize: "13px", padding: "8px 18px" }}>
            Sign Out
          </Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: "14px", marginBottom: "28px" }}>
          {[
            { label: "Teams", value: teams.length, color: C.red },
            { label: "Players", value: players.length, color: C.black },
            { label: "Pending", value: teams.filter(t => t.status === "Pending Payment").length, color: C.redLight },
            { label: "Revenue", value: `R${(teams.length * 3000).toLocaleString()}`, color: C.charcoal },
          ].map((st, i) => (
            <Card key={i} style={{ padding: "22px" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "11px", color: C.textFaint, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>{st.label}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "26px", fontWeight: 800, color: st.color }}>{st.value}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ display: "flex", gap: "4px", background: "#f0f0f0", borderRadius: "10px", padding: "3px", flexWrap: "wrap" }}>
            {["teams", "players"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "8px 20px", borderRadius: "8px", border: "none",
                background: tab === t ? C.white : "transparent",
                color: tab === t ? C.black : C.textLight,
                fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "13px",
                cursor: "pointer", transition: "all 0.2s ease",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                textTransform: "capitalize",
              }}>{t} ({t === "teams" ? teams.length : players.length})</button>
            ))}
          </div>
          <div style={{ width: "100%", maxWidth: "260px", minWidth: "160px" }}>
            <Input value={search} onChange={setSearch} placeholder="Search..." style={{ marginBottom: 0 }} />
          </div>
        </div>

        <Card style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            {tab === "teams" ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Team", "Coach", "Email", "Phone", "City", "Position", "Date"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {ft.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...tdStyle, padding: "48px", textAlign: "center", color: C.textFaint }}>No teams registered yet</td></tr>
                  ) : ft.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 ? "#fafafa" : C.white }}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: C.black }}>{t.team_name}</td>
                      <td style={tdStyle}>{t.coach_first_name} {t.coach_last_name}</td>
                      <td style={tdStyle}>{t.coach_email}</td>
                      <td style={tdStyle}>{t.coach_phone}</td>
                      <td style={tdStyle}>{t.city || "\u2014"}</td>
                      <td style={tdStyle}>
                        {t.coach_position && <span style={{
                          padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                          background: `${C.red}10`, color: C.red,
                          fontFamily: "'Outfit', sans-serif",
                        }}>{t.coach_position}</span>}
                      </td>
                      <td style={{ ...tdStyle, fontSize: "12px", color: C.textFaint }}>{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Player", "DOB", "Phone", "ID Number", "Offense", "Defense", "Email", "Date"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {fp.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...tdStyle, padding: "48px", textAlign: "center", color: C.textFaint }}>No players registered yet</td></tr>
                  ) : fp.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 ? "#fafafa" : C.white }}>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {p.photo_url && <img src={p.photo_url} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />}
                          <span style={{ fontWeight: 600, color: C.black }}>{p.first_name} {p.last_name}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>{p.dob || "\u2014"}</td>
                      <td style={tdStyle}>{p.phone || "\u2014"}</td>
                      <td style={tdStyle}>{p.id_number || "\u2014"}</td>
                      <td style={tdStyle}>
                        {p.off_position && <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "11px", background: `${C.red}10`, color: C.red, fontWeight: 600 }}>{p.off_position.split("(")[0].trim()}</span>}
                      </td>
                      <td style={tdStyle}>
                        {p.def_position && <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "11px", background: `${C.black}10`, color: C.black, fontWeight: 600 }}>{p.def_position.split("(")[0].trim()}</span>}
                      </td>
                      <td style={tdStyle}>{p.email}</td>
                      <td style={{ ...tdStyle, fontSize: "12px", color: C.textFaint }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data: t, error: tErr } = await supabase.from('afs_teams').select('*');
        if (tErr) throw tErr;
        if (t) setTeams(t);
      } catch {
        // Silently fail - data will load when admin authenticates
      }
      try {
        const { data: p, error: pErr } = await supabase.from('afs_players').select('*');
        if (pErr) throw pErr;
        if (p) setPlayers(p);
      } catch {
        // Silently fail - data will load when admin authenticates
      }
    })();
  }, []);

  const handleTeamReg = async (t) => {
    t.status = "Pending Payment";
    const { terms, ...formData } = t;
    try {
      const teamId = crypto.randomUUID();
      const nameParts = (formData.managerName || '').trim().split(/\s+/);
      const insertData = {
        id: teamId,
        team_name: formData.teamName,
        city: formData.homeGround || '',
        coach_first_name: nameParts[0] || '',
        coach_last_name: nameParts.slice(1).join(' ') || '',
        coach_email: formData.managerEmail,
        coach_phone: formData.managerPhone,
        bio: formData.notes || '',
      };
      const { error } = await supabase.from('afs_teams').insert([insertData]);
      if (error) { console.error("Team registration error:", error); alert(`Registration failed: ${error.message}`); return null; }
      const result = { ...insertData };
      setTeams(p => [...p, result]);
      return result;
    } catch (err) {
      console.error("Team registration exception:", err);
      alert(`Something went wrong: ${err.message || "Please try again."}`);
    }
    return null;
  };

  const handlePlayerReg = async (p) => {
    p.status = "Registered";
    const { terms, photo: photoData, team: teamName, ...playerData } = p;

    let photoUrl = null;
    if (photoData) {
      try {
        const fileName = `${Date.now()}-${playerData.firstName}-${playerData.lastName}`.replace(/[^a-zA-Z0-9-]/g, '_');
        const base64Response = await fetch(photoData);
        const blob = await base64Response.blob();
        const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        const filePath = `player-photos/${fileName}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('afs_media')
          .upload(filePath, blob, { contentType: blob.type, upsert: false });

        if (uploadError) {
          console.error("Photo upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('afs_media')
            .getPublicUrl(filePath);
          photoUrl = urlData?.publicUrl || filePath;
        }
      } catch (photoErr) {
        console.error("Photo processing error:", photoErr);
      }
    }

    try {
      const matchedTeam = teamName && teamName !== "Free Agent / Looking for a team"
        ? teams.find(t => t.team_name === teamName)
        : null;

      const insertData = {
        first_name: playerData.firstName,
        last_name: playerData.lastName,
        email: playerData.email,
        phone: playerData.phone,
        dob: playerData.dob || null,
        id_number: playerData.idNumber || '',
        off_position: playerData.offPos || '',
        def_position: playerData.defPos || '',
        photo_url: photoUrl,
        ...(matchedTeam ? { team_id: matchedTeam.id } : {}),
      };
      const { error } = await supabase.from('afs_players').insert([insertData]);
      if (error) { console.error("Player registration error:", error); alert(`Registration failed: ${error.message}`); return false; }
      setPlayers(prev => [...prev, insertData]);
      return true;
    } catch (err) {
      console.error("Player registration exception:", err);
      alert(`Something went wrong: ${err.message || "Please try again."}`);
    }
    return false;
  };

  return (
    <ErrorBoundary>
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: ${C.bg};
          -webkit-text-size-adjust: 100%;
        }
        ::selection { background: ${C.red}20; }
        img { max-width: 100%; height: auto; }

        @media (min-width: 641px) {
          .nav-desktop { display: flex !important; }
          .nav-hamburger { display: none !important; }
          .nav-mobile { display: none !important; }
        }
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: block !important; }
          .nav-mobile { display: block !important; }
        }

        table { min-width: 600px; }

        @media (max-width: 480px) {
          h1 { font-size: clamp(22px, 6vw, 28px) !important; }
        }
      `}</style>
      <Nav page={page} setPage={setPage} />
      {page === "home" && <Home setPage={setPage} />}
      {page === "team" && <TeamReg onSubmit={handleTeamReg} />}
      {page === "player" && <PlayerReg onSubmit={handlePlayerReg} teams={teams} />}
      {page === "admin" && <Admin teams={teams} players={players} />}
    </div>
    </ErrorBoundary>
  );
}
