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
// (fonte→Parser→Canonical→Brain→IA), com rejeições silenciosas no
// Canonical e "hub pause" no Brain antes de servir. O fan-out do Brain
// tem warm start + garantia de atividade (nunca >1.8s sem pulso — Brain
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
  // Brain — aleatoriedade decide ONDE e COMO, nunca se o sistema parece ligado
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
  function serveFromBrain() {
    // hub pause: o Brain "processa" antes de servir (120–340ms)
    setTimeout(function () {
      spawn('out', pick('out'), Math.random() < .12 ? 'big' : 'small');
      if (Math.random() < .45) setTimeout(function () { spawn('out', pick('out'), 'small'); }, 160 + Math.random() * 260);
    }, 120 + Math.random() * 220);
  }
  function toBrain(big) {
    setTimeout(function () {
      spawn('c2b', pick('c2b'), big ? 'big' : 'small', serveFromBrain);
    }, 100 + Math.random() * 220);
  }
  function toCanonical(big) {
    setTimeout(function () {
      spawn('p2c', pick('p2c'), big ? 'big' : 'small', function () {
        if (Math.random() < .7) toBrain(big); // senão: Canonical rejeitou (quiet confidence)
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
  // evidência da rajada dispara uma cadeia importante até o Brain
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
