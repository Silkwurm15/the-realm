/* realm_anim.js: animated full-screen art for the Mimic battle, Strong Mimic battle and Multiversal Library "Knowledge Gained" screens.
   Loaded as its own file (<script src="realm_anim.js" defer>). index.html only calls RealmAnim.battle(...) and RealmAnim.knowledge(...).
   The art in art/ has NO text baked in: everything the player reads (title, HP numbers, combat log, buttons, result lines) is live text drawn on top.
   Respects the game's Settings: html.rm (reduced motion), html.fx-low, html.fx-off, and the OS reduced-motion setting. */
(function () {
  'use strict';
  var W = 1024, H = 1536, TAU = Math.PI * 2, R = Math.random;
  var DE = document.documentElement;

  /* ---------- how much to animate: 0 = still image, 1 = light, 2 = full ---------- */
  function motion() {
    var c = DE.classList;
    if (c.contains('rm') || c.contains('fx-off')) return 0;
    try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return 0; } catch (e) {}
    return c.contains('fx-low') ? 1 : 2;
  }

  /* ---------- scenes: art, glows, torches, drool, coin glints, sweeps, live-text boxes ---------- */
  var BATTLE_BTN_GLOW = [[300, 1370, 210, 2.2, 0], [740, 1370, 210, 2.2, 1.6]];
  var SCENES = {
    smimic: {
      src: 'art/strong_battle.webp', label: 'Strong Mimic battle', kind: 'battle',
      sky: [850, 100, 330, '110,170,255'],
      flames: [[85, 295, 120], [985, 405, 95], [120, 470, 55], [230, 595, 45], [915, 548, 55]],
      glows: [{ x: 250, y: 520, r: 420, col: '255,150,60', a: .12, sp: 5 }, { x: 540, y: 440, r: 230, col: '255,40,30', a: .2, sp: 1.6 },
        { x: 300, y: 1370, r: 210, col: '255,40,30', a: .12, sp: 2.2 }, { x: 740, y: 1370, r: 210, col: '255,40,30', a: .12, sp: 2.2, ph: 1.6 }],
      fangs: [[455, 405], [515, 385], [580, 395], [650, 405], [700, 425]], floor: 800, drip: .03,
      glints: [[150, 760], [350, 790], [560, 830], [700, 830], [900, 790], [300, 880], [120, 1250], [480, 1450], [860, 1380], [980, 750]],
      bars: [{ x: 80, y: 898, w: 862, h: 28 }, { x: 80, y: 992, w: 862, h: 30 }],
      title: [27, 55, 46, 60], hp: [[946, 864, 3.4], [946, 962, 3.4]],
      log: [165, 1074, 694, 190], btns: [[78, 1309, 422, 114], [531, 1309, 415, 114]]
    },
    mimic: {
      src: 'art/mimic_battle.webp', label: 'Mimic battle', kind: 'battle',
      sky: [850, 110, 330, '110,170,255'],
      flames: [[75, 250, 120], [985, 370, 95], [232, 475, 55], [900, 525, 55]],
      glows: [{ x: 250, y: 520, r: 420, col: '255,150,60', a: .12, sp: 5 }, { x: 540, y: 500, r: 220, col: '255,40,30', a: .2, sp: 1.6 },
        { x: 290, y: 1375, r: 210, col: '255,40,30', a: .12, sp: 2.2 }, { x: 745, y: 1375, r: 210, col: '255,40,30', a: .12, sp: 2.2, ph: 1.6 }],
      fangs: [[405, 440], [450, 435], [525, 420], [600, 420], [665, 430], [720, 445]], floor: 790, drip: .02,
      glints: [[80, 735], [220, 775], [600, 825], [900, 745], [960, 690], [60, 1445], [150, 1480], [700, 1470], [780, 1500], [1000, 1235], [30, 1215]],
      bars: [{ x: 78, y: 862, w: 866, h: 29 }, { x: 78, y: 962, w: 866, h: 29 }],
      title: [27, 52, 46, 62], hp: [[946, 830, 3.4], [946, 934, 3.4]],
      log: [165, 1066, 694, 220], btns: [[69, 1320, 434, 111], [526, 1320, 432, 111]]
    },
    knowledge: {
      src: 'art/library_knowledge.webp', label: 'Knowledge Gained, Multiversal Library', kind: 'knowledge', vig: .1,
      flames: [[22, 1015, 60]],
      glows: [{ x: 510, y: 140, r: 260, col: '170,130,255', a: .34, sp: 1.6 }, { x: 520, y: 300, r: 300, col: '255,225,150', a: .2, sp: 1.3, ph: 1 },
        { x: 170, y: 100, r: 210, col: '120,170,255', a: .2, sp: .7 }, { x: 880, y: 100, r: 210, col: '120,170,255', a: .2, sp: .7, ph: 2 },
        { x: 918, y: 1318, r: 170, col: '150,130,255', a: .3, sp: 1.8 }, { x: 520, y: 1470, r: 380, col: '160,110,255', a: .14, sp: .9 },
        { x: 512, y: 1095, r: 330, col: '170,100,255', a: .12, sp: 2.2 }],
      sweeps: [{ x: 140, y: 1050, w: 745, h: 85, ph: 0, a: .35 }],
      lines: [130, 756, 764, 262], btn: [123, 1049, 791, 106]
    }
  };

  /* ---------- the painter: one per overlay, owns its canvas and particles ---------- */
  function Painter(cv) {
    var ctx = cv.getContext('2d'), sc = null, raf = 0, last = 0, root = null;
    var parts = [], drops = [], sparks = [], motes = [], stars = [], orbs = [];
    var bt = [0, 0], bd = [0, 0], imgs = {}, dimR = null;

    function img(s) {
      var i = imgs[s.src];
      if (!i) { i = imgs[s.src] = new Image(); i.decoding = 'async'; i.onload = function () { if (sc === s) still(); }; i.src = s.src; }
      return i;
    }
    function glow(x, y, r, col, a) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    function glint(x, y, r, col, a) { ctx.fillStyle = 'rgba(' + col + ',' + a + ')'; ctx.fillRect(x - r, y - .8, r * 2, 1.6); ctx.fillRect(x - .8, y - r, 1.6, r * 2); }
    function dot(x, y, r, col, a) { ctx.fillStyle = 'rgba(' + col + ',' + a + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0); ctx.lineTo(x + w, y + h - r); ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2); ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5); ctx.closePath(); }

    /* live health bar fill, drawn into the empty trough that is part of the art */
    function bar(b, f, enemy) {
      var w = b.w * f; if (w < 3) return;
      var g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      if (enemy) { g.addColorStop(0, '#ff6270'); g.addColorStop(.2, '#e8283a'); g.addColorStop(.62, '#b3152a'); g.addColorStop(1, '#78101c'); }
      else { g.addColorStop(0, '#86ff74'); g.addColorStop(.2, '#35db30'); g.addColorStop(.62, '#199b1b'); g.addColorStop(1, '#0b6310'); }
      rr(b.x, b.y, w, b.h, Math.min(b.h / 2, w / 2)); ctx.fillStyle = g; ctx.fill();
      ctx.save(); rr(b.x, b.y, w, b.h, Math.min(b.h / 2, w / 2)); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.fillRect(b.x, b.y + b.h * .12, w, b.h * .26); ctx.restore();
    }
    function sweep(rect, t, ph, a) {
      var p = (((t / 5.2 + (ph || 0)) % 1) + 1) % 1; if (p > .38) return;
      var u = p / .38, cx = rect.x - 70 + u * (rect.w + 140);
      ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
      var g = ctx.createLinearGradient(cx - 60, 0, cx + 60, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,' + (a || .5) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); ctx.restore();
    }

    /* knowledge scene extras: orbiting motes, rising motes, twinkling stars, crystal-ball swirl */
    function libExtra(t, dt) {
      var i, k, o, a, ex, ey, ct, st, x, y, tw, p;
      for (i = 0; i < orbs.length; i++) {
        o = orbs[i]; o.a += o.sp * dt; ct = Math.cos(o.tilt); st = Math.sin(o.tilt);
        for (k = 0; k < 4; k++) {
          a = o.a - k * .07 * (o.sp < 0 ? -1 : 1); ex = Math.cos(a) * o.rx; ey = Math.sin(a) * o.ry;
          x = 515 + ex * ct - ey * st; y = 255 + ex * st + ey * ct; tw = .35 + .4 * Math.sin(t * 2.1 + o.ph);
          dot(x, y, o.s * (1 - k * .18), o.col, tw * (1 - k * .25));
        }
      }
      if (R() < 14 * dt) motes.push({ x: 300 + R() * 420, y: 310 + R() * 40, vx: (R() - .5) * 24, vy: -40 - R() * 60, l: 0, m: 2 + R() * 2.2, s: 1 + R() * 1.8, col: R() < .5 ? '255,226,150' : '190,150,255' });
      motes = motes.filter(function (m) { return (m.l += dt) < m.m; });
      for (i = 0; i < motes.length; i++) { p = motes[i]; p.x += (p.vx + Math.sin(t * 2 + p.m * 7) * 10) * dt; p.y += p.vy * dt; dot(p.x, p.y, p.s, p.col, Math.sin(p.l / p.m * Math.PI) * .8); }
      if (R() < 9 * dt) { for (k = 0; k < 4; k++) { x = R() * W; y = 70 + R() * 980; if (!(x > 90 && x < 950 && y > 430 && y < 1230)) { stars.push({ x: x, y: y, l: 0, m: .8 + R() * .8 }); break; } } }
      stars = stars.filter(function (s) { return (s.l += dt) < s.m; });
      for (i = 0; i < stars.length; i++) { p = stars[i]; a = Math.sin(p.l / p.m * Math.PI); glint(p.x, p.y, 11 * a, '235,225,255', a); }
      for (i = 0; i < 5; i++) { a = t * (1.1 + i * .3) + i * 1.3; x = 918 + Math.cos(a) * (30 + i * 12); y = 1318 + Math.sin(a * 1.2) * (30 + i * 12) * .8; dot(x, y, 3, '210,190,255', .6); }
    }

    function frame(t, dt, level) {
      var s = sc, i, f, k, p, g, im = img(s);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, W, H); else { ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, W, H); }
      if (s.bars) { bar(s.bars[0], bd[0], true); bar(s.bars[1], bd[1], false); }
      if (!level) { ctx.globalCompositeOperation = 'source-over'; if (dimR) { rr(dimR[0] + 6, dimR[1] + 8, dimR[2] - 12, dimR[3] - 16, 18); ctx.fillStyle = 'rgba(8,2,2,.62)'; ctx.fill(); } return; }
      ctx.globalCompositeOperation = 'lighter';
      if (s.sky) glow(s.sky[0], s.sky[1], s.sky[2], s.sky[3], .16 + .08 * Math.sin(t * .8));
      (s.glows || []).forEach(function (q) { glow(q.x, q.y, q.r, q.col, q.a * (.45 + .55 * (.5 + .5 * Math.sin(t * q.sp + (q.ph || 0))))); });
      (s.flames || []).forEach(function (fl, n) {
        k = .5 + .25 * Math.sin(t * 9 + n * 2) + .15 * Math.sin(t * 17 + n * 5) + .1 * Math.sin(t * 31 + n);
        glow(fl[0], fl[1], fl[2] * (1 + .2 * k), '255,140,40', .28 * k + .12);
        glow(fl[0] + Math.sin(t * 7 + n) * 4, fl[1] - 20, fl[2] * .45, '255,210,120', .22 * k);
        if (level > 1 && R() < .3 * dt * 60 * Math.min(1, fl[2] / 100)) parts.push({ x: fl[0] + (R() - .5) * 30, y: fl[1] - 10, vx: (R() - .5) * 20, vy: -30 - R() * 50, l: 0, m: 2 + R() * 2, s: 1 + R() * 2 });
      });
      parts = parts.filter(function (q) { return (q.l += dt) < q.m; });
      for (i = 0; i < parts.length; i++) { p = parts[i]; p.x += (p.vx + Math.sin(t * 3 + p.m * 9) * 12) * dt; p.y += p.vy * dt; dot(p.x, p.y, p.s, '255,176,80', Math.max(0, 1 - p.l / p.m)); }
      if (s.glints && level > 1) {
        if (R() < .08 * dt * 60) { f = s.glints[(R() * s.glints.length) | 0]; sparks.push({ x: f[0] + (R() - .5) * 60, y: f[1] + (R() - .5) * 20, l: 0, m: .7 + R() * .5 }); }
        sparks = sparks.filter(function (q) { return (q.l += dt) < q.m; });
        for (i = 0; i < sparks.length; i++) { p = sparks[i]; g = Math.sin(p.l / p.m * Math.PI); glint(p.x, p.y, 14 * g, '255,235,170', g); }
      }
      if (s.bars) { for (i = 0; i < 2; i++) { var bb = s.bars[i], fw = bb.w * bd[i]; if (fw > 8) sweep({ x: bb.x, y: bb.y, w: fw, h: bb.h }, t, i * .12, .5); } }
      (s.sweeps || []).forEach(function (b) { sweep(b, t, b.ph, b.a); });
      if (s.kind === 'knowledge' && level > 1) libExtra(t, dt);
      ctx.globalCompositeOperation = 'source-over';
      if (s.fangs && level > 1) {
        if (R() < s.drip * dt * 60) { f = s.fangs[(R() * s.fangs.length) | 0]; drops.push({ x: f[0] + (R() - .5) * 6, y: f[1] + 30, v: 10, l: 0 }); }
        drops = drops.filter(function (d) { return d.y < s.floor && d.l < 2; });
        for (i = 0; i < drops.length; i++) { p = drops[i]; p.v += 500 * dt; p.y += p.v * dt; p.l += dt; ctx.fillStyle = 'rgba(235,215,215,0.55)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 1.8, 4 + p.v / 60, 0, 0, TAU); ctx.fill(); }
      }
      if (dimR) { rr(dimR[0] + 6, dimR[1] + 8, dimR[2] - 12, dimR[3] - 16, 18); ctx.fillStyle = 'rgba(8,2,2,.62)'; ctx.fill(); }
      g = ctx.createRadialGradient(512, 700, 350, 512, 700, 1000);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + ((s.vig || .16) + .03 * Math.sin(t * 9)) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    function visible() { return root && root.getClientRects().length > 0 && !document.hidden; }
    function loop(ms) {
      raf = 0; if (!visible()) return;
      var lv = motion(); if (!lv) { still(); return; }
      var t = ms / 1000, dt = Math.min(.05, Math.max(.001, t - last)); last = t;
      var k = Math.min(1, dt * 5); bd[0] += (bt[0] - bd[0]) * k; bd[1] += (bt[1] - bd[1]) * k;
      frame(t, dt, lv); raf = requestAnimationFrame(loop);
    }
    function still() { if (!sc) return; bd[0] = bt[0]; bd[1] = bt[1]; frame(performance.now() / 1000, .016, 0); }
    function kick() { if (raf) return; if (!motion()) { still(); return; } last = performance.now() / 1000; raf = requestAnimationFrame(loop); }

    return {
      attach: function (r) { root = r; },
      set: function (s, keepBars) {
        if (sc !== s) { sc = s; parts = []; drops = []; sparks = []; motes = []; stars = []; orbs = [];
          if (s.kind === 'knowledge') { for (var i = 0; i < 64; i++) { var cw = R() < .5 ? -1 : 1; orbs.push({ a: R() * TAU, sp: cw * (.25 + R() * .7), rx: 140 + R() * 270, ry: 50 + R() * 150, tilt: (R() - .5) * .9, ph: R() * TAU, s: 1.2 + R() * 2.2, col: R() < .4 ? '255,226,150' : (R() < .5 ? '190,150,255' : '130,190,255') }); } }
          cv.setAttribute('aria-label', s.label); img(s); }
      },
      bars: function (e, p, snap) { bt[0] = Math.max(0, Math.min(1, e)); bt[1] = Math.max(0, Math.min(1, p)); if (snap) { bd[0] = bt[0]; bd[1] = bt[1]; } },
      dim: function (r) { dimR = r || null; },
      start: kick, redraw: function () { if (!raf) still(); }
    };
  }

  /* ---------- styles (injected once) ---------- */
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style'); s.id = 'ra-css';
    s.textContent =
      '#cbt.ra-on{padding:0;background:#000}#cbt.ra-on>.cbb{display:none}' +
      '.ra{position:fixed;inset:0;z-index:1501;display:none;align-items:center;justify-content:center;overflow:hidden;background:#05040a;font-family:Georgia,"Palatino Linotype",serif;-webkit-user-select:none;user-select:none}' +
      '.ra.on{display:flex}' +
      '.ra .ra-back{position:absolute;inset:-6%;background:var(--ra-img) center/cover;filter:blur(26px) brightness(.5)}' +
      '.ra .ra-stg{position:relative;flex:none;aspect-ratio:2/3;width:min(100vw,calc(100vh*2/3));width:min(100vw,calc(100dvh*2/3));container-type:inline-size;background:#05040a;overflow:hidden}' +
      '.ra canvas{position:absolute;inset:0;width:100%;height:100%;display:block}' +
      '.ra .ra-x{position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;color:#f3e6c4;text-shadow:0 2px 3px #000,0 0 10px #000a;white-space:pre-line;overflow:hidden}' +
      '.ra .ra-t{font-weight:700;color:#f6e3ae;white-space:nowrap}' +
      '.ra .ra-hp{justify-content:flex-end;transform:translateY(-50%);height:5%;font-weight:700;color:#f3e6c4;white-space:nowrap;overflow:visible}' +
      '.ra .ra-log{line-height:1.22;font-weight:400}' +
      '.ra .ra-lines{justify-content:flex-start;align-items:flex-start;text-align:left;line-height:1.38;font-weight:400;color:#f1e8d2}' +
      '.ra .ra-lines .ra-i div{margin:0 0 1.3cqw}' +
      '.ra .ra-i{display:block;width:100%}.ra .ra-i.nw{display:inline-block;width:auto;white-space:nowrap}' +
      '.ra .ra-b{position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 7%;border:0;border-radius:0;background:none;color:#fff0cf;font:700 5.3cqw/1.05 Georgia,serif;text-shadow:0 2px 3px #000,0 0 10px #000a;cursor:pointer;-webkit-tap-highlight-color:transparent;box-sizing:border-box;white-space:pre-line}' +
      '.ra .ra-b:active{background:radial-gradient(ellipse,rgba(255,225,160,.25),transparent 70%)}' +
      '.ra .ra-b:disabled{opacity:.55;cursor:default}' +
      '.ra .ra-b:focus-visible{outline:2px solid #ecc47e;outline-offset:-6px}' +
      '.ra .ra-b.ra-dim{pointer-events:none;visibility:hidden}';
    document.head.appendChild(s);
  }

  function pos(el, x, y, w, h) { el.style.left = (x / W * 100) + '%'; el.style.top = (y / H * 100) + '%'; if (w != null) { el.style.width = (w / W * 100) + '%'; el.style.height = (h / H * 100) + '%'; } }
  function mk(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  /* shrink text until it fits its box (font sizes are in container-width units so they scale with the art) */
  function fit(el, max, min) { var i = el._i || el, s = max; el.style.fontSize = s + 'cqw'; while (s > min && (i.offsetHeight > el.clientHeight + 1 || i.offsetWidth > el.clientWidth + 1)) { s -= .15; el.style.fontSize = s + 'cqw'; } }
  function setText(el, str, nowrap) { el.innerHTML = ''; var i = document.createElement('span'); i.className = 'ra-i' + (nowrap ? ' nw' : ''); i.textContent = str; el.appendChild(i); el._i = i; return i; }

  function shell(parent, id) {
    var root = mk('div', 'ra', parent); root.id = id;
    mk('div', 'ra-back', root); var stg = mk('div', 'ra-stg', root);
    var cv = mk('canvas', '', stg); cv.width = W; cv.height = H; cv.setAttribute('role', 'img');
    return { root: root, stg: stg, cv: cv, p: Painter(cv) };
  }
  function setBack(root, src) { root.style.setProperty('--ra-img', 'url(' + src + ')'); }

  /* ---------- battle screen ---------- */
  var B = null, battleKey = '';
  function mountBattle() {
    var cbt = document.getElementById('cbt'); if (!cbt) return null;
    if (B && B.root.parentNode === cbt) return B;
    css(); B = shell(cbt, 'raBt'); B.p.attach(B.root);
    B.t = mk('div', 'ra-x ra-t', B.stg);
    B.h0 = mk('div', 'ra-x ra-hp', B.stg); B.h1 = mk('div', 'ra-x ra-hp', B.stg);
    B.log = mk('div', 'ra-x ra-log', B.stg); B.log.setAttribute('aria-live', 'polite');
    B.b = [mk('button', 'ra-b', B.stg), mk('button', 'ra-b', B.stg)]; B.b.forEach(function (b) { b.type = 'button'; });
    addEventListener('resize', function () { if (B && B.root.classList.contains('on')) B.fitAll(); });
    B.fitAll = function () { fit(B.t, B.tMax || 5.2, 2.6); fit(B.log, 3.1, 1.9); B.b.forEach(function (b) { fit(b, 5.3, 2.8); }); };
    return B;
  }

  function battle(o) {
    try {
      if (!o || !o.bars || (o.k !== 'smimic' && o.k !== 'mimic')) { battleOff(); return false; }
      var b = mountBattle(); if (!b) return false;
      var cbt = document.getElementById('cbt'), s = SCENES[o.k], first = battleKey !== o.k || !b.root.classList.contains('on');
      battleKey = o.k; b.p.set(s); setBack(b.root, s.src);
      var e = o.e || {}, eh = Math.max(0, o.eh | 0), ehp = Math.max(1, e.hp | 0), hp = Math.max(0, Math.floor(o.hp || 0)), mx = Math.max(1, o.max | 0);
      b.p.bars(eh / ehp, hp / mx, first);
      pos(b.t, s.title[0] / 100 * W, s.title[1], s.title[2] / 100 * W, s.title[3]); setText(b.t, o.title || '', true);
      setText(b.h0, eh + ' / ' + ehp, true); setText(b.h1, hp + ' / ' + mx, true);
      [b.h0, b.h1].forEach(function (h, i) { h.style.left = ''; h.style.right = ((W - s.hp[i][0]) / W * 100) + '%'; h.style.top = (s.hp[i][1] / H * 100) + '%'; h.style.width = '30%'; h.style.fontSize = s.hp[i][2] + 'cqw'; });
      pos(b.log, s.log[0], s.log[1], s.log[2], s.log[3]); setText(b.log, (o.log || []).slice(-4).join('\n'));
      var btns = o.btns || [];
      b.b.forEach(function (el, i) {
        var d = btns[i], pl = s.btns[i];
        pos(el, pl[0], pl[1], pl[2], pl[3]);
        if (!d) { el.className = 'ra-b ra-dim'; el.innerHTML = ''; el._i = null; el.onclick = null; return; }
        el.className = 'ra-b'; el.disabled = false; setText(el, d[0]); el.setAttribute('aria-label', d[0]);
        el.onclick = function () { b.b.forEach(function (x) { x.disabled = true; }); d[1](); };
      });
      b.p.dim(btns.length < 2 ? s.btns[1] : null);
      cbt.classList.add('ra-on'); b.root.classList.add('on');
      b.tMax = 5.2; b.fitAll(); b.p.start(); b.p.redraw();
      return true;
    } catch (err) { try { battleOff(); } catch (e2) {} return false; }
  }
  function battleOff() { var cbt = document.getElementById('cbt'); if (cbt) cbt.classList.remove('ra-on'); if (B) B.root.classList.remove('on'); }

  /* ---------- Knowledge Gained screen (Multiversal Library result) ---------- */
  var K = null;
  function mountKnowledge() {
    if (K) return K;
    css(); K = shell(document.body, 'raKn'); K.p.attach(K.root);
    var s = SCENES.knowledge; K.p.set(s); setBack(K.root, s.src);
    K.l = mk('div', 'ra-x ra-lines', K.stg); pos(K.l, s.lines[0], s.lines[1], s.lines[2], s.lines[3]);
    K.c = mk('button', 'ra-b', K.stg); K.c.type = 'button'; K.c.setAttribute('aria-label', 'Continue'); pos(K.c, s.btn[0], s.btn[1], s.btn[2], s.btn[3]);
    K.c.onclick = function () { var f = K.done; knowledgeOff(); if (f) f(); };
    addEventListener('resize', function () { if (K.root.classList.contains('on')) fit(K.l, 3.3, 2); });
    var rf = document.getElementById('riftOv');
    if (rf && window.MutationObserver) new MutationObserver(function () { if (rf.style.display === 'none') knowledgeOff(); }).observe(rf, { attributes: true, attributeFilter: ['style'] });
    return K;
  }
  function knowledge(x, done) {
    try {
      if (!x || !/knowledge/i.test(String(x.ttl || ''))) return false;
      var k = mountKnowledge(); k.done = done;
      k.l.innerHTML = ''; var wr = document.createElement('div'); wr.className = 'ra-i'; (x.lines || []).forEach(function (ln) { var d = document.createElement('div'); d.textContent = ln; wr.appendChild(d); }); k.l.appendChild(wr); k.l._i = wr;
      k.root.classList.add('on'); fit(k.l, 3.3, 2); k.p.start(); k.p.redraw();
      return true;
    } catch (err) { try { knowledgeOff(); } catch (e2) {} return false; }
  }
  function knowledgeOff() { if (K) K.root.classList.remove('on'); }

  window.RealmAnim = { battle: battle, battleOff: battleOff, knowledge: knowledge, knowledgeOff: knowledgeOff };
})();
