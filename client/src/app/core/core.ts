import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpInterceptorFn, HttpParams } from '@angular/common/http';
import { Router, CanActivateFn } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Me { id: string; userId: string; name: string; username: string; email: string; mobile: string; role: 'user' | 'admin'; referralCode: string;
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
