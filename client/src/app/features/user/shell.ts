import { Component, inject, signal, HostListener, OnInit, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { Api, Auth, Site, fileUrl } from '../../core/core';

@Component({ selector: 'app-user-shell', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule], template: `
  <header class="nav" [class.solid]="scrolled()"><div class="container bar">
    <a routerLink="/" class="brand" aria-label="Kings Lioness home"><img class="mk" src="assets/brand/logo-mark.png" alt=""><img class="wm" src="assets/brand/logo-wordmark.png" alt="Kings Lioness"></a>
    <nav class="links" aria-label="Main">
      <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{exact:true}">Home</a>
      <a routerLink="/" fragment="services">Our Services</a><a routerLink="/" fragment="about">About Us</a><a routerLink="/" fragment="contact">Contact</a>
      @if (auth.me()?.role === 'user') { <a routerLink="/bookings" routerLinkActive="on">My Bookings</a><a routerLink="/wallet" routerLinkActive="on">Wallet</a><a routerLink="/history" routerLinkActive="on">History</a><a routerLink="/referrals" routerLinkActive="on">Referrals</a> }
    </nav>
    <div class="tools">
      <a class="contact" [href]="site.waLink()" target="_blank" rel="noopener" aria-label="Contact us on WhatsApp" title="Contact us on WhatsApp"><lucide-icon name="phone" [size]="18"/><span>Contact us</span></a>
      @if (auth.me()?.role === 'user') {
        <a routerLink="/notifications" class="icb" aria-label="Notifications"><lucide-icon name="bell" [size]="18"/>@if (unread() > 0) {<i class="dot">{{unread() > 9 ? '9+' : unread()}}</i>}</a>
        <div class="menu"><button type="button" class="av" (click)="menu.set(!menu())" aria-label="Account menu" aria-haspopup="true" [attr.aria-expanded]="menu()">@if (auth.me()?.avatar) { <img [src]="fileUrl(auth.me()?.avatar)" alt=""> } @else { <span>{{initial()}}</span> }</button>
          @if (menu()) { <div class="dd" (click)="menu.set(false)"><div class="who"><b>{{auth.me()?.name}}</b><span>{{auth.me()?.userId}}</span></div>
            <a routerLink="/profile">Profile</a><a routerLink="/banks">Bank accounts</a><a routerLink="/notifications">Notifications</a><button type="button" (click)="auth.logout()">Logout</button></div> }</div>
      } @else { <a routerLink="/login" class="btn btn-gold btn-sm lg-btn">Login</a><a routerLink="/register" class="btn btn-sm reg-btn hide-s">Register</a> }
      <button type="button" class="icb burger" (click)="drawer.set(true)" aria-label="Open menu"><lucide-icon name="menu" [size]="20"/></button>
    </div></div></header>

  @if (drawer()) { <div class="scrim" (click)="drawer.set(false)"></div>
    <aside class="drawer-nav" (click)="drawer.set(false)"><div class="row between"><img src="assets/brand/logo-wordmark.png" alt="Kings Lioness" style="height:34px;width:auto"><button type="button" class="icb" aria-label="Close menu"><lucide-icon name="x" [size]="20"/></button></div>
      <nav><a routerLink="/">Home</a><a routerLink="/" fragment="services">Our Services</a><a routerLink="/" fragment="about">About Us</a><a routerLink="/" fragment="contact">Contact</a>
        @if (auth.me()?.role === 'user') { <hr><a routerLink="/bookings">My Bookings</a><a routerLink="/wallet">Wallet</a><a routerLink="/history">History</a><a routerLink="/referrals">Referrals</a><a routerLink="/profile">Profile</a><a routerLink="/notifications">Notifications</a><button type="button" (click)="auth.logout()">Logout</button> }
        @else { <hr><a routerLink="/login">Login</a><a routerLink="/register" class="cta">Create account</a> }</nav>
      <a class="wa-big" [href]="site.waLink()" target="_blank" rel="noopener"><lucide-icon name="phone" [size]="18"/> Chat with us on WhatsApp</a></aside> }

  <main><router-outlet/></main>

  <footer id="contact"><div class="container fgrid">
    <div><img src="assets/brand/logo-full.png" alt="Kings Lioness" class="flogo"><p>Trusted services and a simple wallet, in one place.</p></div>
    <div><h4>Contact</h4><a [href]="site.waLink()" target="_blank" rel="noopener"><lucide-icon name="phone" [size]="14"/> {{site.contact().phone}}</a>
      <span><lucide-icon name="mail" [size]="14"/> {{site.contact().email}}</span><span><lucide-icon name="map-pin" [size]="14"/> {{site.contact().address}}</span></div>
    <div><h4>Explore</h4><a routerLink="/" fragment="services">Our Services</a><a routerLink="/" fragment="about">About Us</a><a routerLink="/login">Login</a><a routerLink="/register">Register</a></div>
    <div><h4>Wallet notice</h4><p class="fine">Wallet returns and referral rewards, where offered, are program benefits under published terms and are not guaranteed. Principal may be locked for a period set by the administrator.</p></div></div>
    <div class="container copy">© {{year}} Kings Lioness. All rights reserved.</div></footer>

  @if (auth.me()?.role === 'user') { <nav class="bottom" aria-label="Quick navigation">
    <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{exact:true}"><lucide-icon name="home" [size]="20"/>Home</a>
    <a routerLink="/bookings" routerLinkActive="on"><lucide-icon name="calendar-check" [size]="20"/>Bookings</a>
    <a routerLink="/wallet" routerLinkActive="on" class="mid"><span><lucide-icon name="wallet" [size]="22"/></span>Wallet</a>
    <a routerLink="/referrals" routerLinkActive="on"><lucide-icon name="gift" [size]="20"/>Referrals</a>
    <a routerLink="/profile" routerLinkActive="on"><lucide-icon name="user" [size]="20"/>Profile</a></nav> }`,
  styles: [`
  .nav{position:sticky;top:0;z-index:100;background:var(--ink);border-bottom:1px solid rgba(212,165,58,.25)}
  .bar{display:flex;align-items:center;gap:18px;min-height:68px}
  .brand{display:flex;align-items:center;gap:10px;flex:none}.mk{height:46px;width:auto}.wm{height:34px;width:auto}
  .links{display:flex;gap:2px;margin-left:auto}.links a{padding:8px 12px;border-radius:10px;color:#CFC9B6;font-weight:600;font-size:.9rem;white-space:nowrap}.links a:hover,.links a.on{color:var(--gold-2);background:rgba(212,165,58,.1)}
  .tools{display:flex;align-items:center;gap:10px;margin-left:auto}.links+.tools{margin-left:0}
  .contact{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,var(--gold-2),var(--gold));color:#1A1405;padding:9px 16px;border-radius:999px;font-weight:700;font-size:.88rem;white-space:nowrap;transition:transform .18s}.contact:hover{transform:translateY(-1px)}
  .icb{position:relative;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:var(--gold-2);background:rgba(255,255,255,.06);border:0;cursor:pointer}.icb:hover{background:rgba(212,165,58,.16)}
  .dot{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--danger);color:#fff;font:700 .66rem/18px var(--font);text-align:center;font-style:normal;padding:0 4px}
  .lg-btn{padding:9px 20px;font-weight:800;box-shadow:0 4px 14px -4px rgba(212,165,58,.7)}.reg-btn{background:transparent;color:#fff;border:1.5px solid var(--gold);padding:8px 16px}.reg-btn:hover{background:rgba(212,165,58,.16);color:var(--gold-2)}
  .burger{display:none}
  .av{width:40px;height:40px;border-radius:50%;border:2px solid var(--gold);background:var(--ink-3);color:var(--gold-2);font:800 1rem var(--display);cursor:pointer;overflow:hidden;padding:0}.av img{width:100%;height:100%;object-fit:cover}
  .menu{position:relative}.dd{position:absolute;right:0;top:50px;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:var(--sh-lg);min-width:220px;padding:6px;display:grid;animation:pop .18s var(--ease)}
  .dd .who{display:grid;padding:10px 12px;border-bottom:1px solid var(--border);margin-bottom:4px}.dd .who span{font-size:.78rem;color:var(--muted)}
  .dd a,.dd button{padding:9px 12px;border-radius:9px;color:var(--text);font:600 .88rem var(--font);text-align:left;background:none;border:0;cursor:pointer}.dd a:hover,.dd button:hover{background:var(--gold-50)}
  main{min-height:70vh}
  footer{background:var(--ink);color:#B9B3A0;padding-top:52px;margin-top:0;border-top:3px solid var(--gold)}
  .fgrid{display:grid;grid-template-columns:1.3fr 1fr 1fr 1.3fr;gap:32px;padding-bottom:36px}.fgrid>div{display:grid;gap:10px;align-content:start;font-size:.9rem;min-width:0}
  .fgrid h4{font:700 .95rem var(--display);color:var(--gold-2)}.fgrid a,.fgrid span{display:flex;gap:8px;align-items:center;color:#B9B3A0;word-break:break-word}.fgrid a:hover{color:var(--gold-2)}
  .flogo{width:min(260px,100%);height:auto}.fine{font-size:.8rem;line-height:1.6}.copy{border-top:1px solid rgba(255,255,255,.08);padding-block:16px;font-size:.8rem;color:#8A8575}
  .scrim{position:fixed;inset:0;background:rgba(20,20,24,.6);z-index:140;animation:fade .2s}
  .drawer-nav{position:fixed;top:0;right:0;bottom:0;width:min(340px,86vw);background:var(--ink);z-index:150;padding:18px 18px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:18px;overflow:auto;animation:slide .25s var(--ease);border-left:1px solid rgba(212,165,58,.3)}
  .drawer-nav nav{display:grid;gap:2px}.drawer-nav nav a,.drawer-nav nav button{padding:13px 12px;border-radius:12px;color:#EDE9DD;font:600 1rem var(--font);background:none;border:0;text-align:left;cursor:pointer}.drawer-nav nav a:hover,.drawer-nav nav button:hover{background:rgba(212,165,58,.12);color:var(--gold-2)}
  .drawer-nav nav .cta{background:var(--gold);color:#1A1405;text-align:center;margin-top:6px}.drawer-nav hr{border:0;border-top:1px solid rgba(255,255,255,.1);margin:8px 0}
  .wa-big{margin-top:auto;display:flex;gap:10px;align-items:center;justify-content:center;background:linear-gradient(180deg,var(--gold-2),var(--gold));color:#1A1405;padding:14px;border-radius:14px;font-weight:700}
  .bottom{display:none}
  @media(max-width:1020px){.links{display:none}.tools{margin-left:auto}.burger{display:grid}}
  @media(max-width:900px){.fgrid{grid-template-columns:1fr 1fr}}
  @media(max-width:700px){
    .bar{min-height:60px;gap:10px}.mk{height:38px}.wm{height:26px}.contact span{display:none}.contact{width:40px;height:40px;padding:0;justify-content:center;border-radius:12px}.hide-s{display:none}
    .fgrid{grid-template-columns:1fr}main{padding-bottom:78px}footer{padding-bottom:70px}
    .bottom{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;bottom:0;left:0;right:0;z-index:90;background:rgba(20,20,24,.97);backdrop-filter:blur(12px);border-top:1px solid rgba(212,165,58,.3);padding:6px 4px calc(6px + env(safe-area-inset-bottom))}
    .bottom a{display:grid;justify-items:center;gap:2px;font-size:.68rem;font-weight:700;color:#B9B3A0;padding:6px 0;border-radius:10px}.bottom a.on{color:var(--gold-2)}
    .bottom .mid span{width:46px;height:46px;border-radius:50%;background:var(--gold);color:#1A1405;display:grid;place-items:center;margin-top:-22px;border:4px solid var(--ink);box-shadow:0 6px 16px -4px rgba(212,165,58,.6)}.bottom .mid{color:var(--gold-2)}}
  @media(max-width:360px){.wm{display:none}}`] })
export class UserShell implements OnInit {
  auth = inject(Auth); site = inject(Site); private api = inject(Api); private router = inject(Router); fileUrl = fileUrl;
  scrolled = signal(false); menu = signal(false); drawer = signal(false); unread = signal(0); year = new Date().getFullYear();
  constructor() { effect(() => { if (this.auth.me()?.role === 'user') this.loadUnread(); else this.unread.set(0); }, { allowSignalWrites: true }); }
  ngOnInit() { this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => { this.menu.set(false); this.drawer.set(false); if (this.auth.me()?.role === 'user') this.loadUnread(); }); }
  initial() { return (this.auth.me()?.name || '?').charAt(0).toUpperCase(); }
  loadUnread() { this.api.get<{ count: number }>('/notifications/unread').subscribe({ next: (r) => this.unread.set(r.count), error: () => {} }); }
  @HostListener('window:scroll') onScroll() { this.scrolled.set(window.scrollY > 8); }
  @HostListener('document:click', ['$event']) outside(e: Event) { if (this.menu() && !(e.target as HTMLElement).closest('.menu')) this.menu.set(false); }
}
