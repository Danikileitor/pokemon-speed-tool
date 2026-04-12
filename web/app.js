// ─── State ───────────────────────────────────────────
const state = {
  a: { pokemon: null, boost: 0, evs: "32" },
  b: { pokemon: null, boost: 0, evs: "32" },
};

// ─── DOM refs ────────────────────────────────────────
const els = {
  searchA: document.getElementById('search-a'),
  searchB: document.getElementById('search-b'),
  dropdownA: document.getElementById('dropdown-a'),
  dropdownB: document.getElementById('dropdown-b'),
  iconA: document.getElementById('icon-a'),
  iconB: document.getElementById('icon-b'),
  nameA: document.getElementById('name-a'),
  nameB: document.getElementById('name-b'),
  speedA: document.getElementById('speed-a'),
  speedB: document.getElementById('speed-b'),
  resultA: document.getElementById('result-a'),
  resultB: document.getElementById('result-b'),
  boostA: document.getElementById('boost-a'),
  boostB: document.getElementById('boost-b'),
  evsA: document.getElementById('evs-a'),
  evsB: document.getElementById('evs-b'),
  vsBadge: document.getElementById('vs-outcome'),
  panelA: document.getElementById('panel-a'),
  panelB: document.getElementById('panel-b'),
  tiersGrid: document.getElementById('tiers-grid'),
  tiersHint: document.querySelector('.tiers-hint'),
};

// ─── Search / Dropdown ──────────────────────────────
function setupSearch(inputEl, dropdownEl, side) {
  inputEl.addEventListener('input', () => {
    const q = inputEl.value.trim().toLowerCase();
    if (!q) { dropdownEl.classList.remove('open'); return; }
    const matches = ALL_POKEMON.filter(p => p.toLowerCase().includes(q)).slice(0, 30);
    renderDropdown(dropdownEl, matches, side);
  });

  inputEl.addEventListener('focus', () => {
    const q = inputEl.value.trim().toLowerCase();
    if (q) {
      const matches = ALL_POKEMON.filter(p => p.toLowerCase().includes(q)).slice(0, 30);
      renderDropdown(dropdownEl, matches, side);
    }
  });

  document.addEventListener('click', e => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      dropdownEl.classList.remove('open');
    }
  });
}

function renderDropdown(dropdownEl, matches, side) {
  if (!matches.length) { dropdownEl.classList.remove('open'); return; }
  dropdownEl.innerHTML = matches.map(name => {
    const animUrl = getSpriteUrl(name);
    const staticUrl = getSpriteFallbackUrl(name);
    return `<div class="dropdown-item" data-name="${name}">
      <img src="${animUrl}" onerror="this.onerror=null;this.src='${staticUrl}';this.onerror=function(){this.style.display='none';}" alt="">
      ${name}
    </div>`;
  }).join('');
  dropdownEl.classList.add('open');

  dropdownEl.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      selectPokemon(item.dataset.name, side);
      dropdownEl.classList.remove('open');
      document.getElementById(`search-${side}`).value = '';
    });
  });
}

// ─── Select Pokemon ──────────────────────────────────
function renderTypeBadges(name) {
  const types = POKEMON_TYPES[name] || [];
  return types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
}

function selectPokemon(name, side) {
  state[side].pokemon = name;
  const iconEl = side === 'a' ? els.iconA : els.iconB;
  const nameEl = side === 'a' ? els.nameA : els.nameB;
  const typesEl = side === 'a' ? document.getElementById('types-a') : document.getElementById('types-b');
  const spriteUrl = getSpriteUrl(name);
  const fallbackUrl = getSpriteFallbackUrl(name);

  iconEl.innerHTML = `<img src="${spriteUrl}" alt="${name}"
    onerror="this.onerror=null; this.src='${fallbackUrl}'; this.onerror=function(){this.parentElement.innerHTML='<div class=\poke-placeholder\>${name[0].toUpperCase()}</div>';};"
  >`;
  nameEl.textContent = name;
  if (typesEl) typesEl.innerHTML = renderTypeBadges(name);

  updateSpeed(side);
  renderTiers();
}

// ─── Segmented Buttons ──────────────────────────────
function setupSegmented(groupEl, side, type) {
  groupEl.querySelectorAll('.seg-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      groupEl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Map index to actual value for boost
      if (type === 'boost') {
        const boostMap = [-2, -1, 0, 1, 2];
        state[side].boost = boostMap[idx];
      } else {
        state[side].evs = btn.dataset.val;
      }
      updateSpeed(side);
      renderTiers();
    });
  });
}

// ─── Speed Calculation ──────────────────────────────
function updateSpeed(side) {
  const s = state[side];
  const speedEl = side === 'a' ? els.speedA : els.speedB;
  const resultEl = side === 'a' ? els.resultA : els.resultB;

  if (!s.pokemon) {
    speedEl.textContent = '—';
    speedEl.className = 'result-value';
    return;
  }

  const speed = getSpeed(s.pokemon, s.boost, s.evs);

  if (speed !== null) {
    speedEl.textContent = speed;
    speedEl.className = 'result-value has-value';
    // Remove any existing no-data note
    const note = resultEl.querySelector('.result-no-data');
    if (note) note.remove();
  } else {
    speedEl.textContent = '—';
    speedEl.className = 'result-value';
    // Show available tiers hint
    let note = resultEl.querySelector('.result-no-data');
    if (!note) {
      note = document.createElement('div');
      note.className = 'result-no-data';
      resultEl.appendChild(note);
    }
    note.textContent = 'Sin datos para esta combinación';
  }

  updateComparison();
}

function updateComparison() {
  const sA = state.a.pokemon ? getSpeed(state.a.pokemon, state.a.boost, state.a.evs) : null;
  const sB = state.b.pokemon ? getSpeed(state.b.pokemon, state.b.boost, state.b.evs) : null;

  // Reset
  els.panelA.classList.remove('winner', 'loser');
  els.panelB.classList.remove('winner', 'loser');
  els.speedA.classList.remove('winner', 'loser', 'tie');
  els.speedB.classList.remove('winner', 'loser', 'tie');
  els.vsBadge.className = 'vs-badge';
  els.vsBadge.textContent = 'VS';

  if (sA === null || sB === null) return;

  if (sA > sB) {
    els.panelA.classList.add('winner');
    els.panelB.classList.add('loser');
    els.speedA.classList.add('winner');
    els.speedB.classList.add('loser');
    els.vsBadge.className = 'vs-badge faster-a';
    els.vsBadge.textContent = 'A >';
  } else if (sB > sA) {
    els.panelB.classList.add('winner');
    els.panelA.classList.add('loser');
    els.speedB.classList.add('winner');
    els.speedA.classList.add('loser');
    els.vsBadge.className = 'vs-badge faster-b';
    els.vsBadge.textContent = '< B';
  } else {
    els.speedA.classList.add('tie');
    els.speedB.classList.add('tie');
    els.vsBadge.className = 'vs-badge tie-badge';
    els.vsBadge.textContent = '=';
  }
}

// ─── Tier Chips ─────────────────────────────────────
function renderTiers() {
  const hasA = !!state.a.pokemon;
  const hasB = !!state.b.pokemon;

  if (!hasA && !hasB) {
    els.tiersGrid.innerHTML = '<div class="tiers-empty">Selecciona un Pokémon para ver sus niveles de velocidad disponibles</div>';
    els.tiersHint.textContent = 'Selecciona un Pokémon para ver sus tiers';
    return;
  }

  const tiersA = hasA ? getTiersForPokemon(state.a.pokemon) : [];
  const tiersB = hasB ? getTiersForPokemon(state.b.pokemon) : [];

  // Build merged list, track which side each belongs to
  const allTierKeys = new Set();
  const tierMap = {};

  tiersA.forEach(t => {
    const key = `${t.boost}_${t.evs}`;
    allTierKeys.add(key);
    if (!tierMap[key]) tierMap[key] = { ...t, forA: true, forB: false };
    else tierMap[key].forA = true;
  });
  tiersB.forEach(t => {
    const key = `${t.boost}_${t.evs}`;
    allTierKeys.add(key);
    if (!tierMap[key]) tierMap[key] = { ...t, forA: false, forB: true };
    else tierMap[key].forB = true;
  });

  const sorted = Object.values(tierMap).sort((a, b) => b.spe - a.spe || b.boost - a.boost);

  const boostLabel = b => b > 0 ? `+${b}` : `${b}`;
  const evsLabel = e => e;

  const chips = sorted.map(t => {
    const key = `${t.boost}_${t.evs}`;
    const isActiveA = state.a.pokemon && state.a.boost === t.boost && state.a.evs === t.evs;
    const isActiveB = state.b.pokemon && state.b.boost === t.boost && state.b.evs === t.evs;

    // Look up correct speed for each pokemon at this tier
    const speedA = hasA && t.forA ? SPEED_DATA.find(d => d.pokemon.includes(state.a.pokemon) && d.boost === t.boost && d.evs === t.evs)?.spe : null;
    const speedB = hasB && t.forB ? SPEED_DATA.find(d => d.pokemon.includes(state.b.pokemon) && d.boost === t.boost && d.evs === t.evs)?.spe : null;

    // Display the relevant speed (prefer A, then B)
    const displaySpeed = speedA ?? speedB;

    let cls = 'tier-chip';
    if (isActiveA) cls += ' selected-a';
    if (isActiveB) cls += ' selected-b';

    let forLabel = '';
    if (t.forA && t.forB) {
      forLabel = `<span class="tier-for tier-for-a">A</span> <span class="tier-for tier-for-b">B</span>`;
    } else if (t.forA) {
      forLabel = `<span class="tier-for tier-for-a">A</span>`;
    } else {
      forLabel = `<span class="tier-for tier-for-b">B</span>`;
    }

    return `<div class="${cls}" data-boost="${t.boost}" data-evs="${t.evs}">
      <div class="tier-speed">${displaySpeed ?? '?'}</div>
      <div class="tier-info">${boostLabel(t.boost)} · ${evsLabel(t.evs)}</div>
      ${forLabel}
    </div>`;
  }).join('');

  els.tiersGrid.innerHTML = chips;

  // Click chip to apply to whichever side is selected
  els.tiersGrid.querySelectorAll('.tier-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const boost = parseInt(chip.dataset.boost);
      const evs = chip.dataset.evs;

      // Apply to A first if no pokemon yet selected for B, else apply to both
      const applyToA = hasA;
      const applyToB = hasB;

      if (applyToA) {
        state.a.boost = boost;
        state.a.evs = evs;
        syncSegmented(els.boostA, boost, 'boost');
        syncSegmented(els.evsA, evs, 'evs');
        updateSpeed('a');
      }
      if (applyToB) {
        state.b.boost = boost;
        state.b.evs = evs;
        syncSegmented(els.boostB, boost, 'boost');
        syncSegmented(els.evsB, evs, 'evs');
        updateSpeed('b');
      }
      renderTiers();
    });
  });

  const names = [hasA && state.a.pokemon, hasB && state.b.pokemon].filter(Boolean).join(' vs ');
  els.tiersHint.textContent = names;
}

function syncSegmented(groupEl, value, type) {
  groupEl.querySelectorAll('.seg-btn').forEach((btn, idx) => {
    btn.classList.remove('active');
    if (type === 'boost') {
      const boostMap = [-2, -1, 0, 1, 2];
      if (boostMap[idx] === value) btn.classList.add('active');
    } else {
      if (btn.dataset.val === value) btn.classList.add('active');
    }
  });
}

// ─── Init ────────────────────────────────────────────
setupSearch(els.searchA, els.dropdownA, 'a');
setupSearch(els.searchB, els.dropdownB, 'b');
setupSegmented(els.boostA, 'a', 'boost');
setupSegmented(els.boostB, 'b', 'boost');
setupSegmented(els.evsA, 'a', 'evs');
setupSegmented(els.evsB, 'b', 'evs');
