// Helpers shared by the Activity journal and the story page (both are drawn in the browser).
export const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
export const fmt = (d: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
export const src = (u: string, w: number) => u + '?w=' + w + '&auto=format';
export const srcset = (u: string, ws: number[]) => ws.map((w) => src(u, w) + ' ' + w + 'w').join(', ');
export const pos = (im: any) => (typeof im.x === 'number' && typeof im.y === 'number' ? Math.round(im.x * 100) + '% ' + Math.round(im.y * 100) + '%' : '50% 40%');
export const isPortrait = (im: any) => !!(im.w && im.h && im.h > im.w * 1.05);

export const slugify = (s: string) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'story';

export const normalize = (rows: any[]) => {
  const list = (rows || []).map((r: any) => ({
    id: r.id, title: r.title || 'Untitled', caption: r.caption || '', category: r.category || '', date: r.date || '',
    location: r.location || '', organization: r.organization || '', description: r.description || '', alt: r.alt || '',
    images: (r.images || []).filter((i: any) => i && i.url), slug: '',
  }));
  const seen = new Set<string>();
  list.forEach((a) => {
    let s = slugify(a.title);
    if (seen.has(s)) s += '-' + String(a.date).replace(/-/g, '');
    while (seen.has(s)) s += '-2';
    seen.add(s);
    a.slug = s;
  });
  return list;
};
export const storyHref = (a: any) => '/activity/story/?p=' + encodeURIComponent(a.slug);

export const fetchLive = async (url: string) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return normalize((await res.json()).result);
  } finally { clearTimeout(t); }
};

export const stateHTML = (title: string, text: string, action = '') =>
  '<div class="jr-state"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p>' + action + '</div>';

// ---------- photo carousel (4 s autoplay; pauses on hover, focus, touch and after manual use) ----------
const pauseIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
const playIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
let userPaused = reduce;

export const carouselHTML = (a: any, sizes: string) => {
  const n = a.images.length;
  const slides = a.images.map((im: any, k: number) =>
    '<div class="ac-slide' + (isPortrait(im) ? ' contain' : '') + '" role="group" aria-roledescription="slide" aria-label="' + (k + 1) + ' of ' + n + '">' +
    '<img src="' + src(im.url, 1400) + '" srcset="' + srcset(im.url, [800, 1400, 2000]) + '" sizes="' + sizes + '" alt="' +
    esc(k === 0 ? (a.alt || a.title) : (im.caption || a.title + ', photo ' + (k + 1) + ' of ' + n)) + '" style="object-position:' + pos(im) + '" ' +
    (k === 0 ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async"></div>'
  ).join('');
  const controls = n > 1
    ? '<button class="ac-btn ac-prev" type="button" aria-label="Previous photo">←</button>' +
      '<button class="ac-btn ac-next" type="button" aria-label="Next photo">→</button>' +
      '<button class="ac-btn ac-play" type="button"></button>' +
      '<div class="ac-dots">' + a.images.map((_: any, k: number) => '<button type="button" aria-label="Go to photo ' + (k + 1) + '"><i></i></button>').join('') + '</div>'
    : '';
  return '<div class="ac" role="group" aria-roledescription="carousel" aria-label="Photos: ' + esc(a.title) + '"><div class="ac-track" aria-live="off">' + slides + '</div>' + controls + '</div>';
};

export const initCarousel = (el: HTMLElement | null): (() => void) => {
  if (!el) return () => {};
  const track = el.querySelector<HTMLElement>('.ac-track')!;
  const n = track.children.length;
  if (n < 2) return () => {};
  const dots = [...el.querySelectorAll<HTMLElement>('.ac-dots button')];
  const playBtn = el.querySelector<HTMLButtonElement>('.ac-play')!;
  let i = 0, hover = false, focus = false, touching = false, busy = false, visible = true;
  let busyTimer: any = 0, touchTimer: any = 0, scrollTimer: any = 0;
  const sync = () => dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', String(k === i)); });
  const go = (k: number, smooth = true) => {
    i = (k + n) % n;
    track.scrollTo?.({ left: i * track.clientWidth, behavior: reduce || !smooth ? 'auto' : 'smooth' });
    sync();
  };
  const live = () => track.setAttribute('aria-live', userPaused || busy || hover || focus ? 'polite' : 'off');
  const touchBusy = () => { busy = true; live(); clearTimeout(busyTimer); busyTimer = setTimeout(() => { busy = false; live(); }, 6000); };
  const setPlay = () => {
    playBtn.innerHTML = userPaused ? playIcon : pauseIcon;
    playBtn.setAttribute('aria-label', userPaused ? 'Start automatic slideshow' : 'Pause automatic slideshow');
    playBtn.setAttribute('aria-pressed', String(userPaused));
    live();
  };
  el.querySelector('.ac-prev')!.addEventListener('click', () => { touchBusy(); go(i - 1); });
  el.querySelector('.ac-next')!.addEventListener('click', () => { touchBusy(); go(i + 1); });
  dots.forEach((d, k) => d.addEventListener('click', () => { touchBusy(); go(k); }));
  playBtn.addEventListener('click', () => { userPaused = !userPaused; setPlay(); });
  el.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { touchBusy(); go(i - 1); }
    if (e.key === 'ArrowRight') { touchBusy(); go(i + 1); }
  });
  el.addEventListener('pointerenter', (e: PointerEvent) => { if (e.pointerType === 'mouse') { hover = true; live(); } });
  el.addEventListener('pointerleave', (e: PointerEvent) => { if (e.pointerType === 'mouse') { hover = false; live(); } });
  el.addEventListener('focusin', () => { focus = true; live(); });
  el.addEventListener('focusout', () => { focus = false; live(); });
  el.addEventListener('touchstart', () => { touching = true; clearTimeout(touchTimer); }, { passive: true });
  el.addEventListener('touchend', () => { clearTimeout(touchTimer); touchTimer = setTimeout(() => { touching = false; }, 4000); }, { passive: true });
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { i = Math.round(track.scrollLeft / (track.clientWidth || 1)); sync(); }, 80);
  }, { passive: true });
  const onResize = () => go(i, false);
  addEventListener('resize', onResize);
  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) { io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.3 }); io.observe(el); }
  const timer = setInterval(() => {
    if (!userPaused && !hover && !focus && !touching && !busy && visible && !document.hidden && track.clientWidth) go(i + 1);
  }, 4000);
  setPlay(); sync();
  return () => { clearInterval(timer); clearTimeout(busyTimer); clearTimeout(touchTimer); clearTimeout(scrollTimer); removeEventListener('resize', onResize); io?.disconnect(); };
};
