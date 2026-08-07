(() => {
  'use strict';

  const REPO = 'matteoroma095/gift';
  const PERSONAL_BLOBS = {
    '01-opening':'df1bef5b16658a5c903997cb1589d0561ce53493',
    '02-clue-1':'78362cd0d1e786c78e9ed4e15106cad8a7eb47ba',
    '03-clue-2':'46e2fea55bafa4678cb65f7ea89aab08385c1ddf',
    '04-choice':'dbe26db0c6738128b29bdd31f8f3acb624e7616e',
    '05-scratch':'6f44c29315e890e5701e2c230683b3508f2284ca',
    '06-first-reveal':'f8aaa0c196e5357f7b78647b2005bee3fdb9dee5',
    '07-response':'1b60377847f0745a97406b6022a55e01d7c3ebf3',
    '08-plot-twist':'dc2e2be3fb76faab053d0018d199a0c6774a98ff',
    '09-options':'03740a8cc3329eccd64ad1ac0f8fc8a7865813fd',
    '10-final':'d6a3ab06ca3308f926e8932e814ca2ad0013a6e'
  };

  const treatments = [
    { name:'Botox — 2 zone', image:'assets/treatments/botox-2-zone.jpg', note:'', blob:null },
    { name:'Botox — completo', image:'assets/treatments/botox-completo.jpg', note:'', blob:null },
    { name:'Botox 2 zone + Filler Longevity', image:'assets/treatments/botox-filler-longevity.jpg', note:'Labbra, nasogeniene o zigomi', blob:'877aa1e99a25acea4551deb29f8a6fdc40bff96b' },
    { name:'Filler Longevity Contouring — 2 fiale', image:'assets/treatments/filler-contouring.jpg', note:'', blob:'f51640b95cb983a636b63d8023e0081c6c47aa41' }
  ];

  const progressMap = {s1:1,s2:2,s3:3,s4:4,s5:5,s5r:6,s6like:7,s6no:7,s7:8,s8:9,s9:10};
  let selectedIndex = 0;
  let revealedOptions = new Set();
  const blobCache = new Map();

  function go(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    const pct = (progressMap[id] || 1) * 10;
    document.getElementById('progressBar').style.width = pct + '%';
    window.scrollTo({top:0, behavior:'instant'});
    if (id === 's8' && !document.getElementById('allScratch').children.length) renderAllScratch();
  }

  document.addEventListener('click', e => {
    const goEl = e.target.closest('[data-go]');
    if (goEl) go(goEl.dataset.go);
  });

  document.querySelectorAll('[data-card]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedIndex = Number(btn.dataset.card);
      document.getElementById('pickedLabel').textContent = `HAI SCELTO LA CARTA ${selectedIndex + 1}`;
      renderFirstScratch();
      go('s5');
    });
  });

  function blobDataUrl(sha) {
    if (!sha) return Promise.reject(new Error('No blob SHA'));
    if (blobCache.has(sha)) return blobCache.get(sha);
    const p = fetch(`https://api.github.com/repos/${REPO}/git/blobs/${sha}`, {headers:{Accept:'application/vnd.github+json'}})
      .then(r => { if (!r.ok) throw new Error(`GitHub media ${r.status}`); return r.json(); })
      .then(data => `data:image/jpeg;base64,${String(data.content || '').replace(/\s/g,'')}`);
    blobCache.set(sha, p);
    return p;
  }

  function resilientImage(treatment, alt='Trattamento Clinic') {
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = 'eager';
    img.decoding = 'async';
    img.src = treatment.image;
    img.addEventListener('error', async () => {
      if (img.dataset.fallbackTried) return;
      img.dataset.fallbackTried = '1';
      if (treatment.blob) {
        try { img.src = await blobDataUrl(treatment.blob); return; } catch (_) {}
      }
      img.style.display = 'none';
      const parent = img.parentElement;
      if (parent && !parent.querySelector('.media-fallback')) {
        const fb = document.createElement('div');
        fb.className = 'media-fallback';
        fb.textContent = treatment.name;
        parent.appendChild(fb);
      }
    });
    return img;
  }

  function treatmentLayer(treatment) {
    const content = document.createElement('div');
    content.className = 'scratch-content';
    content.appendChild(resilientImage(treatment, treatment.name));
    const copy = document.createElement('div');
    copy.className = 'scratch-copy';
    copy.innerHTML = `<strong>${escapeHtml(treatment.name)}</strong>${treatment.note ? `<small>${escapeHtml(treatment.note)}</small>` : ''}`;
    content.appendChild(copy);
    return content;
  }

  function buildScratch(treatment, onComplete) {
    const shell = document.createElement('div');
    shell.className = 'scratch-shell';
    shell.appendChild(treatmentLayer(treatment));

    const hint = document.createElement('div');
    hint.className = 'scratch-hint';
    hint.textContent = 'GRATTA QUI ✨';
    shell.appendChild(hint);

    const grid = document.createElement('div');
    grid.className = 'scratch-grid';
    const tiles = [];
    for (let i=0;i<16;i++) {
      const tile = document.createElement('div');
      tile.className = 'scratch-tile';
      tile.dataset.tile = String(i);
      grid.appendChild(tile);
      tiles.push(tile);
    }
    shell.appendChild(grid);

    let drawing = false;
    let done = false;
    let removed = 0;

    const removeTile = tile => {
      if (!tile || !tile.classList.contains('scratch-tile') || tile.classList.contains('gone') || done) return;
      shell.classList.add('started');
      tile.classList.add('gone');
      removed++;
      if (removed >= 5) complete();
    };

    const complete = () => {
      if (done) return;
      done = true;
      shell.classList.add('started');
      tiles.forEach(t => t.classList.add('gone'));
      grid.style.pointerEvents = 'none';
      setTimeout(() => onComplete && onComplete(), 260);
    };

    const atPoint = e => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.classList.contains('scratch-tile')) removeTile(el);
    };

    grid.addEventListener('pointerdown', e => {
      e.preventDefault();
      drawing = true;
      try { grid.setPointerCapture(e.pointerId); } catch (_) {}
      atPoint(e);
    });
    grid.addEventListener('pointermove', e => { if (drawing) { e.preventDefault(); atPoint(e); } });
    ['pointerup','pointercancel','lostpointercapture'].forEach(type => grid.addEventListener(type, () => { drawing = false; }));

    return {shell, complete};
  }

  function renderFirstScratch() {
    const host = document.getElementById('firstScratch');
    host.replaceChildren();
    const scratch = buildScratch(treatments[selectedIndex], showFirstReveal);
    host.appendChild(scratch.shell);
    const fallback = document.getElementById('firstFallback');
    fallback.onclick = scratch.complete;
  }

  function showFirstReveal() {
    const t = treatments[selectedIndex];
    const media = document.getElementById('firstRevealMedia');
    media.replaceChildren(resilientImage(t, t.name));
    document.getElementById('firstRevealName').textContent = t.name;
    const note = document.getElementById('firstRevealNote');
    note.textContent = t.note;
    note.hidden = !t.note;
    go('s5r');
  }

  function renderAllScratch() {
    revealedOptions = new Set();
    const host = document.getElementById('allScratch');
    host.replaceChildren();
    const finish = document.getElementById('finishButton');
    finish.hidden = true;

    treatments.forEach((t, index) => {
      const wrap = document.createElement('div');
      wrap.className = 'option-card';
      const scratch = buildScratch(t, () => {
        revealedOptions.add(index);
        if (revealedOptions.size === treatments.length) {
          finish.hidden = false;
          setTimeout(() => finish.scrollIntoView({behavior:'smooth', block:'center'}), 120);
        }
      });
      wrap.appendChild(scratch.shell);
      const fallback = document.createElement('button');
      fallback.className = 'text-button';
      fallback.type = 'button';
      fallback.textContent = 'Se non parte, tocca qui per scoprire';
      fallback.addEventListener('click', scratch.complete);
      wrap.appendChild(fallback);
      host.appendChild(wrap);
    });
  }

  function resetGame() {
    selectedIndex = 0;
    revealedOptions = new Set();
    document.getElementById('firstScratch').replaceChildren();
    document.getElementById('allScratch').replaceChildren();
    document.getElementById('finishButton').hidden = true;
    go('s1');
  }
  document.getElementById('resetButton').addEventListener('click', resetGame);

  function escapeHtml(s) {
    return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function hydrateBackdrop(section) {
    const key = section.dataset.photo;
    const sha = PERSONAL_BLOBS[key];
    if (!sha) return;
    const staticUrl = `assets/personal/${key}.jpg`;
    const tester = new Image();
    tester.onload = () => {};
    tester.onerror = async () => {
      try {
        const dataUrl = await blobDataUrl(sha);
        section.style.backgroundImage = `url("${dataUrl}")`;
      } catch (_) {
        section.style.background = 'linear-gradient(145deg,#174652,#82c6d3)';
      }
    };
    tester.src = staticUrl;
  }

  document.querySelectorAll('.screen[data-photo]').forEach(hydrateBackdrop);
  go('s1');
})();