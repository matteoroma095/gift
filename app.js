(() => {
  'use strict';

  const treatments = [
    { name:'Botox — 2 zone', image:'assets/hq/treatments/botox-2-zone.webp', fallback:'assets/treatments/botox-2-zone.jpg', note:'' },
    { name:'Botox — completo', image:'assets/hq/treatments/botox-completo.webp', fallback:'assets/treatments/botox-completo.jpg', note:'' },
    { name:'Botox 2 zone + Filler Longevity', image:'assets/hq/treatments/botox-filler-longevity.webp', fallback:'assets/treatments/botox-filler-longevity.jpg', note:'Labbra, nasogeniene o zigomi' },
    { name:'Filler Longevity Contouring — 2 fiale', image:'assets/hq/treatments/filler-contouring.webp', fallback:'assets/treatments/filler-contouring.jpg', note:'' }
  ];

  const progressMap = {s1:1,s2:2,s3:3,s4:4,s5:5,s5r:6,s6like:7,s6no:7,s7:8,s8:9,s9:10};

  let selectedIndex = 0;
  let finalChoiceIndex = null;
  let revealedOptions = new Set();
  let optionRecords = [];

  function go(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.body.classList.toggle('final-mode', id === 's9');
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

  function resilientImage(treatment, alt='Trattamento Clinic') {
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = 'eager';
    img.decoding = 'async';
    img.src = treatment.image;
    let triedFallback = false;
    img.addEventListener('error', () => {
      if (!triedFallback && treatment.fallback) {
        triedFallback = true;
        img.src = treatment.fallback;
        return;
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
      setTimeout(() => onComplete && onComplete(), 220);
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
    grid.addEventListener('pointermove', e => {
      if (drawing) {
        e.preventDefault();
        atPoint(e);
      }
    });
    ['pointerup','pointercancel','lostpointercapture'].forEach(type => grid.addEventListener(type, () => { drawing = false; }));

    return {shell, complete};
  }

  function renderFirstScratch() {
    const host = document.getElementById('firstScratch');
    host.replaceChildren();
    const scratch = buildScratch(treatments[selectedIndex], showFirstReveal);
    host.appendChild(scratch.shell);
    document.getElementById('firstFallback').onclick = scratch.complete;
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
    finalChoiceIndex = null;
    optionRecords = [];

    const host = document.getElementById('allScratch');
    host.replaceChildren();
    document.getElementById('selectionPrompt').hidden = true;
    document.getElementById('choiceSummary').hidden = true;
    document.getElementById('confirmChoiceButton').hidden = true;

    treatments.forEach((t, index) => {
      const wrap = document.createElement('div');
      wrap.className = 'option-card';
      wrap.dataset.option = String(index);

      const scratch = buildScratch(t, () => {
        revealedOptions.add(index);
        fallback.hidden = true;
        if (revealedOptions.size === treatments.length) unlockFinalSelection();
      });
      wrap.appendChild(scratch.shell);

      const fallback = document.createElement('button');
      fallback.className = 'text-button';
      fallback.type = 'button';
      fallback.textContent = 'Se non parte, tocca qui per scoprire';
      fallback.addEventListener('click', scratch.complete);
      wrap.appendChild(fallback);

      const choose = document.createElement('button');
      choose.className = 'choose-treatment';
      choose.type = 'button';
      choose.textContent = 'Scelgo questo ❤️';
      choose.hidden = true;
      choose.setAttribute('aria-pressed','false');
      choose.addEventListener('click', () => selectFinalChoice(index));
      wrap.appendChild(choose);

      optionRecords.push({wrap, choose});
      host.appendChild(wrap);
    });
  }

  function unlockFinalSelection() {
    const prompt = document.getElementById('selectionPrompt');
    prompt.hidden = false;
    optionRecords.forEach(({choose}) => { choose.hidden = false; });
    setTimeout(() => prompt.scrollIntoView({behavior:'smooth', block:'start'}), 180);
  }

  function selectFinalChoice(index) {
    finalChoiceIndex = index;
    optionRecords.forEach(({wrap, choose}, i) => {
      const isSelected = i === index;
      wrap.classList.toggle('selected', isSelected);
      choose.classList.toggle('selected', isSelected);
      choose.setAttribute('aria-pressed', String(isSelected));
      choose.textContent = isSelected ? 'Scelto ✓' : 'Scelgo questo ❤️';
    });

    const t = treatments[index];
    document.getElementById('choiceSummaryName').textContent = t.name;
    document.getElementById('choiceSummary').hidden = false;
    const confirm = document.getElementById('confirmChoiceButton');
    confirm.hidden = false;
    confirm.textContent = `Conferma: ${t.name} ❤️`;
    setTimeout(() => confirm.scrollIntoView({behavior:'smooth', block:'center'}), 120);
  }

  function showFinalChoice() {
    if (finalChoiceIndex === null) return;
    const t = treatments[finalChoiceIndex];
    document.getElementById('finalChoiceName').textContent = t.name;
    const note = document.getElementById('finalChoiceNote');
    note.textContent = t.note;
    note.hidden = !t.note;
    go('s9');
  }

  document.getElementById('confirmChoiceButton').addEventListener('click', showFinalChoice);

  function escapeHtml(s) {
    return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  go('s1');
})();
