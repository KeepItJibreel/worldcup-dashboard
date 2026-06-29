import { useState, useEffect, useCallback } from "react";
const BASE = import.meta.env.BASE_URL;

const C = {
  bg:         "#FAFAFA",
  surface:    "#FFFFFF",
  surfaceAlt: "#F4F4F6",
  border:     "#E2E4EC",
  borderDark: "#C8CBD8",

  usaBlue:    "#002868",
  usaRed:     "#BF0A30",
  canadaRed:  "#FF0000",
  mexicoGreen:"#006847",

  text:       "#0A0E1A",
  textSub:    "#3D4460",
  muted:      "#8B92A9",

  win:        "#006847",
  draw:       "#B8860B",
  loss:       "#BF0A30",
  live:       "#BF0A30",
  liveGlow:   "rgba(191,10,48,0.12)",

  green:      "#006847",
  greenLight: "rgba(0,104,71,0.08)",
  blue:       "#002868",
  blueLight:  "rgba(0,40,104,0.07)",
  red:        "#BF0A30",
};

const FLAG_EMOJI = {
  "Mexico":"🇲🇽","South Africa":"🇿🇦","Czechia":"🇨🇿","Czech Republic":"🇨🇿","Costa Rica":"🇨🇷",
  "Switzerland":"🇨🇭","Canada":"🇨🇦","Qatar":"🇶🇦","Bosnia and Herzegovina":"🇧🇦",
  "Brazil":"🇧🇷","Scotland":"🏴","Morocco":"🇲🇦","Haiti":"🇭🇹",
  "USA":"🇺🇸","United States":"🇺🇸","Australia":"🇦🇺","Paraguay":"🇵🇾",
  "Türkiye":"🇹🇷","Turkey":"🇹🇷",
  "Germany":"🇩🇪","Côte d'Ivoire":"🇨🇮","Ivory Coast":"🇨🇮","Ecuador":"🇪🇨","Curaçao":"🇨🇼",
  "Netherlands":"🇳🇱","Japan":"🇯🇵","Sweden":"🇸🇪","Tunisia":"🇹🇳",
  "Spain":"🇪🇸","Nigeria":"🇳🇬","Cameroon":"🇨🇲","Honduras":"🇭🇳",
  "Portugal":"🇵🇹","DR Congo":"🇨🇩","Democratic Republic of the Congo":"🇨🇩",
  "Congo DR":"🇨🇩","Uzbekistan":"🇺🇿","Colombia":"🇨🇴",
  "Argentina":"🇦🇷","Croatia":"🇭🇷","Saudi Arabia":"🇸🇦","Egypt":"🇪🇬",
  "France":"🇫🇷","Algeria":"🇩🇿","Senegal":"🇸🇳","Bolivia":"🇧🇴",
  "Belgium":"🇧🇪","Uruguay":"🇺🇾","South Korea":"🇰🇷","Iran":"🇮🇷","IR Iran":"🇮🇷",
  "England":"🏴","Ghana":"🇬🇭","Panama":"🇵🇦","Iraq":"🇮🇶",
  "Norway":"🇳🇴","Austria":"🇦🇹","Jordan":"🇯🇴","New Zealand":"🇳🇿",
  "Cape Verde":"🇨🇻",
};

const SHORT_NAME = {
  "Democratic Republic of the Congo": "DR Congo",
  "Bosnia and Herzegovina": "Bosnia & Herz.",
  "Ivory Coast": "Côte d'Ivoire",
};

function teamName(name) {
  return SHORT_NAME[name] || name;
}

const SERIF = "'Georgia', 'Times New Roman', serif";
const SANS  = "'Inter', system-ui, sans-serif";

function LiveBadge() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), 800);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      background:C.liveGlow, border:`1px solid ${C.live}`,
      borderRadius:3, padding:"2px 7px", fontSize:10, fontWeight:700,
      letterSpacing:1.5, color:C.live, fontFamily:SANS }}>
      <span style={{ width:6, height:6, borderRadius:"50%",
        background: on ? C.live : "transparent",
        boxShadow: on ? `0 0 5px ${C.live}` : "none",
        transition:"all 0.3s", flexShrink:0 }} />
      LIVE
    </span>
  );
}

// warning banner
function DataBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div style={{ background:"#FFFBEB", borderBottom:`1px solid #F0D060`,
      padding:"8px 20px", display:"flex", alignItems:"center",
      justifyContent:"space-between", gap:12, fontFamily:SANS,
      fontSize:12, color:"#7A5C00" }}>
      <span>
        ⚠️ Score and standings data is provided by a free, community-maintained API and may be
        slightly delayed or occasionally inaccurate. For critical results, verify with an
        official source.
      </span>
      <button onClick={() => setVisible(false)}
        style={{ background:"none", border:"none", cursor:"pointer",
          color:"#7A5C00", fontSize:16, lineHeight:1, flexShrink:0,
          padding:"0 4px" }}>×</button>
    </div>
  );
}


function MatchPopup({ match, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const isDone = match.finished;
  const homeScorers = Array.isArray(match.home_scorers)
    ? match.home_scorers.filter(Boolean) : [];
  const awayScorers = Array.isArray(match.away_scorers)
    ? match.away_scorers.filter(Boolean) : [];
  const hasScorers = homeScorers.length > 0 || awayScorers.length > 0;
  const hasScore   = match.home_score > 0 || match.away_score > 0;
  const isLive     = !isDone && (match.time_elapsed > 0 || hasScorers || hasScore);
  const isHalftime = !isDone && match.time_elapsed === 0 && (hasScorers || hasScore);
  const score      = isDone || isLive ? `${match.home_score} – ${match.away_score}` : "vs";

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,0.45)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:C.surface, borderRadius:12, width:"100%", maxWidth:440,
          boxShadow:"0 20px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
          border:`1px solid ${C.border}`, overflow:"hidden" }}>

        {/* header stripe — USA blue */}
        <div style={{ background:C.usaBlue, padding:"12px 16px",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)",
            letterSpacing:1.5, fontFamily:SANS, fontWeight:600 }}>
            GROUP {match.group} · MATCHDAY {match.matchday}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {isLive && !isHalftime && <LiveBadge />}
            {isHalftime && (
              <span style={{ fontSize:10, color:C.draw, fontWeight:700,
                letterSpacing:1.5, fontFamily:SANS }}>HALF TIME</span>
            )}
            <button onClick={onClose}
              style={{ background:"none", border:"none",
                color:"rgba(255,255,255,0.6)", fontSize:20, cursor:"pointer",
                lineHeight:1, padding:"0 2px" }}>×</button>
          </div>
        </div>

        {/* scoreline */}
        <div style={{ padding:"28px 20px 24px",
          borderBottom: hasScorers ? `1px solid ${C.border}` : "none",
          background: isDone ? C.surfaceAlt : C.surface }}>
          <div style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:8 }}>

            {/* home team */}
            <div style={{ flex:1, textAlign:"left", minWidth:0 }}>
              <div style={{ fontSize:28 }}>{FLAG_EMOJI[match.home] || "🏳️"}</div>
              <div style={{ fontSize:14, color:C.text, marginTop:6,
                fontWeight:600, fontFamily:SERIF,
                wordBreak:"break-word", lineHeight:1.2 }}>{teamName(match.home)}</div>
            </div>

            {/* score — fixed width so it never wraps */}
            <div style={{ textAlign:"center", flexShrink:0, width:140 }}>
              <div style={{ fontFamily:"'Georgia', serif", fontSize:38,
                fontWeight:700, letterSpacing:2, whiteSpace:"nowrap",
                color: isLive ? C.live : isDone ? C.text : C.muted,
                textShadow: isLive ? `0 0 16px ${C.liveGlow}` : "none" }}>
                {score}
              </div>
              {isLive && !isHalftime && match.time_elapsed > 0 && (
                <div style={{ fontSize:12, color:C.live, marginTop:4,
                  fontWeight:700, fontFamily:SANS }}>{match.time_elapsed}'</div>
              )}
              {isDone && (
                <div style={{ fontSize:10, color:C.muted, marginTop:4,
                  letterSpacing:2, fontFamily:SANS }}>FULL TIME</div>
              )}
              {!isDone && !isLive && (
                <div style={{ fontSize:11, color:C.green, marginTop:4,
                  fontFamily:SANS }}>{match.local_date}</div>
              )}
            </div>

            {/* away team */}
            <div style={{ flex:1, textAlign:"right", minWidth:0 }}>
              <div style={{ fontSize:28 }}>{FLAG_EMOJI[match.away] || "🏳️"}</div>
              <div style={{ fontSize:14, color:C.text, marginTop:6,
                fontWeight:600, fontFamily:SERIF,
                wordBreak:"break-word", lineHeight:1.2 }}>{teamName(match.away)}</div>
            </div>
          </div>
        </div>

        {/* goalscorers */}
        {hasScorers && (
          <div style={{ padding:"18px 20px" }}>
            <div style={{ fontSize:10, color:C.muted, letterSpacing:2,
              marginBottom:14, textAlign:"center", fontFamily:SANS,
              fontWeight:600 }}>GOALSCORERS</div>
            <div style={{ display:"flex", gap:12 }}>
              <div style={{ flex:1 }}>
                {homeScorers.map((s, i) => (
                  <div key={i} style={{ fontSize:13, color:C.text,
                    marginBottom:7, display:"flex", alignItems:"center",
                    gap:8, fontFamily:SERIF }}>
                    <span style={{ fontSize:14, flexShrink:0 }}>⚽</span>
                    <span style={{ lineHeight:1.3 }}>{s}</span>
                  </div>
                ))}
              </div>
              {awayScorers.length > 0 && (
                <div style={{ width:1, background:C.border, flexShrink:0 }} />
              )}
              <div style={{ flex:1 }}>
                {awayScorers.map((s, i) => (
                  <div key={i} style={{ fontSize:13, color:C.text,
                    marginBottom:7, display:"flex", alignItems:"center",
                    justifyContent:"flex-end", gap:8, fontFamily:SERIF }}>
                    <span style={{ lineHeight:1.3, textAlign:"right" }}>{s}</span>
                    <span style={{ fontSize:14, flexShrink:0 }}>⚽</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isDone && !isLive && (
          <div style={{ padding:"20px", textAlign:"center",
            color:C.muted, fontSize:13, fontFamily:SANS }}>
            Match hasn't started yet.
          </div>
        )}
        {(isDone || isLive) && !hasScorers && (
          <div style={{ padding:"20px", textAlign:"center",
            color:C.muted, fontSize:13, fontFamily:SANS }}>
            No goalscorer data available.
          </div>
        )}
      </div>
    </div>
  );
}


function GroupTable({ group, rows }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:8, overflow:"hidden",
      boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ padding:"9px 14px", display:"flex",
        justifyContent:"space-between", alignItems:"center",
        background:C.usaBlue }}>
        <span style={{ fontFamily:SERIF, fontWeight:700, letterSpacing:1,
          color:"#FFFFFF", fontSize:14 }}>Group {group}</span>
        <span style={{ fontFamily:"'Georgia', monospace", fontSize:10,
          color:"rgba(255,255,255,0.55)", display:"flex", gap:12, flexShrink:0 }}>
          <span style={{ width:16, textAlign:"center" }}>MP</span>
          <span style={{ width:16, textAlign:"center" }}>W</span>
          <span style={{ width:16, textAlign:"center" }}>D</span>
          <span style={{ width:16, textAlign:"center" }}>L</span>
          <span style={{ width:24, textAlign:"center" }}>GD</span>
          <span style={{ width:24, textAlign:"right" }}>PTS</span>
        </span>
      </div>
      {rows.map((r, i) => (
        <div key={r.team} style={{ display:"flex", alignItems:"center",
          padding:"9px 14px",
          borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none",
          background: i < 2 ? C.greenLight : C.surface }}>
          <span style={{ width:18, fontSize:11, fontWeight:700,
            color: i < 2 ? C.green : C.muted, fontFamily:SANS }}>{i+1}</span>
          <span style={{ flex:1, fontSize:13, color:C.text,
            display:"flex", alignItems:"center", gap:7, fontFamily:SERIF }}>
            <span>{FLAG_EMOJI[r.team] || "🏳️"}</span>{r.team}
          </span>
          <span style={{ fontFamily:"'Georgia', monospace", fontSize:12,
            color:C.textSub, display:"flex", gap:12, flexShrink:0 }}>
            <span style={{ width:16, textAlign:"center" }}>{r.mp}</span>
            <span style={{ width:16, textAlign:"center", color:C.win }}>{r.w}</span>
            <span style={{ width:16, textAlign:"center", color:C.draw }}>{r.d}</span>
            <span style={{ width:16, textAlign:"center", color:C.loss }}>{r.l}</span>
            <span style={{ width:24, textAlign:"center",
              color: r.gd >= 0 ? C.green : C.loss }}>
              {r.gd > 0 ? "+" : ""}{r.gd}
            </span>
            <span style={{ width:24, textAlign:"right", color:C.text,
              fontWeight:700 }}>{r.points}</span>
          </span>
        </div>
      ))}
    </div>
  );
}


function MatchCard({ match, onClick }) {
  const isDone = match.finished;
  const hasScore   = match.home_score > 0 || match.away_score > 0;
  const isLive     = !isDone && match.time_elapsed > 0;
  const isHalftime = !isDone && match.time_elapsed === 0 && hasScore;
  const isInProgress = isLive || isHalftime;
  const score = isDone || isInProgress
    ? `${match.home_score}–${match.away_score}` : null;

  const borderColor = isLive ? C.live : isHalftime ? C.draw : C.border;

  return (
    <div onClick={onClick} style={{ background:C.surface,
      border:`1.5px solid ${borderColor}`,
      borderRadius:8, padding:"13px 14px", cursor:"pointer",
      boxShadow: isLive
        ? `0 0 0 3px ${C.liveGlow}, 0 2px 8px rgba(0,0,0,0.07)`
        : "0 1px 4px rgba(0,0,0,0.06)",
      transition:"transform 0.12s, box-shadow 0.12s" }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = isLive
          ? `0 0 0 3px ${C.liveGlow}, 0 2px 8px rgba(0,0,0,0.07)`
          : "0 1px 4px rgba(0,0,0,0.06)";
      }}>

      {/* top row */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:10, color:C.muted, letterSpacing:1,
          fontFamily:SANS, fontWeight:600 }}>
          {match.group} · MD{match.matchday}
        </span>
        {isLive ? <LiveBadge /> :
          isHalftime ? (
            <span style={{ fontSize:10, color:C.draw, fontWeight:700,
              letterSpacing:1.5, fontFamily:SANS }}>HT</span>
          ) : (
            <span style={{ fontSize:10, fontFamily:SANS, fontWeight:600,
              color: isDone ? C.muted : C.green }}>
              {isDone ? "FT" : match.local_date}
            </span>
          )}
      </div>

      {/* teams + score */}
      <div style={{ display:"flex", alignItems:"center",
        justifyContent:"space-between", gap:4 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18 }}>{FLAG_EMOJI[match.home] || "🏳️"}</div>
          <div style={{ fontSize:12, color:C.text, marginTop:3,
            fontFamily:SERIF, lineHeight:1.25,
            overflow:"hidden", textOverflow:"ellipsis",
            display:"-webkit-box", WebkitLineClamp:2,
            WebkitBoxOrient:"vertical" }}>{teamName(match.home)}</div>
        </div>

        <div style={{ textAlign:"center", flexShrink:0, minWidth:60 }}>
          {score
            ? <div style={{ fontFamily:SERIF, fontSize:22, fontWeight:700,
                letterSpacing:1, whiteSpace:"nowrap",
                color: isInProgress ? C.live : C.text }}>
                {score}
              </div>
            : <div style={{ fontSize:14, color:C.muted, fontFamily:SANS }}>vs</div>}
          {isLive && (
            <div style={{ fontSize:10, color:C.live, marginTop:2,
              fontFamily:SANS, fontWeight:600 }}>
              {match.time_elapsed}'
            </div>
          )}
        </div>

        <div style={{ flex:1, minWidth:0, textAlign:"right" }}>
          <div style={{ fontSize:18 }}>{FLAG_EMOJI[match.away] || "🏳️"}</div>
          <div style={{ fontSize:12, color:C.text, marginTop:3,
            fontFamily:SERIF, lineHeight:1.25,
            overflow:"hidden", textOverflow:"ellipsis",
            display:"-webkit-box", WebkitLineClamp:2,
            WebkitBoxOrient:"vertical" }}>{teamName(match.away)}</div>
        </div>
      </div>

      <div style={{ marginTop:8, fontSize:10, color:C.muted,
        textAlign:"center", fontFamily:SANS }}>tap for details</div>
    </div>
  );
}


function PredictionCard({ pred }) {
  const total = pred.home_win_pct + pred.away_win_pct;
  const homeW = total > 0 ? Math.round((pred.home_win_pct / total) * 100) : 50;
  const awayW = 100 - homeW;
  const favour = homeW > awayW ? "home" : homeW < awayW ? "away" : "even";
  const noData = pred.home_mp === 0 || pred.away_mp === 0;

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:8, overflow:"hidden",
      boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
      opacity: noData ? 0.55 : 1 }}>

      {/* group header — Mexico green */}
      <div style={{ background: noData ? C.surfaceAlt : C.mexicoGreen,
        padding:"6px 12px", display:"flex",
        justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:10, color: noData ? C.muted : "rgba(255,255,255,0.8)",
          letterSpacing:1.5, fontFamily:SANS, fontWeight:600 }}>
          GROUP {pred.group}
        </span>
        <span style={{ fontSize:10,
          color: noData ? C.muted : "rgba(255,255,255,0.7)",
          fontFamily:SANS }}>
          {pred.date}
        </span>
      </div>

      <div style={{ padding:"14px 14px 12px" }}>
        {/* teams */}
        <div style={{ display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", marginBottom:14, gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:20 }}>{FLAG_EMOJI[pred.home] || "🏳️"}</div>
            <div style={{ fontSize:13, color:C.text, marginTop:4,
              fontWeight: favour === "home" ? 700 : 400,
              fontFamily:SERIF, lineHeight:1.2 }}>{pred.home}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2,
              fontFamily:SANS }}>
              {pred.home_pts}pts · GD{pred.home_gd >= 0 ? "+" : ""}{pred.home_gd}
            </div>
          </div>
          <div style={{ textAlign:"center", flexShrink:0, paddingTop:2 }}>
            <div style={{ fontSize:12, color:C.muted, fontFamily:SANS,
              letterSpacing:2 }}>VS</div>
          </div>
          <div style={{ flex:1, minWidth:0, textAlign:"right" }}>
            <div style={{ fontSize:20 }}>{FLAG_EMOJI[pred.away] || "🏳️"}</div>
            <div style={{ fontSize:13, color:C.text, marginTop:4,
              fontWeight: favour === "away" ? 700 : 400,
              fontFamily:SERIF, lineHeight:1.2 }}>{pred.away}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2,
              fontFamily:SANS }}>
              {pred.away_pts}pts · GD{pred.away_gd >= 0 ? "+" : ""}{pred.away_gd}
            </div>
          </div>
        </div>

        {noData ? (
          <div style={{ textAlign:"center", fontSize:11, color:C.muted,
            fontStyle:"italic", fontFamily:SANS, padding:"4px 0" }}>
            No form data yet — check back after both teams have played
          </div>
        ) : (
          <>
            <div style={{ height:6, borderRadius:3, overflow:"hidden",
              display:"flex", marginBottom:6 }}>
              <div style={{ width:`${homeW}%`, background:C.usaBlue,
                transition:"width 0.6s ease" }} />
              <div style={{ width:`${awayW}%`, background:C.usaRed,
                transition:"width 0.6s ease" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
              fontSize:12, fontFamily:SANS }}>
              <span style={{ fontWeight: favour === "home" ? 700 : 400,
                color:C.usaBlue }}>{homeW}%</span>
              <span style={{ color:C.muted, fontSize:10 }}>win probability</span>
              <span style={{ fontWeight: favour === "away" ? 700 : 400,
                color:C.usaRed }}>{awayW}%</span>
            </div>
            {favour !== "even" && (
              <div style={{ textAlign:"center", fontSize:11,
                color:C.muted, marginTop:6, fontFamily:SANS }}>
                <span style={{ fontWeight:700,
                  color: favour === "home" ? C.usaBlue : C.usaRed }}>
                  {favour === "home" ? pred.home : pred.away}
                </span>{" "}favoured
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MatchesTab({ liveMatches, halftimeMatches, doneMatches, upcomingMatches, setSelectedMatch }) {
  const [showAllResults, setShowAllResults] = useState(false);
  const PREVIEW = 3;
  const hasMore = doneMatches.length > PREVIEW;
  const visibleDone = showAllResults ? doneMatches : doneMatches.slice(0, PREVIEW);

  return (
    <div>
      {/* LIVE */}
      {liveMatches.length > 0 && (
        <section style={{ marginBottom:32 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <LiveBadge />
            <span style={{ fontSize:12, fontWeight:700, color:C.live,
              letterSpacing:1.5, fontFamily:SANS }}>IN PROGRESS</span>
          </div>
          <div style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
            {liveMatches.map((m, i) => (
              <MatchCard key={i} match={m} onClick={() => setSelectedMatch(m)} />
            ))}
          </div>
        </section>
      )}

      {/* HALF TIME */}
      {halftimeMatches.length > 0 && (
        <section style={{ marginBottom:32 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.draw,
            letterSpacing:1.5, marginBottom:12, fontFamily:SANS }}>
            HALF TIME
          </div>
          <div style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
            {halftimeMatches.map((m, i) => (
              <MatchCard key={i} match={m} onClick={() => setSelectedMatch(m)} />
            ))}
          </div>
        </section>
      )}

      {/* RESULTS — collapsed by default */}
      {doneMatches.length > 0 && (
        <section style={{ marginBottom:32 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted,
            letterSpacing:1.5, marginBottom:12, fontFamily:SANS }}>
            RESULTS
          </div>

          {/* grid with fade overlay when collapsed */}
          <div style={{ position:"relative" }}>
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
              {visibleDone.map((m, i) => (
                <MatchCard key={i} match={m} onClick={() => setSelectedMatch(m)} />
              ))}
            </div>

            {/* fade-out overlay — only shown when collapsed and there are hidden matches */}
            {!showAllResults && hasMore && (
              <div style={{
                position:"absolute", bottom:0, left:0, right:0, height:100,
                background:"linear-gradient(to bottom, transparent, #FAFAFA)",
                pointerEvents:"none"
              }} />
            )}
          </div>

          {/* expand/collapse button */}
          {hasMore && (
            <div style={{ textAlign:"center", marginTop: showAllResults ? 16 : 4 }}>
              <button
                onClick={() => setShowAllResults(v => !v)}
                style={{
                  background:"none",
                  border:`1.5px solid ${C.border}`,
                  borderRadius:6,
                  padding:"7px 20px",
                  fontSize:12,
                  fontFamily:SANS,
                  fontWeight:600,
                  color:C.textSub,
                  cursor:"pointer",
                  transition:"border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.usaBlue;
                  e.currentTarget.style.color = C.usaBlue;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.textSub;
                }}
              >
                {showAllResults
                  ? `▲ Show fewer results`
                  : `▼ Show all ${doneMatches.length} results`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* UPCOMING */}
      {upcomingMatches.length > 0 && (
        <section>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted,
            letterSpacing:1.5, marginBottom:12, fontFamily:SANS }}>
            UPCOMING
          </div>
          <div style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
            {upcomingMatches.map((m, i) => (
              <MatchCard key={i} match={m} onClick={() => setSelectedMatch(m)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab]                   = useState("matches");
  const [groupFilter, setGroupFilter]   = useState("ALL");
  const [predGroup, setPredGroup]       = useState("ALL");
  const [fixtures, setFixtures]         = useState([]);
  const [standings, setStandings]       = useState([]);
  const [predictions, setPredictions]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const loadData = useCallback(() => {
    Promise.all([
      fetch(`${BASE}matches.json`).then(r => r.json()),
      fetch(`${BASE}standings.json`).then(r => r.json()),
      fetch(`${BASE}predictions.json`).then(r => r.json()).catch(() => []),
    ]).then(([matches, stand, preds]) => {
      setFixtures(matches);
      setStandings(stand);
      setPredictions(preds);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load data:", err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const allGroups = [...new Set(standings.map(s => s.group))].sort();
  const predGroups = [...new Set(predictions.map(p => p.group))].sort();

  const groupedStandings = allGroups.reduce((acc, g) => {
    acc[g] = standings.filter(s => s.group === g);
    return acc;
  }, {});

  const liveMatches     = fixtures.filter(f => !f.finished && f.time_elapsed > 0);
  const halftimeMatches = fixtures.filter(f =>
    !f.finished && f.time_elapsed === 0 && (f.home_score > 0 || f.away_score > 0));

  const doneMatches = fixtures
    .filter(f => f.finished)
    .sort((a, b) => new Date(b.local_date) - new Date(a.local_date)); // most recent first

  const upcomingMatches = fixtures
    .filter(f => !f.finished && f.time_elapsed === 0 && f.home_score === 0 && f.away_score === 0)
    .sort((a, b) => new Date(a.local_date) - new Date(b.local_date)); // soonest first

  const sortedPredictions = [...predictions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const filteredPreds = predGroup === "ALL"
    ? sortedPredictions
    : sortedPredictions.filter(p => p.group === predGroup);

  const tabs = ["matches", "groups", "predictions"];

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
        alignItems:"center", justifyContent:"center", fontFamily:SERIF }}>
        <div style={{ color:C.usaBlue, fontSize:16, letterSpacing:2 }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:SANS }}>

      {selectedMatch && (
        <MatchPopup match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}

      {/* ── Dismissible data warning ── */}
      <DataBanner />

      {/* ── Header ── */}
      <div style={{ background:C.surface, borderBottom:`2px solid ${C.usaBlue}` }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 20px" }}>

          {/* top bar — flag stripe */}
          <div style={{ height:4, display:"flex", margin:"0 -20px" }}>
            <div style={{ flex:1, background:C.canadaRed }} />
            <div style={{ flex:1, background:C.usaBlue }} />
            <div style={{ flex:1, background:C.mexicoGreen }} />
          </div>

          {/* title area */}
          <div style={{ padding:"20px 0 0", display:"flex",
            alignItems:"flex-start", justifyContent:"space-between",
            flexWrap:"wrap", gap:12 }}>
            <div>
              <h1 style={{ fontFamily:SERIF, fontSize:26, fontWeight:700,
                margin:0, letterSpacing:0.5, color:C.text, lineHeight:1 }}>
                World Cup{" "}
                <span style={{ color:C.usaBlue }}>2026</span>
              </h1>
              <p style={{ margin:"6px 0 0", fontSize:12, color:C.muted,
                fontFamily:SANS, lineHeight:1.5, maxWidth:480 }}>
                A no-frills live dashboard — scores, standings, and match
                predictions for all 104 games across the USA, Canada &amp; Mexico.
                Fast, clean, no ads.
              </p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10,
              paddingTop:4 }}>
              {liveMatches.length > 0 && <LiveBadge />}
              <span style={{ fontSize:12, color:C.muted, fontFamily:SANS }}>
                {doneMatches.length}/{fixtures.length} played
              </span>
            </div>
          </div>

          {/* tabs */}
          <div style={{ display:"flex", gap:0, marginTop:16 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ background:"none", border:"none",
                  borderBottom: tab === t
                    ? `3px solid ${C.usaBlue}` : "3px solid transparent",
                  padding:"10px 20px", color: tab === t ? C.usaBlue : C.muted,
                  fontWeight: tab === t ? 700 : 400,
                  fontSize:13, cursor:"pointer", letterSpacing:0.5,
                  fontFamily:SANS, transition:"all 0.15s",
                  marginBottom:"-2px" }}>
                {t === "predictions" ? "📊 Predictions"
                  : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 20px 60px" }}>

        {/* MATCHES */}
        {tab === "matches" && (
          <MatchesTab
            liveMatches={liveMatches}
            halftimeMatches={halftimeMatches}
            doneMatches={doneMatches}
            upcomingMatches={upcomingMatches}
            setSelectedMatch={setSelectedMatch}
          />
        )}

        {/* GROUPS */}
        {tab === "groups" && (
          <div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
              {["ALL", ...allGroups].map(g => (
                <button key={g} onClick={() => setGroupFilter(g)}
                  style={{ background: groupFilter === g ? C.usaBlue : C.surface,
                    color: groupFilter === g ? "#FFF" : C.muted,
                    border:`1px solid ${groupFilter === g ? C.usaBlue : C.border}`,
                    borderRadius:4, padding:"4px 12px", fontSize:12,
                    fontWeight:600, cursor:"pointer", fontFamily:SANS,
                    transition:"all 0.15s" }}>
                  {g === "ALL" ? "All Groups" : `Group ${g}`}
                </button>
              ))}
            </div>
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:16 }}>
              {(groupFilter === "ALL" ? allGroups : [groupFilter]).map(g => (
                <GroupTable key={g} group={g} rows={groupedStandings[g] || []} />
              ))}
            </div>
            <p style={{ marginTop:14, fontSize:11, color:C.muted,
              textAlign:"center", fontFamily:SANS }}>
              Top 2 + best 8 third-place teams advance to Round of 32.
            </p>
          </div>
        )}

        {/* PREDICTIONS */}
        {tab === "predictions" && (
          <div>
            {/* explainer */}
            <div style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:8, padding:"14px 16px", marginBottom:16,
              fontSize:13, color:C.textSub, lineHeight:1.7, fontFamily:SANS }}>
              <span style={{ fontFamily:SERIF, fontWeight:700,
                color:C.text }}>How predictions work: </span>
              A logistic regression model trained on historical World Cup group
              stage results (1994–2018). For each upcoming match it computes the
              difference in each team's per-game form — points earned, goal
              difference, goals scored, and goals conceded — from the live 2026
              standings, then outputs a win probability. Predictions update
              automatically after every completed match.
            </div>

            {/* group filter */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
              {["ALL", ...predGroups].map(g => (
                <button key={g} onClick={() => setPredGroup(g)}
                  style={{ background: predGroup === g ? C.mexicoGreen : C.surface,
                    color: predGroup === g ? "#FFF" : C.muted,
                    border:`1px solid ${predGroup === g ? C.mexicoGreen : C.border}`,
                    borderRadius:4, padding:"4px 12px", fontSize:12,
                    fontWeight:600, cursor:"pointer", fontFamily:SANS,
                    transition:"all 0.15s" }}>
                  {g === "ALL" ? "All Groups" : `Group ${g}`}
                </button>
              ))}
            </div>

            {filteredPreds.length === 0 ? (
              <div style={{ textAlign:"center", color:C.muted,
                padding:"60px 0", fontFamily:SANS }}>
                No predictions yet — run{" "}
                <code style={{ color:C.usaBlue }}>py pipeline.py</code> to generate them.
              </div>
            ) : (
              <div style={{ display:"grid",
                gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
                {filteredPreds.map((p, i) => (
                  <PredictionCard key={i} pred={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* footer */}
        <div style={{ marginTop:48, paddingTop:20,
          borderTop:`1px solid ${C.border}`,
          textAlign:"center", fontSize:11, color:C.muted,
          lineHeight:1.8, fontFamily:SANS }}>
          Data:{" "}
          <a href="https://github.com/rezarahiminia/worldcup2026"
            target="_blank" rel="noreferrer"
            style={{ color:C.usaBlue }}>
            worldcup2026 API
          </a>{" "}by Reza Rahiminia (ISC License)
        </div>
      </div>
    </div>
  );
}