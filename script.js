/* ════════════════════════════════════════════════
   ADITYA SONI — PORTFOLIO SCRIPT
════════════════════════════════════════════════ */

/* ── PAGE CONFIG ─────────────────────────────── */
const PAGES = ['hero','journey','projects','skills','achievements','resume','contact'];
const TOTAL = PAGES.length;
let current = 0;
let locked  = false;
const isMob = () => window.innerWidth < 768;

/* ── DOM REFS ────────────────────────────────── */
const track   = document.getElementById('track');
const progBar = document.getElementById('progress-bar');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const tbNav   = document.getElementById('tb-nav');
const tbIdx   = document.getElementById('tb-idx');

/* ════════════════════════════════════════════════
   SCROLL-TRAP SYSTEM
   Each page that has scrollable content registers
   a scroll descriptor. The unified input handlers
   (wheel, key, touch) check this before deciding
   whether to advance the page or scroll inside.
════════════════════════════════════════════════ */

/*
  scrollTrap(forward: bool) → bool
    true  = content was scrolled, stay on page
    false = already at boundary, allow page nav
*/
const PAGE_SCROLL = {

  // Journey: horizontal card carousel
  journey: {
    forward() {
      const max = Math.max(0, DATA.journey.items.length - journeyPerView());
      if (journeyOffset < max) { journeyOffset++; updateJourney(); return true; }
      return false;
    },
    backward() {
      if (journeyOffset > 0) { journeyOffset--; updateJourney(); return true; }
      return false;
    },
    reset() { journeyOffset = 0; updateJourney(); },
  },

  // Projects: vertical grid scroll
  projects: {
    forward()  { return scrollEl('.projects-scroll', 180, true);  },
    backward() { return scrollEl('.projects-scroll', 180, false); },
    reset()    { resetEl('.projects-scroll'); },
  },

  // Skills: vertical table scroll
  skills: {
    forward()  { return scrollEl('.skills-table', 140, true);  },
    backward() { return scrollEl('.skills-table', 140, false); },
    reset()    { resetEl('.skills-table'); },
  },

  // Achievements: vertical grid scroll
  achievements: {
    forward()  { return scrollEl('.ach-scroll', 160, true);  },
    backward() { return scrollEl('.ach-scroll', 160, false); },
    reset()    { resetEl('.ach-scroll'); },
  },

  // Contact: vertical layout scroll
  contact: {
    forward()  { return scrollEl('.ct-scroll', 160, true);  },
    backward() { return scrollEl('.ct-scroll', 160, false); },
    reset()    { resetEl('.ct-scroll'); },
  },

  // Hero & Resume: no inner scroll — pass through immediately
  hero:   { forward() { return false; }, backward() { return false; }, reset() {} },
  resume: { forward() { return false; }, backward() { return false; }, reset() {} },
};

/* Utility: scroll a querySelector element by step, return true if consumed */
function scrollEl(selector, step, forward) {
  const el = document.querySelector(selector);
  if (!el) return false;
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 6;
  const atTop    = el.scrollTop <= 0;
  if (forward && !atBottom) { el.scrollBy({ top:  step, behavior: 'smooth' }); return true; }
  if (!forward && !atTop)   { el.scrollBy({ top: -step, behavior: 'smooth' }); return true; }
  return false;
}

function resetEl(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollTop = 0;
}

/* Dispatch to current page's trap */
function trapScroll(forward) {
  const page = PAGES[current];
  const trap = PAGE_SCROLL[page];
  if (!trap) return false;
  return forward ? trap.forward() : trap.backward();
}

/* Reset all inner scrolls when leaving a page */
function resetPageScroll(pageIdx) {
  const trap = PAGE_SCROLL[PAGES[pageIdx]];
  if (trap) trap.reset();
}

/* ── CURSOR ──────────────────────────────────── */
(function initCursor() {
  const cur  = document.getElementById('cur');
  const ring = document.getElementById('cur-ring');
  if (!cur || !ring) return;
  document.addEventListener('mousemove', e => {
    cur.style.left  = e.clientX + 'px';
    cur.style.top   = e.clientY + 'px';
    ring.style.left = e.clientX + 'px';
    ring.style.top  = e.clientY + 'px';
  });
  document.addEventListener('mouseover', e => {
    const hoverable = e.target.closest('a,button,.proj-card,.ach-card,.cl-item');
    document.body.classList.toggle('hovering', !!hoverable);
  });
})();

/* ── BUILD NAV DOTS ──────────────────────────── */
function buildNav() {
  tbNav.innerHTML = '';
  PAGES.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'nd' + (i === 0 ? ' active' : '');
    b.textContent = String(i + 1).padStart(2, '0');
    b.title = p.charAt(0).toUpperCase() + p.slice(1);
    b.setAttribute('aria-label', `Go to ${p} page`);
    b.addEventListener('click', () => goTo(i));
    tbNav.appendChild(b);
  });
}

/* ── NAVIGATE ────────────────────────────────── */
const tBars  = document.getElementById('transition-bars');
const tLabel = document.getElementById('transition-label');
const PAGE_NAMES = ['Hero', 'Journey', 'Projects', 'Skills', 'Achievements', 'Resume', 'Contact'];

function goTo(n) {
  if (n < 0 || n >= TOTAL || locked) return;

  const prev    = current;
  const forward = n > prev;

  resetPageScroll(current);
  locked  = true;
  current = n;

  // notify background canvas
  if (window.bgCanvas) window.bgCanvas.setPage(n);

  const outPage = document.getElementById('p-' + PAGES[prev]);
  const inPage  = document.getElementById('p-' + PAGES[n]);

  // ── Phase 1 (0ms): bars slam down ─────────────
  tBars.className = '';
  void tBars.offsetWidth;
  tBars.classList.add('t-in');

  // ── Phase 1b (0ms): exit current page content ─
  if (outPage) {
    outPage.classList.remove('page-exit', 'page-enter', 'page-enter-back');
    void outPage.offsetWidth;
    outPage.classList.add('page-exit');
  }

  // ── Phase 2 (340ms): bars fully down → slide track + show label ──
  setTimeout(() => {
    // slide the track (invisible behind bars)
    track.style.transform = `translateX(-${n * 100}vw)`;
    progBar.style.width   = `${((n + 1) / TOTAL) * 100}%`;

    // flash page number
    const tlNum  = tLabel.querySelector('.tl-num');
    const tlName = tLabel.querySelector('.tl-name');
    tlNum.textContent  = String(n + 1).padStart(2, '0');
    tlName.textContent = PAGE_NAMES[n];
    tLabel.classList.remove('tl-show');
    void tLabel.offsetWidth;
    tLabel.classList.add('tl-show');

    // update nav
    document.querySelectorAll('.nd').forEach((d, i) =>
      d.classList.toggle('active', i === n));
    tbIdx.textContent = `${String(n + 1).padStart(2,'0')} / ${String(TOTAL).padStart(2,'0')}`;
    btnPrev.disabled = n === 0;
    btnNext.disabled = n === TOTAL - 1;

    // ── Phase 3 (540ms): bars retract ─────────────
    setTimeout(() => {
      tBars.classList.remove('t-in');
      void tBars.offsetWidth;
      tBars.classList.add('t-out');

      // arm incoming page animation
      if (inPage) {
        inPage.classList.remove('page-exit', 'page-enter', 'page-enter-back');
        void inPage.offsetWidth;
        inPage.classList.add(forward ? 'page-enter' : 'page-enter-back');
      }
    }, 200);

  }, 340);

  // ── Phase 4 (1050ms): full cleanup ────────────
  setTimeout(() => {
    if (outPage) outPage.classList.remove('page-exit');
    if (inPage)  inPage.classList.remove('page-enter', 'page-enter-back');
    tBars.className  = '';
    tLabel.className = '';
    locked = false;
  }, 1050);

  // scroll to top on mobile
  if (isMob()) {
    setTimeout(() => {
      const pg = document.getElementById('p-' + PAGES[n]);
      if (pg) pg.scrollTop = 0;
    }, 400);
  }
}

/* ── PREV / NEXT BUTTONS ─────────────────────── */
btnPrev.addEventListener('click', () => {
  const consumed = trapScroll(false);
  if (!consumed) goTo(current - 1);
});

btnNext.addEventListener('click', () => {
  const consumed = trapScroll(true);
  if (!consumed) goTo(current + 1);
});

/* ── WHEEL ───────────────────────────────────── */
let wAcc = 0, wTimer;

window.addEventListener('wheel', e => {
  if (isModalOpen()) return;
  e.preventDefault();

  const horiz   = Math.abs(e.deltaX) > Math.abs(e.deltaY);
  const delta   = horiz ? e.deltaX : e.deltaY;
  const forward = delta > 0;

  // For journey page horizontal swipe on trackpad, use horizontal delta
  // For all other pages use vertical delta
  const page = PAGES[current];
  const useDelta = (page === 'journey') ? (e.deltaX || e.deltaY) : e.deltaY;

  wAcc += useDelta !== 0 ? useDelta : delta;
  clearTimeout(wTimer);
  wTimer = setTimeout(() => wAcc = 0, 220);

  const threshold = 65;
  if (Math.abs(wAcc) > threshold && !locked) {
    const consumed = trapScroll(wAcc > 0);
    wAcc = 0;
    if (!consumed) goTo(forward ? current + 1 : current - 1);
  }
}, { passive: false });

/* ── KEYBOARD ────────────────────────────────── */
window.addEventListener('keydown', e => {
  if (isModalOpen()) {
    if (e.key === 'Escape') closeModal();
    return;
  }

  const forward  = e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ';
  const backward = e.key === 'ArrowLeft'  || e.key === 'ArrowUp';
  if (!forward && !backward) return;
  e.preventDefault();

  const consumed = trapScroll(!!forward);
  if (!consumed) goTo(forward ? current + 1 : current - 1);
});

/* ── TOUCH SWIPE ─────────────────────────────── */
let tx = null, ty = null, tDir = null;

window.addEventListener('touchstart', e => {
  if (isModalOpen()) return;
  tx = e.touches[0].clientX;
  ty = e.touches[0].clientY;
  tDir = null;
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (isModalOpen() || tx === null) return;
  if (!tDir) {
    const dx = Math.abs(e.touches[0].clientX - tx);
    const dy = Math.abs(e.touches[0].clientY - ty);
    if (dx > 10 || dy > 10) tDir = dx > dy ? 'h' : 'v';
  }
  // block native scroll only on horizontal swipe
  if (tDir === 'h') e.preventDefault();
}, { passive: false });

window.addEventListener('touchend', e => {
  if (isModalOpen() || tx === null) return;
  const dx   = tx - e.changedTouches[0].clientX;
  const dy   = ty - e.changedTouches[0].clientY;
  const page = PAGES[current];

  if (tDir === 'h' && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    // Horizontal swipe → journey carousel or page nav
    if (page === 'journey') {
      const consumed = trapScroll(dx > 0);
      if (!consumed) goTo(dx > 0 ? current + 1 : current - 1);
    } else {
      goTo(dx > 0 ? current + 1 : current - 1);
    }
  } else if (tDir === 'v' && Math.abs(dy) > 55) {
    // Vertical swipe → try inner scroll first then page nav
    const consumed = trapScroll(dy > 0);
    if (!consumed) goTo(dy > 0 ? current + 1 : current - 1);
  }

  tx = null; ty = null; tDir = null;
});

/* ── MOBILE NAV ──────────────────────────────── */
function buildMobNav() {
  // Remove existing first to avoid duplicates
  const existing = document.getElementById('mob-nav');
  if (existing) existing.remove();

  const nav  = document.createElement('div');
  nav.id = 'mob-nav';

  const prev = document.createElement('button');
  prev.className = 'mob-nav-btn mob-nav-prev';
  prev.setAttribute('aria-label', 'Previous');
  prev.innerHTML = '‹';
  prev.addEventListener('click', () => {
    const consumed = trapScroll(false);
    if (!consumed) goTo(current - 1);
  });

  const next = document.createElement('button');
  next.className = 'mob-nav-btn mob-nav-next';
  next.setAttribute('aria-label', 'Next');
  next.innerHTML = '›';
  next.addEventListener('click', () => {
    const consumed = trapScroll(true);
    if (!consumed) goTo(current + 1);
  });

  nav.appendChild(prev);
  nav.appendChild(next);
  document.body.appendChild(nav);
}

/* ════════════════════════════════════════════════
   JOURNEY CAROUSEL
════════════════════════════════════════════════ */
let journeyOffset = 0;

function journeyPerView() {
  if (window.innerWidth < 640)  return 1;
  if (window.innerWidth < 1024) return 2;
  return 3;
}

function getCardWidth() {
  const card = document.querySelector('.jc');
  if (!card) return 0;
  return card.offsetWidth + 16; // 16px gap
}

function updateJourney() {
  const total   = DATA.journey.items.length;
  const perView = journeyPerView();
  const max     = Math.max(0, total - perView);

  journeyOffset = Math.max(0, Math.min(journeyOffset, max));

  const btnL = document.getElementById('j-prev');
  const btnR = document.getElementById('j-next');
  if (btnL) btnL.disabled = journeyOffset <= 0;
  if (btnR) btnR.disabled = journeyOffset >= max;

  const cards = document.querySelector('.journey-cards');
  if (cards) cards.style.transform = `translateX(-${journeyOffset * getCardWidth()}px)`;
}

function buildJourneyControls() {
  const btnL = document.getElementById('j-prev');
  const btnR = document.getElementById('j-next');
  if (!btnL || !btnR) return;

  btnL.addEventListener('click', () => {
    if (journeyOffset > 0) { journeyOffset--; updateJourney(); }
  });
  btnR.addEventListener('click', () => {
    const max = Math.max(0, DATA.journey.items.length - journeyPerView());
    if (journeyOffset < max) { journeyOffset++; updateJourney(); }
  });

  window.addEventListener('resize', () => { journeyOffset = 0; updateJourney(); });
  setTimeout(updateJourney, 80);
}

/* ── SKILL ANIM (placeholder for future bars) ─ */
function triggerSkillAnim() {
  document.querySelectorAll('.sk-fill').forEach(el => {
    el.style.transform = 'scaleX(1)';
  });
}

/* ════════════════════════════════════════════════
   PROJECT MODAL
════════════════════════════════════════════════ */
const modalOverlay = document.getElementById('modal-overlay');
const modalClose   = document.getElementById('modal-close');

function isModalOpen() { return modalOverlay.classList.contains('open'); }

function openModal(idx) {
  const p = DATA.projects.items[idx];

  document.getElementById('m-num').textContent     = `PROJECT ${p.num}`;
  document.getElementById('m-title').textContent   = p.name;
  document.getElementById('m-tagline').textContent = p.tagline;

  const statusMap = { live: 'Live', soon: 'Coming Soon', wip: 'In Development' };
  const statusEl  = document.getElementById('m-status');
  statusEl.className = `modal-status ${p.status}`;
  statusEl.textContent = statusMap[p.status] || p.status;

  document.getElementById('m-desc').innerHTML =
    p.longDesc.split('\n\n').map(t => `<p>${t}</p>`).join('');

  document.getElementById('m-tags').innerHTML =
    p.stack.map(t => `<span class="ptag">${t}</span>`).join('');

  document.getElementById('m-highlights').innerHTML =
    p.highlights.map(h => `
      <div class="mh-card">
        <div class="mh-lbl">${h.label}</div>
        <div class="mh-val">${h.value}</div>
      </div>`).join('');

  let links = '';
  if (p.live)
    links += `<a href="${p.live}" target="_blank" rel="noopener" class="ml-btn primary">Visit Live Site ↗</a>`;
  else
    links += `<span class="ml-btn disabled">Live — Coming Soon</span>`;
  if (p.repo)
    links += `<a href="${p.repo}" target="_blank" rel="noopener" class="ml-btn secondary">View on GitHub ↗</a>`;
  else
    links += `<span class="ml-btn disabled">GitHub — Coming Soon</span>`;
  document.getElementById('m-links').innerHTML = links;

  document.getElementById('modal-box').scrollTop = 0;
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

/* ════════════════════════════════════════════════
   RENDER FUNCTIONS
════════════════════════════════════════════════ */

function renderHero() {
  const d = DATA.hero;
  document.getElementById('hero-greeting').textContent = d.greeting;
  document.getElementById('hero-name').textContent     = d.name;
  document.getElementById('hero-role').textContent     = d.role;
  document.getElementById('hero-stack').textContent    = d.tagline;
  document.getElementById('hero-lines').innerHTML      = d.lines.map(l => `<p>${l}</p>`).join('');

  document.getElementById('hero-stats').innerHTML = d.stats.map(s => `
    <div class="hs">
      <div class="hs-val">${s.value}</div>
      <div class="hs-lbl">${s.label}</div>
    </div>`).join('');

  document.getElementById('hero-contact').innerHTML = d.contact.map(c => `
    <a href="${c.href}" class="hc-item"
       target="${c.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener">
      <div class="hc-icon">${c.icon}</div>
      <div>
        <div class="hc-label">${c.label}</div>
        <div class="hc-val">${c.value}</div>
      </div>
    </a>`).join('');
}

function renderJourney() {
  const d = DATA.journey;
  document.getElementById('j-chapter').textContent = d.chapter;
  document.getElementById('j-title').textContent   = d.title;

  document.getElementById('journey-cards').innerHTML = d.items.map(item => `
    <div class="jc">
      <div class="jc-year-bg">${item.year}</div>
      <div class="jc-period">${item.period}</div>
      <div class="jc-role">${item.role}</div>
      <div class="jc-type">${item.type}</div>
      <div class="jc-location">${item.location}</div>
      <div class="jc-divider"></div>
      <div class="jc-points">
        ${item.points.map(pt => `
          <div class="jc-point">
            <div class="jc-point-dash"></div>
            <div class="jc-point-text">${pt}</div>
          </div>`).join('')}
      </div>
      <div class="jc-dot"></div>
    </div>`).join('');
}

function renderProjects() {
  const d = DATA.projects;
  document.getElementById('proj-chapter').textContent = d.chapter;
  document.getElementById('proj-title').textContent   = d.title;

  document.getElementById('projects-grid').innerHTML = d.items.map((p, i) => `
    <div class="proj-card" onclick="openModal(${i})"
         role="button" tabindex="0" aria-label="View ${p.name} details">
      <div class="proj-num">PROJECT ${p.num}</div>
      <div class="proj-stack">
        ${p.stack.map(t => `<span class="ptag">${t}</span>`).join('')}
      </div>
      <div class="proj-name">${p.name}</div>
      <div class="proj-desc">${p.desc}</div>
      <div>
        ${p.status === 'wip'  ? `<span class="proj-status-badge">IN PROGRESS</span>` : ''}
        ${p.status === 'soon' ? `<span class="proj-status-badge">COMING SOON</span>` : ''}
        <span class="proj-explore">EXPLORE →</span>
      </div>
    </div>`).join('');

  document.querySelectorAll('.proj-card').forEach((card, i) => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(i); }
    });
  });
}

function renderSkills() {
  const d = DATA.skills;
  document.getElementById('skills-chapter').textContent = d.chapter;
  document.getElementById('skills-title').textContent   = d.title;

  // Primary skills to highlight (first item per category)
  document.getElementById('skills-table').innerHTML = d.categories.map(cat => `
    <div class="skill-row">
      <div class="skill-cat">${cat.label}</div>
      <div class="skill-items">
        ${cat.items.map((item, i) =>
          `<span class="skill-chip${i === 0 ? ' primary' : ''}">${item}</span>`
        ).join('')}
      </div>
    </div>`).join('');
}

function renderAchievements() {
  const d = DATA.achievements;
  document.getElementById('ach-chapter').textContent = d.chapter;
  document.getElementById('ach-title').textContent   = d.title;

  document.getElementById('ach-grid').innerHTML = d.items.map(a => `
    <div class="ach-card ${a.featured ? 'feat' : ''}">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-title">${a.title}</div>
      <div class="ach-org">${a.org}</div>
      <div class="ach-meta">${a.meta}</div>
      <div class="ach-desc">${a.desc}</div>
    </div>`).join('');
}

function renderResume() {
  const d = DATA.resume;
  document.getElementById('res-chapter').textContent  = d.chapter;
  document.getElementById('res-title').textContent    = d.title;
  document.getElementById('res-subtitle').textContent = d.subtitle;
  setResumeVersion('detailed');
}

function setResumeVersion(v) {
  const src    = DATA.resume.versions[v];
  const iframe = document.getElementById('resume-iframe');
  if (iframe) iframe.src = src + '#toolbar=0&navpanes=0&scrollbar=1';

  document.querySelectorAll('.res-ver-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.ver === v));

  const openBtn = document.getElementById('res-open-btn');
  const dlBtn   = document.getElementById('res-dl-btn');
  if (openBtn) openBtn.href = src;
  if (dlBtn)   dlBtn.href   = src;
}

function renderContact() {
  const d = DATA.contact;
  document.getElementById('ct-chapter').textContent = d.chapter;

  document.getElementById('ct-big').innerHTML =
    d.title.replace('Together.', '<em>Together.</em>');

  document.getElementById('ct-blurb').textContent = d.blurb;

  document.getElementById('ct-links').innerHTML = d.links.map(l => `
    <a href="${l.href}" class="cl-item"
       target="${l.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener">
      <div class="cl-icon">${l.icon}</div>
      <div>
        <div class="cl-lbl">${l.label}</div>
        <div class="cl-val">${l.value}</div>
      </div>
    </a>`).join('');
}

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderHero();
  renderJourney();
  renderProjects();
  renderSkills();
  renderAchievements();
  renderResume();
  renderContact();

  buildNav();
  buildJourneyControls();
  initContactForm();

  // always build mob nav — CSS hides it on desktop
  buildMobNav();

  window.addEventListener('resize', () => {
    // rebuild mob nav on resize to keep event listeners fresh
    buildMobNav();
  });

  goTo(0);
  progBar.style.width = `${(1 / TOTAL) * 100}%`;
  btnPrev.disabled = true;
});

/* ════════════════════════════════════════════════
   TOAST NOTIFICATION
════════════════════════════════════════════════ */
let toastTimer;

function showToast(type, title, msg) {
  const toast     = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastTitle= document.getElementById('toast-title');
  const toastMsg  = document.getElementById('toast-msg');

  clearTimeout(toastTimer);
  toast.className = '';           // reset
  void toast.offsetWidth;         // reflow

  toastIcon.textContent  = type === 'success' ? '✓' : '✕';
  toastTitle.textContent = title;
  toastMsg.textContent   = msg;

  toast.classList.add('toast-show', type === 'success' ? 'toast-success' : 'toast-error');

  toastTimer = setTimeout(() => {
    toast.classList.remove('toast-show');
  }, 4500);
}

/* ════════════════════════════════════════════════
   CONTACT FORM — EmailJS
════════════════════════════════════════════════ */
function initContactForm() {
  const form    = document.querySelector('.ct-form');
  const btn     = form.querySelector('.f-submit');
  const btnSpan = btn.querySelector('span');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name    = document.getElementById('f-name').value.trim();
    const email   = document.getElementById('f-email').value.trim();
    const subject = document.getElementById('f-subject').value.trim();
    const message = document.getElementById('f-msg').value.trim();

    // ── Validation ─────────────────────────────
    if (!name) {
      showToast('error', 'Missing name', 'Please enter your name.');
      document.getElementById('f-name').focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('error', 'Invalid email', 'Please enter a valid email address.');
      document.getElementById('f-email').focus();
      return;
    }
    if (!subject) {
      showToast('error', 'Missing subject', 'Please add a subject line.');
      document.getElementById('f-subject').focus();
      return;
    }
    if (!message) {
      showToast('error', 'Missing message', 'Please write a message.');
      document.getElementById('f-msg').focus();
      return;
    }

    // ── Loading state ───────────────────────────
    btn.disabled       = true;
    btn.classList.add('f-submit-loading');
    btnSpan.textContent = 'Sending…';

    try {
      await emailjs.send('service_j0ng26l', 'template_xwz19t9', {
        from_name:  name ,
        from_email: email,
        subject:    subject,
        message:    message,
      });

      // ── Success ─────────────────────────────
      btnSpan.textContent = 'Sent ✓';
      btn.classList.remove('f-submit-loading');
      btn.classList.add('f-submit-sent');

      showToast('success', 'Message sent!', 'Thanks ' + name + ' — Aditya will reply within 48 hours.');

      // Reset form after short delay
      setTimeout(() => {
        form.reset();
        btnSpan.textContent = 'Send Message →';
        btn.disabled = false;
        btn.classList.remove('f-submit-sent');
      }, 2500);

    } catch (err) {
      // ── Error ────────────────────────────────
      btn.disabled = false;
      btn.classList.remove('f-submit-loading');
      btnSpan.textContent = 'Send Message →';

      showToast('error', 'Failed to send', 'Something went wrong. Try emailing directly at adisonii2004@gmail.com');
      console.error('EmailJS error:', err);
    }
  });
}
