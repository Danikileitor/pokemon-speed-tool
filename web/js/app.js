// ─── State ───────────────────────────────────────────
const state = {
  a: { pokemon: null, boost: 0, evs: "32+", sp: 32, nature: "+", effects: new Set() },
  b: { pokemon: null, boost: 0, evs: "32+", sp: 32, nature: "+", effects: new Set() },
};

// ─── Lógica de Cálculo Dinámico ──────────────────────

// Tabla de multiplicadores de Boost (Stat Stages -6 a +6)
const BOOST_MULT = {
  "-6": 0.25, "-5": 0.28, "-4": 0.33, "-3": 0.40, "-2": 0.50, "-1": 0.66,
  "0": 1.0, "1": 1.5, "2": 2.0, "3": 2.5, "4": 3.0, "5": 3.5, "6": 4.0
};

// Extraer velocidades base de SPEED_DATA (Base = Vel a Boost 0 y SP 32 - 32)
// Esto permite que tu app funcione con cualquier Pokémon de tu lista actual.
const POKEMON_BASES = {};
SPEED_DATA.forEach(d => {
  if (d.boost === 0 && d.evs === "32") {
    d.pokemon.forEach(name => {
      POKEMON_BASES[name] = d.spe - 32;
    });
  }
});

/**
 * Calcula la velocidad final para cualquier combinación.
 * Fórmula: floor(floor((Base + SP) * Nat) * Boost)
 */
function calculateSpeed(name, boost, sp, nature) {
  const base = POKEMON_BASES[name];
  if (base === undefined) return null;

  const natMult = nature === "+" ? 1.1 : (nature === "-" ? 0.9 : 1.0);
  const boostMult = BOOST_MULT[boost] || 1.0;

  // Cálculo siguiendo el orden de redondeo oficial de Pokémon
  let stat = Math.floor((base + sp) * natMult);
  stat = Math.floor(stat * boostMult);

  return stat;
}

// Convert sp (0-32) + nature to the evs key used in SPEED_DATA
function spNatureToEvsKey(sp, nature) {
  if (sp === 32 && nature === "+") return "32+";
  if (sp === 32 && nature === "=") return "32";
  if (sp === 0 && nature === "=") return "0";
  if (sp === 0 && nature === "-") return "0-";
  // Si no es ninguna de estas combinaciones exactas, no devolvemos nada (se desmarcan los botones)
  return null;
}

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
  boostSliderA: document.getElementById('boost-slider-a'),
  boostSliderB: document.getElementById('boost-slider-b'),
  boostDisplayA: document.getElementById('boost-display-a'),
  boostDisplayB: document.getElementById('boost-display-b'),
  evsA: document.getElementById('evs-a'),
  evsB: document.getElementById('evs-b'),
  spSliderA: document.getElementById('sp-slider-a'),
  spSliderB: document.getElementById('sp-slider-b'),
  spDisplayA: document.getElementById('sp-display-a'),
  spDisplayB: document.getElementById('sp-display-b'),
  natureA: document.getElementById('nature-a'),
  natureB: document.getElementById('nature-b'),
  vsBadge: document.getElementById('vs-outcome'),
  panelA: document.getElementById('panel-a'),
  panelB: document.getElementById('panel-b'),
  tiersGrid: document.getElementById('tiers-grid'),
  tiersHint: document.querySelector('.tiers-hint'),
  effectsA: document.getElementById('effects-a'),
  effectsB: document.getElementById('effects-b'),
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
  groupEl.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      groupEl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (type === 'boost') {
        const val = parseInt(btn.dataset.val);
        state[side].boost = val;
        syncBoostSlider(side, val);
      } else {
        const evsVal = btn.dataset.val;
        state[side].evs = evsVal;
        // Sync sp + nature from preset key
        const { sp, nature } = evsKeyToSpNature(evsVal);
        state[side].sp = sp;
        state[side].nature = nature;
        syncSpSlider(side, sp);
        syncNature(side, nature);
      }
      updateSpeed(side);
      renderTiers();
    });
  });
}

function evsKeyToSpNature(key) {
  if (key === "32+") return { sp: 32, nature: "+" };
  if (key === "32") return { sp: 32, nature: "=" };
  if (key === "0") return { sp: 0, nature: "=" };
  if (key === "0-") return { sp: 0, nature: "-" };
  return { sp: 32, nature: "+" };
}

function syncBoostSlider(side, val) {
  const slider = side === 'a' ? els.boostSliderA : els.boostSliderB;
  const display = side === 'a' ? els.boostDisplayA : els.boostDisplayB;
  slider.value = val;
  display.textContent = val > 0 ? `+${val}` : `${val}`;
}

function syncSpSlider(side, sp) {
  const slider = side === 'a' ? els.spSliderA : els.spSliderB;
  const display = side === 'a' ? els.spDisplayA : els.spDisplayB;
  slider.value = sp;
  display.textContent = sp;
}

function syncNature(side, nature) {
  const natureEl = side === 'a' ? els.natureA : els.natureB;
  natureEl.querySelectorAll('.nature-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === nature);
  });
}

// ─── Boost Slider Setup ──────────────────────────────
function setupBoostSlider(sliderEl, side) {
  sliderEl.addEventListener('input', () => {
    const val = parseInt(sliderEl.value);
    state[side].boost = val;
    const display = side === 'a' ? els.boostDisplayA : els.boostDisplayB;
    display.textContent = val > 0 ? `+${val}` : `${val}`;
    // Sync presets: highlight matching button or clear all
    const groupEl = side === 'a' ? els.boostA : els.boostB;
    groupEl.querySelectorAll('.seg-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.val) === val);
    });
    updateSpeed(side);
    renderTiers();
  });
}

// ─── SP Slider + Nature Setup ────────────────────────
function setupSpSlider(sliderEl, side) {
  sliderEl.addEventListener('input', () => {
    const sp = parseInt(sliderEl.value);
    state[side].sp = sp;
    const display = side === 'a' ? els.spDisplayA : els.spDisplayB;
    display.textContent = sp;
    const evsKey = spNatureToEvsKey(sp, state[side].nature);
    state[side].evs = evsKey;
    syncEvsPreset(side, evsKey);
    updateSpeed(side);
    renderTiers();
  });
}

function setupNature(natureEl, side) {
  natureEl.querySelectorAll('.nature-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      natureEl.querySelectorAll('.nature-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state[side].nature = btn.dataset.val;
      const evsKey = spNatureToEvsKey(state[side].sp, btn.dataset.val);
      state[side].evs = evsKey;
      syncEvsPreset(side, evsKey);
      updateSpeed(side);
      renderTiers();
    });
  });
}

function syncEvsPreset(side, evsKey) {
  const groupEl = side === 'a' ? els.evsA : els.evsB;
  groupEl.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === evsKey);
  });
}

// ─── Speed Calculation ──────────────────────────────

// Apply extra effects to a base speed value
function applyEffects(baseSpeed, effects) {
  if (baseSpeed === null) return null;
  let spd = baseSpeed;
  if (effects.has('scarf')) spd = Math.floor(spd * 1.5);
  if (effects.has('swift')) spd = spd * 2;
  if (effects.has('tailwind')) spd = spd * 2;
  if (effects.has('paralysis')) spd = Math.floor(spd / 2);
  if (effects.has('ironball')) spd = Math.floor(spd / 2);
  // trick room doesn't change the number, handled in comparison
  return spd;
}

function getEffectiveSpeed(side) {
  const s = state[side];
  if (!s.pokemon) return null;
  const base = calculateSpeed(s.pokemon, s.boost, s.sp, s.nature);
  return applyEffects(base, s.effects);
}

function updateSpeed(side) {
  const s = state[side];
  const speedEl = side === 'a' ? els.speedA : els.speedB;
  const resultEl = side === 'a' ? els.resultA : els.resultB;

  if (!s.pokemon) {
    speedEl.textContent = '—';
    speedEl.className = 'result-value';
    return;
  }

  const baseSpeed = calculateSpeed(s.pokemon, s.boost, s.sp, s.nature);
  const effectiveSpeed = applyEffects(baseSpeed, s.effects);

  if (effectiveSpeed !== null) {
    // Show effective speed; if modified show base too
    const isModified = s.effects.has('scarf') || s.effects.has('swift') || s.effects.has('tailwind') || s.effects.has('paralysis') || s.effects.has('ironball');
    speedEl.innerHTML = effectiveSpeed +
      (isModified && baseSpeed !== effectiveSpeed
        ? `<span class="speed-base"> (base ${baseSpeed})</span>`
        : '');
    speedEl.className = 'result-value has-value';
    const note = resultEl.querySelector('.result-no-data');
    if (note) note.remove();
  } else {
    speedEl.textContent = '—';
    speedEl.className = 'result-value';
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
  const sA = getEffectiveSpeed('a');
  const sB = getEffectiveSpeed('b');
  // Trick Room: the "winner" is the slower pokemon (lower speed)
  const trickRoom = state.a.effects.has('trickroom') || state.b.effects.has('trickroom');

  // Reset
  els.panelA.classList.remove('winner', 'loser');
  els.panelB.classList.remove('winner', 'loser');
  els.speedA.classList.remove('winner', 'loser', 'tie');
  els.speedB.classList.remove('winner', 'loser', 'tie');
  els.vsBadge.className = 'vs-badge';
  els.vsBadge.textContent = 'VS';

  if (sA === null || sB === null) return;

  // In Trick Room, the slower mon goes first
  const aFirst = trickRoom ? sA < sB : sA > sB;
  const bFirst = trickRoom ? sB < sA : sB > sA;

  if (aFirst) {
    els.panelA.classList.add('winner');
    els.panelB.classList.add('loser');
    els.speedA.classList.add('winner');
    els.speedB.classList.add('loser');
    els.vsBadge.className = 'vs-badge faster-a';
    els.vsBadge.textContent = trickRoom ? 'A <' : 'A >';
  } else if (bFirst) {
    els.panelB.classList.add('winner');
    els.panelA.classList.add('loser');
    els.speedB.classList.add('winner');
    els.speedA.classList.add('loser');
    els.vsBadge.className = 'vs-badge faster-b';
    els.vsBadge.textContent = trickRoom ? '> B' : '< B';
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
    els.tiersGrid.innerHTML = '<div class="tiers-empty">Select a Pokémon to view its available speed levels</div>';
    els.tiersHint.textContent = 'Select a Pokémon to view its speed tiers';
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
        const spnA = evsKeyToSpNature(evs);
        state.a.sp = spnA.sp;
        state.a.nature = spnA.nature;
        syncSegmented(els.boostA, boost, 'boost');
        syncBoostSlider('a', boost);
        syncSegmented(els.evsA, evs, 'evs');
        syncSpSlider('a', spnA.sp);
        syncNature('a', spnA.nature);
        updateSpeed('a');
      }
      if (applyToB) {
        state.b.boost = boost;
        state.b.evs = evs;
        const spnB = evsKeyToSpNature(evs);
        state.b.sp = spnB.sp;
        state.b.nature = spnB.nature;
        syncSegmented(els.boostB, boost, 'boost');
        syncBoostSlider('b', boost);
        syncSegmented(els.evsB, evs, 'evs');
        syncSpSlider('b', spnB.sp);
        syncNature('b', spnB.nature);
        updateSpeed('b');
      }
      renderTiers();
    });
  });

  const names = [hasA && state.a.pokemon, hasB && state.b.pokemon].filter(Boolean).join(' vs ');
  els.tiersHint.textContent = names;
}

function syncSegmented(groupEl, value, type) {
  groupEl.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.remove('active');
    if (type === 'boost') {
      if (parseInt(btn.dataset.val) === value) btn.classList.add('active');
    } else {
      if (btn.dataset.val === value) btn.classList.add('active');
    }
  });
}

// ─── Effects Setup ──────────────────────────────────
function setupEffects(groupEl, side) {
  groupEl.querySelectorAll('.effect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      const wasActive = state[side].effects.has(val);

      if (val === 'trickroom') {
        const shouldActivate = !wasActive;

        ['a', 'b'].forEach(s => {
          if (shouldActivate) {
            state[s].effects.add('trickroom');
          } else {
            state[s].effects.delete('trickroom');
          }

          const targetGroup = (s === 'a') ? els.effectsA : els.effectsB;
          const targetBtn = targetGroup.querySelector('.effect-btn[data-val="trickroom"]');

          if (targetBtn) {
            targetBtn.classList.toggle('active', shouldActivate);
          }
        });

        updateSpeed('a');
        updateSpeed('b');
        renderTiers();
        return;
      }
      else if (val === 'scarf' || val === 'ironball') {
        state[side].effects.delete('scarf');
        state[side].effects.delete('ironball');
        groupEl.querySelectorAll('.effect-btn[data-val="scarf"], .effect-btn[data-val="ironball"]').forEach(b => b.classList.remove('active'));

        if (!wasActive) {
          state[side].effects.add(val);
          btn.classList.add('active');
        }
      }
      else {
        if (wasActive) {
          state[side].effects.delete(val);
          btn.classList.remove('active');
        } else {
          state[side].effects.add(val);
          btn.classList.add('active');
        }
      }

      updateSpeed(side);
      renderTiers();
    });
  });
}

// ─── Init ────────────────────────────────────────────
setupSearch(els.searchA, els.dropdownA, 'a');
setupSearch(els.searchB, els.dropdownB, 'b');
setupSegmented(els.boostA, 'a', 'boost');
setupSegmented(els.boostB, 'b', 'boost');
setupSegmented(els.evsA, 'a', 'evs');
setupSegmented(els.evsB, 'b', 'evs');
setupBoostSlider(els.boostSliderA, 'a');
setupBoostSlider(els.boostSliderB, 'b');
setupSpSlider(els.spSliderA, 'a');
setupSpSlider(els.spSliderB, 'b');
setupNature(els.natureA, 'a');
setupNature(els.natureB, 'b');
setupEffects(els.effectsA, 'a');
setupEffects(els.effectsB, 'b');

// ─── Swap Pokémon A ↔ B ─────────────────────────────
function swapPokemon() {
  // Swap state
  const tmpPokemon = state.a.pokemon;
  const tmpBoost = state.a.boost;
  const tmpEvs = state.a.evs;
  const tmpSp = state.a.sp;
  const tmpNature = state.a.nature;
  const tmpEffects = new Set(state.a.effects);

  state.a.pokemon = state.b.pokemon;
  state.a.boost = state.b.boost;
  state.a.evs = state.b.evs;
  state.a.sp = state.b.sp;
  state.a.nature = state.b.nature;
  state.a.effects = new Set(state.b.effects);

  state.b.pokemon = tmpPokemon;
  state.b.boost = tmpBoost;
  state.b.evs = tmpEvs;
  state.b.sp = tmpSp;
  state.b.nature = tmpNature;
  state.b.effects = tmpEffects;

  // Re-render both sides
  ['a', 'b'].forEach(side => {
    const s = state[side];
    const iconEl = side === 'a' ? els.iconA : els.iconB;
    const nameEl = side === 'a' ? els.nameA : els.nameB;
    const typesEl = document.getElementById('types-' + side);

    if (s.pokemon) {
      const spriteUrl = getSpriteUrl(s.pokemon);
      const fallbackUrl = getSpriteFallbackUrl(s.pokemon);
      iconEl.innerHTML = `<img src="${spriteUrl}" alt="${s.pokemon}"
        onerror="this.onerror=null; this.src='${fallbackUrl}'; this.onerror=function(){this.parentElement.innerHTML='<div class=\poke-placeholder\>${s.pokemon[0].toUpperCase()}</div>';};">`;
      nameEl.textContent = s.pokemon;
      if (typesEl) typesEl.innerHTML = renderTypeBadges(s.pokemon);
    } else {
      iconEl.innerHTML = '<div class="poke-placeholder">?</div>';
      nameEl.textContent = '—';
      if (typesEl) typesEl.innerHTML = '';
    }

    // Sync all controls
    syncSegmented(side === 'a' ? els.boostA : els.boostB, s.boost, 'boost');
    syncBoostSlider(side, s.boost);
    syncSegmented(side === 'a' ? els.evsA : els.evsB, s.evs, 'evs');
    syncSpSlider(side, s.sp);
    syncNature(side, s.nature);

    // Sync effect buttons
    const effectsEl = side === 'a' ? els.effectsA : els.effectsB;
    effectsEl.querySelectorAll('.effect-btn').forEach(btn => {
      btn.classList.toggle('active', s.effects.has(btn.dataset.val));
    });

    updateSpeed(side);
  });

  renderTiers();

  // Brief animation on the badge
  els.vsBadge.classList.add('swap-flash');
  setTimeout(() => els.vsBadge.classList.remove('swap-flash'), 300);
}

els.vsBadge.style.cursor = 'pointer';
els.vsBadge.title = 'Swap Pokémon A ↔ B';
els.vsBadge.addEventListener('click', swapPokemon);

// ─── Type Effectiveness Popup ────────────────────────
const TYPE_CHART = {
  normal: { weak: ['fighting'], resist: ['ghost'], immune: ['ghost'] },
  fire: { weak: ['water', 'ground', 'rock'], resist: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immune: [] },
  water: { weak: ['electric', 'grass'], resist: ['fire', 'water', 'ice', 'steel'], immune: [] },
  electric: { weak: ['ground'], resist: ['electric', 'flying', 'steel'], immune: ['ground'] },
  grass: { weak: ['fire', 'ice', 'poison', 'flying', 'bug'], resist: ['water', 'electric', 'grass', 'ground'], immune: [] },
  ice: { weak: ['fire', 'fighting', 'rock', 'steel'], resist: ['ice'], immune: [] },
  fighting: { weak: ['flying', 'psychic', 'fairy'], resist: ['bug', 'rock', 'dark'], immune: [] },
  poison: { weak: ['ground', 'psychic'], resist: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immune: [] },
  ground: { weak: ['water', 'grass', 'ice'], resist: ['poison', 'rock'], immune: ['electric'] },
  flying: { weak: ['electric', 'ice', 'rock'], resist: ['grass', 'fighting', 'bug'], immune: ['ground'] },
  psychic: { weak: ['bug', 'ghost', 'dark'], resist: ['fighting', 'psychic'], immune: ['dark'] },
  bug: { weak: ['fire', 'flying', 'rock'], resist: ['grass', 'fighting', 'ground'], immune: [] },
  rock: { weak: ['water', 'grass', 'fighting', 'ground', 'steel'], resist: ['normal', 'fire', 'poison', 'flying'], immune: [] },
  ghost: { weak: ['ghost', 'dark'], resist: ['poison', 'bug'], immune: ['normal', 'fighting'] },
  dragon: { weak: ['ice', 'dragon', 'fairy'], resist: ['fire', 'water', 'electric', 'grass'], immune: ['fairy'] },
  dark: { weak: ['fighting', 'bug', 'fairy'], resist: ['ghost', 'dark'], immune: ['psychic'] },
  steel: { weak: ['fire', 'fighting', 'ground'], resist: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immune: ['poison'] },
  fairy: { weak: ['poison', 'steel'], resist: ['fighting', 'bug', 'dark'], immune: ['dragon'] },
};

function calcTypeEffectiveness(types) {
  const allTypes = Object.keys(TYPE_CHART);
  const result = {};

  allTypes.forEach(attacker => {
    let mult = 1;
    types.forEach(defender => {
      const chart = TYPE_CHART[defender];
      if (chart.immune.includes(attacker)) mult *= 0;
      else if (chart.weak.includes(attacker)) mult *= 2;
      else if (chart.resist.includes(attacker)) mult *= 0.5;
    });
    if (mult !== 1) result[attacker] = mult;
  });

  return result;
}

function buildPopupHTML(name) {
  const types = POKEMON_TYPES[name] || [];
  const eff = calcTypeEffectiveness(types);

  const groups = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
  Object.entries(eff).forEach(([t, m]) => {
    if (groups[m]) groups[m].push(t);
  });

  const badge = t => `<span class="popup-type-badge type-badge type-${t}">${t}</span>`;

  const row = (label, mult, cls, list) => list.length
    ? `<div class="popup-row ${cls}">
        <span class="popup-mult">${label}</span>
        <div class="popup-types">${list.map(badge).join('')}</div>
       </div>`
    : '';

  return `
    <div class="type-popup-inner">
      <div class="popup-header">
        <span class="popup-name">${name}</span>
        <div class="popup-own-types">${types.map(badge).join('')}</div>
        <button class="popup-close" aria-label="Close">✕</button>
      </div>
      <div class="popup-title">Type Effectiveness</div>
      ${row('4×', 4, 'super-weak', groups[4])}
      ${row('2×', 2, 'weak', groups[2])}
      ${row('½×', 0.5, 'resist', groups[0.5])}
      ${row('¼×', 0.25, 'super-resist', groups[0.25])}
      ${row('0×', 0, 'immune', groups[0])}
    </div>`;
}

function showTypePopup(name, anchorEl) {
  // Remove any existing popup
  const existing = document.getElementById('type-popup');
  if (existing) existing.remove();
  if (!name) return;

  const popup = document.createElement('div');
  popup.id = 'type-popup';
  popup.className = 'type-popup';
  popup.innerHTML = buildPopupHTML(name);
  document.body.appendChild(popup);

  // Position near anchor
  const rect = anchorEl.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;
  const scrollX = window.scrollX || window.pageXOffset;

  let top = rect.bottom + scrollY + 8;
  let left = rect.left + scrollX + rect.width / 2 - 160;
  left = Math.max(8, Math.min(left, window.innerWidth - 328));
  popup.style.top = top + 'px';
  popup.style.left = left + 'px';

  // Close button
  popup.querySelector('.popup-close').addEventListener('click', () => popup.remove());

  // Click outside to close
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!popup.contains(e.target) && !anchorEl.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
}

// Attach click to icon wrappers
els.iconA.addEventListener('click', () => {
  if (state.a.pokemon) showTypePopup(state.a.pokemon, els.iconA);
});
els.iconB.addEventListener('click', () => {
  if (state.b.pokemon) showTypePopup(state.b.pokemon, els.iconB);
});

// ─── April Fools Easter Egg ──────────────────────────
(function () {
  const btn = document.getElementById('afd-toggle');
  if (!btn) return;

  function refreshAllSprites() {
    ['a', 'b'].forEach(side => {
      const name = state[side].pokemon;
      if (!name) return;

      const iconEl = document.getElementById('icon-' + side);
      const animUrl = getSpriteUrl(name);
      const fallbackUrl = getSpriteFallbackUrl(name);
      const initial = name[0].toUpperCase();

      iconEl.innerHTML = `
      <img 
        src="${animUrl}" 
        alt="${name}" 
        onerror="
          this.onerror=null; 
          this.src='${fallbackUrl}'; 
          this.onerror=function(){
            this.parentElement.innerHTML='<div class=&quot;poke-placeholder&quot;>${initial}</div>';
          };
        "
      >`;
    });

    // Refresh open dropdown if any
    ['a', 'b'].forEach(side => {
      const ddEl = document.getElementById('dropdown-' + side);
      const searchEl = document.getElementById('search-' + side);
      if (ddEl && ddEl.classList.contains('open')) {
        const q = searchEl.value.trim().toLowerCase();
        if (q) {
          const matches = ALL_POKEMON.filter(p => p.toLowerCase().includes(q)).slice(0, 30);
          renderDropdown(ddEl, matches, side);
        }
      }
    });
  }

  btn.addEventListener('click', () => {
    AFD_MODE = !AFD_MODE;
    btn.classList.toggle('afd-active', AFD_MODE);
    btn.title = AFD_MODE ? 'Easter egg active' : 'Easter egg';
    refreshAllSprites();
  });
})();