// File: firebase-script-integration.js
// Copy and integrate these code blocks into your script.js

// ========== ADD AT TOP OF SCRIPT.JS IIFE ==========

import {
  recordPromptView,
  togglePromptLike,
  getUserLikeStatus,
  getPromptMetrics,
  listenToPromptMetrics,
  listenToUserLikeStatus,
  initializePromptsInFirestore
} from './firestore-service.js';

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Store for tracking real-time listeners
const firestoreListeners = {};

// Monitor auth state changes
let currentUser = null;
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  console.log('Auth state changed:', currentUser ? 'Logged in' : 'Logged out');
});

// ========== UTILITY FUNCTIONS TO ADD ==========

/**
 * Update card views display when Firestore data changes
 */
function updateCardMetrics(promptId, metrics) {
  document.querySelectorAll(`.prompt-card[data-id="${promptId}"] .card-views`).forEach(el => {
    el.innerHTML = `<i class="fa-solid fa-eye"></i> ${metrics.views}`;
  });
  
  document.querySelectorAll(`.prompt-card[data-id="${promptId}"] .card-likes`).forEach(el => {
    el.innerHTML = `<i class="fa-solid fa-heart"></i> ${metrics.likes}`;
  });
}

/**
 * Update modal metrics display
 */
function updateModalMetrics(metrics) {
  const viewsEl = document.getElementById('modalViews');
  const likesEl = document.getElementById('modalLikes');
  
  if (viewsEl) viewsEl.textContent = metrics.views;
  if (likesEl) likesEl.textContent = metrics.likes;
}

/**
 * Update modal like button state
 */
async function updateModalLikeButton(promptId) {
  const likeStatus = await getUserLikeStatus(promptId);
  const likeBtn = document.getElementById('modalLikeBtn');
  
  if (likeBtn) {
    likeBtn.classList.toggle('liked', likeStatus.liked);
    likeBtn.innerHTML = likeStatus.liked
      ? '<i class="fa-solid fa-heart"></i> Liked'
      : '<i class="fa-regular fa-heart"></i> Like';
  }
}

// ========== REPLACE EXISTING createPromptCard FUNCTION ==========

async function createPromptCard(p) {
  const card = document.createElement('div');
  card.className = 'prompt-card';
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
        <button class="card-action-btn card-like-btn ${isLiked ? 'liked' : ''}" 
                aria-label="Like this prompt" type="button">
          <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i>
        </button>
        <button class="card-action-btn card-save-btn ${isSaved ? 'saved' : ''}" 
                data-id="${p.id}" aria-label="Save this prompt" type="button">
          <i class="fa-${isSaved ? 'solid' : 'regular'} fa-bookmark"></i>
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
        <span class="card-meta-date">${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  `;

  // Card click to open modal
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-action-btn') || e.target.closest('.card-action-center')) return;
    openModal(p.id);
  });

  // Save button
  const saveBtn = card.querySelector('.card-save-btn');
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isLoggedIn()) {
      redirectToAuth(window.location.pathname + window.location.search + window.location.hash, 'bookmark', p.id);
      return;
    }
    toggleBookmark(p.id);
    saveBtn.classList.toggle('saved', state.bookmarks.has(p.id));
  });

  // Like button
  const likeBtn = card.querySelector('.card-like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      if (!currentUser) {
        showToast('Please log in to like prompts', 'fa-solid fa-heart');
        redirectToAuth(window.location.pathname + window.location.search + window.location.hash);
        return;
      }
      
      const result = await togglePromptLike(p.id);
      if (result.success) {
        // Update button state
        likeBtn.classList.toggle('liked', result.liked);
        likeBtn.innerHTML = `<i class="fa-${result.liked ? 'solid' : 'regular'} fa-heart"></i>`;
        showToast(result.message, 'fa-solid fa-heart');
      } else {
        showToast(result.message || 'Error', 'fa-solid fa-exclamation-circle');
      }
    });
  }

  // Center action button
  const actionCenter = card.querySelector('.card-action-center');
  actionCenter.addEventListener('click', (e) => {
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

// ========== REPLACE EXISTING openModal FUNCTION ==========

async function openModal(id) {
  const p = PROMPTS.find(x => x.id === id);
  if (!p) return;
  currentModalId = id;

  // Record view in Firestore
  await recordPromptView(id);
  
  // Fetch and display metrics
  const metrics = await getPromptMetrics(id);
  updateModalMetrics(metrics);

  $('#modalImage').src = p.img;
  $('#modalImage').alt = p.title;
  $('#modalCategoryChip').textContent = catNameById[p.category];
  $('#modalTitle').textContent = p.title;
  $('#modalBookmarkCount').textContent = p.bookmarks;
  $('#modalDate').textContent = formatDate(p.date);
  $('#modalPromptText').textContent = p.prompt;

  // Removed: Direct href assignment. ChatGPT/Gemini buttons now use event listeners
  // for proper app-first strategy with fallback to web. See script.js for implementation.


}

// ========== UPDATE closeModal FUNCTION ==========

function closeModal() {
  // Clean up listeners when closing modal
  if (currentModalId && firestoreListeners[`modal_${currentModalId}`]) {
    firestoreListeners[`modal_${currentModalId}`]();
    delete firestoreListeners[`modal_${currentModalId}`];
  }
  
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  currentModalId = null;
}

// ========== UPDATE MODAL LIKE BUTTON HANDLER ==========
// Add this in the section where you handle modal events

// Modal like button handler
$('#modalLikeBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  
  if (!currentUser) {
    showToast('Please log in to like prompts', 'fa-solid fa-heart');
    redirectToAuth(window.location.pathname + window.location.search + window.location.hash);
    return;
  }
  
  if (!currentModalId) return;
  
  const result = await togglePromptLike(currentModalId);
  if (result.success) {
    await updateModalLikeButton(currentModalId);
    showToast(result.message, 'fa-solid fa-heart');
  } else {
    showToast(result.message || 'Error updating like', 'fa-solid fa-exclamation-circle');
  }
});

// ========== UPDATE INIT FUNCTION ==========

async function init() {
  // restore dark mode
  const savedDark = localStorage.getItem('pv_dark') === '1';
  applyDarkMode(savedDark);

  // Initialize prompts in Firestore (creates documents if they don't exist)
  await initializePromptsInFirestore(PROMPTS);

  // update auth UI
  updateAuthUI();

  renderCategories();
  renderAllCardSections();
  updateBookmarkCount();
}
