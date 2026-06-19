// ============================================================
// PROMPTVERSE ADMIN — Professional JS + Firebase Firestore
// Real data only. No fake percentages, no fake trends.
// ============================================================

// ---- FIREBASE IMPORTS ----
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ---- DATA LAYER (Firestore) ----

/**
 * Fetch all prompts from Firestore
 */
async function getPromptsDataAsync() {
  try {
    const promptsCollection = collection(db, "prompts");
    const snapshot = await getDocs(promptsCollection);
    const prompts = [];
    snapshot.forEach((doc) => {
      prompts.push({ ...doc.data(), id: doc.id });
    });
    console.log("[Firestore] Loaded prompts:", prompts.length);
    return prompts;
  } catch (error) {
    console.error("[Firestore] Error loading prompts:", error);
    return [];
  }
}

/**
 * Save all prompts to Firestore
 */
async function savePromptsDataAsync(prompts) {
  try {
    for (const prompt of prompts) {
      const promptId = prompt.id;
      const promptRef = doc(db, "prompts", promptId);
      await setDoc(promptRef, {
        ...prompt,
        updatedAt: serverTimestamp(),
      });
    }
    console.log("[Firestore] Saved prompts:", prompts.length);
  } catch (error) {
    console.error("[Firestore] Error saving prompts:", error);
  }
}

/**
 * Save a single prompt to Firestore
 */
async function savePromptAsync(prompt) {
  try {
    const promptId = prompt.id;
    const promptRef = doc(db, "prompts", promptId);
    await setDoc(promptRef, {
      ...prompt,
      updatedAt: serverTimestamp(),
    });
    console.log("[Firestore] Saved prompt:", promptId);
  } catch (error) {
    console.error("[Firestore] Error saving prompt:", error);
  }
}

/**
 * Delete a single prompt from Firestore
 */
async function deletePromptAsync(promptId) {
  try {
    const promptRef = doc(db, "prompts", promptId);
    await deleteDoc(promptRef);
    console.log("[Firestore] Deleted prompt:", promptId);
  } catch (error) {
    console.error("[Firestore] Error deleting prompt:", error);
  }
}

/**
 * Fetch all categories from Firestore
 */
async function getCategoriesDataAsync() {
  const defaults = [
    "Couples",
    "Friends",
    "AI Chibi",
    "Cartoon",
    "AI Caricature",
    "Fake Movie Poster",
    "AI Action Figure",
    "Scrapbook",
    "Journal Style",
    "Barbie Version",
    "90s Photos",
    "Anime",
    "Fantasy",
  ];

  try {
    const categoriesCollection = collection(db, "categories");
    const snapshot = await getDocs(categoriesCollection);

    if (snapshot.empty) {
      // Initialize with defaults if collection is empty
      console.log(
        "[Firestore] Categories collection empty, initializing with defaults",
      );
      for (const cat of defaults) {
        const catRef = doc(db, "categories", cat);
        await setDoc(catRef, { name: cat, createdAt: serverTimestamp() });
      }
      return defaults;
    }

    const categories = [];
    snapshot.forEach((doc) => {
      categories.push(doc.data().name || doc.id);
    });
    console.log("[Firestore] Loaded categories:", categories.length);
    return categories;
  } catch (error) {
    console.error("[Firestore] Error loading categories:", error);
    return defaults;
  }
}

/**
 * Save all categories to Firestore
 */
async function saveCategoriesDataAsync(categories) {
  try {
    for (const cat of categories) {
      const catRef = doc(db, "categories", cat);
      await setDoc(catRef, { name: cat, updatedAt: serverTimestamp() });
    }
    console.log("[Firestore] Saved categories:", categories.length);
  } catch (error) {
    console.error("[Firestore] Error saving categories:", error);
  }
}

/**
 * Delete a category from Firestore
 */
async function deleteCategoryAsync(categoryName) {
  try {
    const catRef = doc(db, "categories", categoryName);
    await deleteDoc(catRef);
    console.log("[Firestore] Deleted category:", categoryName);
  } catch (error) {
    console.error("[Firestore] Error deleting category:", error);
  }
}

// ---- STATE (initialized empty, will be populated async) ----
const adminState = {
  currentSection: "dashboard",
  prompts: [],
  categories: [],
  editingIdx: null,
  pendingDeleteIdx: null,
  darkMode: localStorage.getItem("pvDarkMode") === "1",
  tags: [],
  searchQuery: "",
  sortBy: "newest",
  filterCat: "all",
  viewMode: "table",
  page: 1,
  perPage: 10,
  firestoreReady: false,
};

// ---- ACTIVITY LOG (Firestore) ----

/**
 * Fetch activity log from Firestore
 */
async function getActivityLogAsync() {
  try {
    const logCollection = collection(db, "adminActivityLog");
    const snapshot = await getDocs(logCollection);
    const log = [];
    snapshot.forEach((doc) => {
      log.push(doc.data());
    });
    // Sort by timestamp descending
    log.sort((a, b) => b.ts - a.ts);
    return log.slice(0, 50);
  } catch (error) {
    console.error("[Firestore] Error loading activity log:", error);
    return [];
  }
}

/**
 * Log activity to Firestore
 */
async function logActivityAsync(type, title) {
  try {
    const logRef = doc(collection(db, "adminActivityLog"));
    await setDoc(logRef, {
      type,
      title,
      ts: Date.now(),
      createdAt: serverTimestamp(),
    });
    console.log("[Firestore] Logged activity:", type, title);
  } catch (error) {
    console.error("[Firestore] Error logging activity:", error);
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize Firestore data and setup UI
 */
async function initializeFirestore() {
  try {
    console.log("[Firestore] Starting initialization...");

    // Load data from Firestore
    adminState.prompts = await getPromptsDataAsync();
    adminState.categories = await getCategoriesDataAsync();
    adminState.firestoreReady = true;

    // Ensure categories always have defaults as fallback
    if (!adminState.categories || adminState.categories.length === 0) {
      adminState.categories = [
        "Couples",
        "Friends",
        "AI Chibi",
        "Cartoon",
        "AI Caricature",
        "Fake Movie Poster",
        "AI Action Figure",
        "Scrapbook",
        "Journal Style",
        "Barbie Version",
        "90s Photos",
        "Anime",
        "Fantasy",
      ];
    }

    console.log(
      "[Firestore] Initialization complete. Prompts:",
      adminState.prompts.length,
      "Categories:",
      adminState.categories.length,
    );
  } catch (error) {
    console.error("[Firestore] Failed to initialize:", error);
    adminState.firestoreReady = false;

    // Fallback: Initialize with defaults
    adminState.categories = [
      "Couples",
      "Friends",
      "AI Chibi",
      "Cartoon",
      "AI Caricature",
      "Fake Movie Poster",
      "AI Action Figure",
      "Scrapbook",
      "Journal Style",
      "Barbie Version",
      "90s Photos",
      "Anime",
      "Fantasy",
    ];
    adminState.prompts = [];
    console.warn("[Firestore] Using default values - Firestore unavailable");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Firestore first
  await initializeFirestore();

  // Load activity log before rendering dashboard
  await loadActivityLogAsync();

  setupDarkMode();
  setupNavigation();
  setupForms();
  setupModals();
  setupSearch();
  setupTagInput();
  setupTemplates();
  setupViewToggle();
  setupTableSort();
  setupGlobalSearch();

  // Ensure categories are populated in dropdowns BEFORE rendering
  populateCategorySelects();

  renderDashboard();
  updateSidebarCounts();
  updateStorageBar();

  const ts = document.getElementById("dashTimestamp");
  if (ts)
    ts.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Panel tabs
  document.querySelectorAll(".ptab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".ptab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      drawActivityChart();
    });
  });

  // Select all
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "selectAll") {
      document
        .querySelectorAll(".row-check")
        .forEach((cb) => (cb.checked = e.target.checked));
    }
  });

  window.addEventListener("resize", debounce(drawActivityChart, 300));
});

// ============================================================
// DARK MODE
// ============================================================
function setupDarkMode() {
  const toggle = document.getElementById("adminModeToggle");
  const moon = document.getElementById("iconMoon");
  const sun = document.getElementById("iconSun");

  function apply(on) {
    document.body.classList.toggle("dark-mode", on);
    if (moon) moon.style.display = on ? "none" : "";
    if (sun) sun.style.display = on ? "" : "none";
  }

  apply(adminState.darkMode);

  if (toggle)
    toggle.addEventListener("click", () => {
      adminState.darkMode = !adminState.darkMode;
      apply(adminState.darkMode);
      localStorage.setItem("pvDarkMode", adminState.darkMode ? "1" : "0");
    });
}

// ============================================================
// NAVIGATION
// ============================================================
function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => switchSection(item.dataset.section));
  });
}

function switchSection(id) {
  document
    .querySelectorAll(".admin-section")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));

  const section = document.getElementById(id);
  if (section) section.classList.add("active");

  const navItem = document.querySelector(`.nav-item[data-section="${id}"]`);
  if (navItem) navItem.classList.add("active");

  adminState.currentSection = id;

  // Update breadcrumb
  const labels = {
    dashboard: "Dashboard",
    prompts: "Manage Prompts",
    "add-prompt": "Add Prompt",
    categories: "Categories",
    analytics: "Analytics",
  };
  const bc = document.getElementById("pageBreadcrumb");
  if (bc) bc.textContent = labels[id] || id;

  if (id === "dashboard") renderDashboard();
  if (id === "prompts") {
    adminState.page = 1;
    renderPromptsTable();
  }
  if (id === "categories") renderCategoriesGrid();
  if (id === "analytics") renderAnalytics();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const prompts = adminState.prompts;
  const bookmarks = JSON.parse(
    localStorage.getItem("promptverseBookmarks") || "[]",
  );

  // Stat cards — real counts only
  animateCount("totalPromptsCount", prompts.length);
  animateCount("totalBookmarksCount", bookmarks.length);
  animateCount("totalCategoriesCount", adminState.categories.length);

  const avg = prompts.length ? bookmarks.length / prompts.length : 0;
  document.getElementById("avgBookmarksCount").textContent = avg.toFixed(2);

  // Sub-labels
  const psub = document.getElementById("statSubPrompts");
  if (psub)
    psub.textContent =
      prompts.length === 1
        ? "in your library"
        : `across ${adminState.categories.filter((c) => prompts.some((p) => p.category === c)).length} categories`;

  const csub = document.getElementById("statSubCats");
  if (csub) {
    const active = adminState.categories.filter((c) =>
      prompts.some((p) => p.category === c),
    ).length;
    csub.textContent = `${active} of ${adminState.categories.length} have prompts`;
  }

  // Summary row
  const catCounts = {};
  adminState.categories.forEach((c) => {
    catCounts[c] = prompts.filter((p) => p.category === c).length;
  });
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  setText(
    "topCategory",
    topCat && topCat[1] > 0 ? `${topCat[0]} (${topCat[1]})` : "—",
  );

  const last = [...prompts].sort(
    (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0),
  )[0];
  setText("lastAdded", last ? truncate(last.title, 22) : "—");

  const withImages = prompts.filter((p) => p.image).length;
  setText("promptsWithImages", `${withImages} / ${prompts.length}`);

  const filled = adminState.categories.filter((c) =>
    prompts.some((p) => p.category === c),
  ).length;
  setText(
    "categoryCoverage",
    adminState.categories.length
      ? Math.round((filled / adminState.categories.length) * 100) + "%"
      : "0%",
  );

  // Storage
  const storBytes = new Blob([JSON.stringify(localStorage)]).size;
  setText("storageDisplay", formatBytes(storBytes));

  // Activity feed
  renderActivityFeed();

  // Chart & sparklines
  drawActivityChart();
  drawSparklines();
  updateStorageBar();
  updateSidebarCounts();
}

// ============================================================
// ACTIVITY FEED — Real logged events
// ============================================================
function renderActivityFeed() {
  const feed = document.getElementById("recentActivity");
  if (!feed) return;

  const log = getActivityLog();
  const prompts = adminState.prompts;

  // Seed with real data if log is empty
  const items = [];

  if (log.length > 0) {
    log.slice(0, 8).forEach((entry) => {
      items.push({
        title: entry.title,
        meta: formatRelativeTime(entry.ts),
        color: colorForType(entry.type),
      });
    });
  } else {
    // Show real state info
    if (prompts.length > 0) {
      const last = [...prompts].sort(
        (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0),
      )[0];
      items.push({
        title: `"${truncate(last.title, 30)}" is the latest prompt`,
        meta: formatRelativeTime(
          new Date(last.dateAdded || Date.now()).getTime(),
        ),
        color: "#a855f7",
      });
    }
    if (prompts.length === 0) {
      items.push({
        title: "No prompts yet. Add your first prompt.",
        meta: "Now",
        color: "#9b8ec4",
      });
    }
    items.push({
      title: `Library loaded: ${prompts.length} prompt${prompts.length !== 1 ? "s" : ""}`,
      meta: "Now",
      color: "#10b981",
    });
    items.push({
      title: `${adminState.categories.length} categories configured`,
      meta: "Now",
      color: "#a855f7",
    });
  }

  if (items.length === 0) {
    feed.innerHTML = '<div class="feed-empty">No activity recorded yet.</div>';
    return;
  }

  feed.innerHTML = items
    .map(
      (item, i) => `
    <div class="activity-item" style="animation-delay:${i * 60}ms">
      <div class="activity-dot" style="background:${item.color}"></div>
      <div class="activity-body">
        <div class="activity-title">${esc(item.title)}</div>
        <div class="activity-meta">${esc(item.meta)}</div>
      </div>
    </div>`,
    )
    .join("");
}

function colorForType(type) {
  const map = {
    add: "#10b981",
    delete: "#ef4444",
    edit: "#f59e0b",
    category: "#a855f7",
  };
  return map[type] || "#a855f7";
}

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(2) + " MB";
}

// ============================================================
// ACTIVITY CHART — Based on real dateAdded data
// ============================================================
function drawActivityChart() {
  const canvas = document.getElementById("activityChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.parentElement.clientWidth || 400;
  const H = 200;
  canvas.width = W;
  canvas.height = H;

  const prompts = adminState.prompts;
  const activeTab = document.querySelector(".ptab.active");
  const range = activeTab ? activeTab.dataset.range : "week";

  // Build real data from dateAdded
  const days = range === "week" ? 7 : 30;
  const counts = Array(days).fill(0);

  // Normalize current time to start of today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  prompts.forEach((p) => {
    if (!p.dateAdded) return;

    // Normalize prompt date to start of day
    const promptDate = new Date(p.dateAdded);
    promptDate.setHours(0, 0, 0, 0);
    const promptTime = promptDate.getTime();

    // Calculate exact days difference
    const diff = Math.floor((todayTime - promptTime) / 86400000);
    if (diff >= 0 && diff < days) {
      counts[days - 1 - diff]++;
    }
  });

  const chartEmpty = document.getElementById("chartEmpty");
  const totalActivity = counts.reduce((a, b) => a + b, 0);

  if (totalActivity === 0 && prompts.length === 0) {
    if (chartEmpty) chartEmpty.style.display = "flex";
    ctx.clearRect(0, 0, W, H);
    return;
  }

  if (chartEmpty) chartEmpty.style.display = "none";

  const labels =
    range === "week"
      ? (() => {
          const days2 = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days2.push(d.toLocaleDateString("en-US", { weekday: "short" }));
          }
          return days2;
        })()
      : (() => {
          const days2 = [];
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days2.push(
              i % 5 === 0
                ? d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "",
            );
          }
          return days2;
        })();

  const max = Math.max(...counts, 1);
  const pad = { top: 20, right: 20, bottom: 32, left: 36 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // Grid
  const isDark = document.body.classList.contains("dark-mode");
  const gridColor = isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)";
  const textColor = isDark ? "rgba(255,255,255,.3)" : "rgba(0,0,0,.35)";

  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (cH / 4) * i;
    ctx.beginPath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cW, y);
    ctx.stroke();

    // Y label
    const val = Math.round((max / 4) * (4 - i));
    ctx.fillStyle = textColor;
    ctx.font = "10px Inter,sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(val, pad.left - 6, y + 4);
  }

  const stepX = cW / (days - 1);

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
  grad.addColorStop(0, isDark ? "rgba(168,85,247,.3)" : "rgba(168,85,247,.15)");
  grad.addColorStop(1, "rgba(168,85,247,.01)");

  // Path
  const pts = counts.map((v, i) => ({
    x: pad.left + i * stepX,
    y: pad.top + cH - (v / max) * cH,
  }));

  // Fill
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineTo(pts[pts.length - 1].x, pad.top + cH);
  ctx.lineTo(pts[0].x, pad.top + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // Points
  pts.forEach((p, i) => {
    if (counts[i] > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#a855f7";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "#16102a" : "#fff";
      ctx.fill();
    }

    // X label
    if (labels[i]) {
      ctx.fillStyle = textColor;
      ctx.font = "10px Inter,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[i], p.x, H - 6);
    }
  });

  // Store chart data for hover tooltip
  canvas.chartData = {
    pts,
    counts,
    labels,
    range,
    days,
    isDark,
    pad,
    W,
    H,
  };

  // Create or get tooltip element
  let tooltip = document.getElementById("chartTooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "chartTooltip";
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      pointer-events: none;
      z-index: 10000;
      display: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(tooltip);
  }

  // Add hover tooltip listener (remove old one if exists)
  if (canvas.tooltipListener) {
    canvas.removeEventListener("mousemove", canvas.tooltipListener);
  }

  canvas.tooltipListener = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let hoveredIdx = -1;
    const data = canvas.chartData;

    // Check if hovering over any point with data (large hover area - 40px radius)
    for (let i = 0; i < data.pts.length; i++) {
      const p = data.pts[i];
      const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
      // Only hover over points that have data (count > 0)
      if (dist < 40 && data.counts[i] > 0) {
        hoveredIdx = i;
        break;
      }
    }

    // Show or hide tooltip
    if (hoveredIdx >= 0) {
      const count = data.counts[hoveredIdx];
      tooltip.textContent = `Prompts published: ${count}`;
      tooltip.style.display = "block";

      // Position tooltip right above the data point using viewport coordinates
      const point = data.pts[hoveredIdx];
      const chartRect = canvas.getBoundingClientRect();
      const pointX = chartRect.left + point.x;
      const pointY = chartRect.top + point.y;

      tooltip.style.left = pointX - tooltip.offsetWidth / 2 + "px";
      tooltip.style.top = pointY - 35 + "px";

      canvas.style.cursor = "pointer";
    } else {
      tooltip.style.display = "none";
      canvas.style.cursor = "default";
    }
  };

  canvas.addEventListener("mousemove", canvas.tooltipListener);

  // Hide tooltip when mouse leaves canvas
  canvas.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
    canvas.style.cursor = "default";
  });
}

// ============================================================
// SPARKLINES — REMOVED (not useful when all values similar)
// ============================================================
function drawSparklines() {
  // Sparklines removed - all stat cards showed similar trends
  // Card values alone are sufficient without trend visualization
}

// ============================================================
// STORAGE BAR
// ============================================================
function updateStorageBar() {
  // Calculate Firestore data size estimation
  const prompts = adminState.prompts;
  const categories = adminState.categories;
  const bookmarks = JSON.parse(
    localStorage.getItem("promptverseBookmarks") || "[]",
  );

  // Estimate Firestore database size
  let firestoreSize = 0;

  // Each prompt in Firestore
  prompts.forEach((p) => {
    firestoreSize += new Blob([JSON.stringify(p)]).size;
  });

  // Each category
  categories.forEach((c) => {
    firestoreSize += new Blob([JSON.stringify({ name: c })]).size;
  });

  // Activity log entries (rough estimate: 10 entries)
  firestoreSize += 500 * 10;

  // Document count breakdown
  const promptCount = prompts.length;
  const categoryCount = categories.length;
  const totalDocs = promptCount + categoryCount + 10; // +10 for activity log

  const fill = document.getElementById("storageFill");
  const pctEl = document.getElementById("storagePct");
  const detail = document.getElementById("storageUsed");

  // Show Firestore usage (no real limit, so show percentage of what we use)
  const displayPct = Math.min(
    20,
    Math.max(5, (firestoreSize / 100000) * 100),
  ).toFixed(1);

  if (fill) fill.style.width = displayPct + "%";
  if (pctEl) pctEl.textContent = promptCount + " prompts";
  if (detail)
    detail.textContent = `Firestore: ${promptCount} prompts + ${categoryCount} categories`;
}

function updateSidebarCounts() {
  const pc = document.getElementById("sidebarPromptsCount");
  const cc = document.getElementById("sidebarCatsCount");
  if (pc) pc.textContent = adminState.prompts.length;
  if (cc) cc.textContent = adminState.categories.length;
}

// ============================================================
// PROMPTS TABLE
// ============================================================
function renderPromptsTable() {
  let list = [...adminState.prompts];
  const bookmarks = JSON.parse(
    localStorage.getItem("promptverseBookmarks") || "[]",
  );

  if (adminState.searchQuery) {
    const q = adminState.searchQuery.toLowerCase();
    list = list.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.tags || []).join(" ").toLowerCase().includes(q),
    );
  }

  if (adminState.filterCat !== "all") {
    list = list.filter((p) => p.category === adminState.filterCat);
  }

  if (adminState.sortBy === "newest")
    list.sort(
      (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0),
    );
  if (adminState.sortBy === "oldest")
    list.sort(
      (a, b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0),
    );
  if (adminState.sortBy === "alpha")
    list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / adminState.perPage));
  if (adminState.page > pages) adminState.page = pages;
  const start = (adminState.page - 1) * adminState.perPage;
  const paged = list.slice(start, start + adminState.perPage);

  const tbody = document.getElementById("promptsTableBody");
  const tableEmpty = document.getElementById("tableEmpty");

  if (!tbody) return;

  if (total === 0) {
    tbody.innerHTML = "";
    if (tableEmpty) tableEmpty.style.display = "block";
  } else {
    if (tableEmpty) tableEmpty.style.display = "none";
    tbody.innerHTML = paged
      .map((prompt, i) => {
        const idx = adminState.prompts.indexOf(prompt);
        const saves = bookmarks.filter((id) => id === prompt.id).length;
        const tags = (prompt.tags || [])
          .slice(0, 3)
          .map((t) => `<span class="tag-chip">${esc(t)}</span>`)
          .join("");
        const dateStr = prompt.dateAdded
          ? new Date(prompt.dateAdded).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—";
        const hasImg = !!prompt.image;

        return `
        <tr style="animation:sectionIn .25s ease ${i * 30}ms both">
          <td><input type="checkbox" class="check-input row-check" data-idx="${idx}"></td>
          <td>
            <div class="prompt-title-main">${esc(prompt.title || "Untitled")}</div>
            <div class="prompt-title-sub">${esc((prompt.prompt || "").slice(0, 60))}…</div>
          </td>
          <td><span class="cat-badge">${esc(prompt.category || "Uncategorized")}</span></td>
          <td>${tags || '<span style="color:var(--text-3);font-size:.75rem">—</span>'}</td>
          <td>
            ${
              hasImg
                ? `<span class="img-indicator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Yes</span>`
                : `<span class="img-indicator no-img">No image</span>`
            }
          </td>
          <td style="color:var(--text-3);font-size:.78rem">${dateStr}</td>
          <td>
            <div class="action-buttons">
              <button class="act-btn" onclick="editPrompt(${idx})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button class="act-btn del" onclick="confirmDelete(${idx})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join("");
  }

  renderPromptsGrid(paged);
  renderPagination(total, pages);
}

function renderPromptsGrid(list) {
  const grid = document.getElementById("promptsCardGrid");
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = "";
    return;
  }
  grid.innerHTML = list
    .map((prompt) => {
      const idx = adminState.prompts.indexOf(prompt);
      return `
      <div class="prompt-grid-card">
        ${prompt.image ? `<img class="pgc-img" src="${esc(prompt.image)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}
        <div class="pgc-body">
          <div class="pgc-title">${esc(prompt.title || "Untitled")}</div>
          <div class="pgc-cat">${esc(prompt.category || "Uncategorized")}</div>
          <div class="pgc-actions">
            <button class="act-btn" onclick="editPrompt(${idx})">Edit</button>
            <button class="act-btn del" onclick="confirmDelete(${idx})">Delete</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

function renderPagination(total, pages) {
  const wrap = document.getElementById("tablePagination");
  if (!wrap || pages <= 1) {
    if (wrap) wrap.innerHTML = "";
    return;
  }

  const btns = [];
  for (let i = 1; i <= pages; i++) {
    btns.push(
      `<button class="page-btn${i === adminState.page ? " active" : ""}" onclick="goPage(${i})">${i}</button>`,
    );
  }

  wrap.innerHTML = `
    <button class="page-btn" onclick="goPage(${adminState.page - 1})" ${adminState.page <= 1 ? "disabled" : ""}>‹</button>
    ${btns.join("")}
    <button class="page-btn" onclick="goPage(${adminState.page + 1})" ${adminState.page >= pages ? "disabled" : ""}>›</button>
    <span class="page-info">${total} total</span>`;
}

function goPage(p) {
  adminState.page = p;
  renderPromptsTable();
}

// ============================================================
// EDIT PROMPT
// ============================================================
function editPrompt(index) {
  const prompt = adminState.prompts[index];
  if (!prompt) return;
  adminState.editingIdx = index;

  document.getElementById("editPromptTitle").value = prompt.title || "";
  document.getElementById("editPromptImage").value = prompt.image || "";
  document.getElementById("editPromptText").value = prompt.prompt || "";
  document.getElementById("editPromptTags").value = (prompt.tags || []).join(
    ", ",
  );

  populateCategorySelects();
  document.getElementById("editPromptCategory").value = prompt.category || "";

  document.getElementById("editPromptModal").classList.add("active");
}

// ============================================================
// DELETE
// ============================================================
function confirmDelete(index) {
  adminState.pendingDeleteIdx = index;
  document.getElementById("deleteConfirmModal").classList.add("active");
}

async function executeDelete() {
  const idx = adminState.pendingDeleteIdx;
  if (idx === null || idx === undefined) return;

  if (!adminState.firestoreReady) {
    showToast("Firestore not ready", "error");
    return;
  }

  const deleted = adminState.prompts[idx];
  const deletedId = deleted?.id;

  if (deletedId) {
    await deletePromptAsync(deletedId);
  }
  await logActivityAsync(
    "delete",
    `Deleted: "${truncate(deleted?.title || "Prompt", 30)}"`,
  );

  adminState.prompts.splice(idx, 1);
  document.getElementById("deleteConfirmModal").classList.remove("active");
  adminState.pendingDeleteIdx = null;
  renderPromptsTable();
  updateSidebarCounts();
  updateStorageBar();
  showToast("Prompt deleted", "info");
}

// ============================================================
// FORMS
// ============================================================
function setupForms() {
  // Add prompt
  const addForm = document.getElementById("addPromptForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!adminState.firestoreReady) {
        showFormMessage("Firestore not ready", "error");
        return;
      }

      const title = document.getElementById("promptTitle").value.trim();
      const category = document.getElementById("promptCategory").value;
      const text = document.getElementById("promptText").value.trim();

      if (!title || !category || !text) {
        showFormMessage("Please fill in all required fields.", "error");
        return;
      }

      const newPrompt = {
        id: "p" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        title,
        category,
        image: document.getElementById("promptImage").value.trim() || "",
        prompt: text,
        tags: adminState.tags.slice(),
        dateAdded: new Date().toISOString(),
      };

      await savePromptAsync(newPrompt);
      adminState.prompts.push(newPrompt);
      await logActivityAsync("add", `Added: "${truncate(title, 30)}"`);

      adminState.tags = [];
      document.getElementById("tagsDisplay").innerHTML = "";
      addForm.reset();
      updatePreview();
      updateCharCount();
      showFormMessage("Prompt published successfully.", "success");
      updateSidebarCounts();
      updateStorageBar();
      showToast("Prompt published", "success");
    });

    addForm.addEventListener("reset", () => {
      adminState.tags = [];
      const disp = document.getElementById("tagsDisplay");
      if (disp) disp.innerHTML = "";
      setTimeout(() => {
        updatePreview();
        updateCharCount();
      }, 10);
    });
  }

  // Edit prompt
  const editForm = document.getElementById("editPromptForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const idx = adminState.editingIdx;
      if (idx === null || idx === undefined) return;

      if (!adminState.firestoreReady) {
        showFormMessage("Firestore not ready", "error");
        return;
      }

      const prev = adminState.prompts[idx];
      adminState.prompts[idx] = {
        ...prev,
        title: document.getElementById("editPromptTitle").value.trim(),
        category: document.getElementById("editPromptCategory").value,
        image: document.getElementById("editPromptImage").value.trim(),
        prompt: document.getElementById("editPromptText").value.trim(),
        tags: document
          .getElementById("editPromptTags")
          .value.split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        lastEdited: new Date().toISOString(),
      };

      await savePromptAsync(adminState.prompts[idx]);
      await logActivityAsync(
        "edit",
        `Edited: "${truncate(adminState.prompts[idx].title, 30)}"`,
      );
      document.getElementById("editPromptModal").classList.remove("active");
      renderPromptsTable();
      showToast("Changes saved", "success");
    });
  }

  // Add category
  const addCatBtn = document.getElementById("addCategoryBtn");
  if (addCatBtn) {
    addCatBtn.addEventListener("click", async () => {
      if (!adminState.firestoreReady) {
        showToast("Firestore not ready", "error");
        return;
      }

      const input = document.getElementById("newCategoryInput");
      const cat = input.value.trim();
      if (!cat) {
        showToast("Enter a category name first.", "info");
        return;
      }
      if (
        adminState.categories
          .map((c) => c.toLowerCase())
          .includes(cat.toLowerCase())
      ) {
        showToast("Category already exists.", "info");
        return;
      }
      adminState.categories.push(cat);
      await saveCategoriesDataAsync(adminState.categories);
      input.value = "";
      await logActivityAsync("category", `Category added: "${cat}"`);
      renderCategoriesGrid();
      populateCategorySelects();
      updateSidebarCounts();
      showToast(`Category "${cat}" added`, "success");
    });

    document
      .getElementById("newCategoryInput")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") addCatBtn.click();
      });
  }

  // Export
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      if (!adminState.firestoreReady) {
        showToast("Firestore not ready", "error");
        return;
      }

      const data = {
        prompts: adminState.prompts,
        categories: adminState.categories,
        bookmarks: JSON.parse(
          localStorage.getItem("promptverseBookmarks") || "[]",
        ),
        exportedAt: new Date().toISOString(),
        totalPrompts: adminState.prompts.length,
        totalCategories: adminState.categories.length,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `promptverse-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      await logActivityAsync("export", "Exported data");
      showToast("Export downloaded", "success");
    });
  }
}

function populateCategorySelects() {
  ["promptCategory", "editPromptCategory"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML =
      '<option value="">Select a category</option>' +
      adminState.categories
        .map(
          (c) =>
            `<option value="${esc(c)}"${c === current ? " selected" : ""}>${esc(c)}</option>`,
        )
        .join("");
  });

  const filterEl = document.getElementById("categoryFilter");
  if (filterEl) {
    const current = filterEl.value;
    filterEl.innerHTML =
      '<option value="all">All Categories</option>' +
      adminState.categories
        .map(
          (c) =>
            `<option value="${esc(c)}"${c === current ? " selected" : ""}>${esc(c)}</option>`,
        )
        .join("");
  }
}

function showFormMessage(msg, type) {
  const el = document.getElementById("formMessage");
  if (!el) return;
  el.textContent = msg;
  el.className = "form-message " + type;
  setTimeout(() => {
    el.className = "form-message";
  }, 4500);
}

// ============================================================
// MODALS
// ============================================================
function setupModals() {
  ["closeEditModal", "cancelEditBtn"].forEach((id) => {
    const el = document.getElementById(id);
    if (el)
      el.addEventListener("click", () =>
        document.getElementById("editPromptModal").classList.remove("active"),
      );
  });

  const editOverlay = document.getElementById("editModalOverlay");
  if (editOverlay)
    editOverlay.addEventListener("click", () =>
      document.getElementById("editPromptModal").classList.remove("active"),
    );

  const confirmBtn = document.getElementById("confirmDeleteBtn");
  if (confirmBtn) confirmBtn.addEventListener("click", executeDelete);

  const cancelDelBtn = document.getElementById("cancelDeleteBtn");
  if (cancelDelBtn)
    cancelDelBtn.addEventListener("click", () => {
      document.getElementById("deleteConfirmModal").classList.remove("active");
      adminState.pendingDeleteIdx = null;
    });

  const delOverlay = document.getElementById("deleteModalOverlay");
  if (delOverlay)
    delOverlay.addEventListener("click", () => {
      document.getElementById("deleteConfirmModal").classList.remove("active");
      adminState.pendingDeleteIdx = null;
    });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".modal.active")
        .forEach((m) => m.classList.remove("active"));
    }
  });
}

// ============================================================
// SEARCH & FILTERS
// ============================================================
function setupSearch() {
  const search = document.getElementById("adminSearch");
  if (search) {
    search.addEventListener(
      "input",
      debounce((e) => {
        adminState.searchQuery = e.target.value.trim();
        adminState.page = 1;
        renderPromptsTable();
      }, 250),
    );
  }

  const catFilter = document.getElementById("categoryFilter");
  if (catFilter) {
    catFilter.addEventListener("change", (e) => {
      adminState.filterCat = e.target.value;
      adminState.page = 1;
      renderPromptsTable();
    });
  }

  const sortFilter = document.getElementById("sortFilter");
  if (sortFilter) {
    sortFilter.addEventListener("change", (e) => {
      adminState.sortBy = e.target.value;
      renderPromptsTable();
    });
  }
}

function setupGlobalSearch() {
  const gs = document.getElementById("globalSearch");
  if (!gs) return;

  gs.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      adminState.searchQuery = gs.value.trim();
      adminState.page = 1;
      switchSection("prompts");
      const as = document.getElementById("adminSearch");
      if (as) as.value = gs.value;
      gs.value = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      gs.focus();
    }
  });
}

// ============================================================
// VIEW TOGGLE
// ============================================================
function setupViewToggle() {
  const btnTable = document.getElementById("viewTable");
  const btnGrid = document.getElementById("viewGrid");
  const tableC = document.getElementById("tableContainer");
  const gridC = document.getElementById("gridContainer");

  if (!btnTable || !btnGrid) return;

  btnTable.addEventListener("click", () => {
    adminState.viewMode = "table";
    btnTable.classList.add("active");
    btnGrid.classList.remove("active");
    if (tableC) tableC.style.display = "block";
    if (gridC) gridC.style.display = "none";
  });

  btnGrid.addEventListener("click", () => {
    adminState.viewMode = "grid";
    btnGrid.classList.add("active");
    btnTable.classList.remove("active");
    if (tableC) tableC.style.display = "none";
    if (gridC) gridC.style.display = "block";
    renderPromptsTable();
  });
}

// ============================================================
// TABLE SORT HEADERS
// ============================================================
function setupTableSort() {
  document.querySelectorAll(".data-table th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (col === "title") adminState.sortBy = "alpha";
      else if (col === "date") adminState.sortBy = "newest";
      adminState.page = 1;
      renderPromptsTable();
    });
  });
}

// ============================================================
// TAGS INPUT
// ============================================================
function setupTagInput() {
  const input = document.getElementById("promptTags");
  const display = document.getElementById("tagsDisplay");
  const textEl = document.getElementById("promptText");
  const wrap = document.getElementById("tagsWrap");

  if (!input || !display) return;

  // Click on wrap → focus input
  if (wrap) wrap.addEventListener("click", () => input.focus());

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = input.value.replace(/,/g, "").trim();
      if (tag && !adminState.tags.includes(tag)) {
        adminState.tags.push(tag);
        renderTags(display);
      }
      input.value = "";
      updatePreview();
    }
    if (e.key === "Backspace" && !input.value && adminState.tags.length) {
      adminState.tags.pop();
      renderTags(display);
      updatePreview();
    }
  });

  if (textEl) {
    textEl.addEventListener("input", updateCharCount);
    textEl.addEventListener("input", debounce(updatePreview, 300));
  }

  ["promptTitle", "promptCategory"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", debounce(updatePreview, 300));
  });
}

function renderTags(display) {
  display.innerHTML = adminState.tags
    .map(
      (t, i) => `
    <span class="tag-pill">${esc(t)}<span class="tag-remove" onclick="removeTag(${i})">×</span></span>
  `,
    )
    .join("");
}

function removeTag(i) {
  adminState.tags.splice(i, 1);
  renderTags(document.getElementById("tagsDisplay"));
  updatePreview();
}

function updateCharCount() {
  const el = document.getElementById("promptText");
  const counter = document.getElementById("charCount");
  if (el && counter) counter.textContent = el.value.length;
}

function updatePreview() {
  const card = document.getElementById("addPreviewCard");
  if (!card) return;
  const title = (document.getElementById("promptTitle") || {}).value || "";
  const cat = (document.getElementById("promptCategory") || {}).value || "";
  const text = (document.getElementById("promptText") || {}).value || "";

  if (!title && !text) {
    card.innerHTML =
      '<span class="preview-hint">Fill in the form to see a live preview</span>';
    return;
  }

  card.innerHTML = `
    ${title ? `<div class="preview-title">${esc(title)}</div>` : ""}
    ${cat ? `<div class="preview-cat">${esc(cat)}</div>` : ""}
    ${text ? `<div class="preview-text">${esc(text.slice(0, 240))}${text.length > 240 ? "…" : ""}</div>` : ""}
    ${
      adminState.tags.length
        ? `<div style="margin-top:8px">${adminState.tags.map((t) => `<span class="tag-chip">${esc(t)}</span>`).join("")}</div>`
        : ""
    }
  `;
}

// ============================================================
// CATEGORIES GRID
// ============================================================
function renderCategoriesGrid() {
  const grid = document.getElementById("categoriesGrid");
  if (!grid) return;

  const counts = {};
  adminState.categories.forEach((c) => {
    counts[c] = adminState.prompts.filter((p) => p.category === c).length;
  });
  const max = Math.max(...Object.values(counts), 1);

  if (!adminState.categories.length) {
    grid.innerHTML =
      '<p style="color:var(--text-3);font-size:.85rem;grid-column:1/-1">No categories yet.</p>';
    return;
  }

  grid.innerHTML = adminState.categories
    .map((cat, i) => {
      const cnt = counts[cat] || 0;
      const pct = cnt / max;
      return `
      <div class="category-card" style="animation-delay:${i * 40}ms">
        <div class="cat-card-head">
          <div class="cat-label-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <span class="cat-count-badge">${cnt} prompt${cnt !== 1 ? "s" : ""}</span>
        </div>
        <div class="cat-name">${esc(cat)}</div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${Math.max(pct * 100, 2)}%"></div>
        </div>
        <button class="cat-remove-btn" onclick="deleteCategory('${esc(cat)}')">Remove</button>
      </div>`;
    })
    .join("");
}

async function deleteCategory(cat) {
  if (!adminState.firestoreReady) {
    showToast("Firestore not ready", "error");
    return;
  }

  adminState.categories = adminState.categories.filter((c) => c !== cat);
  await saveCategoriesDataAsync(adminState.categories);
  await deleteCategoryAsync(cat);
  await logActivityAsync("category", `Category removed: "${cat}"`);
  renderCategoriesGrid();
  populateCategorySelects();
  updateSidebarCounts();
  showToast(`Category "${cat}" removed`, "info");
}

// ============================================================
// ANALYTICS — Real data only
// ============================================================
function renderAnalytics() {
  const prompts = adminState.prompts;
  const bookmarks = JSON.parse(
    localStorage.getItem("promptverseBookmarks") || "[]",
  );

  // Hero stats
  setText("totalEngagement", prompts.length + bookmarks.length);

  // Publish rate (prompts per week since first prompt)
  const sorted = [...prompts].sort(
    (a, b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0),
  );
  const oldest = sorted[0];
  let rate = "—";
  if (oldest && oldest.dateAdded) {
    const msPerWeek = 7 * 24 * 3600 * 1000;
    const weeks = Math.max(
      1,
      (Date.now() - new Date(oldest.dateAdded).getTime()) / msPerWeek,
    );
    rate = (prompts.length / weeks).toFixed(1);
  }
  setText("publishRate", rate);

  const filled = adminState.categories.filter((c) =>
    prompts.some((p) => p.category === c),
  ).length;
  setText(
    "categoryCoverage2",
    adminState.categories.length
      ? Math.round((filled / adminState.categories.length) * 100) + "%"
      : "—",
  );

  const withImages = prompts.filter((p) => p.image).length;
  setText(
    "imageCoverage",
    prompts.length
      ? `${Math.round((withImages / prompts.length) * 100)}%`
      : "—",
  );

  // Category distribution bars
  const catCounts = {};
  adminState.categories.forEach((c) => {
    catCounts[c] = prompts.filter((p) => p.category === c).length;
  });
  const maxCat = Math.max(...Object.values(catCounts), 1);

  const distEl = document.getElementById("categoryDistribution");
  if (distEl) {
    const sorted2 = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, cnt]) => cnt > 0);
    distEl.innerHTML = sorted2.length
      ? sorted2
          .slice(0, 8)
          .map(
            ([cat, cnt]) => `
          <div class="dist-item">
            <div class="dist-header"><span>${esc(cat)}</span><strong>${cnt}</strong></div>
            <div class="dist-track">
              <div class="dist-fill" style="width:${(cnt / maxCat) * 100}%"></div>
            </div>
          </div>`,
          )
          .join("")
      : '<p style="color:var(--text-3);font-size:.82rem;padding:12px 0">No prompts with categories yet.</p>';
  }

  // Top prompts by saves
  const topEl = document.getElementById("topPrompts");
  if (topEl) {
    if (!prompts.length) {
      topEl.innerHTML =
        '<div class="top-item" style="justify-content:center;color:var(--text-3);border:none">No prompts yet.</div>';
    } else {
      const ranked = [...prompts].sort((a, b) => {
        const savesB = bookmarks.filter((id) => id === b.id).length;
        const savesA = bookmarks.filter((id) => id === a.id).length;
        return savesB - savesA;
      });
      topEl.innerHTML = ranked
        .slice(0, 7)
        .map((p, i) => {
          const saves = bookmarks.filter((id) => id === p.id).length;
          return `
          <div class="top-item">
            <span class="top-item-rank">#${i + 1}</span>
            <span class="top-item-title" title="${esc(p.title || "Untitled")}">${esc(truncate(p.title || "Untitled", 28))}</span>
            <span class="top-item-saves">${saves} save${saves !== 1 ? "s" : ""}</span>
          </div>`;
        })
        .join("");
    }
  }

  // Key metrics
  const statsEl = document.getElementById("statisticsData");
  if (statsEl) {
    const withTags = prompts.filter((p) => (p.tags || []).length > 0).length;
    const avgSaves = prompts.length
      ? (bookmarks.length / prompts.length).toFixed(2)
      : "0.00";
    const noImg = prompts.filter((p) => !p.image).length;

    const rows = [
      ["Total Prompts", prompts.length],
      ["Total Saves (Bookmarks)", bookmarks.length],
      ["Active Categories", adminState.categories.length],
      ["Categories With Prompts", filled],
      ["Avg Saves per Prompt", avgSaves],
      ["Prompts With Tags", withTags],
      ["Prompts With Images", withImages],
      ["Prompts Without Images", noImg],
    ];

    statsEl.innerHTML = rows
      .map(
        ([label, val]) => `
      <div class="stat-row">
        <span class="stat-row-label">${label}</span>
        <span class="stat-row-val">${val}</span>
      </div>`,
      )
      .join("");
  }
}

// ============================================================
// QUICK TEMPLATES
// ============================================================
const TEMPLATES = {
  portrait:
    "A stunning portrait of [subject], [lighting style] lighting, bokeh background, shot on Canon EOS R5, 85mm lens, f/1.8 aperture, hyperrealistic, cinematic --ar 2:3 --v 6",
  landscape:
    "An epic landscape of [location], golden hour, dramatic clouds, foreground interest, wide angle, National Geographic style, 8K resolution, ultra-detailed --ar 16:9 --v 6",
  anime:
    "[Subject] in anime art style, vibrant colors, expressive eyes, detailed linework, Studio Ghibli inspired, soft shading, pastel tones --ar 1:1 --v 6",
  scifi:
    "Futuristic [scene] set in 2150, neon lights, cyberpunk aesthetic, rain-soaked streets, holographic displays, ultra-realistic, cinematic lighting --ar 16:9 --v 6",
};

function setupTemplates() {
  document.querySelectorAll(".template-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.template;
      const el = document.getElementById("promptText");
      if (el && TEMPLATES[key]) {
        el.value = TEMPLATES[key];
        updateCharCount();
        updatePreview();
        el.focus();
        showToast(`Template "${key}" loaded`, "info");
      }
    });
  });
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><span>${esc(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity .3s ease, transform .3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ============================================================
// HELPERS
// ============================================================
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function truncate(str, len) {
  return str && str.length > len ? str.slice(0, len) + "…" : str || "";
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  if (target === 0) {
    el.textContent = "0";
    return;
  }
  let start = null;
  const duration = 700;
  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    el.textContent = Math.round(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

function debounce(fn, delay) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Synchronous activity log getter - stores log in memory after async load
 */
let activityLogCache = [];

function getActivityLog() {
  return activityLogCache;
}

/**
 * Load activity log from Firestore and cache it
 */
async function loadActivityLogAsync() {
  try {
    activityLogCache = await getActivityLogAsync();
    console.log("[Activity Log] Loaded:", activityLogCache.length, "entries");
  } catch (error) {
    console.error("[Activity Log] Failed to load:", error);
    activityLogCache = [];
  }
}

/**
 * Cleanup function - Delete all untitled demo prompts from Firestore
 * Keeps only prompts with real titles
 * Usage: window.cleanupUntitledPrompts()
 */
async function cleanupUntitledPrompts() {
  if (!db) {
    console.error("Firestore not initialized");
    return;
  }

  try {
    console.log("Starting cleanup of untitled prompts...");

    // Get all prompts directly from Firestore
    const promptsCollection = collection(db, "prompts");
    const snapshot = await getDocs(promptsCollection);

    const toDelete = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const title = data.title || "";
      // Delete if no title or if title is "Untitled"
      if (!title || title === "Untitled" || title.trim() === "") {
        toDelete.push(doc.id);
      }
    });

    console.log(`Found ${toDelete.length} demo prompts to delete`);

    // Delete each one
    for (const promptId of toDelete) {
      await deleteDoc(doc(db, "prompts", promptId));
      console.log(`Deleted: ${promptId}`);
    }

    // Reload the prompts list
    adminState.prompts = [];
    const reloadedSnapshot = await getDocs(promptsCollection);
    reloadedSnapshot.forEach((doc) => {
      adminState.prompts.push({ ...doc.data(), id: doc.id });
    });

    // Log the cleanup activity
    await logActivityAsync(
      "cleanup",
      `Removed ${toDelete.length} demo prompts`,
    );

    // Update the UI
    renderPromptsTable();
    updateSidebarCounts();
    updateStorageBar();
    renderDashboard();

    console.log(`✓ Successfully deleted ${toDelete.length} demo prompts`);
    console.log(`✓ Kept ${adminState.prompts.length} real prompt(s)`);
    showToast(`Deleted ${toDelete.length} demo prompts!`, "success");

    return { deleted: toDelete.length, remaining: adminState.prompts.length };
  } catch (error) {
    console.error("Cleanup failed:", error);
    showToast("Cleanup failed: " + error.message, "error");
    return { error: error.message };
  }
}

// Make functions globally accessible for onclick handlers in HTML
window.switchSection = switchSection;
window.editPrompt = editPrompt;
window.confirmDelete = confirmDelete;
window.goPage = goPage;
window.removeTag = removeTag;
window.deleteCategory = deleteCategory;
window.cleanupUntitledPrompts = cleanupUntitledPrompts;
