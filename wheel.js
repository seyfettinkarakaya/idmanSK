// idmanSK — metro tekerleği.
//
// Setler bir metro hattının durakları gibi dizilir. Aktif durak "peron"da
// büyük bir kart olarak açılır; önceki ve sonraki duraklar ince satırlar olarak
// görünür. Kaydırdıkça hat akar: giden kart büzülerek satıra döner, gelen satır
// açılarak karta dönüşür. Sürükleme, atalet (momentum) ve en yakın durağa
// oturma (snap) içerir.
//
// Her öğe (durak) iki katman taşır: `.w-row` (satır) ve `.w-card` (kart).
// Tekerlek her öğeye `--e` (0..1, ne kadar "açık" olduğu) değişkenini ve
// yüksekliğini verir; katmanların geçişini CSS yapar.

export const ROW_H = 36;       // durak satırı yüksekliği
export const CARD_GAP = 8;     // kartın üstündeki/altındaki boşluk
const SIDE = 2;                // peronun üstünde ve altında görünen durak sayısı
const MIN_CARD = 300;
const DRAG_PX_PER_ITEM = 170;  // bir durak geçmek için gereken parmak yolu (bilerek "ağır")
const MOMENTUM_MS = 110;       // hız × bu süre = atalet ile gidilecek ek yol
const MAX_FLING = 1;           // bir fırlatma bırakılan yerden en fazla bu kadar durak ileri gider

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export class Wheel {
  constructor(el, { onChange, onTapActive, onLayout } = {}) {
    this.el = el;
    this.onLayout = onLayout || (() => {});
    this.onChange = onChange || (() => {});
    this.onTapActive = onTapActive || (() => {});
    this.items = [];
    this.pos = 0;
    this.lastIndex = -1;
    this.anim = null;
    this.drag = null;
    this.wheelAcc = 0;
    this.cardH = 400;
    this.locked = false; // true iken kaydırma ve dokunarak geçiş kapalı (yüzerken)
    this.side = SIDE;    // 13.9: idman sürerken 1 (kart büyür)

    // Peron: aktif durağın oturduğu sabit halka.
    this.platform = document.createElement('div');
    this.platform.className = 'w-platform';

    el.addEventListener('pointerdown', (e) => this._down(e));
    el.addEventListener('pointermove', (e) => this._move(e));
    el.addEventListener('pointerup', (e) => this._up(e));
    el.addEventListener('pointercancel', (e) => this._up(e, true));
    el.addEventListener('wheel', (e) => this._wheel(e), { passive: false });
    // iOS'ta sayfanın kendisinin kaymasını engelle.
    el.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    this._ro = new ResizeObserver(() => this.layout());
    this._ro.observe(el);
  }

  get index() {
    return Math.max(0, Math.min(this.items.length - 1, Math.round(this.pos)));
  }

  setItems(nodes, index = 0) {
    this.el.replaceChildren(this.platform, ...nodes);
    this.items = nodes;
    this.pos = Math.max(0, Math.min(nodes.length - 1, index));
    this.lastIndex = -1;
    this.layout();
  }

  /** Peronun üstünde/altında görünen durak sayısı (13.9: idman sürerken 1, kart büyür). */
  setSide(n) {
    if (this.side === n) return;
    this.side = n;
    this.layout();
  }

  /** Kart boyu tekerleğin yüksekliğinden hesaplanır: 2+2 durak satırı sığar, gerisi kartındır. */
  layout() {
    const h = this.el.clientHeight;
    this.cardH = Math.max(MIN_CARD, h - 2 * this.side * ROW_H - 2 * CARD_GAP);
    this.el.style.setProperty('--card-h', `${this.cardH}px`);
    this.el.style.setProperty('--row-h', `${ROW_H}px`);
    this.el.style.setProperty('--card-gap', `${CARD_GAP}px`);
    this.platform.style.top = `${this.side * ROW_H + CARD_GAP}px`;
    this.render();
    this.onLayout(this.cardH);
  }

  scrollTo(index, animate = true) {
    const target = Math.max(0, Math.min(this.items.length - 1, index));
    if (!animate) {
      this._stopAnim();
      this.pos = target;
      this.render();
      return;
    }
    this._animateTo(target);
  }

  render() {
    const n = this.items.length;
    if (!n) return;
    const H = this.el.clientHeight;
    const slot = this.cardH + 2 * CARD_GAP;

    // Her durağın "açıklığı" ve yüksekliği.
    const es = new Array(n);
    const hs = new Array(n);
    for (let i = 0; i < n; i++) {
      es[i] = Math.max(0, 1 - Math.abs(i - this.pos));
      hs[i] = ROW_H + (slot - ROW_H) * es[i];
    }
    const tops = new Array(n);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      tops[i] = acc;
      acc += hs[i];
    }

    // Peron hizası: pos tam sayıyken o durağın tepesi peronda durur.
    const pc = Math.max(0, Math.min(n - 1, this.pos));
    const fl = Math.min(n - 1, Math.floor(pc));
    let pointer = tops[fl] + (pc - fl) * hs[fl];
    pointer += (this.pos - pc) * ROW_H; // uçlarda lastik etkisi
    const offset = this.side * ROW_H - pointer;

    for (let i = 0; i < n; i++) {
      const node = this.items[i];
      const y = tops[i] + offset;
      if (y + hs[i] < -ROW_H || y > H + ROW_H) {
        node.style.visibility = 'hidden';
        continue;
      }
      node.style.visibility = 'visible';
      node.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      node.style.height = `${hs[i].toFixed(1)}px`;
      node.style.setProperty('--e', es[i].toFixed(3));
      node.classList.toggle('is-active', es[i] > 0.5);
      node.classList.toggle('is-first', i === 0);
      node.classList.toggle('is-last', i === n - 1);
    }

    const idx = this.index;
    if (idx !== this.lastIndex) {
      this.lastIndex = idx;
      this.onChange(idx);
    }
  }

  // --- etkileşim ---------------------------------------------------------

  _down(e) {
    if (this.locked) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this._stopAnim();
    this.drag = {
      id: e.pointerId,
      startY: e.clientY,
      startPos: this.pos,
      moved: false,
      samples: [{ t: e.timeStamp, pos: this.pos }],
      target: e.target,
    };
  }

  _move(e) {
    const g = this.drag;
    if (!g || e.pointerId !== g.id) return;
    const dy = e.clientY - g.startY;
    if (!g.moved && Math.abs(dy) > 8) {
      g.moved = true;
      try { this.el.setPointerCapture(e.pointerId); } catch { /* yok say */ }
    }
    if (!g.moved) return;

    let pos = g.startPos - dy / DRAG_PX_PER_ITEM;
    const max = this.items.length - 1;
    if (pos < 0) pos *= 0.35;
    else if (pos > max) pos = max + (pos - max) * 0.35;
    this.pos = pos;
    g.samples.push({ t: e.timeStamp, pos });
    if (g.samples.length > 8) g.samples.shift();
    this.render();
  }

  _up(e, cancelled = false) {
    const g = this.drag;
    if (!g || e.pointerId !== g.id) return;
    this.drag = null;

    if (!g.moved) {
      if (cancelled) return;
      const item = g.target && g.target.closest ? g.target.closest('.w-item') : null;
      const i = item ? this.items.indexOf(item) : -1;
      if (i < 0) return;
      if (i === this.index) this.onTapActive(i);
      else this._animateTo(i);
      return;
    }

    const now = e.timeStamp;
    const recent = g.samples.filter((s) => now - s.t < 100);
    let v = 0;
    if (recent.length >= 2) {
      const a = recent[0];
      const b = recent[recent.length - 1];
      if (b.t > a.t) v = (b.pos - a.pos) / (b.t - a.t);
    }
    // Atalet: hız küçük bir ek yol verir; bırakılan en yakın durağın en fazla
    // MAX_FLING ötesine gidilir. Yarım duraktan az sürükleme geri yerine oturur.
    const here = Math.round(this.pos);
    const projected = Math.round(this.pos + v * MOMENTUM_MS);
    const target = Math.max(here - MAX_FLING, Math.min(here + MAX_FLING, projected));
    this._animateTo(target);
  }

  _wheel(e) {
    e.preventDefault();
    if (this.locked) return;
    this.wheelAcc += e.deltaY;
    if (Math.abs(this.wheelAcc) < 40) return;
    const dir = Math.sign(this.wheelAcc);
    this.wheelAcc = 0;
    this._animateTo(this.index + dir);
  }

  _animateTo(target) {
    this._stopAnim();
    const t = Math.max(0, Math.min(this.items.length - 1, target));
    const from = this.pos;
    const dist = Math.abs(t - from);
    if (dist < 0.001) {
      this.pos = t;
      this.render();
      return;
    }
    // Durağa yanaşma: biraz daha yavaş ve yumuşak
    const duration = Math.min(900, 380 + dist * 160);
    const start = performance.now();
    const tick = () => {
      const k = Math.max(0, Math.min(1, (performance.now() - start) / duration));
      this.pos = from + (t - from) * easeOutCubic(k);
      this.render();
      if (k < 1) this.anim = requestAnimationFrame(tick);
      else this.anim = null;
    };
    this.anim = requestAnimationFrame(tick);
  }

  _stopAnim() {
    if (this.anim) cancelAnimationFrame(this.anim);
    this.anim = null;
  }
}
