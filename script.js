/* =========================================================
   PromptVerse — script.js
   ========================================================= */

// ========== FIREBASE IMPORTS ==========
import {
  recordPromptView,
  togglePromptLike,
  getUserLikeStatus,
  getPromptMetrics,
  listenToPromptMetrics,
  listenToUserLikeStatus,
} from "./firestore-service.js";

import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

(() => {
  "use strict";

  // Store for tracking real-time listeners
  const firestoreListeners = {};

  // Monitor auth state changes
  let currentUser = null;
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    console.log(
      "Auth state changed:",
      currentUser ? "Logged in" : "Logged out",
    );
  });

  /* ---------------------------------------------------------
     1. DATA: Categories
  --------------------------------------------------------- */
  const CATEGORIES = [
    { id: "couples", name: "Couples", icon: "fa-solid fa-heart" },
    { id: "friends", name: "Friends", icon: "fa-solid fa-people-group" },
    { id: "chibi", name: "AI Chibi", icon: "fa-solid fa-face-smile-beam" },
    { id: "cartoon", name: "Cartoon", icon: "fa-solid fa-palette" },
    {
      id: "caricature",
      name: "AI Caricature",
      icon: "fa-solid fa-masks-theater",
    },
    { id: "movie-poster", name: "Fake Movie Poster", icon: "fa-solid fa-film" },
    {
      id: "action-figure",
      name: "AI Action Figure",
      icon: "fa-solid fa-robot",
    },
    { id: "scrapbook", name: "Scrapbook", icon: "fa-solid fa-images" },
    { id: "journal", name: "Journal Style", icon: "fa-solid fa-book-open" },
    { id: "barbie", name: "Barbie Version", icon: "fa-solid fa-gem" },
    { id: "90s", name: "90s Photos", icon: "fa-solid fa-camera-retro" },
    { id: "anime", name: "Anime", icon: "fa-solid fa-dragon" },
    { id: "fantasy", name: "Fantasy", icon: "fa-solid fa-hat-wizard" },
  ];

  const catNameById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));

  /* ---------------------------------------------------------
     2. DATA: Prompts (loaded from Firestore only)
  --------------------------------------------------------- */
  let PROMPTS = [];

  /* ---------------------------------------------------------
     3. STATE
  --------------------------------------------------------- */
  const state = {
    activeCategory: null,
    searchTerm: "",
    bookmarks: new Set(
      JSON.parse(localStorage.getItem("pv_bookmarks") || "[]"),
    ),
  };

  const saveBookmarks = () => {
    localStorage.setItem("pv_bookmarks", JSON.stringify([...state.bookmarks]));
    updateBookmarkCount();
  };

  /* ---------------------------------------------------------
     4. DOM REFS
  --------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ---------------------------------------------------------
     AUTH HELPERS
  --------------------------------------------------------- */
  function isLoggedIn() {
    return !!localStorage.getItem("pv_user");
  }

  function redirectToAuth(next = "/", action = "", id = "") {
    const url = new URL(window.location.origin + "/auth.html");
    if (next) url.searchParams.set("next", next);
    if (action) url.searchParams.set("action", action);
    if (id) url.searchParams.set("id", id);
    window.location.href = url.href;
  }

  const trendingGrid = $("#trendingGrid");
  const bookmarkedRow = $("#bookmarkedRow");
  const latestRow = $("#latestRow");
  const categoriesGrid = $("#categoriesGrid");
  const navCatDropdown = $("#navCatDropdown");
  const mobileCatList = $("#mobileCatList");
  const emptyState = $("#emptyState");
  const activeFilterBar = $("#activeFilterBar");
  const activeFilterText = $("#activeFilterText");
  const bookmarkCountEl = $("#bookmarkCount");

  /* ---------------------------------------------------------
     5. RENDER HELPERS
  --------------------------------------------------------- */
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async function createPromptCard(p) {
    // VALIDATE: Skip incomplete prompts - no fake/untitled cards
    if (!p || !p.title || !p.title.trim() || !p.prompt || !p.prompt.trim() || !p.id) {
      console.warn(
        "[Card Validation] Skipping incomplete prompt:",
        p,
      );
      return null;
    }

    const card = document.createElement("div");
    card.className = "prompt-card";
    card.dataset.id = p.id;

    const isSaved = state.bookmarks.has(p.id);

    // Get metrics from Firestore
    const metrics = await getPromptMetrics(p.id);
    const views = metrics.views || 0;
    const likes = metrics.likes || 0;

    // Check if current user liked this prompt
    const likeStatus = await getUserLikeStatus(p.id);
    const isLiked = likeStatus.liked || false;

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${p.img}" alt="${p.title}" loading="lazy">
        <div class="card-overlay"></div>
        
        <div class="card-actions-top">
          <button class="card-action-btn card-like-btn ${isLiked ? "liked" : ""}" 
                  aria-label="Like this prompt" type="button">
            <i class="fa-${isLiked ? "solid" : "regular"} fa-heart"></i>
          </button>
          <button class="card-action-btn card-save-btn ${isSaved ? "saved" : ""}" data-id="${p.id}" aria-label="Save this prompt" type="button">
            <i class="fa-${isSaved ? "solid" : "regular"} fa-bookmark"></i>
          </button>
        </div>
        
        <button class="card-action-center" aria-label="View prompt details" type="button">
          <i class="fa-solid fa-arrow-up-right"></i>
        </button>
        
        <div class="card-category-badge">${(catNameById[p.category] || p.category).toUpperCase()}</div>
      </div>
      
      <div class="card-content">
        <h3 class="card-title">${p.title}</h3>
        <div class="card-meta">
          <div class="card-meta-left">
            <span class="meta-item card-views"><i class="fa-solid fa-eye"></i> ${views}</span>
            <span class="meta-item card-likes"><i class="fa-solid fa-heart"></i> ${likes}</span>
          </div>
          <span class="card-meta-date">${new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      </div>
    `;

    // Card click to open modal
    card.addEventListener("click", (e) => {
      if (
        e.target.closest(".card-action-btn") ||
        e.target.closest(".card-action-center")
      )
        return;
      openModal(p.id);
    });

    // Save button
    const saveBtn = card.querySelector(".card-save-btn");
    saveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isLoggedIn()) {
        // redirect to auth page and request bookmark after login
        redirectToAuth(
          window.location.pathname +
            window.location.search +
            window.location.hash,
          "bookmark",
          p.id,
        );
        return;
      }
      toggleBookmark(p.id);
      saveBtn.classList.toggle("saved", state.bookmarks.has(p.id));
    });

    // Like button
    const likeBtn = card.querySelector(".card-like-btn");
    if (likeBtn) {
      likeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const result = await togglePromptLike(p.id);
        if (result.success) {
          // Update button state
          likeBtn.classList.toggle("liked", result.liked);
          likeBtn.innerHTML = `<i class="fa-${result.liked ? "solid" : "regular"} fa-heart"></i>`;
          showToast(result.message, "fa-solid fa-heart");
        } else {
          showToast(
            result.message || "Error",
            "fa-solid fa-exclamation-circle",
          );
        }
      });
    }

    // Center action button
    const actionCenter = card.querySelector(".card-action-center");
    actionCenter.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(p.id);
    });

    // Set up real-time listener for metrics
    if (!firestoreListeners[p.id]) {
      firestoreListeners[p.id] = listenToPromptMetrics(p.id, (metrics) => {
        updateCardMetrics(p.id, metrics);
      });
    }

    return card;
  }

  /**
   * Update card views display when Firestore data changes
   */
  function updateCardMetrics(promptId, metrics) {
    document
      .querySelectorAll(`.prompt-card[data-id="${promptId}"] .card-views`)
      .forEach((el) => {
        el.innerHTML = `<i class="fa-solid fa-eye"></i> ${metrics.views}`;
      });

    document
      .querySelectorAll(`.prompt-card[data-id="${promptId}"] .card-likes`)
      .forEach((el) => {
        el.innerHTML = `<i class="fa-solid fa-heart"></i> ${metrics.likes}`;
      });
  }

  /**
   * Update modal metrics display
   */
  function updateModalMetrics(metrics) {
    const viewsEl = document.getElementById("modalViews");
    const likesEl = document.getElementById("modalLikes");

    if (viewsEl) viewsEl.textContent = metrics.views;
    if (likesEl) likesEl.textContent = metrics.likes;
  }

  /**
   * Update modal like button state
   */
  async function updateModalLikeButton(promptId) {
    const likeStatus = await getUserLikeStatus(promptId);
    const likeBtn = document.getElementById("modalLikeBtn");

    if (likeBtn) {
      likeBtn.classList.toggle("liked", likeStatus.liked);
      likeBtn.innerHTML = likeStatus.liked
        ? '<i class="fa-solid fa-heart"></i> Liked'
        : '<i class="fa-regular fa-heart"></i> Like';
    }
  }

  function getFilteredPrompts() {
    return PROMPTS.filter((p) => {
      const matchesCategory =
        !state.activeCategory || p.category === state.activeCategory;
      const term = state.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        p.title.toLowerCase().includes(term) ||
        p.prompt.toLowerCase().includes(term) ||
        catNameById[p.category].toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }

  function renderTrending() {
    const filtered = getFilteredPrompts();
    trendingGrid.innerHTML = "";
    if (filtered.length === 0) {
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      // Create cards asynchronously
      Promise.all(filtered.map((p) => createPromptCard(p)))
        .then((cards) =>
          cards
            .filter((card) => card !== null) // Skip incomplete prompts that returned null
            .forEach((card) => trendingGrid.appendChild(card)),
        )
        .catch((err) => console.error("Error rendering trending cards:", err));
    }

    // active filter bar
    if (state.activeCategory || state.searchTerm) {
      activeFilterBar.hidden = false;
      const parts = [];
      if (state.activeCategory) parts.push(catNameById[state.activeCategory]);
      if (state.searchTerm) parts.push(`“${state.searchTerm}”`);
      activeFilterText.textContent = `Showing: ${parts.join(" + ")}`;
    } else {
      activeFilterBar.hidden = true;
    }
  }

  function renderBookmarkedRow() {
    const top = [...PROMPTS]
      .sort((a, b) => b.bookmarks - a.bookmarks)
      .slice(0, 10);
    bookmarkedRow.innerHTML = "";
    Promise.all(top.map((p) => createPromptCard(p)))
      .then((cards) => cards
        .filter((card) => card !== null) // Skip incomplete prompts that returned null
        .forEach((card) => bookmarkedRow.appendChild(card)))
      .catch((err) => console.error("Error rendering bookmarked cards:", err));
  }

  function renderLatestRow() {
    const latest = [...PROMPTS]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    latestRow.innerHTML = "";
    Promise.all(latest.map((p) => createPromptCard(p)))
      .then((cards) => cards
        .filter((card) => card !== null) // Skip incomplete prompts that returned null
        .forEach((card) => latestRow.appendChild(card)))
      .catch((err) => console.error("Error rendering latest cards:", err));
  }

  function renderAllCardSections() {
    renderTrending();
    renderBookmarkedRow();
    renderLatestRow();
  }

  function renderCategories() {
    // Horizontal scroll section
    categoriesGrid.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className =
        "category-card" + (state.activeCategory === cat.id ? " active" : "");
      btn.dataset.id = cat.id;
      btn.innerHTML = `
        <span class="category-icon"><i class="${cat.icon}"></i></span>
        <span>${cat.name}</span>
      `;
      btn.addEventListener("click", () => setCategory(cat.id));
      categoriesGrid.appendChild(btn);
    });

    // Nav dropdown
    navCatDropdown.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const btn = document.createElement("button");
      btn.innerHTML = `<i class="${cat.icon}"></i> ${cat.name}`;
      btn.addEventListener("click", () => {
        setCategory(cat.id);
        navCatDropdown.classList.remove("open");
        $("#navCatToggle").classList.remove("open");
      });
      navCatDropdown.appendChild(btn);
    });

    // Mobile drawer list
    mobileCatList.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const btn = document.createElement("button");
      btn.innerHTML = `<i class="${cat.icon}"></i> ${cat.name}`;
      btn.addEventListener("click", () => {
        setCategory(cat.id);
        closeMobileDrawer();
      });
      mobileCatList.appendChild(btn);
    });
  }

  function setCategory(id) {
    state.activeCategory = state.activeCategory === id ? null : id;
    renderCategories();
    renderTrending();
    document
      .getElementById("trending")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateBookmarkCount() {
    bookmarkCountEl.textContent = state.bookmarks.size;
  }

  function toggleBookmark(id) {
    if (state.bookmarks.has(id)) {
      state.bookmarks.delete(id);
      showToast("Removed from bookmarks", "fa-solid fa-bookmark-slash");
    } else {
      state.bookmarks.add(id);
      showToast("Saved to bookmarks", "fa-solid fa-bookmark");
    }
    saveBookmarks();
    // refresh all rendered cards' bookmark state
    $$(".card-save-btn").forEach((btn) => {
      const bid = btn.dataset.id;
      const saved = state.bookmarks.has(bid);
      btn.classList.toggle("saved", saved);
      btn.querySelector("i").className =
        `fa-${saved ? "solid" : "regular"} fa-bookmark`;
    });
    if (currentModalId === id) syncModalBookmarkButton(id);
  }

  /* ---------------------------------------------------------
     6. MODAL
  --------------------------------------------------------- */
  let currentModalId = null;
  const modalOverlay = $("#modalOverlay");

  function openModal(id) {
    const p = PROMPTS.find((x) => x.id === id);
    if (!p) return;
    currentModalId = id;

    // Record view in Firestore
    recordPromptView(id);

    // Fetch and display metrics
    getPromptMetrics(id).then((metrics) => {
      updateModalMetrics(metrics);
    });

    $("#modalImage").src = p.img;
    $("#modalImage").alt = p.title;
    $("#modalCategoryChip").textContent = catNameById[p.category];
    $("#modalTitle").textContent = p.title;
    $("#modalBookmarkCount").textContent = p.bookmarks;
    $("#modalDate").textContent = formatDate(p.date);
    $("#modalPromptText").textContent = p.prompt;

    const encoded = encodeURIComponent(p.prompt);
    $("#modalChatGPTBtn").href = `https://chat.openai.com/?q=${encoded}`;
    $("#modalGeminiBtn").href = `https://gemini.google.com/app?q=${encoded}`;

    syncModalBookmarkButton(id);

    // Update like button
    updateModalLikeButton(id);

    // Set up real-time listener for modal metrics
    if (firestoreListeners[`modal_${id}`]) {
      firestoreListeners[`modal_${id}`]();
    }
    firestoreListeners[`modal_${id}`] = listenToPromptMetrics(id, (metrics) => {
      updateModalMetrics(metrics);
    });

    modalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function syncModalBookmarkButton(id) {
    const btn = $("#modalBookmarkBtn");
    const saved = state.bookmarks.has(id);
    btn.classList.toggle("btn-outline", !saved);
    btn.classList.toggle("btn-primary", saved);
    btn.innerHTML = saved
      ? '<i class="fa-solid fa-bookmark"></i> Saved'
      : '<i class="fa-regular fa-bookmark"></i> Save';
  }

  function closeModal() {
    // Clean up listeners when closing modal
    if (currentModalId && firestoreListeners[`modal_${currentModalId}`]) {
      firestoreListeners[`modal_${currentModalId}`]();
      delete firestoreListeners[`modal_${currentModalId}`];
    }

    modalOverlay.classList.remove("open");
    document.body.style.overflow = "";
    currentModalId = null;
  }

  $("#modalClose").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modalOverlay.classList.contains("open")) closeModal();
      closeMobileDrawer();
      navCatDropdown.classList.remove("open");
    }
  });

  $("#modalBookmarkBtn").addEventListener("click", () => {
    if (currentModalId) toggleBookmark(currentModalId);
  });

  // Modal like button handler
  $("#modalLikeBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!currentModalId) return;

    const result = await togglePromptLike(currentModalId);
    if (result.success) {
      await updateModalLikeButton(currentModalId);
      showToast(result.message, "fa-solid fa-heart");
    } else {
      showToast(
        result.message || "Error updating like",
        "fa-solid fa-exclamation-circle",
      );
    }
  });

  $("#modalCopyBtn").addEventListener("click", async () => {
    const p = PROMPTS.find((x) => x.id === currentModalId);
    if (!p) return;
    try {
      await navigator.clipboard.writeText(p.prompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = p.prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    const toast = $("#modalToast");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  });

  /* ---------------------------------------------------------
     7. GLOBAL TOAST
  --------------------------------------------------------- */
  let toastTimer = null;
  function showToast(message, icon = "fa-solid fa-circle-check") {
    const toast = $("#globalToast");
    toast.innerHTML = `<i class="${icon}"></i> ${message}`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  /* ---------------------------------------------------------
     8. SEARCH
  --------------------------------------------------------- */
  function setSearch(value) {
    state.searchTerm = value;
    $("#heroSearchInput").value = value;
    renderTrending();
    if (value)
      document
        .getElementById("trending")
        .scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("#heroSearchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    setSearch($("#heroSearchInput").value);
  });

  $$(".hero-tag-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const tag = chip.dataset.tag;
      const cat = CATEGORIES.find((c) => c.name === tag);
      if (cat) setCategory(cat.id);
    });
  });

  $("#clearFilterBtn").addEventListener("click", () => {
    state.activeCategory = null;
    state.searchTerm = "";
    $("#heroSearchInput").value = "";
    renderCategories();
    renderTrending();
  });

  /* ---------------------------------------------------------
     9. NAV CATEGORY DROPDOWN
  --------------------------------------------------------- */
  const navCatToggle = $("#navCatToggle");
  navCatToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    navCatDropdown.classList.toggle("open");
    navCatToggle.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-categories")) {
      navCatDropdown.classList.remove("open");
      navCatToggle.classList.remove("open");
    }
  });

  /* ---------------------------------------------------------
     10. MOBILE DRAWER
  --------------------------------------------------------- */
  const mobileDrawer = $("#mobileDrawer");
  const drawerOverlay = $("#drawerOverlay");

  function openMobileDrawer() {
    mobileDrawer.classList.add("open");
    drawerOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeMobileDrawer() {
    mobileDrawer.classList.remove("open");
    drawerOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  $("#mobileMenuToggle").addEventListener("click", openMobileDrawer);
  $("#closeMobileDrawer").addEventListener("click", closeMobileDrawer);
  drawerOverlay.addEventListener("click", closeMobileDrawer);

  /* ---------------------------------------------------------
     11. DARK MODE
  --------------------------------------------------------- */
  function applyDarkMode(isDark) {
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("pv_dark", isDark ? "1" : "0");
    $$("#darkModeToggle i, #mobileDarkToggle i").forEach((i) => {
      i.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    });
  }

  function toggleDarkMode() {
    applyDarkMode(!document.body.classList.contains("dark"));
  }

  $("#darkModeToggle").addEventListener("click", toggleDarkMode);
  $("#mobileDarkToggle").addEventListener("click", toggleDarkMode);

  /* ---------------------------------------------------------
     12. AUTH UI: Navbar visibility based on login state
  --------------------------------------------------------- */
  function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const loginBtn = $("#loginBtn");
    const profileMenuWrapper = $("#profileMenuWrapper");
    const navBookmarkBtn = $("#navBookmarkBtn");

    if (loggedIn) {
      loginBtn.style.display = "none";
      profileMenuWrapper.style.display = "flex";
      navBookmarkBtn.style.display = "flex";

      // Load user data
      const user = JSON.parse(localStorage.getItem("pv_user"));
      $("#profileUsername").textContent = user.username || "User";
      $("#profileEmail").textContent = user.email || "";
    } else {
      loginBtn.style.display = "inline-flex";
      profileMenuWrapper.style.display = "none";
      navBookmarkBtn.style.display = "none";
    }
  }

  // Profile menu toggle
  const profileMenuBtn = $("#profileMenuBtn");
  const profileDropdown = $("#profileDropdown");

  profileMenuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = profileDropdown.hasAttribute("hidden");
    if (isHidden) {
      profileDropdown.removeAttribute("hidden");
    } else {
      profileDropdown.setAttribute("hidden", "");
    }
  });

  // Close profile menu on click outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".profile-menu-wrapper")) {
      profileDropdown?.setAttribute("hidden", "");
    }
  });

  // Handle logout
  const logoutBtn = $("#logoutBtn");
  logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("pv_user");
    localStorage.removeItem("pv_auth_token");
    updateAuthUI();
    showToast("Logged out successfully", "fa-solid fa-sign-out-alt");
  });

  // Handle "My Bookmarks" link
  const myBookmarksLink = $("#myBookmarksLink");
  myBookmarksLink?.addEventListener("click", (e) => {
    e.preventDefault();
    profileDropdown?.setAttribute("hidden", "");
    document
      .getElementById("mostBookmarked")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------------------------------------------------------
     13. LOGIN BUTTON + Bookmark nav button
  --------------------------------------------------------- */
  $("#loginBtn").addEventListener("click", () => {
    if (isLoggedIn()) return (window.location.href = "profile.html");
    redirectToAuth(
      window.location.pathname + window.location.search + window.location.hash,
    );
  });
  $("#mobileLoginBtn").addEventListener("click", () => {
    if (isLoggedIn()) return (window.location.href = "profile.html");
    redirectToAuth(
      window.location.pathname + window.location.search + window.location.hash,
    );
  });

  $("#navBookmarkBtn")?.addEventListener("click", () => {
    document
      .getElementById("mostBookmarked")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------------------------------------------------------
     14. NAVBAR SCROLL SHADOW (subtle)
  --------------------------------------------------------- */
  const navbar = $("#navbar");
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const sc = window.scrollY;
    navbar.style.boxShadow =
      sc > 10 ? "0 8px 24px rgba(139,92,246,0.10)" : "none";
    lastScroll = sc;
  });

  /* ---------------------------------------------------------
     15. INIT
  --------------------------------------------------------- */
  /**
   * Load prompts from Firestore if available, otherwise use defaults
   */
  async function loadPromptsFromFirestore() {
    try {
      const { getDocs, collection } =
        await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
      const { db } = await import("./firebase-config.js");

      const promptsCollection = collection(db, "prompts");
      const snapshot = await getDocs(promptsCollection);

      if (!snapshot.empty) {
        const firestorePrompts = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // ONLY load complete prompts with required fields
          // Skip any incomplete documents
          if (!data.title || !data.prompt) {
            console.warn(
              "[Public Site] Skipping incomplete prompt:",
              doc.id,
              "missing title or prompt",
            );
            return; // Skip this document
          }

          firestorePrompts.push({
            id: data.id || doc.id,
            category: data.category || "uncategorized",
            title: data.title,
            img: data.image || "",
            prompt: data.prompt,
            bookmarks: data.bookmarks || 0,
            date: data.dateAdded
              ? new Date(data.dateAdded).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
          });
        });

        if (firestorePrompts.length > 0) {
          PROMPTS = firestorePrompts;
          console.log(
            "[Public Site] Loaded",
            PROMPTS.length,
            "complete prompts from Firestore",
          );
          return true;
        } else {
          console.log(
            "[Public Site] No complete prompts found in Firestore",
          );
        }
      } else {
        console.log("[Public Site] Firestore prompts collection is empty");
      }
    } catch (error) {
      console.warn(
        "[Public Site] Could not load from Firestore:",
        error.message,
      );
    }
    return false;
  }

  async function init() {
    // Load prompts from Firestore first - critical for data sync
    await loadPromptsFromFirestore();

    // restore dark mode
    const savedDark = localStorage.getItem("pv_dark") === "1";
    applyDarkMode(savedDark);

    // update auth UI
    updateAuthUI();

    renderCategories();
    renderAllCardSections();
    updateBookmarkCount();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
