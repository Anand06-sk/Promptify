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
  initializeBookmarksField,
} from "./firestore-service.js";

import {
  addBookmark,
  removeBookmark,
  isPromptBookmarked,
  getUserBookmarks,
  getBookmarkCount,
} from "./user-service.js";

import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

(() => {
  "use strict";

  // Store for tracking real-time listeners
  const firestoreListeners = {};

  // Monitor auth state changes
  let currentUser = null;
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    console.log(
      "Auth state changed:",
      currentUser ? "Logged in as " + currentUser.email : "Logged out",
    );
    // Load bookmarks from Firebase when user logs in/out
    await loadUserBookmarks();
    // Update UI when auth state changes
    updateAuthUI();
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
     2B. SEARCH INDEX: Firebase-powered tokenized search
  --------------------------------------------------------- */
  // Map of promptId -> array of searchable words (lowercase)
  // Built once after prompts load, used for fast filtering
  const searchIndex = new Map();

  /**
   * Build search index from all prompts
   * Extracts and normalizes all searchable terms:
   * - Title words
   * - Category name words
   * - All individual tags
   *
   * Called after loading prompts from Firebase
   * Enables fast, tokenized searching without re-parsing
   */
  function buildSearchIndex() {
    searchIndex.clear();

    PROMPTS.forEach((prompt) => {
      const words = new Set();

      // Extract title words
      if (prompt.title) {
        prompt.title
          .toLowerCase()
          .split(/\s+/)
          .forEach((word) => {
            if (word.trim()) words.add(word.trim());
          });
      }

      // Extract category name words
      if (prompt.category && catNameById[prompt.category]) {
        catNameById[prompt.category]
          .toLowerCase()
          .split(/\s+/)
          .forEach((word) => {
            if (word.trim()) words.add(word.trim());
          });
      }

      // Extract individual tags (stored as array in Firebase)
      if (Array.isArray(prompt.tags) && prompt.tags.length > 0) {
        prompt.tags.forEach((tag) => {
          if (tag && typeof tag === "string") {
            tag
              .toLowerCase()
              .split(/[\s,]+/) // Split by space or comma
              .forEach((word) => {
                if (word.trim()) words.add(word.trim());
              });
          }
        });
      }

      // Store normalized words for this prompt
      searchIndex.set(prompt.id, Array.from(words));
    });

    console.log("🔍 Search index built:", searchIndex.size, "prompts indexed");
  }

  /**
   * Check if a prompt matches the search terms
   * Supports:
   * - Partial word matching (e.g., "cut" matches "cute")
   * - Multi-word search (e.g., "cute couple" checks all words)
   * - Case-insensitive matching
   *
   * @param {Object} prompt - The prompt to check
   * @param {string} searchTerm - User's search input
   * @returns {boolean} True if prompt matches search terms
   */
  function searchMatches(prompt, searchTerm) {
    if (!searchTerm || !searchTerm.trim()) return true;

    const searchWords = searchTerm
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (searchWords.length === 0) return true;

    const promptWords = searchIndex.get(prompt.id) || [];

    // For multi-word search: at least one word should match
    // This provides breadth of matching for user friendliness
    return searchWords.some((searchWord) =>
      promptWords.some((promptWord) => promptWord.startsWith(searchWord)),
    );
  }

  /* ---------------------------------------------------------
     3. STATE
  --------------------------------------------------------- */
  const state = {
    activeCategory: null,
    searchTerm: "",
    bookmarks: new Set(), // Will be populated from Firebase
  };

  // Load user's bookmarks from Firebase
  async function loadUserBookmarks() {
    if (!currentUser) {
      state.bookmarks.clear();
      updateBookmarkCount();
      return;
    }

    try {
      const userBookmarks = await getUserBookmarks();
      state.bookmarks = new Set(userBookmarks.map((b) => b.promptId || b.id));
      console.log("📚 Loaded", state.bookmarks.size, "bookmarks from Firebase");
      updateBookmarkCount();
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      state.bookmarks.clear();
    }
  }

  /* ---------------------------------------------------------
     4. DOM REFS
  --------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ---------------------------------------------------------
     AUTH HELPERS
  --------------------------------------------------------- */
  function isLoggedIn() {
    return !!currentUser;
  }

  function redirectToAuth(next = "/", action = "", id = "") {
    const url = new URL(window.location.origin + "/auth.html");
    if (next) url.searchParams.set("next", next);
    if (action) url.searchParams.set("action", action);
    if (id) url.searchParams.set("id", id);
    window.location.href = url.href;
  }

  const trendingGrid = $("#trendingGrid");
  const likedRow = $("#likedRow");
  const viewedRow = $("#viewedRow");
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
    if (
      !p ||
      !p.title ||
      !p.title.trim() ||
      !p.prompt ||
      !p.prompt.trim() ||
      !p.id
    ) {
      console.warn("[Card Validation] Skipping incomplete prompt:", p);
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
        
        <button class="card-action-center card-view-btn" aria-label="View full image" type="button">
          <i class="fa-solid fa-eye"></i>
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
    saveBtn.addEventListener("click", async (e) => {
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

      // Pass prompt data when toggling bookmark
      const promptData = {
        promptId: p.id,
        title: p.title,
        category: p.category,
        image: p.img,
        prompt: p.prompt,
        date: p.date,
      };

      await toggleBookmark(p.id, promptData);
      saveBtn.classList.toggle("saved", state.bookmarks.has(p.id));
    });

    // View button - record view and open modal
    const viewBtn = card.querySelector(".card-view-btn");
    viewBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await recordPromptView(p.id);
      openModal(p.id);
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
    const bookmarkCountEl = document.getElementById("modalBookmarkCount");

    // Ensure all values are non-negative
    const views = Math.max(0, metrics.views || 0);
    const likes = Math.max(0, metrics.likes || 0);
    const bookmarks = Math.max(0, metrics.bookmarks || 0);

    if (viewsEl) viewsEl.textContent = views;
    if (likesEl) likesEl.textContent = likes;
    if (bookmarkCountEl) bookmarkCountEl.textContent = bookmarks;
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

  /**
   * Get filtered prompts based on active category and search term
   * Uses Firebase-powered tokenized search index for fast matching
   * Supports:
   * - Partial word matching across title, category, and tags
   * - Multi-word search (at least one word must match)
   * - Case-insensitive matching
   */
  function getFilteredPrompts() {
    return PROMPTS.filter((p) => {
      const matchesCategory =
        !state.activeCategory || p.category === state.activeCategory;
      const matchesSearch = searchMatches(p, state.searchTerm);
      return matchesCategory && matchesSearch;
    });
  }

  function renderTrending() {
    // Filter by active category and search term, then sort by engagement
    const filtered = getFilteredPrompts();
    const trending = [...filtered]
      .sort((a, b) => {
        const scoreA = (a.views || 0) + (a.likes || 0) + (a.bookmarks || 0);
        const scoreB = (b.views || 0) + (b.likes || 0) + (b.bookmarks || 0);
        return scoreB - scoreA;
      })
      .slice(0, 10);

    trendingGrid.innerHTML = "";
    if (trending.length === 0) {
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      // Create cards asynchronously
      Promise.all(trending.map((p) => createPromptCard(p)))
        .then((cards) =>
          cards
            .filter((card) => card !== null) // Skip incomplete prompts that returned null
            .forEach((card) => trendingGrid.appendChild(card)),
        )
        .catch((err) => console.error("Error rendering trending cards:", err));
    }

    // Display filter info
    if (state.activeCategory || state.searchTerm) {
      activeFilterBar.hidden = false;
      const parts = [];
      if (state.activeCategory) parts.push(catNameById[state.activeCategory]);
      if (state.searchTerm) parts.push(`"${state.searchTerm}"`);
      activeFilterText.textContent = "Showing: " + parts.join(" + ");
    } else {
      activeFilterBar.hidden = false;
      activeFilterText.textContent = "Showing: Trending Prompts by Engagement";
    }
  }

  function renderBookmarkedRow() {
    // Filter by active category and search term, then sort by bookmarks
    const filtered = getFilteredPrompts();
    const top = [...filtered]
      .sort((a, b) => b.bookmarks - a.bookmarks)
      .slice(0, 10);
    bookmarkedRow.innerHTML = "";
    Promise.all(top.map((p) => createPromptCard(p)))
      .then((cards) =>
        cards
          .filter((card) => card !== null) // Skip incomplete prompts that returned null
          .forEach((card) => bookmarkedRow.appendChild(card)),
      )
      .catch((err) => console.error("Error rendering bookmarked cards:", err));
  }

  function renderLikedRow() {
    // Filter by active category and search term, then sort by likes
    const filtered = getFilteredPrompts();
    const top = [...filtered]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 10);
    likedRow.innerHTML = "";
    Promise.all(top.map((p) => createPromptCard(p)))
      .then((cards) =>
        cards
          .filter((card) => card !== null) // Skip incomplete prompts that returned null
          .forEach((card) => likedRow.appendChild(card)),
      )
      .catch((err) => console.error("Error rendering liked cards:", err));
  }

  function renderViewedRow() {
    // Filter by active category and search term, then sort by views
    const filtered = getFilteredPrompts();
    const top = [...filtered]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10);
    viewedRow.innerHTML = "";
    Promise.all(top.map((p) => createPromptCard(p)))
      .then((cards) =>
        cards
          .filter((card) => card !== null) // Skip incomplete prompts that returned null
          .forEach((card) => viewedRow.appendChild(card)),
      )
      .catch((err) => console.error("Error rendering viewed cards:", err));
  }

  function renderLatestRow() {
    // Filter by active category and search term, then sort by date
    const filtered = getFilteredPrompts();
    const latest = [...filtered]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    latestRow.innerHTML = "";
    Promise.all(latest.map((p) => createPromptCard(p)))
      .then((cards) =>
        cards
          .filter((card) => card !== null) // Skip incomplete prompts that returned null
          .forEach((card) => latestRow.appendChild(card)),
      )
      .catch((err) => console.error("Error rendering latest cards:", err));
  }

  function renderAllCardSections() {
    renderTrending();
    renderLikedRow();
    renderViewedRow();
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
    renderAllCardSections();
    document
      .getElementById("trending")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateBookmarkCount() {
    bookmarkCountEl.textContent = state.bookmarks.size;
  }

  async function toggleBookmark(id, promptData = {}) {
    if (!currentUser) {
      redirectToAuth("/index.html");
      return;
    }

    try {
      if (state.bookmarks.has(id)) {
        // Remove bookmark
        await removeBookmark(id);
        state.bookmarks.delete(id);
        showToast("Removed from bookmarks", "fa-solid fa-bookmark-slash");
      } else {
        // Add bookmark
        await addBookmark(id, promptData);
        state.bookmarks.add(id);
        showToast("Saved to bookmarks", "fa-solid fa-bookmark");
      }

      // Refresh all rendered cards' bookmark state
      $$(".card-save-btn").forEach((btn) => {
        const bid = btn.dataset.id;
        const saved = state.bookmarks.has(bid);
        btn.classList.toggle("saved", saved);
        btn.querySelector("i").className =
          `fa-${saved ? "solid" : "regular"} fa-bookmark`;
      });
      if (currentModalId === id) syncModalBookmarkButton(id);
      updateBookmarkCount();
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      showToast("Error updating bookmark", "fa-solid fa-exclamation-circle");
    }
  }

  /* ---------------------------------------------------------
     6. MODAL
  --------------------------------------------------------- */
  let currentModalId = null;
  const modalOverlay = $("#modalOverlay");

  /**
   * Detect user's platform (iOS, Android, or Desktop)
   * @returns {string} 'ios' | 'android' | 'desktop'
   */
  function detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/android/.test(ua)) return "android";
    return "desktop";
  }

  /**
   * Open ChatGPT in new tab
   */
  function openChatGPT(prompt) {
    window.open("https://chat.openai.com", "_blank", "noopener,noreferrer");
  }

  /**
   * Open Gemini in new tab
   */
  function openGemini(prompt) {
    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
  }

  function openModal(id) {
    const p = PROMPTS.find((x) => x.id === id);
    if (!p) return;
    currentModalId = id;

    // Record view in Firestore
    recordPromptView(id);

    // Display prompt content
    $("#modalImage").src = p.img;
    $("#modalImage").alt = p.title;
    $("#modalCategoryChip").textContent = catNameById[p.category];
    $("#modalTitle").textContent = p.title;
    $("#modalDate").textContent = formatDate(p.date);
    $("#modalPromptText").textContent = p.prompt;

    // Fetch and display metrics from Firestore (views, likes, bookmarks)
    getPromptMetrics(id).then((metrics) => {
      updateModalMetrics(metrics);
    });

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

  $("#modalBookmarkBtn").addEventListener("click", async () => {
    if (!currentModalId) return;
    const p = PROMPTS.find((x) => x.id === currentModalId);
    if (!p) return;

    // Pass prompt data when toggling bookmark
    const promptData = {
      promptId: p.id,
      title: p.title,
      category: p.category,
      image: p.img,
      prompt: p.prompt,
      date: p.date,
    };

    await toggleBookmark(currentModalId, promptData);
    syncModalBookmarkButton(currentModalId);
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

  // Modal ChatGPT button handler - Open with app-first strategy
  $("#modalChatGPTBtn").addEventListener("click", (e) => {
    e.preventDefault();
    const p = PROMPTS.find((x) => x.id === currentModalId);
    if (!p) return;
    openChatGPT(p.prompt);
  });

  // Modal Gemini button handler - Open with app-first strategy
  $("#modalGeminiBtn").addEventListener("click", (e) => {
    e.preventDefault();
    const p = PROMPTS.find((x) => x.id === currentModalId);
    if (!p) return;
    openGemini(p.prompt);
  });

  // Modal share button handler
  const shareMenu = $("#shareMenu");
  const shareBtn = $("#modalShareBtn");

  shareBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    shareMenu.style.display =
      shareMenu.style.display === "none" ? "block" : "none";
  });

  // Close share menu when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#modalShareBtn") &&
      !e.target.closest("#shareMenu")
    ) {
      shareMenu.style.display = "none";
    }
  });

  // Social media share handlers
  const shareOptions = $$(".share-option");
  shareOptions.forEach((option) => {
    option.addEventListener("click", (e) => {
      e.preventDefault();
      const p = PROMPTS.find((x) => x.id === currentModalId);
      if (!p) return;

      const platform = option.dataset.platform;
      const imageUrl = encodeURIComponent(p.img);
      const shareText = encodeURIComponent(p.title);
      const websiteUrl = encodeURIComponent(window.location.origin);

      // Try native app first, fallback to web
      let appUrl = "";
      let webUrl = "";

      switch (platform) {
        case "whatsapp":
          // App URI: whatsapp://send?text=...
          // Web fallback: https://wa.me/
          appUrl = `whatsapp://send?text=${shareText}%20${imageUrl}%20Check%20this%20on%20${websiteUrl}`;
          webUrl = `https://wa.me/?text=${shareText}%20${imageUrl}%20Check%20this%20on%20${websiteUrl}`;
          break;
        case "telegram":
          // App URI: tg://msg?text=...
          // Web fallback: https://t.me/share/
          appUrl = `tg://msg?text=${shareText}%20${imageUrl}%20Check%20this%20on%20${websiteUrl}`;
          webUrl = `https://t.me/share/url?url=${imageUrl}&text=${shareText}`;
          break;
        case "facebook":
          // App URI: fb://page/ (doesn't support direct share, use web)
          // Web fallback: https://www.facebook.com/sharer/
          webUrl = `https://www.facebook.com/sharer/sharer.php?u=${imageUrl}`;
          appUrl = webUrl; // Use web as fallback for Facebook
          break;
        case "twitter":
          // App URI: twitter://post?text=...
          // Web fallback: https://twitter.com/intent/tweet
          appUrl = `twitter://post?text=${shareText}%20${imageUrl}`;
          webUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${imageUrl}`;
          break;
        case "instagram":
          // Instagram app doesn't support deep linking for sharing
          // Show toast and open app store link
          showToast(
            "Copy image and paste in Instagram app",
            "fa-solid fa-info-circle",
          );

          // Try to open Instagram app, fallback to web
          const instaAppUrl = `instagram://user?username=instagram`;
          const instaWebUrl = "https://www.instagram.com";

          // Try app first with timeout fallback
          openAppWithFallback(instaAppUrl, instaWebUrl, "Instagram");
          shareMenu.style.display = "none";
          return;
      }

      // Open app with web fallback
      if (appUrl && webUrl) {
        openAppWithFallback(appUrl, webUrl, platform);
      } else if (webUrl) {
        window.open(webUrl, "_blank", "width=600,height=600");
      }

      showToast(`Sharing on ${platform}...`, "fa-solid fa-share-nodes");
      shareMenu.style.display = "none";
    });
  });

  /**
   * Try to open native app, fallback to web if app not installed
   * Uses timeout to detect if app failed to open
   */
  function openAppWithFallback(appUrl, webUrl, platform) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    // For mobile, try app URI first
    if (isIOS || isAndroid) {
      const startTime = Date.now();

      // Try opening app
      window.location.href = appUrl;

      // If app doesn't open in 1.5 seconds, fallback to web
      setTimeout(() => {
        if (Date.now() - startTime < 2000) {
          window.open(webUrl, "_blank", "width=600,height=600");
          console.log(`${platform} app not found, opening web version`);
        }
      }, 1500);
    } else {
      // Desktop - just use web URL
      window.open(webUrl, "_blank", "width=600,height=600");
    }
  }

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
     8. SEARCH — Firebase-powered with real-time filtering
  --------------------------------------------------------- */
  function setSearch(value) {
    state.searchTerm = value;
    $("#heroSearchInput").value = value;
    renderAllCardSections();
    if (value)
      document
        .getElementById("trending")
        .scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Form submit handler - search only on Enter or Explore click
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
    renderAllCardSections();
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
    // Use Firebase currentUser instead of localStorage
    const loggedIn = !!currentUser;
    const loginBtn = $("#loginBtn");
    const profileMenuWrapper = $("#profileMenuWrapper");
    const navBookmarkBtn = $("#navBookmarkBtn");

    if (loggedIn) {
      loginBtn.style.display = "none";
      profileMenuWrapper.style.display = "flex";
      navBookmarkBtn.style.display = "flex";

      // Display Firebase user data (already set by index.html's auth listener)
      // No need to override - let index.html handle profile info
    } else {
      loginBtn.style.display = "inline-flex";
      profileMenuWrapper.style.display = "none";
      navBookmarkBtn.style.display = "none";
    }
  }

  // Profile menu toggle
  const profileMenuBtn = $("#profileMenuBtn");
  const profileDropdown = $("#profileDropdown");

  if (profileMenuBtn && profileDropdown) {
    // Navigate to profile.html when profile button is clicked
    profileMenuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "profile.html";
    });
  }

  // Close profile menu on click outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".profile-menu-wrapper")) {
      profileDropdown?.setAttribute("hidden", "");
    }
  });

  // Logout is now handled in index.html with Firebase authentication
  // No need for manual localStorage cleanup

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
            category: (data.category || "uncategorized").toLowerCase(), // Normalize to lowercase for category filtering
            title: data.title,
            img: data.image || "",
            prompt: data.prompt,
            tags: Array.isArray(data.tags) ? data.tags : [], // Include tags from Firebase
            bookmarks: typeof data.bookmarks === "number" ? data.bookmarks : 0,
            views: data.views || 0,
            likes: data.likes || 0,
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
          console.log("[Public Site] No complete prompts found in Firestore");
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

    // Initialize bookmarks field for all existing prompts (migration)
    // Ensures all prompts have bookmarks: 0 field initialized
    await initializeBookmarksField();

    // Build search index after loading prompts
    // Enables fast Firebase-powered search with title, category, and tags
    buildSearchIndex();

    // Dispatch event with prompt count
    window.dispatchEvent(
      new CustomEvent("promptsLoaded", {
        detail: { promptCount: PROMPTS.length },
      }),
    );

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

  // Handle opening modal when returning from profile.html
  document.addEventListener("DOMContentLoaded", () => {
    const promptIdToOpen = sessionStorage.getItem("openModalPromptId");
    if (promptIdToOpen) {
      sessionStorage.removeItem("openModalPromptId");
      // Wait a bit to ensure DOM is ready, then open modal
      setTimeout(() => {
        openModal(promptIdToOpen);
      }, 500);
    }
  });

  // Handle postMessage from profile.html
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "openPromptModal") {
      openModal(event.data.promptId);
    }
  });
})();
