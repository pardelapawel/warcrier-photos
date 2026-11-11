(() => {
  'use strict';
  const KEY = '__warcrierPhotosV1';
  if (window[KEY]) {
    if (window[KEY].version === 2) window[KEY].show();
    else alert('Reload this print page once, then activate the updated Warcrier Photos bookmark. Your saved photo will become the first card’s photo.');
    return;
  }
  if (!document.querySelector('.fighter-card')) {
    alert('Open your populated Warcrier print page first, then click this bookmark.');
    return;
  }
  const records = new Map(), originals = new WeakMap();
  let fighters = new Map(), slots = new Map(), selected = '', photo = null, source = '', crop = { zoom: 1, x: 0.5, y: 0.5 };
  let dragging = null, frame = 0, loadToken = 0, db = null, storageWarning = '', busy = true;
  const host = document.createElement('div');
  host.id = 'warcrier-photo-editor';
  host.style.cssText = 'position:fixed;top:12px;right:12px;width:min(390px,calc(100vw - 24px));z-index:2147483647;color-scheme:light';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host { all:initial; font:14px/1.45 system-ui,sans-serif; color:#20332b; }
    * { box-sizing:border-box; } .panel { background:#f9faf6; border:1px solid #b9c8bd; border-radius:16px; padding:20px; box-shadow:0 12px 65px #10251b55; max-height:calc(100vh - 24px); overflow:auto; }
    header { display:flex; justify-content:space-between; align-items:start; gap:12px; } h2 { font-size:21px; margin:0; letter-spacing:-.5px; } p { margin:8px 0 14px; color:#52645a; }
    button,select,input { font:inherit; } button { cursor:pointer; border:1px solid #b9c8bd; background:white; color:#20332b; border-radius:8px; padding:9px 12px; } button:hover { background:#e7eee5; } button:focus-visible,select:focus-visible,canvas:focus-visible { outline:3px solid #e2a548; outline-offset:2px; }
    button:disabled { opacity:.45; cursor:default; } .primary { background:#285b40; color:white; border-color:#285b40; } .primary:hover { background:#1b442d; } .close { padding:2px 9px; font-size:23px; }
    label { display:block; font-weight:600; margin:12px 0 6px; } select { width:100%; padding:9px; border:1px solid #b9c8bd; background:white; border-radius:8px; color:#20332b; }
    .row { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; } .row > * { flex:1; } input[type=file] { width:100%; font-size:12px; }
    canvas { width:100%; aspect-ratio:1; display:block; background:#e5e9e0; border-radius:50%; margin-top:14px; cursor:grab; touch-action:none; } canvas:active { cursor:grabbing; }
    input[type=range] { width:100%; accent-color:#285b40; } .hint { font-size:12px; margin:8px 0; } output { float:right; font-weight:400; } .status { border-top:1px solid #dbe2d8; padding-top:12px; margin:14px 0 0; font-size:12px; min-height:32px; } .notice { background:#edf1e8; padding:9px 11px; border-radius:8px; font-size:12px; }
  </style><section class="panel" aria-label="Warcrier photo editor">
    <header><div><h2>Your fighters, your photos</h2><p>A separate photo for every card.</p></div><button class="close" aria-label="Close photo editor" title="Close; pictures stay applied">×</button></header>
    <label for="fighter">Fighter card</label><select id="fighter"></select>
    <p class="hint" id="matches"></p>
    <label for="upload">Choose a photo</label><input id="upload" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif">
    <canvas id="crop" width="640" height="640" tabindex="0" role="img" aria-label="Crop preview. Drag to reposition, or use arrow keys. Use the sliders for zoom and position."></canvas>
    <p class="hint">Drag to frame your model. Arrow keys also move the crop.</p>
    <label for="zoom">Zoom <output id="zoom-value">1.00×</output></label><input id="zoom" type="range" min="1" max="5" value="1" step="0.01">
    <label for="horizontal">Horizontal position</label><input id="horizontal" type="range" min="0" max="1" value="0.5" step="0.001">
    <label for="vertical">Vertical position</label><input id="vertical" type="range" min="0" max="1" value="0.5" step="0.001">
    <div class="row"><button id="center">Center crop</button><button id="apply" class="primary" disabled>Apply photo</button></div>
    <div class="row"><button id="reset">Restore original</button><button id="print">Print / save PDF</button></div>
    <p class="notice">Each card has its own photo. Abilities always use card 1 of that fighter type. Photos stay in this browser.</p>
    <p id="status" class="status" role="status" aria-live="polite">Loading saved photos…</p>
  </section>`;
  const $ = id => shadow.getElementById(id);
  const canvas = $('crop'), ctx = canvas.getContext('2d');
  const printStyle = document.createElement('style');
  printStyle.textContent = '@media print { #warcrier-photo-editor { display:none!important; } }';
  document.head.append(printStyle);
  document.body.append(host);
  const status = message => { $('status').textContent = message + storageWarning; };
  function discover() {
    const next = new Map();
    document.querySelectorAll('.fighter-card').forEach(card => {
      const link = card.closest('.fighter-card-wrap')?.querySelector('a.customise[href]');
      const id = link && new URL(link.href, location.href).searchParams.get('id');
      const img = card.querySelector(':scope > img');
      if (!id || !img) return;
      const name = card.querySelector('h3')?.textContent.replace(/[\u200b-\u200d\ufeff]/g, '').trim() || id;
      if (!next.has(id)) next.set(id, { id, name, cards: [], abilities: [] });
      next.get(id).cards.push(img);
    });
    document.querySelectorAll('.ability-fighter-pics img').forEach(img => {
      const path = img.getAttribute('data-wcc-original-src') || img.getAttribute('src') || '';
      const id = path.match(/\/fighterPortraits\/([^/?.]+)\.[^/?]+(?:\?.*)?$/)?.[1];
      if (next.has(id)) next.get(id).abilities.push(img);
    });
    fighters = next;
    slots = new Map();
    next.forEach(f => f.cards.forEach((img, index) => {
      const key = index === 0 ? f.id : `${f.id}::${index + 1}`;
      slots.set(key, { ...f, key, index, img });
    }));
    const signature = JSON.stringify(Array.from(next.values(), f => [f.id, f.name, f.cards.length, f.abilities.length]));
    if ($('fighter').dataset.signature !== signature) {
      $('fighter').replaceChildren(...Array.from(slots.values(), f => {
        const option = document.createElement('option'); option.value = f.key;
        option.textContent = `${f.name} · ${f.index + 1}/${f.cards.length}${f.index === 0 ? ' · abilities' : ''}`; return option;
      }));
      $('fighter').dataset.signature = signature;
      if (!slots.has(selected)) selected = slots.keys().next().value || '';
      $('fighter').value = selected;
    }
    updateMatches();
  }
  function updateMatches() {
    const f = slots.get(selected);
    $('matches').textContent = f ? `Card ${f.index + 1} of ${f.cards.length}${f.index === 0 ? ` + ${f.abilities.length} ability thumbnail${f.abilities.length === 1 ? '' : 's'}` : ' · abilities use card 1'}` : 'No supported fighter cards found. Use Standard Fighter Cards.';
    $('reset').disabled = busy || !records.has(selected);
    $('apply').disabled = busy || !selected || !photo;
    $('upload').disabled = busy;
    $('fighter').disabled = busy;
  }
  function applyAll() {
    discover();
    for (const f of fighters.values()) {
      for (const img of [...f.cards, ...f.abilities]) {
        const index = f.cards.indexOf(img);
        const record = records.get(index > 0 ? `${f.id}::${index + 1}` : f.id);
        if (record) {
          if (!originals.has(img)) {
            originals.set(img, { src: img.getAttribute('src'), srcset: img.getAttribute('srcset'), sizes: img.getAttribute('sizes') });
            img.setAttribute('data-wcc-original-src', img.getAttribute('src') || '');
          }
          if (img.getAttribute('src') !== record.result) img.setAttribute('src', record.result);
          if (img.hasAttribute('srcset')) img.removeAttribute('srcset');
          if (img.hasAttribute('sizes')) img.removeAttribute('sizes');
        } else if (originals.has(img)) {
          for (const [key, value] of Object.entries(originals.get(img))) {
            if (value === null) img.removeAttribute(key); else img.setAttribute(key, value);
          }
          originals.delete(img); img.removeAttribute('data-wcc-original-src');
        }
      }
    }
    updateMatches();
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; applyAll(); });
  }
  const observer = new MutationObserver(mutations => {
    if (mutations.some(m => !host.contains(m.target))) schedule();
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'srcset', 'sizes'] });
  function geometry() {
    if (!photo) return null;
    const side = Math.min(photo.naturalWidth, photo.naturalHeight) / crop.zoom;
    return { side, sx: (photo.naturalWidth - side) * crop.x, sy: (photo.naturalHeight - side) * crop.y };
  }
  function draw() {
    ctx.clearRect(0, 0, 640, 640); ctx.fillStyle = '#e5e9e0'; ctx.fillRect(0, 0, 640, 640);
    const g = geometry();
    if (g) ctx.drawImage(photo, g.sx, g.sy, g.side, g.side, 0, 0, 640, 640);
    else { ctx.fillStyle = '#627766'; ctx.font = '26px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Choose a photo to start', 320, 325); }
    $('zoom').value = crop.zoom; $('horizontal').value = crop.x; $('vertical').value = crop.y;
    $('zoom-value').textContent = `${Number(crop.zoom).toFixed(2)}×`;
    updateMatches();
  }
  const clamp = value => Math.max(0, Math.min(1, value));
  async function loadImage(url) {
    const image = new Image(); image.src = url; await image.decode(); return image;
  }
  async function selectFighter() {
    const token = ++loadToken;
    selected = $('fighter').value; photo = null; source = ''; crop = { zoom: 1, x: 0.5, y: 0.5 }; $('upload').value = ''; draw();
    const record = records.get(selected);
    if (record) {
      try {
        const image = await loadImage(record.source);
        if (token !== loadToken) return;
        source = record.source; photo = image; crop = { ...record.crop }; draw();
        status('Saved crop loaded. Adjust it or choose another photo.');
      } catch { status('The saved source could not be opened. Choose another photo.'); }
    } else status('Choose a photo, position it, then apply.');
  }
  async function persist(id, record) {
    if (!db) return;
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('photos', 'readwrite');
        if (record) tx.objectStore('photos').put(record); else tx.objectStore('photos').delete(id);
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    } catch { storageWarning = ' Could not save locally; this change lasts for this page session.'; }
  }
  $('fighter').onchange = selectFighter;
  $('upload').onchange = async () => {
    const file = $('upload').files[0]; if (!file) return;
    const token = ++loadToken;
    if (file.size > 35 * 1024 * 1024) { status('Choose an image smaller than 35 MB.'); return; }
    let url;
    try {
      status('Opening photo…');
      url = URL.createObjectURL(file);
      const image = await loadImage(url);
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      const staging = document.createElement('canvas');
      staging.width = Math.max(1, Math.round(image.naturalWidth * scale)); staging.height = Math.max(1, Math.round(image.naturalHeight * scale));
      staging.getContext('2d').drawImage(image, 0, 0, staging.width, staging.height);
      const nextSource = staging.toDataURL('image/png');
      const nextPhoto = await loadImage(nextSource);
      if (token !== loadToken) return;
      source = nextSource; photo = nextPhoto; crop = { zoom: 1, x: 0.5, y: 0.5 }; draw();
      status('Drag or use the sliders to crop. Apply when ready.');
    } catch { if (token === loadToken) status('Could not open that image. Try a PNG, JPEG, or WebP.'); }
    finally { if (url) URL.revokeObjectURL(url); }
  };
  for (const [id, key] of [['zoom', 'zoom'], ['horizontal', 'x'], ['vertical', 'y']]) {
    $(id).oninput = () => { crop[key] = Number($(id).value); draw(); };
  }
  $('center').onclick = () => { crop = { zoom: 1, x: 0.5, y: 0.5 }; draw(); };
  canvas.onpointerdown = e => {
    if (!photo) return;
    dragging = { x: e.clientX, y: e.clientY, crop: { ...crop } }; canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = e => {
    if (!dragging || !photo) return;
    const g = geometry(), size = canvas.getBoundingClientRect().width;
    const dx = (e.clientX - dragging.x) * g.side / size, dy = (e.clientY - dragging.y) * g.side / size;
    crop.x = clamp(dragging.crop.x - dx / (photo.naturalWidth - g.side || Infinity));
    crop.y = clamp(dragging.crop.y - dy / (photo.naturalHeight - g.side || Infinity)); draw();
  };
  canvas.onpointerup = canvas.onpointercancel = canvas.onlostpointercapture = () => { dragging = null; };
  canvas.onkeydown = e => {
    const moves = { ArrowLeft: ['x', .02], ArrowRight: ['x', -.02], ArrowUp: ['y', .02], ArrowDown: ['y', -.02] };
    if (!moves[e.key] || !photo) return;
    e.preventDefault(); const [key, delta] = moves[e.key]; crop[key] = clamp(crop[key] + delta * (e.shiftKey ? 5 : 1)); draw();
  };
  $('apply').onclick = async () => {
    if (!photo || !selected || busy) return;
    const id = selected, f = slots.get(id), out = document.createElement('canvas');
    out.width = out.height = 800;
    const g = geometry(); out.getContext('2d').drawImage(photo, g.sx, g.sy, g.side, g.side, 0, 0, 800, 800);
    const record = { id, source, crop: { ...crop }, result: out.toDataURL('image/png') };
    records.set(id, record); busy = true; applyAll(); await persist(id, record); busy = false; updateMatches();
    status(f.index === 0 ? `Applied to card 1 and ${f.abilities.length} ability thumbnail(s).` : `Applied to card ${f.index + 1}. Abilities keep card 1’s photo.`);
  };
  $('reset').onclick = async () => {
    if (busy) return;
    const id = selected; records.delete(id); busy = true; applyAll(); await persist(id, null); busy = false;
    if (id === selected) await selectFighter();
    status('Original artwork restored for this card. Abilities use card 1’s artwork.');
  };
  $('print').onclick = async () => {
    applyAll(); status('Preparing pictures for printing…');
    await Promise.all(Array.from(fighters.values()).flatMap(f => [...f.cards, ...f.abilities]).map(img => img.decode().catch(() => {})));
    status('Ready to print. Choose Save as PDF in the print dialog.'); window.print();
  };
  shadow.querySelector('.close').onclick = () => { host.style.display = 'none'; };
  window[KEY] = { version: 2, show() { host.style.display = ''; applyAll(); } };
  discover(); draw();
  (async () => {
    try {
      db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('warcrier-custom-photos-v1', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Storage is blocked'));
      });
      const saved = await new Promise((resolve, reject) => {
        const request = db.transaction('photos', 'readonly').objectStore('photos').getAll();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      saved.forEach(record => { if (record.id && record.result?.startsWith('data:image/png;')) records.set(record.id, record); });
    } catch { storageWarning = ' Local saving is unavailable; photos last for this page session.'; }
    busy = false; applyAll(); await selectFighter();
  })();
})();
