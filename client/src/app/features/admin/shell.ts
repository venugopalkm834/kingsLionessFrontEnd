import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Auth } from '../../core/core';

const NAV = [['dashboard', 'Dashboard', 'layout-dashboard'], ['bookings', 'Bookings', 'calendar-check'], ['users', 'Users', 'users'], ['services', 'Services', 'wrench'], ['wallets', 'Wallet Management', 'wallet'],
  ['deposits', 'Deposit Requests', 'arrow-down-left'], ['withdrawals', 'Withdrawal Requests', 'arrow-up-right'], ['transfers', 'Fund Transfers', 'repeat'], ['returns', 'Earnings', 'percent'],
  ['payment-accounts', 'Payment Details', 'smartphone'], ['banners', 'Banners', 'image'], ['banks', 'User Bank Accounts', 'landmark'], ['commissions', 'Referral Management', 'gift'], ['transactions', 'Transactions', 'receipt'], ['audit-logs', 'Audit Log', 'shield-check'], ['reports', 'Reports', 'file-text'], ['notifications', 'Notifications', 'bell'], ['settings', 'Settings', 'settings']];

  
@Component({ selector: 'app-admin-shell', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule], template: `
  <div class="app" [class.mini]="mini()">
    @if (open()) { <div class="scrim" (click)="open.set(false)"></div> }
    <aside [class.open]="open()"><a routerLink="/admin" class="brand"><img src="assets/brand/logo-mark.png" alt="" class="mark"><span class="bt"><b>Kings Lioness</b><em>Admin</em></span></a>
      <nav>@for (n of nav; track n[0]) { <a [routerLink]="'/admin/'+n[0]" routerLinkActive="on" (click)="open.set(false)" [title]="n[1]"><lucide-icon [name]="n[2]" [size]="18"/><span>{{n[1]}}</span></a> }</nav>
      <button type="button" class="out" (click)="auth.logout(true)"><lucide-icon name="log-out" [size]="18"/><span>Logout</span></button></aside>
    <div class="main"><header><button type="button" class="btn btn-ghost btn-sm" (click)="toggle()" aria-label="Menu"><lucide-icon name="menu" [size]="18"/></button><div class="grow"></div>
      <a routerLink="/admin/notifications" class="btn btn-ghost btn-sm" aria-label="Notifications"><lucide-icon name="bell" [size]="16"/></a><div class="who"><span class="av">{{auth.me()?.name?.[0]}}</span><span class="sm strong hide-s">{{auth.me()?.name}}</span></div></header>
      <div class="content"><router-outlet/></div></div></div>`,
  styles: [`.app{display:grid;grid-template-columns:262px 1fr;min-height:100dvh;transition:grid-template-columns .25s var(--ease)}.app.mini{grid-template-columns:76px 1fr}
  aside{background:var(--ink);color:#ABA593;display:flex;flex-direction:column;padding:16px 12px;position:sticky;top:0;height:100dvh;overflow:auto;z-index:90}
  .brand{display:flex;gap:10px;align-items:center;color:#fff;padding:6px 8px 18px}.mark{width:38px;height:38px;border-radius:50%;flex:none}.bt{display:grid;line-height:1.15}.brand em{font-style:normal;font-size:.68rem;color:var(--gold-2);font-weight:700;letter-spacing:.16em;text-transform:uppercase}
  nav{display:grid;gap:2px;flex:1}nav a,.out{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:10px;color:#ABA593;font-weight:600;font-size:.88rem;white-space:nowrap;background:none;border:0;cursor:pointer;font-family:var(--font);width:100%}
  nav a:hover,.out:hover{background:var(--ink-3);color:#fff}nav a.on{background:linear-gradient(135deg,var(--gold-2),var(--gold));color:#1A1405}
  .mini .bt,.mini nav span,.mini .out span{display:none}.main{min-width:0}header{display:flex;gap:10px;align-items:center;padding:12px 24px;background:#fff;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:40}
  .av{width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--gold-2);display:grid;place-items:center;font-weight:800}.who{display:flex;gap:8px;align-items:center}.content{padding:24px;max-width:1500px}.scrim{display:none}
  @media(max-width:900px){.app,.app.mini{grid-template-columns:1fr}aside{position:fixed;left:0;top:0;width:272px;transform:translateX(-100%);transition:transform .26s var(--ease)}aside.open{transform:none}
    .mini .bt,.mini nav span,.mini .out span{display:inline}.scrim{display:block;position:fixed;inset:0;background:rgba(20,20,24,.6);z-index:80}.content{padding:16px}header{padding:10px 16px}.hide-s{display:none}}`] })
export class AdminShell {
  auth = inject(Auth); nav = NAV; mini = signal(false); open = signal(false);
  toggle() { if (window.innerWidth <= 900) this.open.update((v) => !v); else this.mini.update((v) => !v); }
}
