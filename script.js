/* =========================================================
   PromptVerse — script.js
   ========================================================= */

(() => {
  'use strict';

  /* ---------------------------------------------------------
     1. DATA: Categories
  --------------------------------------------------------- */
  const CATEGORIES = [
    { id: 'couples', name: 'Couples', icon: 'fa-solid fa-heart' },
    { id: 'friends', name: 'Friends', icon: 'fa-solid fa-people-group' },
    { id: 'chibi', name: 'AI Chibi', icon: 'fa-solid fa-face-smile-beam' },
    { id: 'cartoon', name: 'Cartoon', icon: 'fa-solid fa-palette' },
    { id: 'caricature', name: 'AI Caricature', icon: 'fa-solid fa-masks-theater' },
    { id: 'movie-poster', name: 'Fake Movie Poster', icon: 'fa-solid fa-film' },
    { id: 'action-figure', name: 'AI Action Figure', icon: 'fa-solid fa-robot' },
    { id: 'scrapbook', name: 'Scrapbook', icon: 'fa-solid fa-images' },
    { id: 'journal', name: 'Journal Style', icon: 'fa-solid fa-book-open' },
    { id: 'barbie', name: 'Barbie Version', icon: 'fa-solid fa-gem' },
    { id: '90s', name: '90s Photos', icon: 'fa-solid fa-camera-retro' },
    { id: 'anime', name: 'Anime', icon: 'fa-solid fa-dragon' },
    { id: 'fantasy', name: 'Fantasy', icon: 'fa-solid fa-hat-wizard' },
  ];

  const catNameById = Object.fromEntries(CATEGORIES.map(c => [c.id, c.name]));

  /* ---------------------------------------------------------
     2. DATA: Prompts
  --------------------------------------------------------- */
  const PROMPTS = [
    {
      id: 'p01', category: 'couples',
      title: 'Dreamy Sunset Couple Portrait',
      img: 'https://images.unsplash.com/photo-1518621736915-f3b3c16b3b78?w=600&q=70',
      prompt: 'A romantic portrait of a couple silhouetted against a golden sunset, soft cinematic lighting, warm orange and pink tones, gentle film grain, shot on 35mm lens, dreamy bokeh background, hands intertwined, candid pose, ultra-detailed, photorealistic.',
      bookmarks: 482, date: '2026-06-10'
    },
    {
      id: 'p02', category: 'friends',
      title: 'Rooftop Golden Hour Friend Group',
      img: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=70',
      prompt: 'A group of five friends laughing together on a city rooftop during golden hour, candid street-style photography, warm color grade, lens flare, wide angle shot, natural skin tones, joyful energy, editorial fashion feel.',
      bookmarks: 311, date: '2026-06-12'
    },
    {
      id: 'p03', category: 'chibi',
      title: 'Pastel Chibi Avatar',
      img: 'https://images.unsplash.com/photo-1620336655055-bd87ad2c2c4e?w=600&q=70',
      prompt: 'Turn this photo into an adorable chibi-style character, oversized head, big sparkly eyes, soft pastel color palette, simple round body, cute blush cheeks, clean vector illustration, white background, kawaii anime sticker style.',
      bookmarks: 657, date: '2026-06-14'
    },
    {
      id: 'p04', category: 'cartoon',
      title: 'Disney-Inspired Cartoon Portrait',
      img: 'https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=600&q=70',
      prompt: 'Transform this photo into a 2D animated movie character, large expressive eyes, smooth cel-shading, vibrant color palette, soft rim lighting, storybook background, Pixar-style proportions, friendly expression.',
      bookmarks: 593, date: '2026-06-08'
    },
    {
      id: 'p05', category: 'caricature',
      title: 'Exaggerated Studio Caricature',
      img: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=600&q=70',
      prompt: 'Create a fun exaggerated caricature of this person, oversized head with tiny body, comedic proportions, bold ink outlines, watercolor splash background, playful expression, hand-drawn illustration style, theme park artist aesthetic.',
      bookmarks: 274, date: '2026-06-05'
    },
    {
      id: 'p06', category: 'movie-poster',
      title: 'A24-Style Indie Movie Poster',
      img: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=600&q=70',
      prompt: 'Design a vintage indie film poster starring this person, dramatic moody lighting, grainy film texture, bold minimalist typography placeholder at the bottom, muted earthy color grade, A24-inspired aesthetic, cinematic aspect ratio.',
      bookmarks: 412, date: '2026-06-15'
    },
    {
      id: 'p07', category: 'action-figure',
      title: 'Collectible Action Figure in Box',
      img: 'https://images.unsplash.com/photo-1605870445919-838d190e8e1b?w=600&q=70',
      prompt: 'Turn this person into a realistic collectible action figure still in its blister packaging, plastic toy texture, articulated joints, accessory pieces beside the figure, cardboard backing with logo placeholder, studio product photography lighting.',
      bookmarks: 829, date: '2026-06-16'
    },
    {
      id: 'p08', category: 'scrapbook',
      title: 'Vintage Polaroid Scrapbook Page',
      img: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=70',
      prompt: 'Arrange this photo as a vintage scrapbook page, polaroid-style border with handwritten captions, washi tape corners, pressed flowers, cream paper texture, nostalgic warm tones, doodled hearts and stars around the edges.',
      bookmarks: 198, date: '2026-06-02'
    },
    {
      id: 'p09', category: 'journal',
      title: 'Cozy Journal Aesthetic Spread',
      img: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&q=70',
      prompt: 'Create a cozy journal-style page featuring this photo, soft watercolor washes, handwritten font notes around the image, dried leaf and ribbon embellishments, beige textured paper background, muted earthy palette, aesthetic flatlay composition.',
      bookmarks: 233, date: '2026-06-11'
    },
    {
      id: 'p10', category: 'barbie',
      title: 'Barbie Box Doll Edition',
      img: 'https://images.unsplash.com/photo-1601758228041-3caa7c33d8d6?w=600&q=70',
      prompt: 'Transform this person into a Barbie-style doll inside retro packaging, glossy plastic skin texture, bright pink box background, bold "doll edition" logo placeholder, accessory icons in the corner, 90s toy commercial lighting.',
      bookmarks: 945, date: '2026-06-16'
    },
    {
      id: 'p11', category: '90s',
      title: 'Disposable Camera 90s Snapshot',
      img: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=600&q=70',
      prompt: 'Recreate this photo as a 90s disposable camera snapshot, flash-lit grainy texture, slightly overexposed highlights, date stamp in the corner, warm faded color cast, candid unposed feel, vintage film aesthetic.',
      bookmarks: 521, date: '2026-06-09'
    },
    {
      id: 'p12', category: 'anime',
      title: 'Studio Ghibli Style Portrait',
      img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=70',
      prompt: 'Reimagine this photo in Studio Ghibli anime art style, soft painterly background, hand-drawn line work, warm natural lighting, lush greenery and floating particles, gentle expression, nostalgic storybook color palette.',
      bookmarks: 768, date: '2026-06-13'
    },
    {
      id: 'p13', category: 'fantasy',
      title: 'Epic Fantasy Warrior Portrait',
      img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=70',
      prompt: 'Transform this person into an epic fantasy warrior, ornate armor with glowing runes, misty enchanted forest background, dramatic volumetric lighting, flowing cape, painterly digital art style, hyper-detailed, concept art quality.',
      bookmarks: 689, date: '2026-06-07'
    },
    {
      id: 'p14', category: 'couples',
      title: 'Cozy Cafe Couple Sketch',
      img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=70',
      prompt: 'Turn this couple photo into a soft pencil sketch illustration sitting in a cozy cafe, warm crosshatch shading, loose expressive linework, watercolor accent splashes, intimate candid moment, illustrated storybook feel.',
      bookmarks: 156, date: '2026-06-01'
    },
    {
      id: 'p15', category: 'friends',
      title: 'Retro Yearbook Friend Frame',
      img: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&q=70',
      prompt: 'Style this friend group photo like a 90s yearbook page, soft pastel laser background, ribbon banner with names placeholder, grainy film texture, nostalgic warm color grade, classic studio portrait lighting.',
      bookmarks: 204, date: '2026-06-06'
    },
    {
      id: 'p16', category: 'chibi',
      title: 'Chibi Couple Sticker Pack',
      img: 'https://images.unsplash.com/photo-1581281658433-9f1b1a9b8c4f?w=600&q=70',
      prompt: 'Create a chibi-style couple sticker illustration from this photo, holding hands, oversized heads, sparkling eyes, soft gradient pastel background, cute heart accents, clean vector sticker outline, kawaii aesthetic.',
      bookmarks: 387, date: '2026-06-04'
    },
    {
      id: 'p17', category: 'fantasy',
      title: 'Elven Forest Guardian',
      img: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=600&q=70',
      prompt: 'Reimagine this person as an elven forest guardian, pointed ears, glowing leaf-patterned tattoos, soft bioluminescent light, ancient mossy ruins background, ethereal fog, fantasy concept art, painterly digital brushwork.',
      bookmarks: 445, date: '2026-06-03'
    },
    {
      id: 'p18', category: 'anime',
      title: 'Shonen Action Anime Style',
      img: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&q=70',
      prompt: 'Convert this photo into a dynamic shonen anime panel, bold speed lines, dramatic action pose, vibrant saturated colors, sharp cel-shaded lighting, energy aura effect, manga-style ink outlines, high-impact composition.',
      bookmarks: 612, date: '2026-06-15'
    },
    {
      id: 'p19', category: 'movie-poster',
      title: 'Sci-Fi Blockbuster Poster',
      img: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&q=70',
      prompt: 'Design a sci-fi blockbuster movie poster featuring this person, neon-lit dystopian cityscape backdrop, dramatic low-angle hero shot, glowing teal and orange color grade, bold tagline placeholder, epic cinematic composition.',
      bookmarks: 298, date: '2026-05-30'
    },
    {
      id: 'p20', category: 'action-figure',
      title: 'Superhero Figure with Accessories',
      img: 'https://images.unsplash.com/photo-1612036782180-6f0822045d23?w=600&q=70',
      prompt: 'Create a hyper-detailed superhero action figure version of this person, matte plastic finish, interchangeable hands and accessories laid out beside it, display stand, collector packaging with window box, studio lighting.',
      bookmarks: 734, date: '2026-06-14'
    },
    {
      id: 'p21', category: '90s',
      title: 'VHS Home Video Still',
      img: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=70',
      prompt: 'Style this photo as a captured still from a 90s VHS home video, scan lines, slight chromatic aberration, timestamp overlay in the corner, soft blurred motion, warm nostalgic color cast, low-fidelity video texture.',
      bookmarks: 367, date: '2026-05-28'
    },
    {
      id: 'p22', category: 'barbie',
      title: 'Dreamhouse Barbie Scene',
      img: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=600&q=70',
      prompt: 'Place this person into a Barbie Dreamhouse-style scene, bright pink and pastel interior, glossy plastic textures, oversized furniture props, vibrant studio lighting, playful toy-commercial composition, saturated color palette.',
      bookmarks: 512, date: '2026-06-12'
    },
    {
      id: 'p23', category: 'cartoon',
      title: 'Saturday Morning Cartoon Style',
      img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=70',
      prompt: 'Turn this photo into a classic Saturday-morning cartoon character, bold flat colors, thick black outlines, simplified shapes, exaggerated expression, retro animation background patterns, nostalgic 90s cartoon aesthetic.',
      bookmarks: 287, date: '2026-06-09'
    },
    {
      id: 'p24', category: 'journal',
      title: 'Travel Memories Journal Layout',
      img: 'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=600&q=70',
      prompt: 'Design a travel journal spread using this photo, map fragments and postage stamp doodles, handwritten location notes, washi tape borders, kraft paper texture, warm sepia tones, scrapbook collage aesthetic.',
      bookmarks: 176, date: '2026-05-26'
    },
  ];

  /* ---------------------------------------------------------
     3. STATE
  --------------------------------------------------------- */
  const state = {
    activeCategory: null,
    searchTerm: '',
    bookmarks: new Set(JSON.parse(localStorage.getItem('pv_bookmarks') || '[]')),
  };

  const saveBookmarks = () => {
    localStorage.setItem('pv_bookmarks', JSON.stringify([...state.bookmarks]));
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
    return !!localStorage.getItem('pv_user');
  }

  function redirectToAuth(next = '/', action = '', id = '') {
    const url = new URL(window.location.origin + '/auth.html');
    if (next) url.searchParams.set('next', next);
    if (action) url.searchParams.set('action', action);
    if (id) url.searchParams.set('id', id);
    window.location.href = url.href;
  }

  const trendingGrid = $('#trendingGrid');
  const bookmarkedRow = $('#bookmarkedRow');
  const latestRow = $('#latestRow');
  const categoriesGrid = $('#categoriesGrid');
  const navCatDropdown = $('#navCatDropdown');
  const mobileCatList = $('#mobileCatList');
  const emptyState = $('#emptyState');
  const activeFilterBar = $('#activeFilterBar');
  const activeFilterText = $('#activeFilterText');
  const bookmarkCountEl = $('#bookmarkCount');

  /* ---------------------------------------------------------
     5. RENDER HELPERS
  --------------------------------------------------------- */
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function createPromptCard(p) {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.dataset.id = p.id;
    const isSaved = state.bookmarks.has(p.id);
    const views = Math.round(p.bookmarks * 2.3 + Math.random() * 100);
    const likes = Math.round(p.bookmarks * 0.8);

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${p.img}" alt="${p.title}" loading="lazy">
        <div class="card-overlay"></div>
        
        <div class="card-actions-top">
          <button class="card-action-btn card-like-btn" aria-label="Like this prompt">
            <i class="fa-regular fa-heart"></i>
          </button>
          <button class="card-action-btn card-save-btn ${isSaved ? 'saved' : ''}" data-id="${p.id}" aria-label="Save this prompt">
            <i class="fa-${isSaved ? 'solid' : 'regular'} fa-bookmark"></i>
          </button>
        </div>
        
        <button class="card-action-center" aria-label="View prompt details">
          <i class="fa-solid fa-arrow-up-right"></i>
        </button>
        
        <div class="card-category-badge">${(catNameById[p.category] || p.category).toUpperCase()}</div>
      </div>
      
      <div class="card-content">
        <h3 class="card-title">${p.title}</h3>
        <div class="card-meta">
          <div class="card-meta-left">
            <span class="meta-item"><i class="fa-solid fa-eye"></i> ${views}</span>
            <span class="meta-item"><i class="fa-solid fa-heart"></i> ${likes}</span>
          </div>
          <span class="card-meta-date">${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn') || e.target.closest('.card-action-center')) return;
      openModal(p.id);
    });

    const saveBtn = card.querySelector('.card-save-btn');
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isLoggedIn()) {
        // redirect to auth page and request bookmark after login
        redirectToAuth(window.location.pathname + window.location.search + window.location.hash, 'bookmark', p.id);
        return;
      }
      toggleBookmark(p.id);
      saveBtn.classList.toggle('saved', state.bookmarks.has(p.id));
    });

    const actionCenter = card.querySelector('.card-action-center');
    actionCenter.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(p.id);
    });

    return card;
  }

  function getFilteredPrompts() {
    return PROMPTS.filter(p => {
      const matchesCategory = !state.activeCategory || p.category === state.activeCategory;
      const term = state.searchTerm.trim().toLowerCase();
      const matchesSearch = !term ||
        p.title.toLowerCase().includes(term) ||
        p.prompt.toLowerCase().includes(term) ||
        catNameById[p.category].toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }

  function renderTrending() {
    const filtered = getFilteredPrompts();
    trendingGrid.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      filtered.forEach(p => trendingGrid.appendChild(createPromptCard(p)));
    }

    // active filter bar
    if (state.activeCategory || state.searchTerm) {
      activeFilterBar.hidden = false;
      const parts = [];
      if (state.activeCategory) parts.push(catNameById[state.activeCategory]);
      if (state.searchTerm) parts.push(`“${state.searchTerm}”`);
      activeFilterText.textContent = `Showing: ${parts.join(' + ')}`;
    } else {
      activeFilterBar.hidden = true;
    }
  }

  function renderBookmarkedRow() {
    const top = [...PROMPTS].sort((a, b) => b.bookmarks - a.bookmarks).slice(0, 10);
    bookmarkedRow.innerHTML = '';
    top.forEach(p => bookmarkedRow.appendChild(createPromptCard(p)));
  }

  function renderLatestRow() {
    const latest = [...PROMPTS].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    latestRow.innerHTML = '';
    latest.forEach(p => latestRow.appendChild(createPromptCard(p)));
  }

  function renderAllCardSections() {
    renderTrending();
    renderBookmarkedRow();
    renderLatestRow();
  }

  function renderCategories() {
    // Horizontal scroll section
    categoriesGrid.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'category-card' + (state.activeCategory === cat.id ? ' active' : '');
      btn.dataset.id = cat.id;
      btn.innerHTML = `
        <span class="category-icon"><i class="${cat.icon}"></i></span>
        <span>${cat.name}</span>
      `;
      btn.addEventListener('click', () => setCategory(cat.id));
      categoriesGrid.appendChild(btn);
    });

    // Nav dropdown
    navCatDropdown.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.innerHTML = `<i class="${cat.icon}"></i> ${cat.name}`;
      btn.addEventListener('click', () => {
        setCategory(cat.id);
        navCatDropdown.classList.remove('open');
        $('#navCatToggle').classList.remove('open');
      });
      navCatDropdown.appendChild(btn);
    });

    // Mobile drawer list
    mobileCatList.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.innerHTML = `<i class="${cat.icon}"></i> ${cat.name}`;
      btn.addEventListener('click', () => {
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
    document.getElementById('trending').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateBookmarkCount() {
    bookmarkCountEl.textContent = state.bookmarks.size;
  }

  function toggleBookmark(id) {
    if (state.bookmarks.has(id)) {
      state.bookmarks.delete(id);
      showToast('Removed from bookmarks', 'fa-solid fa-bookmark-slash');
    } else {
      state.bookmarks.add(id);
      showToast('Saved to bookmarks', 'fa-solid fa-bookmark');
    }
    saveBookmarks();
    // refresh all rendered cards' bookmark state
    $$('.card-save-btn').forEach(btn => {
      const bid = btn.dataset.id;
      const saved = state.bookmarks.has(bid);
      btn.classList.toggle('saved', saved);
      btn.querySelector('i').className = `fa-${saved ? 'solid' : 'regular'} fa-bookmark`;
    });
    if (currentModalId === id) syncModalBookmarkButton(id);
  }

  /* ---------------------------------------------------------
     6. MODAL
  --------------------------------------------------------- */
  let currentModalId = null;
  const modalOverlay = $('#modalOverlay');

  function openModal(id) {
    const p = PROMPTS.find(x => x.id === id);
    if (!p) return;
    currentModalId = id;

    $('#modalImage').src = p.img;
    $('#modalImage').alt = p.title;
    $('#modalCategoryChip').textContent = catNameById[p.category];
    $('#modalTitle').textContent = p.title;
    $('#modalBookmarkCount').textContent = p.bookmarks;
    $('#modalDate').textContent = formatDate(p.date);
    $('#modalPromptText').textContent = p.prompt;

    const encoded = encodeURIComponent(p.prompt);
    $('#modalChatGPTBtn').href = `https://chat.openai.com/?q=${encoded}`;
    $('#modalGeminiBtn').href = `https://gemini.google.com/app?q=${encoded}`;

    syncModalBookmarkButton(id);

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function syncModalBookmarkButton(id) {
    const btn = $('#modalBookmarkBtn');
    const saved = state.bookmarks.has(id);
    btn.classList.toggle('btn-outline', !saved);
    btn.classList.toggle('btn-primary', saved);
    btn.innerHTML = saved
      ? '<i class="fa-solid fa-bookmark"></i> Saved'
      : '<i class="fa-regular fa-bookmark"></i> Save';
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    currentModalId = null;
  }

  $('#modalClose').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('open')) closeModal();
      closeMobileDrawer();
      navCatDropdown.classList.remove('open');
    }
  });

  $('#modalBookmarkBtn').addEventListener('click', () => {
    if (currentModalId) toggleBookmark(currentModalId);
  });

  $('#modalCopyBtn').addEventListener('click', async () => {
    const p = PROMPTS.find(x => x.id === currentModalId);
    if (!p) return;
    try {
      await navigator.clipboard.writeText(p.prompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = p.prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const toast = $('#modalToast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  });

  /* ---------------------------------------------------------
     7. GLOBAL TOAST
  --------------------------------------------------------- */
  let toastTimer = null;
  function showToast(message, icon = 'fa-solid fa-circle-check') {
    const toast = $('#globalToast');
    toast.innerHTML = `<i class="${icon}"></i> ${message}`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  /* ---------------------------------------------------------
     8. SEARCH
  --------------------------------------------------------- */
  function setSearch(value) {
    state.searchTerm = value;
    $('#heroSearchInput').value = value;
    renderTrending();
    if (value) document.getElementById('trending').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#heroSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    setSearch($('#heroSearchInput').value);
  });

  $$('.hero-tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag;
      const cat = CATEGORIES.find(c => c.name === tag);
      if (cat) setCategory(cat.id);
    });
  });

  $('#clearFilterBtn').addEventListener('click', () => {
    state.activeCategory = null;
    state.searchTerm = '';
    $('#heroSearchInput').value = '';
    renderCategories();
    renderTrending();
  });

  /* ---------------------------------------------------------
     9. NAV CATEGORY DROPDOWN
  --------------------------------------------------------- */
  const navCatToggle = $('#navCatToggle');
  navCatToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navCatDropdown.classList.toggle('open');
    navCatToggle.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-categories')) {
      navCatDropdown.classList.remove('open');
      navCatToggle.classList.remove('open');
    }
  });

  /* ---------------------------------------------------------
     10. MOBILE DRAWER
  --------------------------------------------------------- */
  const mobileDrawer = $('#mobileDrawer');
  const drawerOverlay = $('#drawerOverlay');

  function openMobileDrawer() {
    mobileDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileDrawer() {
    mobileDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  $('#mobileMenuToggle').addEventListener('click', openMobileDrawer);
  $('#closeMobileDrawer').addEventListener('click', closeMobileDrawer);
  drawerOverlay.addEventListener('click', closeMobileDrawer);

  /* ---------------------------------------------------------
     11. DARK MODE
  --------------------------------------------------------- */
  function applyDarkMode(isDark) {
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('pv_dark', isDark ? '1' : '0');
    $$('#darkModeToggle i, #mobileDarkToggle i').forEach(i => {
      i.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
  }

  function toggleDarkMode() {
    applyDarkMode(!document.body.classList.contains('dark'));
  }

  $('#darkModeToggle').addEventListener('click', toggleDarkMode);
  $('#mobileDarkToggle').addEventListener('click', toggleDarkMode);

  /* ---------------------------------------------------------
     12. AUTH UI: Navbar visibility based on login state
  --------------------------------------------------------- */
  function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const loginBtn = $('#loginBtn');
    const profileMenuWrapper = $('#profileMenuWrapper');
    const navBookmarkBtn = $('#navBookmarkBtn');

    if (loggedIn) {
      loginBtn.style.display = 'none';
      profileMenuWrapper.style.display = 'flex';
      navBookmarkBtn.style.display = 'flex';

      // Load user data
      const user = JSON.parse(localStorage.getItem('pv_user'));
      $('#profileUsername').textContent = user.username || 'User';
      $('#profileEmail').textContent = user.email || '';
    } else {
      loginBtn.style.display = 'inline-flex';
      profileMenuWrapper.style.display = 'none';
      navBookmarkBtn.style.display = 'none';
    }
  }

  // Profile menu toggle
  const profileMenuBtn = $('#profileMenuBtn');
  const profileDropdown = $('#profileDropdown');

  profileMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = profileDropdown.hasAttribute('hidden');
    if (isHidden) {
      profileDropdown.removeAttribute('hidden');
    } else {
      profileDropdown.setAttribute('hidden', '');
    }
  });

  // Close profile menu on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.profile-menu-wrapper')) {
      profileDropdown?.setAttribute('hidden', '');
    }
  });

  // Handle logout
  const logoutBtn = $('#logoutBtn');
  logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('pv_user');
    localStorage.removeItem('pv_auth_token');
    updateAuthUI();
    showToast('Logged out successfully', 'fa-solid fa-sign-out-alt');
  });

  // Handle "My Bookmarks" link
  const myBookmarksLink = $('#myBookmarksLink');
  myBookmarksLink?.addEventListener('click', (e) => {
    e.preventDefault();
    profileDropdown?.setAttribute('hidden', '');
    document.getElementById('mostBookmarked').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------------------------------------------------------
     13. LOGIN BUTTON + Bookmark nav button
  --------------------------------------------------------- */
  $('#loginBtn').addEventListener('click', () => {
    if (isLoggedIn()) return window.location.href = 'profile.html';
    redirectToAuth(window.location.pathname + window.location.search + window.location.hash);
  });
  $('#mobileLoginBtn').addEventListener('click', () => {
    if (isLoggedIn()) return window.location.href = 'profile.html';
    redirectToAuth(window.location.pathname + window.location.search + window.location.hash);
  });

  $('#navBookmarkBtn')?.addEventListener('click', () => {
    document.getElementById('mostBookmarked').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------------------------------------------------------
     14. NAVBAR SCROLL SHADOW (subtle)
  --------------------------------------------------------- */
  const navbar = $('#navbar');
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const sc = window.scrollY;
    navbar.style.boxShadow = sc > 10 ? '0 8px 24px rgba(139,92,246,0.10)' : 'none';
    lastScroll = sc;
  });

  /* ---------------------------------------------------------
     15. INIT
  --------------------------------------------------------- */
  function init() {
    // restore dark mode
    const savedDark = localStorage.getItem('pv_dark') === '1';
    applyDarkMode(savedDark);

    // update auth UI
    updateAuthUI();

    renderCategories();
    renderAllCardSections();
    updateBookmarkCount();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
