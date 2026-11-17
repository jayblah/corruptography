// Network map behaviour. Content lives in data.js, styling in styles.css.
// To add a badge/detail type or a filter chip, add one entry to FACETS. The kinds of government reach (govKinds) are in data.js.
(() => {
  'use strict';
  const { nodes: N, edges: E, cats: CAT, sections: SECTIONS, govKinds: GOV, people: PEOPLE, portraits: PICS } = DATA;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  // ---------- configuration ----------
  const HUB = DATA.hub; // id of the central card, set in data.js
  const HUB_SHORT = DATA.hubShort || DATA.nodes[HUB].name; // how the central person is named in running text ("Thiel")
  const BEND = { max: 120, ratio: .25 };   // how far connection lines curve
  const STORE = { theme: 'corruptographyTheme' }; // keep in step with the inline script in index.html
  const REPO = DATA.repo; // where corrections are reported
  const WIKI = 'https://en.wikipedia.org/';
  const NEW_TAB = ' (opens in a new tab)';
  const EXT = '&#8599;'; // the north-east arrow that marks a link out

  // GOV (the kinds of government reach, in display order) comes from data.js; colour names map to .c-<colour> classes in styles.css.
  const GOV_BY_KEY = Object.fromEntries(GOV.map(g => [g.key, g]));
  const govSpec = g => ({ label: g.pill, color: g.color, icon: g.icon, f: `gov:${g.key}`, title: g.title });

  // ---------- small helpers ----------
  const storage = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: ignore */ } },
  };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const other = (e, id) => e.a === id ? e.b : e.a;
  const isHub = id => id === HUB;
  const edgeCat = e => N[isHub(e.a) ? e.b : e.a].cat; // a connection takes the colour of its non-hub end: the hub's own colour is near-black
  const arrow = (e, id) => e.kind === 'plain' ? '&harr;' : (e.a === id ? '&rarr;' : '&larr;');
  const countWhere = test => Object.values(N).filter(test).length;
  const extLink = (cls, href, label, attrs = '') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener" ${attrs}>${label}</a>`;

  // adjacency, built once: node id -> its edges
  const EDGES_OF = {};
  E.forEach(e => { (EDGES_OF[e.a] ||= []).push(e); (EDGES_OF[e.b] ||= []).push(e); });
  const consOf = id => EDGES_OF[id] || [];
  // how each node relates to the hub: the label of its first edge to or from it
  const rel = {};
  consOf(HUB).forEach(e => { const o = other(e, HUB); if (!(o in rel)) rel[o] = e.label; });

  // text formatting: escape, then optionally add Wikipedia links, then wrap money amounts
  const MONEY = /\$\d[\d,]*(?:\.\d+)?(?:\s?(?:billion|million|thousand)|[KMB])?\+?/g;
  const ENT = DATA.ent || {};
  const ENTRE = new RegExp('(?<![A-Za-z0-9])(' + Object.keys(ENT).sort((a, b) => b.length - a.length)
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-z0-9])', 'g');
  const linkNames = s => s.replace(ENTRE, m => extLink('wk', ENT[m], m, `title="${ENT[m].startsWith(WIKI) ? 'Wikipedia' : 'Source'}: ${m}"`));
  const money = s => s.replace(MONEY, m => `<span class="money">${m}</span>`);
  // A block of prose as bullets: one per sentence and per semicolon clause (a sentence ends after a lowercase letter, digit or closing mark, so "U.S. Army" stays whole); `commas` splits a list of names instead.
  const bulletList = (text, commas, render) => {
    const parts = commas ? String(text).split(/,\s+(?![^(]*\))/) : String(text).split(/(?<=[a-z0-9)"'%][.!?])\s+/).flatMap(t => t.split(/;\s+/));
    return `<ul class="blist">${parts.map(p => `<li>${render(p)}</li>`).join('')}</ul>`;
  };
  const fmt = s => money(linkNames(esc(s)));         // body text: links + money
  const plain = s => money(esc(s));             // no links (source titles, facts, text inside buttons)

  // ---------- icons, badges and detail blocks ----------
  // Line icons (24x24 grid, drawn with currentColor) shared by badges, dialog headings and chips.
  const ICON_PATHS = {
    views: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/>',
    faith: '<path d="M12 3v18M6.5 9h11"/>',
    fund: '<path d="M12 2.5v19M19 7c0-1.8-3-3-7-3s-7 1.2-7 3.2 3 2.8 7 3.3 7 1.3 7 3.3-3 3.2-7 3.2-7-1.2-7-3"/>',
    crypto: '<path d="M8.5 4.5v15M8.5 4.5h5a3.5 3.5 0 0 1 0 7h-5M8.5 11.5h5.8a3.8 3.8 0 0 1 0 8H8.5M11 2.5v2M14 2.5v2M11 19.5v2M14 19.5v2"/>',
    cos: '<path d="M5 21V4h9v17M14 9h5v12M3 21h18M8 8h2M8 12h2M8 16h2"/>',
    contractor: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>',
    official: '<path d="M12 3 3 8.5h18zM5 11v7M9.7 11v7M14.3 11v7M19 11v7M3 21h18M4 18h16"/>',
    influence: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 8.5a5 5 0 0 1 0 7"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    gop: '<path d="M9 6h6.5A4.5 4.5 0 0 1 20 10.5V17h-3v-3.5M9 6C6.5 6 5 7.7 5 10v8H3.5a1 1 0 0 1-1-1v-5M9 17v-3.5M12 14h3M9 17H6.5"/><circle cx="10" cy="10" r="1.7"/><path d="M20 11.5l1.5 2"/>', // an elephant
    dem: '<path d="M8.5 9.5 11 3M12.5 8 15 3.5"/><path d="M8.5 9.5C6 10 3.5 12.5 3 16c-.2 1.5.8 2.5 2 2.5h3L12 15.5V22M12.5 8c3 .5 5.5 3 5.5 6.5V22"/><circle cx="10.5" cy="12" r=".7"/>', // a donkey
    politics: '<path d="M5 21V4M5 5h12l-2.5 4 2.5 4H5"/>', // a flag
    filter: '<path d="M3 5h18l-7 8.5V20l-4-2v-4.5z"/>', // a funnel
    abroad: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.5 3.2 3.5 14.8 0 18M12 3c-3.5 3.2-3.5 14.8 0 18"/>',
  };
  const icon = name => `<svg class="ic${name === 'gop' || name === 'dem' ? ' party' : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
  const iconed = (name, html) => (name ? icon(name) : '') + html;

  // A badge. With `f` a click filters the map. `compact` is the card form: icon only, with the words in the tooltip and
  // screen-reader label; it is for display only (the filter chips are the route to the same filters).
  function pill(label, color, { icon: ic, f = '', title = '', compact = false } = {}) {
    const cls = `pill c-${color}${compact ? ' only' : ''}`;
    if (compact) return `<span class="${cls}" role="img" aria-label="${esc(label)}" title="${esc(title || label)}">${iconed(ic, '')}</span>`;
    const tip = title ? ` title="${esc(title)}"` : '';
    return f ? `<button type="button" class="${cls}" data-f="${f}"${tip}>${iconed(ic, esc(label))}</button>` : `<span class="${cls}"${tip}>${iconed(ic, esc(label))}</span>`;
  }
  // A section of the details view: collapsible, open by default; `extra` (badges) sits beside the heading.
  const block = (color, head, body, ic, extra = '') => `<details class="dsec c-${color}" open><summary class="h">${iconed(ic, head)}${extra}</summary>${body}</details>`;

  // Facets: one entry per kind of badge / detail block / filter chip. Fields:
  //   key + color + icon       identity (key is also the filter id and, by default, the node field it reads)
  //   label, desc              badge text and its legend description
  //   has(n), text(n)          whether a node gets the badge/block, and the text shown (default: n[key])
  //   head                     card dialog heading (string or fn); no head: no panel block
  //   fallback                 text for a block whose node field is empty (the views block of a flagged card)
  //   lead                     show the badges inside the block heading too (government)
  //   chip                     the filter's name; chipId/chipTest make it a filter of its own (anti-democracy)
  //   filter(n)                what the filter matches (default: has)
  const facet = def => {
    const f = { has: n => n[def.key], text: n => n[def.key], ...def };
    if (f.label) {
      f.specs ||= [{ label: f.label, color: f.color, icon: f.icon, f: f.key, title: f.desc }];
      f.badges ||= n => f.has(n) ? f.specs : [];
    }
    return f;
  };
  // The order of the badges and of the blocks of a card's details: money first, then power, then politics, then the rest alphabetically.
  const FACETS = [
    facet({ key: 'fund', color: 'green', icon: 'fund', label: 'Money', desc: 'Money',
      head: 'Money', chip: 'Money' }),
    facet({ key: 'gov', color: 'navy', icon: 'official', label: 'Power', has: n => n.gov, text: n => n.gov.text,
      specs: GOV.map(govSpec), badges: n => n.gov ? n.gov.kinds.map(k => govSpec(GOV_BY_KEY[k])) : [],
      head: 'Power', lead: true }),
    facet({ key: 'gop', color: 'red', icon: 'gop', label: 'Republican', desc: 'Republican', text: n => n.partyNote || 'Republican', partyBadge: true,
      has: n => n.party === 'gop' || n.party === 'both', head: 'Party', chip: 'Republican' }),
    facet({ key: 'dem', color: 'blue', icon: 'dem', label: 'Democrat', desc: 'Democrat', text: n => n.partyNote || 'Democrat', partyBadge: true,
      has: n => n.party === 'dem' || n.party === 'both', head: 'Party', inPanel: n => n.party === 'dem', chip: 'Democrat' }),
    facet({ key: 'views', color: 'gold', icon: 'views', label: 'Views', desc: 'Anti-democracy views',
      has: n => n.anti || n.views, fallback: 'Flagged as echoing these views',
      head: n => n.anti ? 'Anti-Democracy' : 'Views',
      chip: 'Anti-Democracy', chipId: 'anti', chipTest: n => n.anti || n.cat === 'net' || consOf(n.id).some(e => N[other(e, n.id)].cat === 'net') }), // network states and startup cities, and the people tied to one, count as anti-democracy
    facet({ key: 'faith', color: 'purple', icon: 'faith', label: 'Christian Nationalism', desc: 'Christian nationalist tie',
      head: 'Christian Nationalist Association',
      chip: 'Christian Nationalism', filter: n => n.faith || n.cat === 'faith' }),
    facet({ key: 'cos', color: 'pink', icon: 'cos', label: 'Companies', desc: 'Companies listed',
      head: 'Companies / Projects', commas: true }),
    facet({ key: 'crypto', color: 'sky', icon: 'crypto', label: 'Crypto', desc: 'Crypto tie',
      head: 'Crypto', chip: 'Crypto' }),
  ];

  // Filters: one per facet (the anti-democracy one has its own id) and one per kind of government reach.
  const FILTERS = {};
  FACETS.filter(f => f.chip).forEach(f => {
    FILTERS[f.chipId || f.key] = { test: f.chipTest || f.filter || f.has, name: f.chip || f.label, color: f.color, icon: f.icon };
  });
  GOV.forEach(g => { FILTERS[`gov:${g.key}`] = { test: n => n.gov && n.gov.kinds.includes(g.key), name: g.reach, color: g.color, icon: g.icon }; });
  // The filter bar, left to right. A filter on its own is a chip; a group is a dropdown of checkboxes. Within a group any chosen option matches; a card must match every group that has a choice.
  const BAR = [
  // `fixed` filters are on every person's map; the others only appear when the person's map has at least one card that matches.
    { fixed: true, keys: ['fund'] },
    { fixed: true, id: 'power', name: 'Power', color: 'navy', icon: 'official', keys: GOV.map(g => `gov:${g.key}`) },
    { fixed: true, id: 'politics', name: 'Politics', color: 'slate', icon: 'politics', keys: ['gop', 'dem'] },
    { keys: ['anti'] }, { keys: ['faith'] }, { keys: ['crypto'] },
  ];

  const facetHtml = {
    pills: (n, only = () => true) => [...FACETS.filter(only)].sort((a, b) => !!b.partyBadge - !!a.partyBadge).flatMap(f => f.badges ? f.badges(n) : []).map(s => pill(s.label, s.color, { icon: s.icon, f: s.f, title: s.title, compact: true })).join(''),
    panel: n => FACETS.filter(f => f.head && f.has(n) && (!f.inPanel || f.inPanel(n))).map(f => { // a card marked for both parties shows one Party block
      const lead = f.lead ? f.badges(n).map(s => pill(s.label, s.color, { icon: s.icon, title: s.title })).join(' ') : '';
      return block(f.color, typeof f.head === 'function' ? f.head(n) : f.head, `<div class="body">${bulletList(f.text(n) || f.fallback, f.commas, fmt)}</div>`, f.icon, lead);
    }).join(''),
  };

  // ---------- state ----------
  const stage = $('#stage'), ov = $('#ov'), cardDlg = $('#card'), cardBody = $('#cardBody'), searchBox = $('#q'), searchClear = $('#qClear');
  const els = {}; // node id -> card element
  let pinned = null, term = '', resizeFrame = 0;
  let pathTo = null, pathAvoid = true, currentPath = null, currentPaths = null; // 'how is A connected to B' state

  // ---------- help panel ----------
  const NARROW = matchMedia('(max-width: 700px)');
  const openModal = d => { if (!d.open) d.showModal(); };
  // The help panel opens beside the map on a wide screen (the map makes room for it) and as a modal on a phone; a card's details open as a panel too.
  const openPanel = d => { if (!d.open) { if (NARROW.matches) d.showModal(); else d.show(); } };
  const helpPanel = $('#helpPanel');
  const toggleHelp = () => { if (helpPanel.open) helpPanel.close(); else openPanel(helpPanel); };

  // ---------- legend and filter chips ----------
  // Arrowhead for each kind of connection: a filled triangle, an outlined triangle, an open line arrow, or none (plain = mutual).
  const HEAD = { strong: 'solid', normal: 'hollow', weak: 'line', plain: null };
  const arrowPath = { solid: 'M0,0 L10,5 L0,10 z', line: 'M1.5,1 L8.5,5 L1.5,9', hollow: 'M1.5,1 L8.5,5 L1.5,9 z' };
  // An arrowhead as an SVG marker. It scales with the line's stroke width, so a close tie's head is twice the size of a tie's.
  const markerSvg = (id, head, cat) => `<marker id="${id}" class="cat-${cat} ${head}" viewBox="0 0 10 10" refX="${head === 'solid' ? 8 : 9}" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="${arrowPath[head]}"/></marker>`;
  // a small drawing of one connection style for the legend, built from the same markers and CSS as the map so it always matches
  const sampleLine = kind => {
    const head = HEAD[kind], id = `lg-${kind}`;
    return `<svg class="ln" viewBox="0 0 48 20" aria-hidden="true">${head ? `<defs>${markerSvg(id, head, 'oth')}</defs>` : ''}`
      + `<path class="edge ${kind} cat-oth" d="M2,10 H${kind === 'strong' ? 42 : 46}"${head ? ` marker-end="url(#${id})"` : ''}/></svg>`;
  };
  function renderLegend() {
    const row = (title, items) => `<div class="lrow"><b>${title}</b><div class="litems">${items.join('')}</div></div>`;
    const lg = (mark, desc) => `<span class="lg">${mark}${desc}</span>`;
    $('#legend').innerHTML =
      row('Marks', [
        lg('<i class="sw anti"></i>', 'Gold dashed border: anti-democracy views'),
        lg('<span class="wk">underlined</span>', 'Link for a name in the text'),
      ]) +
      row('Lines', [
        lg(sampleLine('strong'), 'Close tie: founder, funder, mentor'),
        lg(sampleLine('normal'), 'Tie: influence, support or role'),
        lg(sampleLine('weak'), 'Looser or critical tie'),
        lg(sampleLine('plain'), 'Mutual or peer tie (no arrow)'),
      ]);
  }
  // the person picker: the current person's portrait and name, and a menu of everyone with a map (each is a page of its own)
  const picker = () => {
    const who = typeof DIRECTORY === 'undefined' ? [] : DIRECTORY, me = who.find(p => p.hub === HUB) || { name: N[HUB].name };
    const item = p => `<a class="opt" href="${esc(p.href)}"${p === me ? ' aria-current="page"' : ''}>${avatar(p.hub, '', 24, 'loading="lazy"')}<span>${esc(p.name)}</span></a>`;
    return `<div class="dd who"><button type="button" class="btn chip parent who-btn" data-dd="who" aria-expanded="false" aria-controls="dd-who" title="Choose whose network to show"><span>${esc(me.name)}</span></button>`
      + `<div class="ddmenu" id="dd-who" role="group" aria-label="Person" hidden>${who.map(item).join('')}</div></div>`;
  };
  function renderChips() {
    const chip = k => `<button class="btn chip tinted c-${FILTERS[k].color}" data-f="${k}">${iconed(FILTERS[k].icon, esc(FILTERS[k].name))}</button>`;
    const option = k => `<label class="opt c-${FILTERS[k].color}"><input type="checkbox" data-f="${k}">${iconed(FILTERS[k].icon, `<span>${esc(FILTERS[k].name)}</span>`)}<span class="num">${countWhere(FILTERS[k].test)}</span></label>`;
    const dropdown = g => `<div class="dd c-${g.color}"><button type="button" class="btn chip tinted parent" data-dd="${g.id}" aria-expanded="false" aria-controls="dd-${g.id}">${iconed(g.icon, esc(g.name))}<span class="dd-n"></span></button>`
      + `<div class="ddmenu" id="dd-${g.id}" role="group" aria-label="${esc(g.name)}" hidden>${g.keys.map(option).join('')}</div></div>`;
    // the funnel button in the header is only shown on a phone, where it opens and closes the chips (see styles.css)
    $('#helpBtn').insertAdjacentHTML('beforebegin', `<button type="button" class="btn ftoggle" id="fToggle" aria-expanded="false" aria-controls="filters" aria-label="Filters" title="Filters">${icon('filter')}<span class="dd-n" aria-hidden="true"></span></button>`);
    // the person picker comes first, then the fixed filters, then the ones that suit this person; a thin rule (a line break on a phone) separates the three groups
    const sep = '<span class="sep" aria-hidden="true"></span>';
    const shown = BAR.filter(g => g.fixed || g.keys.some(k => countWhere(FILTERS[k].test)));
    const fixed = shown.filter(g => g.fixed), tailored = shown.filter(g => !g.fixed), part = g => g.id ? dropdown(g) : chip(g.keys[0]);
    $('#filters').insertAdjacentHTML('beforeend', picker() + sep + fixed.map(part).join('') + (tailored.length ? sep + tailored.map(part).join('') : '') + '<span id="count" class="count" aria-live="polite"></span>');
  }
  // The chosen filters: any number. Everything that sets a filter (chips, checkboxes, badges, counts) shows which ones are active.
  const sel = new Set();
  const matchesFilters = n => BAR.every(g => { const on = g.keys.filter(k => sel.has(k)); return !on.length || on.some(k => FILTERS[k].test(n)); });
  const syncButtons = () => {
    $$('[data-f]').forEach(b => {
      const on = sel.has(b.dataset.f);
      b.classList.toggle('on', on);
      if (b.type === 'checkbox') b.checked = on;
      else if (b.classList.contains('chip')) b.setAttribute('aria-pressed', on);
    });
    $('#fToggle .dd-n').textContent = sel.size || '';
    $('#fToggle').setAttribute('aria-label', sel.size ? `Filters (${sel.size} on)` : 'Filters');
    BAR.filter(g => g.id).forEach(g => { // a dropdown's button shows how many of its options are on
      const n = g.keys.filter(k => sel.has(k)).length, btn = $(`[data-dd="${g.id}"]`);
      btn.classList.toggle('on', n > 0);
      btn.querySelector('.dd-n').textContent = n ? `(${n})` : '';
    });
  };
  // open the named dropdown, or close it if it is open; no name closes them all
  const menuOpen = () => $('.ddmenu:not([hidden])');
  function toggleMenu(id) {
    $$('.ddmenu').forEach(m => {
      const open = m.hidden && m.id === `dd-${id}`;
      m.hidden = !open;
      $(`[data-dd="${m.id.slice(3)}"]`).setAttribute('aria-expanded', open);
    });
  }

  // ---------- cards and sections ----------
  // A person's portrait: a round photo when a freely licensed one exists, otherwise their initials in the card's colour.
  const PERSON = new Set(PEOPLE);
  const initials = name => name.replace(/^(Lord|Fr\.|Dr\.)\s+/, '').split(/\s+/).filter(w => /^\p{L}/u.test(w)).map((w, i, a) => i === 0 || i === a.length - 1 ? w[0] : '').join('');
  const avatar = (id, cls = '', size = 36, extra = 'loading="lazy"') => PICS[id]
    ? `<img class="pic${cls}" src="img/${id}.webp" alt="" width="${size}" height="${size}" ${extra}>`
    : `<span class="pic mono${cls}" aria-hidden="true">${esc(initials(N[id].name))}</span>`;
  const portrait = n => PERSON.has(n.id) ? avatar(n.id, '', 112, `${n.id === HUB ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"`) : '';
  // The small round links of a card: the Wikipedia "W", then the card's own link. `cls` places them (corner of the card, or beside the name in the dialog).
  const cornerLink = (url, mark, title, cls) => extLink(`wp${cls ? ' ' + cls : ''}`, url, mark, `title="${esc(title)}" aria-label="${esc(title)}${NEW_TAB}"`);
  const cornerLinks = (n, cls = '') => (n.wiki ? cornerLink(n.wiki, 'W', `Wikipedia article: ${n.name}`, cls) : '')
    + (n.link ? cornerLink(n.link.u, EXT, n.link.l, cls || (n.wiki ? 'alt' : '')) : '');
  // A card's relationship line leaves out the dates the details view keeps: a parenthesised date or range, "in 2018" or "since Nov 2025", and a bare range like 2025-26.
  const BRIEF = [/\s*\((?:[A-Z][a-z]{2}\s)?\d{4}(?:[-–]\d{2,4})?\)/g, /\s+(?:in|since)\s+(?:[A-Z][a-z]{2}\s)?\d{4}(?=[;,.)]|\s|$)/g, /\s+\d{4}[-–]\d{2,4}(?=[;,.]|$)/g];
  const brief = text => BRIEF.reduce((t, re) => t.replace(re, ''), text).replace(/\s+([;,])/g, '$1').trim();
  const subText = n => fmt(n.sub.join(' · '));
  function card(n, { cls = '', lines = '', tail = '' } = {}) {
    const flags = [n.anti && 'anti', cls].filter(Boolean).join(' ');
    const hero = cls.includes('hero'); // the hub card has no row of badges: its portrait sits beside the name, its companies under it
    const pills = hero ? '' : facetHtml.pills(n), party = hero ? facetHtml.pills(n, f => f.partyBadge) : ''; // badges along the bottom, the party badge first; the hub shows only its party badge, in its corner
    const title = `<div class="t"><button type="button" class="n">${esc(n.name)}</button>` + (n.sub.length ? `<div class="s">${plain(n.sub.join(' · '))}</div>` : '') + (hero && n.cos ? `<div class="r">${plain(n.cos)}</div>` : '') + '</div>';
    const badges = pills ? `<div class="pills">${pills}</div>` : '';
    return `<div class="card cat-${n.cat} ${flags}" data-id="${esc(n.id)}">`
      + (hero && PICS[n.id] ? `<img class="herobg" src="img/${n.id}-lg.webp" alt="" width="240" height="240" fetchpriority="high" decoding="async">` : '')
      + `<div class="hd">${hero ? '' : portrait(n)}${title}${party ? `<span class="party">${party}</span>` : ''}</div>`
      + (rel[n.id] ? `<div class="r">${plain(brief(rel[n.id]))}</div>` : '')
      + lines
      + badges
      + tail + '</div>';
  }
  const stat = (g, count) => `<button class="stat" data-f="gov:${g.key}"><b>${count}</b> ${g.reach.toLowerCase()}</button>`;

  function renderStage() {
    const totals = N[HUB].totals ? `<p class="totals">${N[HUB].totals.map(([label, text]) => `<span class="rh">${esc(label)}</span> ${plain(text).replace(/\d[\d,.]*%/g, '<b>$&</b>')}`).join(' <span aria-hidden="true">&rarr;</span> ')}</p>` : ''; // spending, then what came back
    const reach = `<p class="reach"><span class="rh">Reach into government:</span> `
      + GOV.map(g => stat(g, countWhere(FILTERS[`gov:${g.key}`].test))).join(' <span aria-hidden="true">&middot;</span> ')
      + `</p>`;
    const hub = N[HUB];
    const groups = SECTIONS.map(([k]) => [k, Object.values(N).filter(n => n.cat === k)]).filter(([, ns]) => ns.length);
    // One grid of equal cards, no boxes around the groups (placeTabs names each group on its first card).
    const cells = groups.flatMap(([, ns]) => ns.map(n => card(n))).join('');
    const beliefs = hub.beliefs ? `<ul class="beliefs">${hub.beliefs.map(b => `<li>${plain(b)}</li>`).join('')}</ul>` : '';
    stage.insertAdjacentHTML('afterbegin', card(hub, { cls: 'hero', lines: beliefs, tail: totals + reach }) + cells);
    $$('.card').forEach(c => { els[c.dataset.id] = c; });
    placeTabs();
  }
  // A group's name is a tab on the top edge of its first card that is showing, so a filter keeps a name above each run of cards.
  const TAB_NAME = { faith: 'Christian Nationalism', net: 'Network States' }; // the names that are too long for a tab (the full name is its tooltip)
  function placeTabs() {
    const first = {};
    $$('#stage .card:not(.gone)').forEach(c => { const k = N[c.dataset.id].cat; if (k !== N[HUB].cat && !first[k]) first[k] = c; });
    $$('.glabel').forEach(t => { if (first[t.dataset.cat] !== t.parentElement) t.remove(); });
    Object.entries(first).forEach(([k, c]) => { if (!c.querySelector(':scope > .glabel')) c.insertAdjacentHTML('afterbegin', `<span class="glabel" data-cat="${k}" title="${esc(CAT[k])}">${esc(TAB_NAME[k] || CAT[k])}</span>`); });
  }

  // ---------- connection lines ----------
  // Each line is a quadratic curve between two cards' centres, trimmed so it starts and ends on the cards' borders.
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const inside = (r, [x, y]) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  // Binary-search the parameter where the curve crosses a card's border. `from` is the t known to be inside the card
  // and `to` a t outside it; returns the t nearest the border on the outside.
  function crossing(point, rect, from, to) {
    for (let i = 0; i < 18; i++) {
      const mid = (from + to) / 2;
      if (inside(rect, point(mid))) from = mid; else to = mid;
    }
    return to;
  }
  // the arrowhead marker an edge needs (one per head shape and colour), and the <defs> content for a list of edges
  const headId = e => HEAD[e.kind] && `${HEAD[e.kind]}-${edgeCat(e)}`;
  const markerDefs = (list, prefix = '') => [...new Set(list.map(headId).filter(Boolean))].map(id => markerSvg(prefix + id, ...id.split('-'))).join('');
  function edgeSvg(e, i, boxOf) {
    const cat = edgeCat(e), ra = boxOf(e.a), rb = boxOf(e.b);
    const A = [ra.x + ra.w / 2, ra.y + ra.h / 2], B = [rb.x + rb.w / 2, rb.y + rb.h / 2];
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(BEND.max, len * BEND.ratio) * (i % 2 ? 1 : -1); // alternate curve direction so parallel lines don't overlap
    const C = [(A[0] + B[0]) / 2 - dy / len * bend, (A[1] + B[1]) / 2 + dx / len * bend];
    const point = t => lerp(lerp(A, C, t), lerp(C, B, t), t);
    // keep only the part of the curve between the two borders (the whole curve if the cards overlap)
    let t0 = crossing(point, ra, 0, 1), t1 = 1 - crossing(t => point(1 - t), rb, 0, 1); // searched over the whole curve: the Thiel card is big enough to hold its midpoint
    if (t0 >= t1) { t0 = 0; t1 = 1; }
    const P0 = point(t0), P2 = point(t1);
    const P1 = lerp(P0, lerp(C, B, t0), (t1 - t0) / (1 - t0)); // control point of the trimmed segment
    const marker = headId(e) ? ` marker-end="url(#${headId(e)})"` : '';
    return `<path class="edge ${e.kind} cat-${cat}" d="M${P0[0]},${P0[1]} Q${P1[0]},${P1[1]} ${P2[0]},${P2[1]}"${marker}/>`;
  }
  // The hub has dozens of connections; drawn all at once they are a tangle nobody can read. Its card spotlights its neighbours without lines,
  // and each neighbour draws its own line to the hub when hovered or selected.
  const draw = id => { offFor = { id, list: isHub(id) ? [] : consOf(id).filter(e => shown(other(e, id))) }; refreshLines(); };
  // `targets` maps a card id to another element the line should end at instead (the pill that stands in for a card scrolled out of view)
  function drawEdges(list, targets = {}) {
    ov.setAttribute('width', stage.scrollWidth); ov.setAttribute('height', stage.scrollHeight);
    // read every position first (one stage rect, one rect per card), then build the markup
    const origin = stage.getBoundingClientRect(), boxes = {};
    const boxOf = nid => boxes[nid] ||= (r => ({ x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height }))((targets[nid] || els[nid]).getBoundingClientRect());
    const paths = list.map((e, i) => edgeSvg(e, i, boxOf));
    ov.innerHTML = `<defs>${markerDefs(list)}</defs>${paths.join('')}`; // every line runs over the cards so it is easy to see
  }

  // While a card's connections are drawn, the ones whose cards have scrolled out of view are named in a strip at the top or bottom of the page,
  // with an arrow showing which way the tie runs (these are cues only: they ignore the pointer).
  let offFor = null;
  const viewEl = $('#view'), offUp = $('#offUp'), offDown = $('#offDown');
  const OFF_MAX = 6;
  const offPill = (e, id, up) => {
    const o = other(e, id), n = N[o];
    const toward = e.kind === 'plain' ? '&#8597;' : (e.a === id) === up ? '&#8593;' : '&#8595;'; // the arrow points the way the tie runs
    return `<span class="offpill cat-${n.cat}" data-pill="${esc(o)}">${avatar(o, ' sm', 34, '')}<b>${esc(n.name)}</b><i>${toward}</i></span>`;
  };
  function showOffscreen() {
    const up = [], down = [];
    if (offFor && !pinned) { // a pinned card has its dialog open: no strips behind it
      const v = viewEl.getBoundingClientRect();
      offFor.list.forEach(e => {
        const el = els[other(e, offFor.id)];
        if (!el) return;
        const r = (el.querySelector('.n') || el).getBoundingClientRect(); // the name, not the whole card: a card whose name has scrolled away counts as off screen
        if (r.bottom < v.top) up.push(e); else if (r.top > v.bottom) down.push(e);
      });
    }
    const fill = (box, list, isUp) => {
      box.innerHTML = list.slice(0, OFF_MAX).map(e => offPill(e, offFor.id, isUp)).join('') + (list.length > OFF_MAX ? `<span class="offpill more">+${list.length - OFF_MAX} more</span>` : '');
      box.hidden = !list.length;
    };
    fill(offUp, up, true); fill(offDown, down, false);
    const pills = {};
    [offUp, offDown].forEach(box => box.querySelectorAll('[data-pill]').forEach(p => { pills[p.dataset.pill] = p; }));
    return pills;
  }
  // the lines of the card being previewed: those to cards out of view end at their pills, so redraw whenever the page scrolls
  function refreshLines() {
    const pills = showOffscreen();
    if (offFor) drawEdges(offFor.list, pills);
  }
  let offQueued = false;
  viewEl.addEventListener('scroll', () => { if (offFor && !offQueued) { offQueued = true; requestAnimationFrame(() => { offQueued = false; refreshLines(); }); } }, { passive: true });

  // ---------- dimming, filtering, pinning ----------
  // The hub never dims: the government counts inside its card are controls and must stay readable.
  // `hide` removes the others from the layout (filters and search, so the matches close up at the top); otherwise they are only greyed.
  const setDim = (show, hide = false) => {
    Object.entries(els).forEach(([id, el]) => {
      const out = !!show && !show.has(id) && !isHub(id);
      el.classList.toggle('gone', out && hide);
      el.classList.toggle('dim', out && !hide);
    });
    placeTabs();
  };
  // Hovering greys the cards outside the spotlight but never moves anything (a card that moved from under the pointer would flicker); cards a filter hid stay hidden.
  const dimOthers = show => Object.entries(els).forEach(([id, el]) => el.classList.toggle('dim', !!show && !show.has(id) && !isHub(id) && !el.classList.contains('gone')));
  const shown = id => els[id] && !els[id].classList.contains('gone');
  function neighbours(id) { const s = new Set([id]); consOf(id).forEach(e => s.add(other(e, id))); return s; }
  // everything a search can match on a card, including its connection labels and badge names
  const HAYSTACKS = {};
  const haystack = n => HAYSTACKS[n.id] ||= [n.name, n.beliefs, n.sub.join(' '), rel[n.id], ...consOf(n.id).map(e => e.label),
    ...FACETS.filter(f => f.has(n)).map(f => f.text(n)), ...FACETS.flatMap(f => f.badges ? f.badges(n).map(s => s.label) : [])].filter(Boolean).join(' ').toLowerCase();
  const TOTAL = Object.keys(N).length;
  const showCount = k => {
    const name = sel.size ? `${[...sel].map(f => esc(FILTERS[f].name)).join(' + ')} · ` : '';
    // the matches are shown by the cards themselves, so only "no matches" is written on screen; a screen reader hears the count
    $('#count').innerHTML = k === null ? '' : `<span class="${k ? 'sr' : ''}">${name}${k ? `${k} of ${TOTAL} shown` : 'No matches'}</span> <button type="button" class="linkbtn" data-clear>Clear</button>`;
  };
  function applyFilter() {
    if (pinned) return;
    const t = term.trim().toLowerCase();
    if (!sel.size && !t) { setDim(null); showCount(null); return; }
    const hits = Object.values(N).filter(n => matchesFilters(n) && (!t || haystack(n).includes(t))).map(n => n.id);
    setDim(new Set(hits), true);
    showCount(hits.length);
  }
  const reset = () => { ov.innerHTML = ''; offFor = null; showOffscreen(); applyFilter(); };
  function unpin() {
    pinned = pathTo = currentPath = currentPaths = null;
    $$('.card.sel').forEach(c => { c.classList.remove('sel'); c.querySelector('.n').removeAttribute('aria-pressed'); });
  }
  function clearSelection() { unpin(); if (cardDlg.open) cardDlg.close(); reset(); syncUrl(); }
  const setFilter = k => { if (!sel.delete(k)) sel.add(k); syncButtons(); clearSelection(); }; // a filter is switched on or off and the rest stay as they were
  function resetAll() { sel.clear(); setTerm(''); syncButtons(); clearSelection(); } // Clear: no filters, no search
  function setTerm(value) { term = value; searchBox.value = value; searchClear.hidden = !value; } // the search text and its box, kept in step
  function pin(id) {
    unpin();
    pinned = id;
    els[id].classList.add('sel');
    els[id].querySelector('.n').setAttribute('aria-pressed', 'true');
    showCount(null);
    paintSelection();
    showDetails(id);
    openPanel(cardDlg);
    syncUrl();
  }
  // Spotlight what is selected: the chosen path between two cards, or one card's connections.
  function paintSelection() {
    if (!pinned) return;
    if (currentPath) { setDim(new Set(currentPath.nodes)); offFor = null; showOffscreen(); drawEdges(currentPath.edges); return; }
    setDim(neighbours(pinned));
    draw(pinned);
  }
  // hover or keyboard focus on a card: spotlight it and draw its connections (unless something is pinned)
  function previewCard(id) { dimOthers(neighbours(id)); draw(id); } // the filter's count stays put while a card is hovered

  // ---------- how is A connected to B ----------
  // Breadth-first search over the connections, ignoring their direction; optionally refusing to route through the hub.
  function findPath(from, to, avoidHub) {
    const prev = { [from]: null }, queue = [from];
    for (let i = 0; i < queue.length && !(to in prev); i++) {
      for (const e of consOf(queue[i])) {
        const o = other(e, queue[i]);
        if (o in prev || (avoidHub && isHub(o) && o !== to)) continue;
        prev[o] = { id: queue[i], e };
        queue.push(o);
      }
    }
    if (!(to in prev)) return null;
    const nodes = [to], edges = [];
    for (let id = to; prev[id]; id = prev[id].id) { nodes.unshift(prev[id].id); edges.unshift(prev[id].e); }
    return { nodes, edges };
  }
  const pathsFor = (a, b) => ({ any: findPath(a, b, false), avoid: isHub(a) || isHub(b) ? null : findPath(a, b, true) });
  function computePath() {
    currentPath = currentPaths = null;
    if (!pinned || !pathTo) return;
    currentPaths = pathsFor(pinned, pathTo);
    currentPath = (pathAvoid && currentPaths.avoid) || currentPaths.any;
  }
  function renderPath() {
    const box = $('#pathResult');
    if (!box) return;
    if (!currentPath) { box.innerHTML = pathTo ? '<p class="hint">No connection found.</p>' : ''; return; }
    const { any, avoid } = currentPaths;
    const steps = n => `${n} step${n === 1 ? '' : 's'}`;
    const viaHub = any.nodes.slice(1, -1).includes(HUB);
    const choice = (via, text, on) => `<button class="btn${on ? ' on' : ''}" data-via="${via}">${text}</button>`;
    const choices = avoid && viaHub
      ? `<div class="via">${choice('avoid', `Without ${HUB_SHORT} · ${steps(avoid.edges.length)}`, pathAvoid)}${choice('any', `Shortest · ${steps(any.edges.length)}, via ${HUB_SHORT}`, !pathAvoid)}</div>`
      : (viaHub ? `<p class="hint">Every route between them runs through ${HUB_SHORT}.</p>` : '');
    const hop = (e, from) => `<div class="hop">${arrow(e, from)} ${plain(e.label || 'connected')}</div>`;
    const list = currentPath.nodes.map((id, i) =>
      `<button class="btn con cat-${N[id].cat}" data-go="${esc(id)}"><b>${esc(N[id].name)}</b></button>` + (i < currentPath.edges.length ? hop(currentPath.edges[i], id) : '')).join('');
    box.innerHTML = `${choices}<p class="hint">${steps(currentPath.edges.length)}</p>${list}`;
  }
  function setPath(to) {
    pathTo = to || null;
    computePath();
    paintSelection();
    renderPath();
    const select = $('#pathSel');
    if (select) select.value = pathTo || '';
    syncUrl();
  }
  const pathBox = n => block('accent', `How is ${esc(n.name)} connected to…`,
    `<select id="pathSel" aria-label="Find the connection to another card"><option value="">Choose a card</option>`
    + Object.values(N).filter(x => x.id !== n.id).sort((x, y) => x.name.localeCompare(y.name)).map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')
    + `</select><div id="pathResult"></div>`);

  // ---------- the address bar mirrors the view, so any view can be shared ----------
  function syncUrl() {
    const p = new URLSearchParams();
    if (pinned) p.set('card', pinned);
    if (pathTo) { p.set('to', pathTo); if (!pathAvoid) p.set('via', 'any'); }
    if (sel.size) p.set('filter', [...sel].join(','));
    if (term.trim()) p.set('q', term.trim());
    const h = p.toString();
    history.replaceState(null, '', location.pathname + location.search + (h ? '#' + h : ''));
  }
  function applyHash() {
    const p = new URLSearchParams(location.hash.slice(1)), card = p.get('card'), to = p.get('to');
    sel.clear();
    (p.get('filter') || '').split(',').filter(k => FILTERS[k]).forEach(k => sel.add(k));
    setTerm(p.get('q') || '');
    pathAvoid = p.get('via') !== 'any';
    syncButtons();
    clearSelection();
    if (card && els[card]) { pin(card); if (to && els[to] && to !== card) setPath(to); }
  }

  // ---------- card dialog ----------
  const sourcesHtml = n => n.sources && n.sources.length
    ? block('accent', 'Sources',
      `<ul class="blist">${n.sources.map(s => '<li>' + extLink('srcl', s.u, `${plain(s.l)}<span class="ext" aria-hidden="true">${EXT}</span>`
        + (s.s === 'ok' ? '' : `<span class="lock" title="May be paywalled or block automated access">${icon('lock')}</span>`)
        + `<span class="sr">${s.s === 'ok' ? '' : ' (may be paywalled)'}${NEW_TAB}</span>`) + '</li>').join('')}</ul>`
      + `<div class="hint fine">Some links may require an account.</div>`)
    : '';

  // The connections of one card as a star: the card in the middle, each connected card on an ellipse around it.
  // Written by hand (a star needs no layout engine, and the strict policy rules out a library loaded from elsewhere).
  const GRAPH = { w: 880, h: 500, rx: 270, ry: 180, r: 21, rc: 38, maxNodes: 16 }; // size, ellipse radii, bubble radii, most bubbles on the ring (a card with more is shown grouped instead)
  const nameLines = name => {
    if (name.length <= 14 || !name.includes(' ')) return [name];
    const mid = name.length / 2, spaces = [...name].map((c, i) => c === ' ' ? i : -1).filter(i => i >= 0);
    const at = spaces.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
    return [name.slice(0, at), name.slice(at + 1)];
  };
  const bubble = (id, x, y, r) => {
    const face = PICS[id]
      ? `<clipPath id="gc-${id}"><circle cx="${x}" cy="${y}" r="${r - 2}"/></clipPath><image href="img/${id}.webp" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#gc-${id})"/>`
      : ''; // no initials: text inside the link would have to be part of its accessible name
    return `<circle class="bub" cx="${x}" cy="${y}" r="${r}"/>${face}<circle class="rim" cx="${x}" cy="${y}" r="${r}"/>`;
  };
  // Initials for a person with no photo. Kept out of the link itself (text inside a link must be part of its accessible name), so the outer ones sit in their own aria-hidden layer that ignores the pointer.
  const mono = (id, x, y, cls = '') => PICS[id] || !PERSON.has(id) ? '' : `<text class="ini ${cls}" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${esc(initials(N[id].name))}</text>`;
  function connectionGraph(id) {
    const cons = consOf(id), k = cons.length, { r, rc, w, h } = GRAPH, cx = w / 2, cy = h / 2;
    const spots = cons.map((e, i) => {
      const a = k === 1 ? 0 : -Math.PI / 2 + 2 * Math.PI * i / k;
      return { e, a, x: cx + GRAPH.rx * Math.cos(a), y: cy + GRAPH.ry * Math.sin(a) };
    });
    const lines = spots.map(({ e, x, y }) => {
      const cat = edgeCat(e);
      // the line runs from the one acting to the other, trimmed to the bubble edges
      const from = e.a === id ? [cx, cy, rc] : [x, y, r], to = e.a === id ? [x, y, r] : [cx, cy, rc];
      const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      return `<path class="edge ${e.kind} cat-${cat}" d="M${from[0] + ux * (from[2] + 2)},${from[1] + uy * (from[2] + 2)} L${to[0] - ux * (to[2] + 2)},${to[1] - uy * (to[2] + 2)}"${headId(e) ? ` marker-end="url(#dg-${headId(e)})"` : ''}/>`;
    }).join('');
    const nodes = spots.map(({ e, a, x, y }) => {
      const o = other(e, id), n = N[o], s = Math.sin(a), c = Math.cos(a), parts = nameLines(n.name);
      const below = s > .7, above = s < -.7, side = !below && !above;
      const lx = side ? x + (c > 0 ? 1 : -1) * (r + 8) : x, ly = (below ? y + r + 17 : above ? y - r - 8 - 18 * (parts.length - 1) : y - 9 * (parts.length - 1));
      const anchor = side ? (c > 0 ? 'start' : 'end') : 'middle';
      const label = parts.map((t, i) => `<tspan x="${lx}" dy="${i ? 18 : 0}">${esc(t)}</tspan>`).join('');
      const cap = `${arrow(e, id)} ${esc(n.name)}: ${plain(e.label || '')}`;
      return `<g class="gnode cat-${n.cat}" data-go="${esc(o)}" data-cap="${esc(cap)}" tabindex="0" role="link" aria-label="${esc(n.name)}: ${esc(e.label || '')}">${bubble(o, x, y, r)}<text class="lbl" aria-hidden="true" x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle">${label}</text></g>`;
    }).join('');
    return `<svg class="graph cat-${N[id].cat}" viewBox="0 0 ${w} ${h}" role="group" aria-label="Connections of ${esc(N[id].name)}"><defs>${markerDefs(cons, 'dg-')}</defs>${lines}<g class="gnode centre" aria-hidden="true">${bubble(id, cx, cy, rc)}${mono(id, cx, cy, 'big')}</g>${nodes}<g class="inis" aria-hidden="true">${spots.map(({ e, x, y }) => mono(other(e, id), x, y)).join('')}</g></svg>`
      + `<div class="gcap" aria-hidden="true" data-idle="Hover or focus a bubble to see how it connects; select it to open its card.">Hover or focus a bubble to see how it connects; select it to open its card.</div>`;
  }
  // A crowd of connections (the hub has dozens) is grouped by the kind of tie instead, money first: a star chart stops being readable past about 16.
  const EDGE_TYPES = DATA.edgeTypes || [];
  const KIND_ORDER = { strong: 0, normal: 1, weak: 2, plain: 3 };
  const tile = (e, id) => {
    const o = other(e, id), n = N[o];
    return `<button class="btn tile k-${e.kind} cat-${n.cat}" data-go="${esc(o)}">${avatar(o, ' sm')}<span class="tx"><b>${esc(n.name)}</b><span>${arrow(e, id)} ${plain(e.label || '')}</span></span></button>`;
  };
  const groupedConnections = id => {
    const by = {};
    consOf(id).forEach(e => (by[e.type || 'other'] ||= []).push(e));
    return '<div class="groups">' + [...EDGE_TYPES, ['other', 'Other connections']].filter(([k]) => by[k]).map(([k, label]) =>
      `<section class="grp"><h3>${esc(label)} <span class="n">(${by[k].length})</span></h3><div class="tiles">${
        by[k].sort((p, q) => KIND_ORDER[p.kind] - KIND_ORDER[q.kind] || N[other(p, id)].name.localeCompare(N[other(q, id)].name)).map(e => tile(e, id)).join('')}</div></section>`).join('') + '</div>';
  };
  // the graph for a card with a handful of connections (its bubbles are links, reachable by keyboard); a crowd is grouped
  const connectionsHtml = id => {
    const cons = consOf(id);
    if (cons.length > GRAPH.maxNodes) return groupedConnections(id);
    return cons.length ? connectionGraph(id) : '';
  };
  // the larger portrait in the card dialog, with its credit (the licences ask for one)
  const portraitCredit = id => {
    const c = PICS[id];
    return c ? `<figure class="dpic"><img src="img/${id}-lg.webp" alt="" width="240" height="240">`
      + `<figcaption>Photo: ${c[2] ? extLink('', c[2], `${esc(c[0])}<span class="sr">${NEW_TAB}</span>`) : esc(c[0])}${c[1] ? ', ' + esc(c[1]) : ''}</figcaption></figure>` : '';
  };
  function showDetails(id) {
    const n = N[id], cons = consOf(id);
    const links = cornerLinks(n, 'inline'); // the same round links as on the card, beside the name, in the hub's plain style
    cardBody.innerHTML = portraitCredit(id) + `<div class="dtitle"><h2 id="cardTitle">${esc(n.name)}</h2>${facetHtml.pills(n, f => f.partyBadge)}${n.id === HUB ? '' : `<span class="cat cat-${n.cat}">${CAT[n.cat] || ''}</span>`}${links}</div>`
      + (n.sub.length ? `<div class="hint">${subText(n)}</div>` : '')
      + (rel[id] ? `<p><b>Link to ${esc(HUB_SHORT)}:</b> ${fmt(rel[id])}</p>` : '')
      + '<hr class="dsep"><div class="dtools"><button type="button" class="linkbtn" data-toggleall>Collapse all</button></div>'
      + facetHtml.panel(n)
      + pathBox(n)
      + block('mute', `Connections (${cons.length})`, connectionsHtml(id))
      + sourcesHtml(n)
      + extLink('wl', `${REPO}/issues/new?title=${encodeURIComponent('Correction: ' + n.name)}`, `Report a correction for this card ${EXT}`);
    cardBody.scrollTop = 0;
  }
  // "Collapse all" / "Expand all": the button offers whichever applies to the sections as they stand now
  const sections = () => [...cardBody.querySelectorAll('details.dsec')];
  const syncToggleAll = () => { const b = cardBody.querySelector('[data-toggleall]'); if (b) b.textContent = sections().some(d => d.open) ? 'Collapse all' : 'Expand all'; };
  cardBody.addEventListener('toggle', syncToggleAll, true); // `toggle` does not bubble, so listen while it travels down

  // ---------- start up ----------
  const VERSION = new URL(document.currentScript.src).searchParams.get('v'); // single source of truth: the ?v= in index.html
  $('#ver').textContent = `v${VERSION}`;
  // the version opens the log of data added, by date
  $('#updatesBody').innerHTML = `<h2 id="updatesTitle">Data updates</h2>` + DATA.updates.map(u => `<h3>${esc(new Date(u.date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))}</h3><ul>${u.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('');
  $('#ver').addEventListener('click', () => openModal($('#updates')));

  renderLegend();
  renderChips();
  renderStage();
  syncButtons();

  // the dialogs: native <dialog> gives Esc-to-close and focus handling; a modal also closes on a click on its backdrop
  [cardDlg, $('#updates'), helpPanel].forEach(d => {
    d.addEventListener('click', e => { if (e.target === d && d.matches(':modal')) d.close(); });
    d.querySelector('.x').addEventListener('click', () => d.close());
  });
  addEventListener('click', e => { if (e.target === document.body && cardDlg.open && !cardDlg.matches(':modal')) cardDlg.close(); }); // a click on the scrim behind the card
  cardDlg.addEventListener('close', () => { if (pinned) clearSelection(); }); // closed by the reader (not reopened for another card)
  $('#helpBody').innerHTML = $('#howto').innerHTML;
  $('#helpBtn').addEventListener('click', toggleHelp);

  // keyboard shortcuts (ignored while typing)
  const keyActions = { '?': toggleHelp, '/': () => { searchBox.focus(); searchBox.select(); }, escape: () => { const m = menuOpen(); if (m) { toggleMenu(null); $(`[data-dd="${m.id.slice(3)}"]`).focus(); } else if (pinned) clearSelection(); else if (helpPanel.open) helpPanel.close(); } }; // Esc closes the card on top first (clearSelection closes its dialog)
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || document.activeElement.matches('textarea, input:not([type=checkbox])')) return;
    const act = keyActions[e.key.toLowerCase()];
    if (act) { e.preventDefault(); act(); }
  });

  // Pointer and keyboard focus both preview a card. These events also fire when moving between a card's own children,
  // so act only when the pointer or focus actually enters or leaves a card.
  const cardOf = node => node && node.closest ? node.closest('.card') : null;
  [['mouseover', 'focusin', previewCard], ['mouseout', 'focusout', reset]].forEach(([pointerEvt, focusEvt, handler]) => {
    [pointerEvt, focusEvt].forEach(type => document.addEventListener(type, e => {
      const c = cardOf(e.target);
      if (c && !pinned && c !== cardOf(e.relatedTarget)) handler(c.dataset.id);
    }));
  });

  document.addEventListener('change', e => { if (e.target.id === 'pathSel') setPath(e.target.value); });
  document.addEventListener('click', e => {
    const ft = e.target.closest('#fToggle');
    if (ft) { toggleMenu(null); ft.setAttribute('aria-expanded', $('#bar').classList.toggle('open')); return; }
    const dd = e.target.closest('[data-dd]');
    if (dd) { toggleMenu(dd.dataset.dd); return; }
    if (!e.target.closest('.ddmenu')) toggleMenu(null); // a click anywhere else closes an open dropdown
    if (e.target.closest('[data-clear]')) { resetAll(); return; }
    const via = e.target.closest('[data-via]');
    if (via) { pathAvoid = via.dataset.via === 'avoid'; computePath(); paintSelection(); renderPath(); syncUrl(); return; }
    const f = e.target.closest('[data-f]');
    if (f) { setFilter(f.dataset.f); return; }
    if (e.target.closest('[data-toggleall]')) { const open = !sections().some(d => d.open); sections().forEach(d => { d.open = open; }); syncToggleAll(); return; }
    const go = e.target.closest('[data-go]');
    if (go) { pin(go.dataset.go); return; }
    if (e.target.closest('a')) return; // external links
    const c = cardOf(e.target);
    if (c) pin(c.dataset.id);
  });
  // the connection graph: its caption follows the bubble under the pointer or focus; Enter or Space opens the card
  const capOf = el => { const g = el && el.closest ? el.closest('.gnode[data-cap]') : null, cap = cardBody.querySelector('.gcap'); if (cap) cap.innerHTML = g ? g.dataset.cap : cap.dataset.idle; };
  ['mouseover', 'mouseout', 'focusin', 'focusout'].forEach(t => cardBody.addEventListener(t, e => capOf(t.endsWith('out') ? null : e.target)));
  cardBody.addEventListener('keydown', e => { const g = e.target.closest ? e.target.closest('.gnode[data-go]') : null; if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pin(g.dataset.go); } });
  function setSearch(value) { setTerm(value); clearSelection(); }
  searchBox.addEventListener('input', () => setSearch(searchBox.value));
  searchClear.addEventListener('click', () => { setSearch(''); searchBox.focus(); });
  // light/dark: dark unless the reader chose light (saved)
  const root = document.documentElement, themeSwitch = $('#theme');
  const isDark = () => root.dataset.theme !== 'light';
  const syncThemeSwitch = () => themeSwitch.setAttribute('aria-checked', isDark());
  const savedTheme = storage.get(STORE.theme);
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  syncThemeSwitch();
  themeSwitch.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    storage.set(STORE.theme, root.dataset.theme);
    syncThemeSwitch();
  });
  const relayout = () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(paintSelection); };
  addEventListener('resize', relayout);
  new ResizeObserver(relayout).observe(viewEl); // the help panel makes the map narrower without a window resize

  $('#report').href = `${REPO}/issues/new`;
  addEventListener('hashchange', applyHash);
  applyHash(); // open the view named in the address, if any
  document.documentElement.classList.add('ready'); // reveals the main area (see styles.css)
})();
