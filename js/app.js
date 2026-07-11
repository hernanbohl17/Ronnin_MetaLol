/* ============================================================
   LoL Meta Tracker — SPA con hash routing
   Rutas:
     #/                 → home (pie chart)
     #/lane/JG          → vista de línea
     #/champ/LeeSin     → detalle de campeón
   La data viene de data/data.json (generado por GitHub Actions).
   ============================================================ */

"use strict";

// ------------------------------------------------------------------
// Configuración fija del pool (porcentajes rígidos pedidos)
// ------------------------------------------------------------------
const LANES = [
  { id: "TOP",  label: "Top Lane",  pct: 5,  color: "#C89B3C" },
  { id: "JG",   label: "Jungla",    pct: 25, color: "#0AC8B9" },
  { id: "MID",  label: "Mid Lane",  pct: 25, color: "#5383E8" },
  { id: "ADC",  label: "Bot / ADC", pct: 20, color: "#E84057" },
  { id: "SUPP", label: "Soporte",   pct: 25, color: "#9E7CC9" },
];

// Fallback mínimo por si data.json no carga (p. ej. abriendo con file://)
const FALLBACK_POOL = {
  TOP:  ["KSante", "Jayce", "Ambessa"],
  JG:   ["Graves", "LeeSin", "Sylas"],
  MID:  ["Yorick", "Aurora", "Hwei"],
  ADC:  ["Jhin", "Varus", "Zeri"],
  SUPP: ["Bard", "Neeko", "Pyke", "Camille"],
};

const DDRAGON = "https://ddragon.leagueoflegends.com/cdn";

let DATA = null;       // contenido de data.json
let chart = null;      // instancia de Chart.js
let lastLane = "TOP";  // para el botón "volver a la línea"

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);

function ddVersion() {
  return (DATA && DATA.ddragon_version) || "15.13.1";
}

function champSquare(id) {
  return `${DDRAGON}/${ddVersion()}/img/champion/${id}.png`;
}
function champLoading(id) {
  return `${DDRAGON}/img/champion/loading/${id}_0.jpg`;
}
function champSplash(id) {
  return `${DDRAGON}/img/champion/splash/${id}_0.jpg`;
}
function itemIcon(itemId) {
  return `${DDRAGON}/${ddVersion()}/img/item/${itemId}.png`;
}
function runeIcon(path) {
  // data.json guarda la ruta relativa de cada runa (perk) de Data Dragon
  return `https://ddragon.leagueoflegends.com/cdn/img/${path}`;
}

function fmtPct(n) {
  return typeof n === "number" ? `${n.toFixed(1)}%` : "—";
}

function wrClass(n) {
  return typeof n === "number" && n >= 50 ? "wr-up" : "wr-down";
}

function getChampData(champId) {
  return DATA && DATA.champions ? DATA.champions[champId] : null;
}

function laneOf(champId) {
  const pool = (DATA && DATA.pool) || FALLBACK_POOL;
  for (const lane of Object.keys(pool)) {
    if (pool[lane].includes(champId)) return lane;
  }
  return "TOP";
}

// ------------------------------------------------------------------
// Carga de datos
// ------------------------------------------------------------------
async function loadData() {
  try {
    const res = await fetch("data/data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
  } catch (err) {
    console.warn("No se pudo cargar data/data.json, usando fallback.", err);
    DATA = { pool: FALLBACK_POOL, champions: {}, updated_at: null };
  }
  const badge = $("#patch-badge");
  badge.textContent = DATA.updated_at
    ? `KR · patch ${DATA.patch || "?"} · ${new Date(DATA.updated_at).toLocaleDateString("es")}`
    : "Datos de ejemplo (sin actualizar)";
}

// ------------------------------------------------------------------
// HOME: gráfico de pastel
// ------------------------------------------------------------------
function buildChart() {
  const ctx = $("#poolChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: LANES.map((l) => `${l.id} · ${l.pct}%`),
      datasets: [{
        data: LANES.map((l) => l.pct),
        backgroundColor: LANES.map((l) => l.color),
        borderColor: "#0A1428",
        borderWidth: 3,
        hoverOffset: 14,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }, // usamos leyenda propia
        tooltip: {
          backgroundColor: "#0F1F33",
          borderColor: "#C89B3C",
          borderWidth: 1,
          titleFont: { family: "'JetBrains Mono', monospace" },
          bodyFont: { family: "'Karla', sans-serif" },
          callbacks: {
            label: (item) => {
              const lane = LANES[item.dataIndex];
              const pool = (DATA && DATA.pool) || FALLBACK_POOL;
              return ` ${lane.pct}% — ${pool[lane.id].join(", ")}`;
            },
          },
        },
      },
      onClick: (_evt, elements) => {
        if (!elements.length) return;
        const lane = LANES[elements[0].index];
        location.hash = `#/lane/${lane.id}`;
      },
      onHover: (evt, elements) => {
        evt.native.target.style.cursor = elements.length ? "pointer" : "default";
      },
    },
  });

  // Leyenda propia clicable
  const legend = $("#chart-legend");
  legend.innerHTML = "";
  LANES.forEach((lane) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="legend-swatch" style="background:${lane.color}"></span>${lane.id} — ${lane.pct}%`;
    li.tabIndex = 0;
    li.setAttribute("role", "link");
    li.addEventListener("click", () => (location.hash = `#/lane/${lane.id}`));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") location.hash = `#/lane/${lane.id}`;
    });
    legend.appendChild(li);
  });
}

// ------------------------------------------------------------------
// Vista de LÍNEA
// ------------------------------------------------------------------
function renderLane(laneId) {
  const lane = LANES.find((l) => l.id === laneId);
  if (!lane) return showView("home");

  lastLane = laneId;
  $("#lane-eyebrow").textContent = `Línea · ${lane.pct}% de mi pool`;
  $("#lane-title").textContent = lane.label;

  const pool = (DATA && DATA.pool) || FALLBACK_POOL;
  const grid = $("#champ-grid");
  grid.innerHTML = "";

  pool[laneId].forEach((champId) => {
    const c = getChampData(champId) || {};
    const name = c.name || champId;
    const card = document.createElement("button");
    card.className = "champ-card";
    card.setAttribute("aria-label", `Ver detalles de ${name}`);
    card.innerHTML = `
      <img src="${champLoading(champId)}" alt="${name}" loading="lazy"
           onerror="this.src='${champSquare(champId)}'" />
      <div class="champ-meta">
        <h3>${name}</h3>
        <div class="champ-stats-mini">
          WR <span class="${wrClass(c.winrate)}">${fmtPct(c.winrate)}</span>
          &nbsp;·&nbsp; PR ${fmtPct(c.pickrate)}
        </div>
      </div>`;
    card.addEventListener("click", () => (location.hash = `#/champ/${champId}`));
    grid.appendChild(card);
  });

  showView("lane");
  updateNav(laneId);
}

// ------------------------------------------------------------------
// Vista de CAMPEÓN
// ------------------------------------------------------------------
function renderRunesBlock(title, runes) {
  if (!runes) return "";
  const primary = (runes.primary || [])
    .map((r, i) => `<img class="game-icon ${i === 0 ? "keystone" : ""}" src="${runeIcon(r.icon)}" alt="${r.name}" title="${r.name}" />`)
    .join("");
  const secondary = (runes.secondary || [])
    .map((r) => `<img class="game-icon" src="${runeIcon(r.icon)}" alt="${r.name}" title="${r.name}" />`)
    .join("");
  return `
    <h4>${title}</h4>
    <div class="icon-row">${primary}${secondary}</div>
    ${runes.note ? `<p class="icon-caption">${runes.note}</p>` : ""}`;
}

function renderItemsBlock(title, items) {
  if (!items || !items.length) return "";
  const icons = items
    .map((it) => `<img class="game-icon" src="${itemIcon(it.id)}" alt="${it.name}" title="${it.name}" />`)
    .join("");
  return `<h4>${title}</h4><div class="icon-row">${icons}</div>`;
}

function renderChamp(champId) {
  const c = getChampData(champId);
  const laneId = laneOf(champId);
  lastLane = laneId;
  const name = (c && c.name) || champId;
  const el = $("#champ-detail");

  if (!c) {
    el.innerHTML = `
      <div class="panel">
        <h2>${name}</h2>
        <p>Todavía no hay datos para este campeón. El workflow de GitHub Actions
        generará <code>data/data.json</code> en su próxima ejecución.</p>
      </div>`;
    showView("champ");
    return;
  }

  const matchups = (c.counters || [])
    .map((m) => `
      <li class="matchup">
        <img src="${champSquare(m.champion_id)}" alt="${m.champion_name}" loading="lazy" />
        <div>
          <div class="m-name">${m.champion_name}
            <span class="tag ${m.style}">${m.style}</span>
          </div>
          <div class="m-tip">${m.tip || ""}</div>
        </div>
        <div class="m-wr ${wrClass(m.winrate_vs)}">${fmtPct(m.winrate_vs)} WR</div>
      </li>`)
    .join("");

  el.innerHTML = `
    <div class="champ-hero">
      <img class="splash" src="${champSplash(champId)}" alt="" aria-hidden="true" />
      <div class="hero-overlay">
        <div>
          <p class="eyebrow">${LANES.find((l) => l.id === laneId)?.label || laneId} · Corea soloQ</p>
          <h1>${name}</h1>
        </div>
        <div class="stat-pills">
          <div class="stat-pill">Winrate <strong class="${wrClass(c.winrate)}">${fmtPct(c.winrate)}</strong></div>
          <div class="stat-pill">Pickrate <strong>${fmtPct(c.pickrate)}</strong></div>
          ${c.banrate != null ? `<div class="stat-pill">Banrate <strong>${fmtPct(c.banrate)}</strong></div>` : ""}
        </div>
      </div>
    </div>

    <div class="detail-grid">
      <div class="panel">
        <h2>Runas óptimas</h2>
        ${renderRunesBlock("Página principal", c.runes)}
      </div>

      <div class="panel">
        <h2>Build de ítems</h2>
        ${renderItemsBlock("Core (principal)", c.build && c.build.core)}
        ${renderItemsBlock("Opcionales / situacionales", c.build && c.build.optional)}
        ${c.build && c.build.starting ? renderItemsBlock("Inicio", c.build.starting) : ""}
      </div>

      <div class="panel">
        <h2>Mejor combo</h2>
        <div class="combo-box">
          ${c.combo ? `<code>${c.combo.keys}</code><p>${c.combo.description}</p>` : "<p>Sin combo registrado.</p>"}
        </div>
        ${c.playstyle ? `<h4>Cómo jugarlo</h4><p class="icon-caption">${c.playstyle}</p>` : ""}
      </div>

      <div class="panel">
        <h2>Counters / Matchups</h2>
        <ul class="matchup-list">${matchups || "<li class='icon-caption'>Sin matchups registrados.</li>"}</ul>
        ${c.alt_builds ? `
          <h4>Ajustes según el rival</h4>
          <p class="icon-caption"><strong style="color:var(--danger)">Vs ofensivos:</strong> ${c.alt_builds.vs_offensive}</p>
          <p class="icon-caption"><strong style="color:var(--hex)">Vs defensivos:</strong> ${c.alt_builds.vs_defensive}</p>` : ""}
      </div>
    </div>`;

  showView("champ");
  updateNav(laneId);
}

// ------------------------------------------------------------------
// Router + navegación
// ------------------------------------------------------------------
function showView(name) {
  ["home", "lane", "champ"].forEach((v) => {
    $(`#view-${v}`).hidden = v !== name;
  });
  window.scrollTo({ top: 0 });
}

function updateNav(activeLane) {
  document.querySelectorAll(".lane-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.lane === activeLane);
  });
}

function route() {
  const hash = location.hash || "#/";
  const laneMatch = hash.match(/^#\/lane\/(\w+)/);
  const champMatch = hash.match(/^#\/champ\/(\w+)/);

  if (laneMatch) return renderLane(laneMatch[1].toUpperCase());
  if (champMatch) return renderChamp(champMatch[1]);
  showView("home");
  updateNav(null);
}

function buildNav() {
  const nav = $("#lane-nav");
  nav.innerHTML = LANES
    .map((l) => `<a href="#/lane/${l.id}" data-lane="${l.id}">${l.id}</a>`)
    .join("");
}

// ------------------------------------------------------------------
// Init
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  buildNav();
  await loadData();
  buildChart();
  route();

  window.addEventListener("hashchange", route);
  $("#champ-back").addEventListener("click", () => (location.hash = `#/lane/${lastLane}`));
  document.querySelectorAll("[data-nav]").forEach((btn) =>
    btn.addEventListener("click", () => (location.hash = btn.dataset.nav))
  );
});
