import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpInterceptorFn, HttpParams } from '@angular/common/http';
import { Router, CanActivateFn } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Nominee { name: string; relation: string; mobile?: string; dob?: string; address?: string; }
export interface Me { id: string; userId: string; name: string; username: string; email?: string; mobile: string; role: 'user' | 'admin'; referralCode: string; nominee?: Nominee;
  avatar?: string; address?: string; city?: string; state?: string; pin?: string; status: string; createdAt: string; }

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private url = (p: string) => environment.api + p;
  private qs(q?: Record<string, any>) { let h = new HttpParams(); Object.entries(q || {}).forEach(([k, v]) => { if (v !== '' && v != null) h = h.set(k, String(v)); }); return h; }
  get<T>(p: string, q?: Record<string, any>) { return this.http.get<T>(this.url(p), { params: this.qs(q) }); }
  post<T>(p: string, b: any = {}, idem?: string) { return this.http.post<T>(this.url(p), b, idem ? { headers: { 'Idempotency-Key': idem } } : {}); }
  put<T>(p: string, b: any) { return this.http.put<T>(this.url(p), b); }
  patch<T>(p: string, b: any = {}) { return this.http.patch<T>(this.url(p), b); }
  del<T>(p: string) { return this.http.delete<T>(this.url(p)); }
  blob(p: string, q?: Record<string, any>) { return this.http.get(this.url(p), { params: this.qs(q), responseType: 'blob' }); }
}

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage blocked */ } };

@Injectable({ providedIn: 'root' })
export class Auth {
  private api = inject(Api); private router = inject(Router);
  me = signal<Me | null>((() => { try { return JSON.parse(read('kl_user') || 'null'); } catch { return null; } })());
  isAdmin = computed(() => this.me()?.role === 'admin');
  get token() { return read('kl_token'); }
  private save = (r: { token: string; user: Me }) => { write('kl_token', r.token); write('kl_user', JSON.stringify(r.user)); this.me.set(r.user); };
  /** Customers sign in with mobile number OR username; the admin console uses email or username. */
  login(identifier: string, password: string, admin = false) { return this.api.post<{ token: string; user: Me }>(admin ? '/auth/admin/login' : '/auth/login', { identifier, password }).pipe(tap(this.save)); }
  register(b: any) { return this.api.post<{ token: string; user: Me }>('/auth/register', b).pipe(tap(this.save)); }
  refresh() { return this.api.get<Me>('/auth/me').pipe(tap((u) => { write('kl_user', JSON.stringify(u)); this.me.set(u); })); }
  logout(admin = this.isAdmin()) { write('kl_token', null); write('kl_user', null); this.me.set(null); this.router.navigate([admin ? '/admin/login' : '/login']); }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth); const t = auth.token;
  const r = t && req.url.startsWith(environment.api) ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req;
  return next(r).pipe(catchError((e) => { if (e.status === 401 && t && !req.url.includes('/auth/')) auth.logout(); return throwError(() => e); }));
};
export const userGuard: CanActivateFn = (_route, state) => { const a = inject(Auth); const r = inject(Router); return a.me()?.role === 'user' ? true : r.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }); };
export const adminGuard: CanActivateFn = () => { const a = inject(Auth); const r = inject(Router); return a.me()?.role === 'admin' ? true : r.parseUrl('/admin/login'); };

export interface Toast { id: number; kind: 'ok' | 'err'; text: string; }
/** Sound + browser pop-up for new notifications. Works while the site is open in a tab (it is fed by the bell's 20-second check). */
@Injectable({ providedIn: 'root' })
export class NotifySound {
  muted = signal(NotifySound.read());
  private prev = new Map<string, number>(); private ctx: AudioContext | null = null;
  private static read() { try { return localStorage.getItem('kl_sound') === 'off'; } catch { return false; } }
  constructor() {
    // Browsers only allow sound after the person has clicked or tapped the page once.
    const unlock = () => { try { this.ctx ||= new (window.AudioContext || (window as any).webkitAudioContext)(); if (this.ctx.state === 'suspended') void this.ctx.resume(); } catch { /* no audio */ } };
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, unlock, { passive: true }));
    setTimeout(() => this.loadConfig());
  }
  toggle() { const m = !this.muted(); this.muted.set(m); try { localStorage.setItem('kl_sound', m ? 'off' : 'on'); } catch { /* ignore */ } if (!m) { this.beep(); this.askPermission(); } }
  askPermission() { try { if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission(); } catch { /* ignore */ } }
  // Which sound the admin picked (built-in name, or 'custom' = an uploaded file). Loaded once; refreshed after the admin changes it.
  cfg = signal<{ preset: string; v: number }>({ preset: 'ding', v: 0 });
  private audio: HTMLAudioElement | null = null; private api = inject(Api);
  loadConfig() { this.api.get<any>('/program-info').subscribe({ next: (i) => { if (i?.sound) this.cfg.set(i.sound); }, error: () => {} }); }
  private static SYN: Record<string, { notes: number[][]; type: OscillatorType; len: number; gain: number }> = {
    ding: { notes: [[880, 0], [1175, 0.16]], type: 'sine', len: 0.3, gain: 0.25 },
    beep: { notes: [[1000, 0]], type: 'sine', len: 0.25, gain: 0.25 },
    chime: { notes: [[1319, 0], [1568, 0.14], [1976, 0.28]], type: 'sine', len: 0.7, gain: 0.2 },
    coin: { notes: [[988, 0], [1319, 0.09]], type: 'triangle', len: 0.45, gain: 0.22 },
  };
  /** Plays the chosen sound (respects the speaker switch). */
  beep() { if (!this.muted()) this.play(this.cfg().preset, this.cfg().v); }
  /** Plays any sound by name; used for the admin's preview buttons too. */
  play(preset: string, v = 0) {
    if (preset === 'custom') {
      try { this.audio?.pause(); this.audio = new Audio(`${environment.api}/sound/custom?v=${v}`); this.audio.volume = 0.8; void this.audio.play().catch(() => {}); } catch { /* ignore */ }
      return;
    }
    const spec = NotifySound.SYN[preset] || NotifySound.SYN['ding'];
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, t = c.currentTime;
    spec.notes.forEach(([f, d]) => { const o = c.createOscillator(), g = c.createGain(); o.type = spec.type; o.frequency.value = f; o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(spec.gain, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + spec.len); o.start(t + d); o.stop(t + d + spec.len + 0.02); });
  }
  /** Call with each unread count. The first call only remembers it; a higher count later = a new notification. */
  onCount(scope: string, count: number, latest?: { title?: string; body?: string; link?: string } | null) {
    const before = this.prev.get(scope); this.prev.set(scope, count);
    if (before === undefined || count <= before) return;
    this.beep();
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden && !this.muted()) {
        const n = new Notification(latest?.title || 'New notification', { body: latest?.body || '', icon: '/assets/brand/icon-192.png', tag: 'kl-' + scope });
        n.onclick = () => { window.focus(); if (latest?.link) location.assign(latest.link); n.close(); };
      }
    } catch { /* some browsers only allow pop-ups from a service worker */ }
  }
  reset() { this.prev.clear(); }
}

/** Unread admin notifications: the bell in the admin header shows this number. */
@Injectable({ providedIn: 'root' })
export class AdminAlerts {
  private api = inject(Api); private snd = inject(NotifySound); unread = signal(0);
  refresh() { this.api.get<{ count: number; latest?: any }>('/admin/notifications/unread').subscribe({ next: (r) => { this.unread.set(r.count || 0); this.snd.onCount('admin', r.count || 0, r.latest ? { ...r.latest, link: r.latest.link } : null); }, error: () => {} }); }
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  items = signal<Toast[]>([]); private n = 0;
  show(kind: 'ok' | 'err', text: string) { const id = ++this.n; this.items.update((a) => [...a, { id, kind, text }]); setTimeout(() => this.items.update((a) => a.filter((t) => t.id !== id)), 4800); }
  ok(t: string) { this.show('ok', t); }
  err(e: any) { this.show('err', typeof e === 'string' ? e : e?.error?.message || (e?.status === 0 ? 'Cannot reach the server. Is the API running?' : 'Something went wrong')); }
}

// Public site settings (contact number, program info). Falls back to defaults so the header contact icon always works.
const DEFAULT_CONTACT = { whatsapp: '919999999999', message: 'Hello Kings Lioness, I need help.', phone: '+91 99999 99999', email: 'support@kingandlioness.example', address: 'Bengaluru, India' };
@Injectable({ providedIn: 'root' })
export class Site {
  private api = inject(Api);
  info = signal<any>(null);
  contact = computed(() => ({ ...DEFAULT_CONTACT, ...(this.info()?.contact || {}) }));
  waLink = computed(() => { const c = this.contact(); const n = String(c.whatsapp || '').replace(/\D/g, ''); return `https://wa.me/${n}?text=${encodeURIComponent(c.message || '')}`; });
  load() { this.api.get<any>('/program-info').subscribe({ next: (i) => this.info.set(i), error: () => {} }); }
}

export const inr = (paise: number | null | undefined) => '₹' + ((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const toPaise = (rupees: number | string | null | undefined) => Math.round(Number(rupees || 0) * 100);
export const uid = () => (globalThis.crypto && (globalThis.crypto as any).randomUUID ? (globalThis.crypto as any).randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
export const fileUrl = (p?: string | null) => (!p ? '' : p.startsWith('/uploads') ? environment.fileBase + p : p);
export async function copyText(t: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    try { const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch { return false; }
  }
}
export const daysLeft = (d: string | Date | null | undefined) => (d ? Math.max(0, Math.ceil((+new Date(d) - Date.now()) / 864e5)) : 0);
