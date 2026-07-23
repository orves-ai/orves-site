// Orves site — minimal runtime: scroll reveal only.
// The marketing site is light-only by decision; dark tokens are reserved
// for product surfaces (dashboard/console).
(function () {
  document.documentElement.classList.add('js');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
  }
  // "Watch the flow": destaca o diagrama na própria página
  document.querySelectorAll('[data-spotlight]').forEach(function (a) {
    a.addEventListener('click', function () {
      var art = document.querySelector('.flowart'); if (!art) return;
      art.classList.add('lit');
      setTimeout(function () { art.classList.remove('lit'); }, 2600);
    });
  });
})();

// ── Live-flow v2: grafo causal de eventos no diagrama da camada ──
// Não é loop nem só aleatoriedade: eventos GERAM o estágio seguinte
// (reality-Parser-VerifiableKnowledge-consumers), with silent rejections
// during adjudication and a "hub pause" before serving. Its fan-out
// has warm start + activity guarantee (never >1.8s without a pulse —
// sempre pronto e servindo; o Observatory é que espera o mundo mudar).
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var svg = document.querySelector('.flowart svg');
  if (!svg || !svg.querySelector('path[data-flow]')) return;
  svg.classList.add('sim');
  var NS = 'http://www.w3.org/2000/svg';
  var groups = {};
  svg.querySelectorAll('path[data-flow]').forEach(function (p) {
    var k = p.getAttribute('data-flow');
    (groups[k] = groups[k] || []).push({ el: p, len: p.getTotalLength(), last: 0 });
  });
  // ambiente mais quieto nos estágios internos (as cadeias causais geram o
  // grosso do tráfego); fan-out vivo por regra própria
  var CONF = {
    in:       { chance: .30, cool: 220,  max: 5, dur: [1100, 2200], col: '#4FD69B', op: .8  },
    p2c:      { chance: .16, cool: 850,  max: 2, dur: [900, 1700],  col: '#22C07E', op: .95 },
    c2b:      { chance: .15, cool: 900,  max: 2, dur: [900, 1700],  col: '#22C07E', op: .95 },
    out:      { chance: .32, cool: 180,  max: 5, dur: [750, 1500],  col: '#E8ECF4', op: .75 },
    watch:    { chance: .012, cool: 7000, max: 1, dur: [2800, 4200], col: '#4FD69B', op: .65 },
    evidence: { chance: 0,    cool: 0,    max: 4, dur: [1500, 2200], col: '#4FD69B', op: .95 }
  };
  // regra: nunca menos de 4 pulsos no diagrama, nunca menos de 2 saindo do
  // randomness decides WHERE and HOW, never whether the system looks alive
  var MIN_ACTIVE = { in: 1, p2c: 1, c2b: 1, out: 2 };
  var pulses = [], MAXP = 24, lastOut = performance.now();
  function pick(k) { var g = groups[k]; return g && g[Math.floor(Math.random() * g.length)]; }
  function spawn(k, edge, kind, onDone) {
    if (!edge || pulses.length >= MAXP) return;
    var cfg = CONF[k];
    var c = document.createElementNS(NS, 'circle');
    var big = kind === 'big';
    c.setAttribute('r', big ? 3.6 : (1.9 + Math.random() * 1.1));
    c.setAttribute('fill', cfg.col);
    c.setAttribute('opacity', 0);
    if (big || k === 'evidence') c.style.filter = 'drop-shadow(0 0 4px ' + cfg.col + ')';
    svg.appendChild(c);
    if (k === 'out') lastOut = performance.now();
    pulses.push({
      el: c, edge: edge, k: k,
      t0: performance.now() + (kind === 'burst' ? Math.random() * 260 : 0),
      dur: cfg.dur[0] + Math.random() * (cfg.dur[1] - cfg.dur[0]),
      op: cfg.op, onDone: onDone || null,
      die: Math.random() < .1 ? .3 + Math.random() * .45 : 2
    });
  }
  // ── cadeia causal ──────────────────────────────────────────────────
  function serveFromKnowledge() {
    // hub pause: Knowledge "processes" before serving (120-340ms)
    setTimeout(function () {
      spawn('out', pick('out'), Math.random() < .12 ? 'big' : 'small');
      if (Math.random() < .45) setTimeout(function () { spawn('out', pick('out'), 'small'); }, 160 + Math.random() * 260);
    }, 120 + Math.random() * 220);
  }
  function toKnowledge(big) {
    setTimeout(function () {
      spawn('c2b', pick('c2b'), big ? 'big' : 'small', serveFromKnowledge);
    }, 100 + Math.random() * 220);
  }
  function toCanonical(big) {
    setTimeout(function () {
      spawn('p2c', pick('p2c'), big ? 'big' : 'small', function () {
        if (Math.random() < .7) toKnowledge(big); // else: Canonical rejected (quiet confidence)
      });
    }, 90 + Math.random() * 200);
  }
  // ── agendadores ────────────────────────────────────────────────────
  function scheduler() {
    var now = performance.now();
    Object.keys(CONF).forEach(function (k) {
      var g = groups[k], cfg = CONF[k];
      if (!g || !cfg.chance) return;
      var active = 0;
      for (var i = 0; i < pulses.length; i++) if (pulses[i].k === k) active++;
      if (active >= cfg.max) return;
      if (Math.random() > cfg.chance) return;
      var edge = g[Math.floor(Math.random() * g.length)];
      if (now - edge.last < cfg.cool) return;
      edge.last = now;
      var kind = Math.random() < .12 ? 'big' : 'small';
      // ingestão que chega ao Parser pode continuar a cadeia
      spawn(k, edge, kind, k === 'in' && Math.random() < .6
        ? function () { toCanonical(kind === 'big'); } : null);
    });
  }
  // Observatory: silêncio longo → rajada de evidências; a primeira
  // burst evidence fires an important chain up to Knowledge
  function scheduleBurst() {
    setTimeout(function () {
      var g = groups.evidence;
      if (g) {
        var n = 2 + Math.floor(Math.random() * 3);
        for (var i = 0; i < n; i++) (function (i) {
          setTimeout(function () {
            spawn('evidence', g[0], 'burst', i === 0
              ? function () { if (Math.random() < .8) toCanonical(true); } : null);
          }, i * (140 + Math.random() * 180));
        })(i);
      }
      scheduleBurst();
    }, 9000 + Math.random() * 16000);
  }
  // mínimos garantidos por trecho — quiet confidence é do Observatory,
  // não do pipeline servindo seis consumidores
  setInterval(function () {
    Object.keys(MIN_ACTIVE).forEach(function (k) {
      var g = groups[k]; if (!g || !g.length) return;
      var active = 0;
      for (var i = 0; i < pulses.length; i++) if (pulses[i].k === k) active++;
      for (var j = active; j < MIN_ACTIVE[k]; j++) {
        spawn(k, g[Math.floor(Math.random() * g.length)], Math.random() < .1 ? 'big' : 'small');
      }
    });
  }, 350);
  // e o fan-out nunca passa de ~800ms sem evento NOVO
  setInterval(function () {
    if (performance.now() - lastOut > 800) {
      spawn('out', pick('out'), Math.random() < .15 ? 'big' : 'small');
    }
  }, 200);
  // warm start: o diagrama nasce em operação, nunca vazio
  [['in', 0], ['out', 120], ['p2c', 260], ['out', 420], ['c2b', 620], ['in', 760]]
    .forEach(function (s) {
      setTimeout(function () {
        var e = pick(s[0]); if (!e) return;
        spawn(s[0], e, 'small', s[0] === 'in' && Math.random() < .6
          ? function () { toCanonical(false); } : null);
      }, s[1]);
    });
  // ── render ─────────────────────────────────────────────────────────
  function frame(now) {
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      var t = (now - p.t0) / p.dur;
      if (t < 0) continue;
      if (t >= 1 || t >= p.die) {
        var completed = t >= 1 && p.die >= 1;
        svg.removeChild(p.el); pulses.splice(i, 1);
        if (completed && p.onDone) p.onDone();
        continue;
      }
      var pt = p.edge.el.getPointAtLength(t * p.edge.len);
      p.el.setAttribute('cx', pt.x); p.el.setAttribute('cy', pt.y);
      var fade = Math.min(t / .08, (Math.min(1, p.die) - t) / .12, 1);
      p.el.setAttribute('opacity', Math.max(0, p.op * fade));
    }
    requestAnimationFrame(frame);
  }
  setInterval(scheduler, 200);
  scheduleBurst();
  requestAnimationFrame(frame);
})();

// ── kx explorer: os accordions se demonstram sozinhos (pausa ao interagir) ──
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var kx = document.querySelector('.kx');
  if (!kx) return;
  var items = Array.prototype.slice.call(kx.querySelectorAll('details'));
  if (items.length < 2) return;
  var idx = 0, manualUntil = 0;
  items.forEach(function (d) {
    d.addEventListener('toggle', function (e) {
      if (!cycling) manualUntil = Date.now() + 12000;
    });
  });
  var cycling = false;
  setInterval(function () {
    if (Date.now() < manualUntil) return;
    idx = (idx + 1) % items.length;
    cycling = true;
    items.forEach(function (d, i) { d.open = (i === idx); });
    cycling = false;
  }, 4200);
})();

// -- Knowledge: knowledge galaxy - dense, rotating, explorable --
// Clusters radiais; satélites entram continuamente; conexões cruzadas
// entre clusters. A rede gira devagar e o HOVER num nó acende suas
// relações DIRETAS (forte) e INDIRETAS (médio), apagando o resto —
// exactly what Knowledge does: trace relationships. Nothing vanishes;
// contador só sobe. Sem JS / reduced-motion: grafo estático permanece.
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var svg = document.querySelector('svg.mo-know');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  svg.style.cursor = 'crosshair';
  var gE = document.createElementNS(NS, 'g');
  var gX = document.createElementNS(NS, 'g');
  var gN = document.createElementNS(NS, 'g');
  var gL = document.createElementNS(NS, 'g');
  svg.appendChild(gE); svg.appendChild(gX); svg.appendChild(gN); svg.appendChild(gL);
  function el(t) { return document.createElementNS(NS, t); }
  var caption = el('text');
  caption.setAttribute('x', 170); caption.setAttribute('y', 202);
  caption.setAttribute('text-anchor', 'middle');
  caption.setAttribute('style', 'font-family:JetBrains Mono,monospace;font-size:9px;fill:var(--fg3);opacity:.75');
  caption.textContent = 'knowledge compounds · nothing resets';
  svg.appendChild(caption);
  var counter = el('text');
  counter.setAttribute('x', 326); counter.setAttribute('y', 16);
  counter.setAttribute('text-anchor', 'end');
  counter.setAttribute('style', 'font-family:JetBrains Mono,monospace;font-size:7.5px;fill:var(--fg3);opacity:.85');
  svg.appendChild(counter);

  var CX = 170;
  var HUB_DEFS = [
    { l: 'Company',    x: 170, y: 100 },
    { l: 'Revenue',    x: 92,  y: 64 },
    { l: 'Contract',   x: 252, y: 62 },
    { l: 'People',     x: 82,  y: 142 },
    { l: 'Product',    x: 252, y: 144 },
    { l: 'Regulation', x: 168, y: 44 },
    { l: 'Customer',   x: 168, y: 162 },
    { l: 'Project',    x: 34,  y: 100 },
    { l: 'Market',     x: 306, y: 102 }
  ];
  var hubs = [], sats = [], edges = [], pulses = [];
  var MAXSAT = 200;
  var focus = null;

  function link(a, b, kind, g, style0) {
    var e = { a: a, b: b, kind: kind, born: performance.now(), el: el('line') };
    e.el.setAttribute('style', style0 || '');
    g.appendChild(e.el);
    a.adj.push(b); b.adj.push(a);
    edges.push(e);
    return e;
  }
  function addHub(def) {
    var c = el('circle'); c.setAttribute('r', 4); gN.appendChild(c);
    var t = el('text');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('style', 'font-family:JetBrains Mono,monospace;font-size:7.5px;fill:var(--fg2);opacity:.9');
    t.textContent = def.l;
    gL.appendChild(t);
    var h = { hub: true, x: def.x, y: def.y, sats: 0, el: c, lab: t, adj: [], lvl: 3 };
    hubs.push(h);
    if (hubs.length > 1) link(hubs[0], h, 'hub', gX);
    return h;
  }
  function addSat(h, far) {
    var c = el('circle'); c.setAttribute('r', 1.4); gN.appendChild(c);
    var s = {
      hub: false, h: h,
      r: far ? 34 + Math.random() * 24 : 10 + Math.random() * 25,
      th: Math.random() * 6.2832,
      dr: (Math.random() - 0.5) * 0.0024,
      sz: 1 + Math.random() * 1.4,
      born: performance.now(),
      x: h.x, y: h.y, adj: [], lvl: 3,
      col: Math.random() < 0.7 ? 'var(--acc2)' : 'var(--fg3)',
      op: 0.35 + Math.random() * 0.45,
      el: c
    };
    h.sats++;
    sats.push(s);
    link(s, h, 'radial', gE);
    return s;
  }
  function anyNode() {
    var all = hubs.length + sats.length, i = Math.floor(Math.random() * all);
    return i < hubs.length ? hubs[i] : sats[i - hubs.length];
  }
  function addCross() {
    var a = anyNode(), b = anyNode();
    if (a === b || a.adj.indexOf(b) >= 0) return;
    link(a, b, 'cross', gX);
  }

  for (var i = 0; i < 5; i++) addHub(HUB_DEFS[i]);
  for (i = 0; i < 48; i++) addSat(hubs[Math.floor(Math.random() * hubs.length)], Math.random() < 0.2);
  for (i = 0; i < 14; i++) addCross();

  function wave() {
    var n = 1 + Math.floor(Math.random() * 5);
    for (var k = 0; k < n; k++) {
      var r = Math.random();
      if (r < 0.5 && sats.length < MAXSAT) {
        addSat(hubs[Math.floor(Math.random() * hubs.length)], Math.random() < 0.25);
      } else if (r < 0.85) {
        addCross();
      } else if (hubs.length < HUB_DEFS.length && sats.length > hubs.length * 16) {
        var h = addHub(HUB_DEFS[hubs.length]);
        for (var m = 0; m < 6; m++) addSat(h, false);
      } else if (edges.length) {
        var e = edges[Math.floor(Math.random() * edges.length)];
        var p = el('circle'); p.setAttribute('r', 2); p.setAttribute('style', 'fill:var(--acc)');
        svg.appendChild(p);
        pulses.push({ e: e, t0: performance.now(), el: p });
      }
    }
    setTimeout(wave, 400 + Math.random() * 1800);
  }
  setTimeout(wave, 900);

  // ── exploração: hover acende relações diretas e indiretas ──
  var mx = -999, my = -999, spin = 0.00045, spinT = 0.00045;
  function setFocus(n) {
    if (focus === n) return;
    focus = n;
    var i;
    for (i = 0; i < hubs.length; i++) hubs[i].lvl = focus ? 3 : 3;
    for (i = 0; i < sats.length; i++) sats[i].lvl = 3;
    if (!focus) { caption.textContent = 'knowledge compounds · nothing resets'; return; }
    focus.lvl = 0;
    var d1 = focus.adj, d2c = 0;
    for (i = 0; i < d1.length; i++) if (d1[i].lvl > 1) d1[i].lvl = 1;
    for (i = 0; i < d1.length; i++) {
      var aa = d1[i].adj;
      for (var q = 0; q < aa.length; q++) if (aa[q].lvl > 2) { aa[q].lvl = 2; d2c++; }
    }
    caption.textContent = 'tracing: ' + d1.length + ' direct · ' + d2c + ' indirect relationships';
  }
  svg.addEventListener('mousemove', function (ev) {
    var rc = svg.getBoundingClientRect();
    mx = (ev.clientX - rc.left) / rc.width * 340;
    my = (ev.clientY - rc.top) / rc.height * 210;
    spinT = 0.0008 * ((mx - CX) / 170) + 0.00045;
    var best = null, bd = 200, i, n, dx, dy, dd;
    for (i = 0; i < hubs.length; i++) { n = hubs[i]; dx = n.x - mx; dy = n.y - my; dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = n; } }
    for (i = 0; i < sats.length; i++) { n = sats[i]; dx = n.x - mx; dy = n.y - my; dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = n; } }
    setFocus(best);
  });
  svg.addEventListener('mouseleave', function () { mx = -999; my = -999; spinT = 0.00045; setFocus(null); });

  var NOP = [1, 0.95, 0.55, 0.1];       // opacidade por nível (com foco)
  var EOPS = { radial: 0.14, hub: 0.22, cross: 0.2 };
  var G = 0;
  function frame(now) {
    spin += (spinT - spin) * 0.04;
    G += spin * 16;
    var i, s, age, x, y;
    var hasFocus = !!focus;
    for (i = 0; i < sats.length; i++) {
      s = sats[i];
      s.th += s.dr;
      age = Math.min(1, (now - s.born) / 600);
      x = s.h.x + Math.cos(s.th + G) * s.r;
      y = s.h.y + Math.sin(s.th + G) * s.r * 0.62;
      s.x = Math.max(8, Math.min(332, x));
      s.y = Math.max(26, Math.min(184, y));
      var op = hasFocus ? NOP[s.lvl] : s.op;
      var rr = s.sz * age * (s.lvl === 0 ? 2.4 : s.lvl === 1 ? 1.5 : 1);
      s.el.setAttribute('cx', s.x); s.el.setAttribute('cy', s.y); s.el.setAttribute('r', Math.max(0.05, rr));
      s.el.setAttribute('style', 'fill:' + (s.lvl <= 1 && hasFocus ? 'var(--acc)' : s.col) + ';opacity:' + (op * age));
    }
    for (i = 0; i < hubs.length; i++) {
      var h = hubs[i];
      var hr = (3.5 + Math.min(4.5, h.sats * 0.12)) * (h.lvl === 0 ? 1.5 : 1);
      var hop = hasFocus ? Math.max(NOP[h.lvl], 0.25) : 1;
      h.el.setAttribute('cx', h.x); h.el.setAttribute('cy', h.y); h.el.setAttribute('r', Math.max(0.05, hr));
      h.el.setAttribute('style', 'fill:var(--acc);opacity:' + hop);
      h.lab.setAttribute('x', h.x); h.lab.setAttribute('y', h.y - hr - 3);
      h.lab.setAttribute('style', 'font-family:JetBrains Mono,monospace;font-size:7.5px;fill:var(--fg2);opacity:' + (hasFocus ? Math.max(NOP[h.lvl], 0.2) : 0.9));
    }
    for (i = 0; i < edges.length; i++) {
      var e = edges[i];
      var lv = Math.max(e.a.lvl, e.b.lvl);
      var eo, ec = 'var(--fg3)', ew = e.kind === 'hub' ? 0.7 : 0.5;
      if (hasFocus) {
        if (e.a.lvl === 0 || e.b.lvl === 0) { eo = 0.9; ec = 'var(--acc)'; ew = 1; }
        else if (lv <= 2 && (e.a.lvl <= 1 || e.b.lvl <= 1)) { eo = 0.4; ec = 'var(--acc2)'; }
        else eo = 0.03;
      } else {
        eo = Math.min(EOPS[e.kind], (now - e.born) / 900 * EOPS[e.kind]);
        if (e.kind === 'cross') ec = 'var(--acc2)';
      }
      e.el.setAttribute('x1', e.a.x); e.el.setAttribute('y1', e.a.y);
      e.el.setAttribute('x2', e.b.x); e.el.setAttribute('y2', e.b.y);
      e.el.setAttribute('style', 'stroke:' + ec + ';stroke-width:' + ew + ';opacity:' + eo);
    }
    for (i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i], t = (now - p.t0) / 650;
      if (t >= 1) { svg.removeChild(p.el); pulses.splice(i, 1); continue; }
      p.el.setAttribute('cx', p.e.a.x + (p.e.b.x - p.e.a.x) * t);
      p.el.setAttribute('cy', p.e.a.y + (p.e.b.y - p.e.a.y) * t);
      p.el.setAttribute('opacity', 1 - Math.abs(t - 0.5) * 1.7);
    }
    counter.textContent = 'objects ' + (hubs.length + sats.length) + ' · relationships ' + edges.length;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

// ── Domains: 48 setores, 8 por visita, sem repetição na sessão ──
// Cada visita sorteia 8; a rotação percorre TODO o catálogo antes de
// repetir qualquer setor (~5 min de ciclo). Bullets giram por variante.
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var POOL = [
    ['Healthcare', [['Clinical guidelines', 'Medical records', 'Drug labels'], ['MRI scans', 'Radiology', 'Prescriptions']]],
    ['Legal', [['Contracts', 'Case law', 'Regulations'], ['Litigation', 'Patents', 'Depositions']]],
    ['Finance', [['Filings', 'Statements', 'Market data'], ['Portfolios', 'Risk models', 'Audits']]],
    ['Science', [['Papers', 'Experiments', 'Protocols'], ['Datasets', 'Lab notes', 'Peer reviews']]],
    ['Government', [['Laws', 'Public records', 'Rulings'], ['Budgets', 'Census data', 'Permits']]],
    ['Manufacturing', [['Manuals', 'Specifications', 'Quality'], ['Work orders', 'Inspections', 'BOMs']]],
    ['Insurance', [['Policies', 'Claims', 'Evidence'], ['Underwriting', 'Actuarial tables', 'Losses']]],
    ['Energy', [['Operations', 'Compliance', 'Inspections'], ['Grid data', 'Permits', 'Assets']]],
    ['Pharma', [['Trial protocols', 'Submissions', 'Labels']]],
    ['Biotech', [['Sequences', 'Assays', 'Lab records']]],
    ['Genomics', [['Genomes', 'Variants', 'Annotations']]],
    ['Diagnostics', [['Test results', 'Panels', 'Reference ranges']]],
    ['Banking', [['Loan files', 'KYC records', 'Statements']]],
    ['Asset Management', [['Mandates', 'Holdings', 'Research']]],
    ['Fintech', [['Transactions', 'Disputes', 'Onboarding']]],
    ['Courts', [['Dockets', 'Opinions', 'Evidence']]],
    ['Compliance', [['Audits', 'Controls', 'Attestations']]],
    ['Intellectual Property', [['Patents', 'Trademarks', 'Prior art']]],
    ['Defense', [['Doctrine', 'Logistics', 'Intelligence']]],
    ['Public Safety', [['Incidents', 'Dispatch logs', 'Reports']]],
    ['Aerospace', [['Maintenance docs', 'Certifications', 'Telemetry']]],
    ['Space', [['Mission data', 'Telemetry', 'Payload specs']]],
    ['Aviation', [['Flight manuals', 'Incidents', 'Parts']]],
    ['Maritime', [['Charters', 'Port logs', 'Surveys']]],
    ['Rail', [['Timetables', 'Inspections', 'Signaling']]],
    ['Logistics', [['Manifests', 'Customs', 'Tracking']]],
    ['Supply Chain', [['Suppliers', 'Orders', 'Audits']]],
    ['Automotive', [['Service manuals', 'Recalls', 'Telematics']]],
    ['Semiconductor', [['Process specs', 'Yield data', 'Errata']]],
    ['Robotics', [['Sensor logs', 'Behaviors', 'Safety cases']]],
    ['Software', [['Codebases', 'Issues', 'Runbooks']]],
    ['Cloud', [['Configs', 'Incidents', 'SLAs']]],
    ['Cybersecurity', [['Threat intel', 'Incidents', 'Policies']]],
    ['Telecom', [['Network specs', 'Contracts', 'Tickets']]],
    ['Utilities', [['Meters', 'Outages', 'Maintenance']]],
    ['Oil & Gas', [['Well logs', 'Leases', 'Inspections']]],
    ['Mining', [['Surveys', 'Assays', 'Permits']]],
    ['Chemicals', [['Formulations', 'Safety sheets', 'Batches']]],
    ['Agriculture', [['Field data', 'Yields', 'Certifications']]],
    ['Climate', [['Sensor data', 'Models', 'Disclosures']]],
    ['Construction', [['Blueprints', 'Permits', 'Inspections']]],
    ['Real Estate', [['Deeds', 'Leases', 'Appraisals']]],
    ['Education', [['Curricula', 'Research', 'Records']]],
    ['Academia', [['Theses', 'Grants', 'Citations']]],
    ['Media', [['Archives', 'Transcripts', 'Rights']]],
    ['Publishing', [['Manuscripts', 'Rights', 'Editions']]],
    ['Retail', [['Catalogs', 'Suppliers', 'Reviews']]],
    ['Hospitality', [['Bookings', 'Reviews', 'Operations']]]
  ];
  var cards = Array.prototype.slice.call(document.querySelectorAll('.dgrid .dcard'));
  if (cards.length) {
    cards.forEach(function (c) { c.classList.add('swap'); });
    function setCard(card, name, items) {
      card.querySelector('h4').textContent = name;
      var lis = card.querySelectorAll('li');
      for (var k = 0; k < lis.length; k++) lis[k].textContent = items[k] || '';
    }
    // sorteio inicial: 8 aleatórios do catálogo
    var order = POOL.slice();
    for (var s = order.length - 1; s > 0; s--) { var r2 = Math.floor(Math.random() * (s + 1)); var tmp = order[s]; order[s] = order[r2]; order[r2] = tmp; }
    var shown = [], variant = [], cursor = 8;
    for (var ci = 0; ci < cards.length; ci++) {
      shown.push(order[ci][0]); variant.push(0);
      setCard(cards[ci], order[ci][0], order[ci][1][0]);
    }
    function nextDomain() {
      // percorre o catálogo inteiro antes de repetir qualquer setor
      for (var tries = 0; tries < POOL.length; tries++) {
        var d = order[cursor % order.length]; cursor++;
        if (shown.indexOf(d[0]) < 0) return d;
      }
      return null;
    }
    function domOf(name) { for (var q = 0; q < POOL.length; q++) if (POOL[q][0] === name) return POOL[q]; return null; }
    setInterval(function () {
      var i = Math.floor(Math.random() * cards.length);
      var card = cards[i];
      var cur = domOf(shown[i]);
      var swapDomain = Math.random() < 0.5 || !cur || cur[1].length < 2;
      if (swapDomain) {
        var next = nextDomain();
        if (!next) return;
        card.classList.add('fade');
        setTimeout(function () {
          shown[i] = next[0]; variant[i] = 0;
          setCard(card, next[0], next[1][0]);
          card.classList.remove('fade');
        }, 460);
      } else {
        variant[i] = (variant[i] + 1) % cur[1].length;
        card.classList.add('fade');
        setTimeout(function () {
          setCard(card, cur[0], cur[1][variant[i]]);
          card.classList.remove('fade');
        }, 460);
      }
    }, 3500);
  }
  // chips rotativos: fontes e modelos (último chip fixo; nunca quebra linha)
  function rotator(sel, pool, ms) {
    var box = document.querySelector(sel);
    if (!box) return;
    var chips = Array.prototype.slice.call(box.querySelectorAll('.chip'));
    var pinned = chips.pop();
    chips.forEach(function (ch) { ch.classList.add('rotchip'); });
    setInterval(function () {
      var ch = chips[Math.floor(Math.random() * chips.length)];
      var visible = chips.map(function (c) { return c.textContent; });
      visible.push(pinned.textContent);
      var avail = pool.filter(function (s) { return visible.indexOf(s) < 0; });
      if (!avail.length) return;
      var next = avail[Math.floor(Math.random() * avail.length)];
      ch.classList.add('fade');
      setTimeout(function () {
        var prev = ch.textContent;
        ch.textContent = next;
        var tops = {}; var n = 0;
        chips.concat([pinned]).forEach(function (c) { tops[Math.round(c.getBoundingClientRect().top)] = 1; });
        for (var k in tops) n++;
        if (n > 1) ch.textContent = prev;
        ch.classList.remove('fade');
      }, 360);
    }, ms);
  }
  rotator('.srcchips', ['PDFs', 'Word', 'Excel', 'PowerPoint', 'scans', 'spreadsheets', 'websites', 'images', 'audio', 'video', 'email', 'Slack', 'Teams', 'GitHub', 'Jira', 'Notion', 'Confluence', 'databases', 'APIs', 'logs', 'sensors', 'IoT', 'CRM', 'ERP', 'books', 'research', 'contracts', 'policies', 'SQL', 'JSON', 'XML', 'Parquet'], 2400);
  rotator('.aichips', ['ChatGPT', 'Claude', 'Gemini', 'Llama', 'Mistral', 'DeepSeek', 'Qwen', 'Kimi', 'agents', 'copilots', 'internal AI', 'Claude Code', 'Cursor', 'CrewAI', 'LangGraph', 'OpenAI', 'Anthropic', 'Google', 'Meta'], 2900);
  // linha de convergência
  var flow = document.querySelector('.dflow');
  if (flow) {
    var PAIRS = [
      ['Healthcare', 'MRI report'], ['Legal', 'contract'], ['Manufacturing', 'maintenance manual'],
      ['Science', 'research paper'], ['Finance', 'SEC filing'], ['Government', 'regulation'],
      ['Insurance', 'claim file'], ['Pharma', 'trial protocol'], ['Media', 'transcript'],
      ['Energy', 'inspection report'], ['Aerospace', 'flight manual'], ['Retail', 'supplier catalog'],
      ['Semiconductor', 'process spec'], ['Mining', 'geological survey'], ['Maritime', 'charter party'],
      ['Genomics', 'variant report'], ['Defense', 'logistics order'], ['Agriculture', 'field report']
    ];
    var pi = Math.floor(Math.random() * PAIRS.length);
    setInterval(function () {
      flow.classList.add('fade');
      setTimeout(function () {
        pi = (pi + 1) % PAIRS.length;
        flow.querySelector('.dfd').textContent = PAIRS[pi][0];
        flow.querySelector('.dfs').textContent = PAIRS[pi][1];
        flow.classList.remove('fade');
      }, 420);
    }, 3400);
  }
})();
// ── menu mobile ──
(function () {
  var btn = document.querySelector('.menubtn');
  var panel = document.querySelector('.mnav');
  if (!btn || !panel) return;
  btn.addEventListener('click', function () {
    var open = panel.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  panel.addEventListener('click', function (e) { if (e.target.tagName === 'A') panel.classList.remove('open'); });
})();
