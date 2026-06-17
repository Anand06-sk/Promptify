// ============================================================
// PROMPTVERSE ADMIN — Professional JS
// Real data only. No fake percentages, no fake trends.
// ============================================================

// ---- DATA LAYER ----
function getPromptsData() {
  return JSON.parse(localStorage.getItem('promptversePrompts') || '[]');
}

function getCategoriesData() {
  const defaults = [
    'Couples','Friends','AI Chibi','Cartoon','AI Caricature',
    'Fake Movie Poster','AI Action Figure','Scrapbook','Journal Style',
    'Barbie Version','90s Photos','Anime','Fantasy'
  ];
  return JSON.parse(localStorage.getItem('promptverseCategories') || JSON.stringify(defaults));
}

function savePromptsData(d)    { localStorage.setItem('promptversePrompts', JSON.stringify(d)); }
function saveCategoriesData(d) { localStorage.setItem('promptverseCategories', JSON.stringify(d)); }

// ---- STATE ----
const adminState = {
  currentSection: 'dashboard',
  prompts:        getPromptsData(),
  categories:     getCategoriesData(),
  editingIdx:     null,
  pendingDeleteIdx: null,
  darkMode:       localStorage.getItem('pvDarkMode') === '1',
  tags:           [],
  searchQuery:    '',
  sortBy:         'newest',
  filterCat:      'all',
  viewMode:       'table',
  page:           1,
  perPage:        10
};

// ---- ACTIVITY LOG (persisted) ----
function getActivityLog() {
  return JSON.parse(localStorage.getItem('pvActivityLog') || '[]');
}

function logActivity(type, title) {
  const log = getActivityLog();
  log.unshift({ type, title, ts: Date.now() });
  if (log.length > 50) log.length = 50;
  localStorage.setItem('pvActivityLog', JSON.stringify(log));
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
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
  renderDashboard();
  populateCategorySelects();
  updateSidebarCounts();
  updateStorageBar();

  const ts = document.getElementById('dashTimestamp');
  if (ts) ts.textContent = new Date().toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

  // Panel tabs
  document.querySelectorAll('.ptab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      drawActivityChart();
    });
  });

  // Select all
  document.addEventListener('change', e => {
    if (e.target && e.target.id === 'selectAll') {
      document.querySelectorAll('.row-check').forEach(cb => cb.checked = e.target.checked);
    }
  });

  window.addEventListener('resize', debounce(drawActivityChart, 300));
});

// ============================================================
// DARK MODE
// ============================================================
function setupDarkMode() {
  const toggle = document.getElementById('adminModeToggle');
  const moon   = document.getElementById('iconMoon');
  const sun    = document.getElementById('iconSun');

  function apply(on) {
    document.body.classList.toggle('dark-mode', on);
    if (moon) moon.style.display = on ? 'none' : '';
    if (sun)  sun.style.display  = on ? ''     : 'none';
  }

  apply(adminState.darkMode);

  if (toggle) toggle.addEventListener('click', () => {
    adminState.darkMode = !adminState.darkMode;
    apply(adminState.darkMode);
    localStorage.setItem('pvDarkMode', adminState.darkMode ? '1' : '0');
  });
}

// ============================================================
// NAVIGATION
// ============================================================
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchSection(item.dataset.section));
  });
}

function switchSection(id) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(id);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`.nav-item[data-section="${id}"]`);
  if (navItem) navItem.classList.add('active');

  adminState.currentSection = id;

  // Update breadcrumb
  const labels = {
    'dashboard':  'Dashboard',
    'prompts':    'Manage Prompts',
    'add-prompt': 'Add Prompt',
    'categories': 'Categories',
    'analytics':  'Analytics'
  };
  const bc = document.getElementById('pageBreadcrumb');
  if (bc) bc.textContent = labels[id] || id;

  if (id === 'dashboard')  renderDashboard();
  if (id === 'prompts')    { adminState.page = 1; renderPromptsTable(); }
  if (id === 'categories') renderCategoriesGrid();
  if (id === 'analytics')  renderAnalytics();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const prompts   = adminState.prompts;
  const bookmarks = JSON.parse(localStorage.getItem('promptverseBookmarks') || '[]');

  // Stat cards — real counts only
  animateCount('totalPromptsCount', prompts.length);
  animateCount('totalBookmarksCount', bookmarks.length);
  animateCount('totalCategoriesCount', adminState.categories.length);

  const avg = prompts.length ? (bookmarks.length / prompts.length) : 0;
  document.getElementById('avgBookmarksCount').textContent = avg.toFixed(2);

  // Sub-labels
  const psub = document.getElementById('statSubPrompts');
  if (psub) psub.textContent = prompts.length === 1 ? 'in your library' : `across ${adminState.categories.filter(c=>prompts.some(p=>p.category===c)).length} categories`;

  const csub = document.getElementById('statSubCats');
  if (csub) {
    const active = adminState.categories.filter(c => prompts.some(p=>p.category===c)).length;
    csub.textContent = `${active} of ${adminState.categories.length} have prompts`;
  }

  // Summary row
  const catCounts = {};
  adminState.categories.forEach(c => { catCounts[c] = prompts.filter(p=>p.category===c).length; });
  const topCat = Object.entries(catCounts).sort((a,b)=>b[1]-a[1])[0];
  setText('topCategory', topCat && topCat[1] > 0 ? `${topCat[0]} (${topCat[1]})` : '—');

  const last = [...prompts].sort((a,b)=>new Date(b.dateAdded||0)-new Date(a.dateAdded||0))[0];
  setText('lastAdded', last ? truncate(last.title, 22) : '—');

  const withImages = prompts.filter(p=>p.image).length;
  setText('promptsWithImages', `${withImages} / ${prompts.length}`);

  const filled = adminState.categories.filter(c=>prompts.some(p=>p.category===c)).length;
  setText('categoryCoverage', adminState.categories.length
    ? Math.round((filled/adminState.categories.length)*100)+'%' : '0%');

  // Storage
  const storBytes = new Blob([JSON.stringify(localStorage)]).size;
  setText('storageDisplay', formatBytes(storBytes));

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
  const feed = document.getElementById('recentActivity');
  if (!feed) return;

  const log = getActivityLog();
  const prompts = adminState.prompts;

  // Seed with real data if log is empty
  const items = [];

  if (log.length > 0) {
    log.slice(0, 8).forEach(entry => {
      items.push({
        title: entry.title,
        meta:  formatRelativeTime(entry.ts),
        color: colorForType(entry.type)
      });
    });
  } else {
    // Show real state info
    if (prompts.length > 0) {
      const last = [...prompts].sort((a,b)=>new Date(b.dateAdded||0)-new Date(a.dateAdded||0))[0];
      items.push({ title: `"${truncate(last.title,30)}" is the latest prompt`, meta: formatRelativeTime(new Date(last.dateAdded||Date.now()).getTime()), color:'#a855f7' });
    }
    if (prompts.length === 0) {
      items.push({ title: 'No prompts yet. Add your first prompt.', meta:'Now', color:'#9b8ec4' });
    }
    items.push({ title: `Library loaded: ${prompts.length} prompt${prompts.length!==1?'s':''}`, meta:'Now', color:'#10b981' });
    items.push({ title: `${adminState.categories.length} categories configured`, meta:'Now', color:'#a855f7' });
  }

  if (items.length === 0) {
    feed.innerHTML = '<div class="feed-empty">No activity recorded yet.</div>';
    return;
  }

  feed.innerHTML = items.map((item, i) => `
    <div class="activity-item" style="animation-delay:${i*60}ms">
      <div class="activity-dot" style="background:${item.color}"></div>
      <div class="activity-body">
        <div class="activity-title">${esc(item.title)}</div>
        <div class="activity-meta">${esc(item.meta)}</div>
      </div>
    </div>`).join('');
}

function colorForType(type) {
  const map = { add:'#10b981', delete:'#ef4444', edit:'#f59e0b', category:'#a855f7' };
  return map[type] || '#a855f7';
}

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff/1000);
  if (s < 60)  return 'Just now';
  if (s < 3600) return `${Math.floor(s/60)} min ago`;
  if (s < 86400) return `${Math.floor(s/3600)} hr ago`;
  return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function formatBytes(b) {
  if (b < 1024) return b+' B';
  if (b < 1024*1024) return (b/1024).toFixed(1)+' KB';
  return (b/(1024*1024)).toFixed(2)+' MB';
}

// ============================================================
// ACTIVITY CHART — Based on real dateAdded data
// ============================================================
function drawActivityChart() {
  const canvas = document.getElementById('activityChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.parentElement.clientWidth || 400;
  const H = 200;
  canvas.width  = W;
  canvas.height = H;

  const prompts = adminState.prompts;
  const activeTab = document.querySelector('.ptab.active');
  const range = activeTab ? activeTab.dataset.range : 'week';

  // Build real data from dateAdded
  const days = range === 'week' ? 7 : 30;
  const counts = Array(days).fill(0);
  const now = Date.now();

  prompts.forEach(p => {
    if (!p.dateAdded) return;
    const diff = Math.floor((now - new Date(p.dateAdded).getTime()) / 86400000);
    if (diff >= 0 && diff < days) {
      counts[days - 1 - diff]++;
    }
  });

  const chartEmpty = document.getElementById('chartEmpty');
  const totalActivity = counts.reduce((a,b)=>a+b, 0);

  if (totalActivity === 0 && prompts.length === 0) {
    if (chartEmpty) chartEmpty.style.display = 'flex';
    ctx.clearRect(0,0,W,H);
    return;
  }

  if (chartEmpty) chartEmpty.style.display = 'none';

  const labels = range === 'week'
    ? (() => {
        const days2 = [];
        for (let i=6;i>=0;i--) {
          const d = new Date(); d.setDate(d.getDate()-i);
          days2.push(d.toLocaleDateString('en-US',{weekday:'short'}));
        }
        return days2;
      })()
    : (() => {
        const days2 = [];
        for (let i=days-1;i>=0;i--) {
          const d = new Date(); d.setDate(d.getDate()-i);
          days2.push(i%5===0 ? d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '');
        }
        return days2;
      })();

  const max = Math.max(...counts, 1);
  const pad = { top:20, right:20, bottom:32, left:36 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  ctx.clearRect(0,0,W,H);

  // Grid
  const isDark = document.body.classList.contains('dark-mode');
  const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)';
  const textColor = isDark ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.35)';

  for (let i=0;i<=4;i++) {
    const y = pad.top + (cH/4)*i;
    ctx.beginPath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cW, y);
    ctx.stroke();

    // Y label
    const val = Math.round((max/4)*(4-i));
    ctx.fillStyle = textColor;
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val, pad.left-6, y+4);
  }

  const stepX = cW / (days - 1);

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top+cH);
  grad.addColorStop(0, isDark ? 'rgba(168,85,247,.3)' : 'rgba(168,85,247,.15)');
  grad.addColorStop(1, 'rgba(168,85,247,.01)');

  // Path
  const pts = counts.map((v,i) => ({
    x: pad.left + i * stepX,
    y: pad.top + cH - (v/max)*cH
  }));

  // Fill
  ctx.beginPath();
  pts.forEach((p,i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
  ctx.lineTo(pts[pts.length-1].x, pad.top+cH);
  ctx.lineTo(pts[0].x, pad.top+cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach((p,i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Points
  pts.forEach((p,i) => {
    if (counts[i] > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
      ctx.fillStyle = '#a855f7';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2);
      ctx.fillStyle = isDark ? '#16102a' : '#fff';
      ctx.fill();
    }

    // X label
    if (labels[i]) {
      ctx.fillStyle = textColor;
      ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], p.x, H - 6);
    }
  });
}

// ============================================================
// SPARKLINES — real data direction from prompts
// ============================================================
function drawSparklines() {
  const prompts = adminState.prompts;

  // For each sparkline, build 8-day history from real prompts
  function buildHistory(filterFn) {
    const counts = Array(8).fill(0);
    const now = Date.now();
    prompts.forEach(p => {
      if (!filterFn(p)) return;
      const diff = Math.floor((now - new Date(p.dateAdded||now).getTime()) / 86400000);
      if (diff >= 0 && diff < 8) counts[7-diff]++;
    });
    return counts;
  }

  const bookmarks = JSON.parse(localStorage.getItem('promptverseBookmarks') || '[]');

  const datasets = [
    buildHistory(() => true),          // spark1 = all prompts
    buildHistory(p => bookmarks.includes(p.id)), // spark2 = bookmarked
    buildHistory(p => !!p.category),   // spark3 = categorized
    buildHistory(p => !!p.image),      // spark4 = has image
  ];

  datasets.forEach((data, idx) => {
    const el = document.getElementById(`spark${idx+1}`);
    if (!el) return;
    el.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox','0 0 72 36');
    svg.style.cssText = 'width:100%;height:100%';

    const max = Math.max(...data, 1);
    const coords = data.map((v,i) => `${i*(72/7)},${36-((v/max)*28)+4}`).join(' ');

    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', coords);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#a855f7');
    poly.setAttribute('stroke-width', '2');
    poly.setAttribute('stroke-linejoin', 'round');
    poly.setAttribute('stroke-linecap', 'round');
    svg.appendChild(poly);
    el.appendChild(svg);
  });
}

// ============================================================
// STORAGE BAR
// ============================================================
function updateStorageBar() {
  const used  = new Blob([JSON.stringify(localStorage)]).size;
  const limit = 5 * 1024 * 1024;
  const pct   = Math.min((used / limit) * 100, 100).toFixed(1);

  const fill = document.getElementById('storageFill');
  const pctEl = document.getElementById('storagePct');
  const detail = document.getElementById('storageUsed');

  if (fill) fill.style.width = pct+'%';
  if (pctEl) pctEl.textContent = pct+'%';
  if (detail) detail.textContent = `${formatBytes(used)} of 5 MB`;
}

function updateSidebarCounts() {
  const pc = document.getElementById('sidebarPromptsCount');
  const cc = document.getElementById('sidebarCatsCount');
  if (pc) pc.textContent = adminState.prompts.length;
  if (cc) cc.textContent = adminState.categories.length;
}

// ============================================================
// PROMPTS TABLE
// ============================================================
function renderPromptsTable() {
  let list = [...adminState.prompts];
  const bookmarks = JSON.parse(localStorage.getItem('promptverseBookmarks') || '[]');

  if (adminState.searchQuery) {
    const q = adminState.searchQuery.toLowerCase();
    list = list.filter(p =>
      (p.title||'').toLowerCase().includes(q) ||
      (p.category||'').toLowerCase().includes(q) ||
      (p.tags||[]).join(' ').toLowerCase().includes(q)
    );
  }

  if (adminState.filterCat !== 'all') {
    list = list.filter(p => p.category === adminState.filterCat);
  }

  if (adminState.sortBy === 'newest') list.sort((a,b)=>new Date(b.dateAdded||0)-new Date(a.dateAdded||0));
  if (adminState.sortBy === 'oldest') list.sort((a,b)=>new Date(a.dateAdded||0)-new Date(b.dateAdded||0));
  if (adminState.sortBy === 'alpha')  list.sort((a,b)=>(a.title||'').localeCompare(b.title||''));

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / adminState.perPage));
  if (adminState.page > pages) adminState.page = pages;
  const start = (adminState.page - 1) * adminState.perPage;
  const paged = list.slice(start, start + adminState.perPage);

  const tbody = document.getElementById('promptsTableBody');
  const tableEmpty = document.getElementById('tableEmpty');

  if (!tbody) return;

  if (total === 0) {
    tbody.innerHTML = '';
    if (tableEmpty) tableEmpty.style.display = 'block';
  } else {
    if (tableEmpty) tableEmpty.style.display = 'none';
    tbody.innerHTML = paged.map((prompt, i) => {
      const idx    = adminState.prompts.indexOf(prompt);
      const saves  = bookmarks.filter(id => id === prompt.id).length;
      const tags   = (prompt.tags||[]).slice(0,3).map(t=>`<span class="tag-chip">${esc(t)}</span>`).join('');
      const dateStr = prompt.dateAdded
        ? new Date(prompt.dateAdded).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
        : '—';
      const hasImg = !!prompt.image;

      return `
        <tr style="animation:sectionIn .25s ease ${i*30}ms both">
          <td><input type="checkbox" class="check-input row-check" data-idx="${idx}"></td>
          <td>
            <div class="prompt-title-main">${esc(prompt.title||'Untitled')}</div>
            <div class="prompt-title-sub">${esc((prompt.prompt||'').slice(0,60))}…</div>
          </td>
          <td><span class="cat-badge">${esc(prompt.category||'Uncategorized')}</span></td>
          <td>${tags || '<span style="color:var(--text-3);font-size:.75rem">—</span>'}</td>
          <td>
            ${hasImg
              ? `<span class="img-indicator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Yes</span>`
              : `<span class="img-indicator no-img">No image</span>`}
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
    }).join('');
  }

  renderPromptsGrid(paged);
  renderPagination(total, pages);
}

function renderPromptsGrid(list) {
  const grid = document.getElementById('promptsCardGrid');
  if (!grid) return;
  if (!list.length) { grid.innerHTML=''; return; }
  grid.innerHTML = list.map(prompt => {
    const idx = adminState.prompts.indexOf(prompt);
    return `
      <div class="prompt-grid-card">
        ${prompt.image ? `<img class="pgc-img" src="${esc(prompt.image)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="pgc-body">
          <div class="pgc-title">${esc(prompt.title||'Untitled')}</div>
          <div class="pgc-cat">${esc(prompt.category||'Uncategorized')}</div>
          <div class="pgc-actions">
            <button class="act-btn" onclick="editPrompt(${idx})">Edit</button>
            <button class="act-btn del" onclick="confirmDelete(${idx})">Delete</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderPagination(total, pages) {
  const wrap = document.getElementById('tablePagination');
  if (!wrap || pages <= 1) { if(wrap) wrap.innerHTML=''; return; }

  const btns = [];
  for (let i=1; i<=pages; i++) {
    btns.push(`<button class="page-btn${i===adminState.page?' active':''}" onclick="goPage(${i})">${i}</button>`);
  }

  wrap.innerHTML = `
    <button class="page-btn" onclick="goPage(${adminState.page-1})" ${adminState.page<=1?'disabled':''}>‹</button>
    ${btns.join('')}
    <button class="page-btn" onclick="goPage(${adminState.page+1})" ${adminState.page>=pages?'disabled':''}>›</button>
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

  document.getElementById('editPromptTitle').value    = prompt.title || '';
  document.getElementById('editPromptImage').value    = prompt.image || '';
  document.getElementById('editPromptText').value     = prompt.prompt || '';
  document.getElementById('editPromptTags').value     = (prompt.tags||[]).join(', ');

  populateCategorySelects();
  document.getElementById('editPromptCategory').value = prompt.category || '';

  document.getElementById('editPromptModal').classList.add('active');
}

// ============================================================
// DELETE
// ============================================================
function confirmDelete(index) {
  adminState.pendingDeleteIdx = index;
  document.getElementById('deleteConfirmModal').classList.add('active');
}

function executeDelete() {
  const idx = adminState.pendingDeleteIdx;
  if (idx === null || idx === undefined) return;

  const deleted = adminState.prompts[idx];
  logActivity('delete', `Deleted: "${truncate(deleted?.title||'Prompt',30)}"`);

  adminState.prompts.splice(idx, 1);
  savePromptsData(adminState.prompts);
  document.getElementById('deleteConfirmModal').classList.remove('active');
  adminState.pendingDeleteIdx = null;
  renderPromptsTable();
  updateSidebarCounts();
  updateStorageBar();
  showToast('Prompt deleted', 'info');
}

// ============================================================
// FORMS
// ============================================================
function setupForms() {
  // Add prompt
  const addForm = document.getElementById('addPromptForm');
  if (addForm) {
    addForm.addEventListener('submit', e => {
      e.preventDefault();
      const title    = document.getElementById('promptTitle').value.trim();
      const category = document.getElementById('promptCategory').value;
      const text     = document.getElementById('promptText').value.trim();

      if (!title || !category || !text) {
        showFormMessage('Please fill in all required fields.', 'error');
        return;
      }

      const newPrompt = {
        id:        'p' + Date.now(),
        title,
        category,
        image:     document.getElementById('promptImage').value.trim() || '',
        prompt:    text,
        tags:      adminState.tags.slice(),
        dateAdded: new Date().toISOString()
      };

      adminState.prompts.push(newPrompt);
      savePromptsData(adminState.prompts);
      logActivity('add', `Added: "${truncate(title,30)}"`);

      adminState.tags = [];
      document.getElementById('tagsDisplay').innerHTML = '';
      addForm.reset();
      updatePreview();
      updateCharCount();
      showFormMessage('Prompt published successfully.', 'success');
      updateSidebarCounts();
      updateStorageBar();
      showToast('Prompt published', 'success');
    });

    addForm.addEventListener('reset', () => {
      adminState.tags = [];
      const disp = document.getElementById('tagsDisplay');
      if (disp) disp.innerHTML = '';
      setTimeout(() => { updatePreview(); updateCharCount(); }, 10);
    });
  }

  // Edit prompt
  const editForm = document.getElementById('editPromptForm');
  if (editForm) {
    editForm.addEventListener('submit', e => {
      e.preventDefault();
      const idx = adminState.editingIdx;
      if (idx === null || idx === undefined) return;

      const prev = adminState.prompts[idx];
      adminState.prompts[idx] = {
        ...prev,
        title:    document.getElementById('editPromptTitle').value.trim(),
        category: document.getElementById('editPromptCategory').value,
        image:    document.getElementById('editPromptImage').value.trim(),
        prompt:   document.getElementById('editPromptText').value.trim(),
        tags:     document.getElementById('editPromptTags').value.split(',').map(t=>t.trim()).filter(Boolean),
        lastEdited: new Date().toISOString()
      };

      savePromptsData(adminState.prompts);
      logActivity('edit', `Edited: "${truncate(adminState.prompts[idx].title,30)}"`);
      document.getElementById('editPromptModal').classList.remove('active');
      renderPromptsTable();
      showToast('Changes saved', 'success');
    });
  }

  // Add category
  const addCatBtn = document.getElementById('addCategoryBtn');
  if (addCatBtn) {
    addCatBtn.addEventListener('click', () => {
      const input = document.getElementById('newCategoryInput');
      const cat   = input.value.trim();
      if (!cat) { showToast('Enter a category name first.', 'info'); return; }
      if (adminState.categories.map(c=>c.toLowerCase()).includes(cat.toLowerCase())) {
        showToast('Category already exists.', 'info'); return;
      }
      adminState.categories.push(cat);
      saveCategoriesData(adminState.categories);
      input.value = '';
      logActivity('category', `Category added: "${cat}"`);
      renderCategoriesGrid();
      populateCategorySelects();
      updateSidebarCounts();
      showToast(`Category "${cat}" added`, 'success');
    });

    document.getElementById('newCategoryInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') addCatBtn.click();
    });
  }

  // Export
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = {
        prompts:    adminState.prompts,
        categories: adminState.categories,
        bookmarks:  JSON.parse(localStorage.getItem('promptverseBookmarks') || '[]'),
        exportedAt: new Date().toISOString(),
        totalPrompts: adminState.prompts.length,
        totalCategories: adminState.categories.length
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `promptverse-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Export downloaded', 'success');
    });
  }
}

function populateCategorySelects() {
  ['promptCategory','editPromptCategory'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">Select a category</option>' +
      adminState.categories.map(c => `<option value="${esc(c)}"${c===current?' selected':''}>${esc(c)}</option>`).join('');
  });

  const filterEl = document.getElementById('categoryFilter');
  if (filterEl) {
    const current = filterEl.value;
    filterEl.innerHTML = '<option value="all">All Categories</option>' +
      adminState.categories.map(c => `<option value="${esc(c)}"${c===current?' selected':''}>${esc(c)}</option>`).join('');
  }
}

function showFormMessage(msg, type) {
  const el = document.getElementById('formMessage');
  if (!el) return;
  el.textContent = msg;
  el.className = 'form-message ' + type;
  setTimeout(() => { el.className = 'form-message'; }, 4500);
}

// ============================================================
// MODALS
// ============================================================
function setupModals() {
  ['closeEditModal','cancelEditBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => document.getElementById('editPromptModal').classList.remove('active'));
  });

  const editOverlay = document.getElementById('editModalOverlay');
  if (editOverlay) editOverlay.addEventListener('click', () => document.getElementById('editPromptModal').classList.remove('active'));

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  if (confirmBtn) confirmBtn.addEventListener('click', executeDelete);

  const cancelDelBtn = document.getElementById('cancelDeleteBtn');
  if (cancelDelBtn) cancelDelBtn.addEventListener('click', () => {
    document.getElementById('deleteConfirmModal').classList.remove('active');
    adminState.pendingDeleteIdx = null;
  });

  const delOverlay = document.getElementById('deleteModalOverlay');
  if (delOverlay) delOverlay.addEventListener('click', () => {
    document.getElementById('deleteConfirmModal').classList.remove('active');
    adminState.pendingDeleteIdx = null;
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
  });
}

// ============================================================
// SEARCH & FILTERS
// ============================================================
function setupSearch() {
  const search = document.getElementById('adminSearch');
  if (search) {
    search.addEventListener('input', debounce(e => {
      adminState.searchQuery = e.target.value.trim();
      adminState.page = 1;
      renderPromptsTable();
    }, 250));
  }

  const catFilter = document.getElementById('categoryFilter');
  if (catFilter) {
    catFilter.addEventListener('change', e => {
      adminState.filterCat = e.target.value;
      adminState.page = 1;
      renderPromptsTable();
    });
  }

  const sortFilter = document.getElementById('sortFilter');
  if (sortFilter) {
    sortFilter.addEventListener('change', e => {
      adminState.sortBy = e.target.value;
      renderPromptsTable();
    });
  }
}

function setupGlobalSearch() {
  const gs = document.getElementById('globalSearch');
  if (!gs) return;

  gs.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      adminState.searchQuery = gs.value.trim();
      adminState.page = 1;
      switchSection('prompts');
      const as = document.getElementById('adminSearch');
      if (as) as.value = gs.value;
      gs.value = '';
    }
  });

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      gs.focus();
    }
  });
}

// ============================================================
// VIEW TOGGLE
// ============================================================
function setupViewToggle() {
  const btnTable = document.getElementById('viewTable');
  const btnGrid  = document.getElementById('viewGrid');
  const tableC   = document.getElementById('tableContainer');
  const gridC    = document.getElementById('gridContainer');

  if (!btnTable || !btnGrid) return;

  btnTable.addEventListener('click', () => {
    adminState.viewMode = 'table';
    btnTable.classList.add('active'); btnGrid.classList.remove('active');
    if (tableC) tableC.style.display = 'block';
    if (gridC)  gridC.style.display  = 'none';
  });

  btnGrid.addEventListener('click', () => {
    adminState.viewMode = 'grid';
    btnGrid.classList.add('active'); btnTable.classList.remove('active');
    if (tableC) tableC.style.display = 'none';
    if (gridC)  gridC.style.display  = 'block';
    renderPromptsTable();
  });
}

// ============================================================
// TABLE SORT HEADERS
// ============================================================
function setupTableSort() {
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (col === 'title')    adminState.sortBy = 'alpha';
      else if (col === 'date') adminState.sortBy = 'newest';
      adminState.page = 1;
      renderPromptsTable();
    });
  });
}

// ============================================================
// TAGS INPUT
// ============================================================
function setupTagInput() {
  const input   = document.getElementById('promptTags');
  const display = document.getElementById('tagsDisplay');
  const textEl  = document.getElementById('promptText');
  const wrap    = document.getElementById('tagsWrap');

  if (!input || !display) return;

  // Click on wrap → focus input
  if (wrap) wrap.addEventListener('click', () => input.focus());

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = input.value.replace(/,/g,'').trim();
      if (tag && !adminState.tags.includes(tag)) {
        adminState.tags.push(tag);
        renderTags(display);
      }
      input.value = '';
      updatePreview();
    }
    if (e.key === 'Backspace' && !input.value && adminState.tags.length) {
      adminState.tags.pop();
      renderTags(display);
      updatePreview();
    }
  });

  if (textEl) {
    textEl.addEventListener('input', updateCharCount);
    textEl.addEventListener('input', debounce(updatePreview, 300));
  }

  ['promptTitle','promptCategory'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', debounce(updatePreview, 300));
  });
}

function renderTags(display) {
  display.innerHTML = adminState.tags.map((t,i) => `
    <span class="tag-pill">${esc(t)}<span class="tag-remove" onclick="removeTag(${i})">×</span></span>
  `).join('');
}

function removeTag(i) {
  adminState.tags.splice(i, 1);
  renderTags(document.getElementById('tagsDisplay'));
  updatePreview();
}

function updateCharCount() {
  const el      = document.getElementById('promptText');
  const counter = document.getElementById('charCount');
  if (el && counter) counter.textContent = el.value.length;
}

function updatePreview() {
  const card = document.getElementById('addPreviewCard');
  if (!card) return;
  const title = (document.getElementById('promptTitle')||{}).value || '';
  const cat   = (document.getElementById('promptCategory')||{}).value || '';
  const text  = (document.getElementById('promptText')||{}).value || '';

  if (!title && !text) {
    card.innerHTML = '<span class="preview-hint">Fill in the form to see a live preview</span>';
    return;
  }

  card.innerHTML = `
    ${title ? `<div class="preview-title">${esc(title)}</div>` : ''}
    ${cat   ? `<div class="preview-cat">${esc(cat)}</div>` : ''}
    ${text  ? `<div class="preview-text">${esc(text.slice(0,240))}${text.length>240?'…':''}</div>` : ''}
    ${adminState.tags.length
        ? `<div style="margin-top:8px">${adminState.tags.map(t=>`<span class="tag-chip">${esc(t)}</span>`).join('')}</div>`
        : ''}
  `;
}

// ============================================================
// CATEGORIES GRID
// ============================================================
function renderCategoriesGrid() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  const counts = {};
  adminState.categories.forEach(c => { counts[c] = adminState.prompts.filter(p=>p.category===c).length; });
  const max = Math.max(...Object.values(counts), 1);

  if (!adminState.categories.length) {
    grid.innerHTML = '<p style="color:var(--text-3);font-size:.85rem;grid-column:1/-1">No categories yet.</p>';
    return;
  }

  grid.innerHTML = adminState.categories.map((cat, i) => {
    const cnt = counts[cat] || 0;
    const pct = (cnt / max);
    return `
      <div class="category-card" style="animation-delay:${i*40}ms">
        <div class="cat-card-head">
          <div class="cat-label-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <span class="cat-count-badge">${cnt} prompt${cnt!==1?'s':''}</span>
        </div>
        <div class="cat-name">${esc(cat)}</div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${Math.max(pct*100,2)}%"></div>
        </div>
        <button class="cat-remove-btn" onclick="deleteCategory('${esc(cat)}')">Remove</button>
      </div>`;
  }).join('');
}

function deleteCategory(cat) {
  adminState.categories = adminState.categories.filter(c => c !== cat);
  saveCategoriesData(adminState.categories);
  logActivity('category', `Category removed: "${cat}"`);
  renderCategoriesGrid();
  populateCategorySelects();
  updateSidebarCounts();
  showToast(`Category "${cat}" removed`, 'info');
}

// ============================================================
// ANALYTICS — Real data only
// ============================================================
function renderAnalytics() {
  const prompts   = adminState.prompts;
  const bookmarks = JSON.parse(localStorage.getItem('promptverseBookmarks') || '[]');

  // Hero stats
  setText('totalEngagement', prompts.length + bookmarks.length);

  // Publish rate (prompts per week since first prompt)
  const sorted = [...prompts].sort((a,b)=>new Date(a.dateAdded||0)-new Date(b.dateAdded||0));
  const oldest = sorted[0];
  let rate = '—';
  if (oldest && oldest.dateAdded) {
    const msPerWeek = 7 * 24 * 3600 * 1000;
    const weeks = Math.max(1, (Date.now() - new Date(oldest.dateAdded).getTime()) / msPerWeek);
    rate = (prompts.length / weeks).toFixed(1);
  }
  setText('publishRate', rate);

  const filled = adminState.categories.filter(c=>prompts.some(p=>p.category===c)).length;
  setText('categoryCoverage2', adminState.categories.length
    ? Math.round((filled/adminState.categories.length)*100)+'%' : '—');

  const withImages = prompts.filter(p=>p.image).length;
  setText('imageCoverage', prompts.length
    ? `${Math.round((withImages/prompts.length)*100)}%` : '—');

  // Category distribution bars
  const catCounts = {};
  adminState.categories.forEach(c => { catCounts[c] = prompts.filter(p=>p.category===c).length; });
  const maxCat = Math.max(...Object.values(catCounts), 1);

  const distEl = document.getElementById('categoryDistribution');
  if (distEl) {
    const sorted2 = Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).filter(([,cnt])=>cnt>0);
    distEl.innerHTML = sorted2.length
      ? sorted2.slice(0,8).map(([cat,cnt]) => `
          <div class="dist-item">
            <div class="dist-header"><span>${esc(cat)}</span><strong>${cnt}</strong></div>
            <div class="dist-track">
              <div class="dist-fill" style="width:${(cnt/maxCat)*100}%"></div>
            </div>
          </div>`).join('')
      : '<p style="color:var(--text-3);font-size:.82rem;padding:12px 0">No prompts with categories yet.</p>';
  }

  // Top prompts by saves
  const topEl = document.getElementById('topPrompts');
  if (topEl) {
    if (!prompts.length) {
      topEl.innerHTML = '<div class="top-item" style="justify-content:center;color:var(--text-3);border:none">No prompts yet.</div>';
    } else {
      const ranked = [...prompts].sort((a,b) => {
        const savesB = bookmarks.filter(id=>id===b.id).length;
        const savesA = bookmarks.filter(id=>id===a.id).length;
        return savesB - savesA;
      });
      topEl.innerHTML = ranked.slice(0,7).map((p,i) => {
        const saves = bookmarks.filter(id=>id===p.id).length;
        return `
          <div class="top-item">
            <span class="top-item-rank">#${i+1}</span>
            <span class="top-item-title" title="${esc(p.title||'Untitled')}">${esc(truncate(p.title||'Untitled',28))}</span>
            <span class="top-item-saves">${saves} save${saves!==1?'s':''}</span>
          </div>`;
      }).join('');
    }
  }

  // Key metrics
  const statsEl = document.getElementById('statisticsData');
  if (statsEl) {
    const withTags  = prompts.filter(p=>(p.tags||[]).length>0).length;
    const avgSaves  = prompts.length ? (bookmarks.length/prompts.length).toFixed(2) : '0.00';
    const noImg     = prompts.filter(p=>!p.image).length;

    const rows = [
      ['Total Prompts', prompts.length],
      ['Total Saves (Bookmarks)', bookmarks.length],
      ['Active Categories', adminState.categories.length],
      ['Categories With Prompts', filled],
      ['Avg Saves per Prompt', avgSaves],
      ['Prompts With Tags', withTags],
      ['Prompts With Images', withImages],
      ['Prompts Without Images', noImg],
    ];

    statsEl.innerHTML = rows.map(([label, val]) => `
      <div class="stat-row">
        <span class="stat-row-label">${label}</span>
        <span class="stat-row-val">${val}</span>
      </div>`).join('');
  }
}

// ============================================================
// QUICK TEMPLATES
// ============================================================
const TEMPLATES = {
  portrait:  'A stunning portrait of [subject], [lighting style] lighting, bokeh background, shot on Canon EOS R5, 85mm lens, f/1.8 aperture, hyperrealistic, cinematic --ar 2:3 --v 6',
  landscape: 'An epic landscape of [location], golden hour, dramatic clouds, foreground interest, wide angle, National Geographic style, 8K resolution, ultra-detailed --ar 16:9 --v 6',
  anime:     '[Subject] in anime art style, vibrant colors, expressive eyes, detailed linework, Studio Ghibli inspired, soft shading, pastel tones --ar 1:1 --v 6',
  scifi:     'Futuristic [scene] set in 2150, neon lights, cyberpunk aesthetic, rain-soaked streets, holographic displays, ultra-realistic, cinematic lighting --ar 16:9 --v 6'
};

function setupTemplates() {
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.template;
      const el  = document.getElementById('promptText');
      if (el && TEMPLATES[key]) {
        el.value = TEMPLATES[key];
        updateCharCount();
        updatePreview();
        el.focus();
        showToast(`Template "${key}" loaded`, 'info');
      }
    });
  });
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><span>${esc(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity .3s ease, transform .3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ============================================================
// HELPERS
// ============================================================
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function truncate(str, len) {
  return str && str.length > len ? str.slice(0, len)+'…' : (str||'');
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  if (target === 0) { el.textContent = '0'; return; }
  let start = null;
  const duration = 700;
  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts-start)/duration, 1);
    el.textContent = Math.round(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

function debounce(fn, delay) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); };
}