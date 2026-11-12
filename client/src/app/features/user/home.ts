import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, Auth, Site, ToastService, fileUrl } from '../../core/core';
import { COMMON, showErr } from '../../shared/common';

const TAGS: Record<string, string> = { 'home-appliances': 'Repair · Install', logistics: 'Move · Deliver', 'manpower-supply': 'Hire · Staff', 'civil-works': 'Build · Renovate', trading: 'Source · Supply', others: 'Anything else' };
// Shown when the API has no services yet (before `npm run seed`) or is unreachable, so the page is never empty.
const DEFAULT_SERVICES = [
  { _id: 'd1', slug: 'home-appliances', name: 'Home Appliances', description: 'Installation, repair and servicing for the things your home runs on.', items: ['AC installation & repair', 'Refrigerator', 'Washing machine', 'Television', 'Electrical appliances', 'Maintenance'], allowCustom: false },
  { _id: 'd2', slug: 'logistics', name: 'Logistics', description: 'Goods transport, local delivery and commercial logistics on demand.', items: ['Goods transportation', 'Local delivery', 'Commercial logistics', 'Transportation services'], allowCustom: false },
  { _id: 'd3', slug: 'manpower-supply', name: 'Manpower Supply', description: 'Skilled workers, technicians and helpers, placed when you need them.', items: ['Skilled workers', 'General labour', 'Technicians', 'Helpers', 'Professional manpower'], allowCustom: false },
  { _id: 'd4', slug: 'civil-works', name: 'Civil Works', description: 'Construction, painting, plumbing, electrical work and renovation.', items: ['Construction', 'Painting', 'Plumbing', 'Electrical works', 'Renovation', 'Maintenance'], allowCustom: false },
  { _id: 'd5', slug: 'trading', name: 'Trading', description: 'Products and commercial trading configured by our team.', items: ['Products', 'Commercial trading'], allowCustom: false },
  { _id: 'd6', slug: 'others', name: 'Others', description: 'Tell us what you need and we will find the right professional.', items: [], allowCustom: true },
].map((d) => ({ ...d, image: `assets/services/${d.slug}.svg`, fallback: true }));

@Component({ standalone: true, imports: COMMON, template: `
  @if (banners().length) {
    <section class="banners" aria-label="Offers and announcements"><div class="container"><div class="bwrap">
      @for (b of banners(); track b._id; let i = $index) {
        <div class="slide" [class.on]="i === bi()" [attr.aria-hidden]="i !== bi()">
          @if (b.link) { <a [href]="b.link" target="_blank" rel="noopener"><img [src]="file(b.image)" [alt]="b.title || 'Banner'" [attr.loading]="i ? 'lazy' : 'eager'"></a> } @else { <img [src]="file(b.image)" [alt]="b.title || 'Banner'" [attr.loading]="i ? 'lazy' : 'eager'"> }
          @if (b.title || b.subtitle) { <div class="cap"><b>{{b.title}}</b><span>{{b.subtitle}}</span></div> }
        </div> }
      @if (banners().length > 1) {
        <button type="button" class="bnav prev" (click)="step(-1)" aria-label="Previous banner"><lucide-icon name="chevron-left" [size]="20"/></button>
        <button type="button" class="bnav next" (click)="step(1)" aria-label="Next banner"><lucide-icon name="chevron-right" [size]="20"/></button>
        <div class="dots">@for (b of banners(); track b._id; let i = $index) { <button type="button" [class.on]="i === bi()" (click)="goto(i)" [attr.aria-label]="'Banner ' + (i + 1)"></button> }</div> }
    </div></div></section> }

  <section class="hero"><div class="container hgrid">
    <div class="hcopy">
      <h1>Everything you need, <em>all in one place.</em></h1>
      <p class="lead">Discover trusted services, manage your bookings, and enjoy a seamless experience with our all-in-one platform.</p>
      <div class="row wrap"><a routerLink="/" fragment="services" class="btn btn-navy">Explore Services</a><button type="button" class="btn btn-gold" (click)="book(services()[0])">Book a Service</button></div>
      @if (auth.me()?.role !== 'user') { <div class="signin"><span>Already a member?</span><a routerLink="/login" class="btn btn-gold btn-sm">Login</a><a routerLink="/register" class="btn btn-ghost btn-sm">Create account</a></div> }
      <div class="facts"><div><b>6</b><span>service lines</span></div><div><b>24 h</b><span>booking response</span></div><div><b>1</b><span>wallet for everything</span></div></div>
    </div>
    <div class="collage" aria-hidden="true">
      <img class="c1" src="assets/services/civil-works.svg" alt=""><img class="c2" src="assets/services/home-appliances.svg" alt=""><img class="c3" src="assets/services/logistics.svg" alt="">
      <span class="stamp"><img src="assets/brand/logo-mark.png" alt=""></span>
    </div></div></section>

  <section id="services" class="sec container">
    <div class="head"><h2>Pick a service.<br>We handle the rest.</h2><p class="muted">Each category comes with verified professionals, a unique booking ID and live status from request to completion.</p></div>
    @if (loading()) { <div class="svcs">@for (i of [1,2,3,4,5,6]; track i) { <div class="sk" style="height:430px;border-radius:22px"></div> }</div> }
    @else { <div class="svcs">@for (s of services(); track s._id; let i = $index) {
      <article class="svc">
        <div class="media"><img [src]="img(s)" [alt]="s.name" loading="lazy"><span class="tag">{{tags[s.slug] || 'Service'}}</span><span class="num">{{i < 9 ? '0' + (i + 1) : i + 1}}</span></div>
        <div class="in"><h3>{{s.name}}</h3><p>{{s.description}}</p>
          @if (s.items?.length) { <ul class="chips">@for (it of s.items.slice(0,4); track it) { <li>{{it}}</li> }@if (s.items.length > 4) { <li class="more">+{{s.items.length - 4}} more</li> }</ul> }
          <div class="acts"><button type="button" class="btn btn-line btn-sm" (click)="detail.set(s)">Explore details</button><button type="button" class="btn btn-gold btn-sm" (click)="book(s)">Book now <lucide-icon name="chevron-right" [size]="15"/></button></div></div></article> }</div> }
  </section>

  <section class="band"><div class="container"><div class="grid g3 steps">
    <div><span class="ticket">BKG-20261102-4821</span><h3>Submit a booking</h3><p class="muted">Choose a category, add your address and date, and even attach a voice note. You get a booking ID straight away.</p></div>
    <div><span class="ticket">Pending → Confirmed</span><h3>We confirm it</h3><p class="muted">Our team reviews the request and leaves remarks you can read in My Bookings.</p></div>
    <div><span class="ticket">In progress → Completed</span><h3>Track to the end</h3><p class="muted">Follow every status change on a timeline. Signed-in users also get their own wallet.</p></div></div></div></section>

  <section id="about" class="sec container"><div class="grid g2 about">
    <div><h2>About us</h2>
      <p class="muted" style="margin-top:12px">Kings Lioness brings home services, logistics, manpower and civil works under one roof. Create an account to unlock your wallet for deposits, withdrawals and transfers between users.</p>
      <ul class="ticks"><li><lucide-icon name="check" [size]="16"/> Unique booking IDs and live status</li><li><lucide-icon name="check" [size]="16"/> Admin-verified deposits and bank accounts</li><li><lucide-icon name="check" [size]="16"/> Full transaction history in your wallet</li></ul></div>
    <div class="cta"><img src="assets/brand/logo-mark.png" alt="" class="ctam"><h3>Questions before you book?</h3><p>Message us on WhatsApp or call {{site.contact().phone}}.</p>
      <a class="btn btn-gold" [href]="site.waLink()" target="_blank" rel="noopener"><lucide-icon name="phone" [size]="16"/> Contact us on WhatsApp</a></div></div></section>

  <app-modal [open]="!!detail()" [title]="detail()?.name || ''" (close)="detail.set(null)">
    @if (detail(); as d) { <img [src]="img(d)" [alt]="d.name" class="dimg"><p class="muted mb">{{d.description}}</p>
      @if (d.items?.length) { <div class="row wrap mb" style="gap:6px">@for (i of d.items; track i) { <span class="badge">{{i}}</span> }</div> }
      <button type="button" class="btn btn-gold btn-block" (click)="detail.set(null); book(d)">Book {{d.name}}</button> }</app-modal>

  <app-modal [open]="!!sel()" [title]="done() ? 'Booking confirmed' : 'Book ' + (sel()?.name || '')" (close)="closeBook()">
    @if (done(); as b) {
      <div class="center" style="padding:6px 0"><div class="okc"><lucide-icon name="check" [size]="30"/></div><h3>Thank you, your request is in.</h3>
        <p class="muted sm mt">Your Booking ID</p><div class="bid mono">{{b.bookingId}}</div><p class="sm muted mb">You can follow it under My Bookings.</p>
        <div class="row"><button type="button" class="btn btn-ghost grow" (click)="closeBook()">Close</button><button type="button" class="btn btn-primary grow" (click)="closeBook(); router.navigate(['/bookings'])">My Bookings</button></div></div>
    } @else {
      <form [formGroup]="bf" (ngSubmit)="submitBook()" novalidate>
        <div class="grid g2"><div class="field"><label for="b-cn">Customer name</label><input id="b-cn" [value]="auth.me()?.name" readonly></div><div class="field"><label for="b-uid">User ID</label><input id="b-uid" [value]="auth.me()?.userId" readonly></div></div>
        <div class="grid g2"><div class="field" [class.err]="e('mobile')"><label for="b-mob">Mobile number</label><input id="b-mob" formControlName="mobile" inputmode="numeric" maxlength="10"><span class="err-t">{{e('mobile') ? 'Enter a valid 10-digit mobile' : ''}}</span></div>
          <div class="field"><label for="b-cat">Service category</label><input id="b-cat" [value]="sel()?.name" readonly></div></div>
        @if (sel()?.allowCustom || !sel()?.items?.length) { <div class="field" [class.err]="e('serviceName')"><label for="b-svc">Service title</label><input id="b-svc" formControlName="serviceName" placeholder="e.g. Terrace waterproofing"><span class="err-t">{{e('serviceName') ? 'Please enter a title (min 2 characters)' : ''}}</span></div> }
        @else { <div class="field" [class.err]="e('serviceName')"><label for="b-svc2">Selected service</label><select id="b-svc2" formControlName="serviceName"><option value="">Select…</option>@for (i of sel().items; track i) { <option [value]="i">{{i}}</option> }</select><span class="err-t">{{e('serviceName') ? 'Please select a service' : ''}}</span></div> }
        <div class="field"><label for="b-desc">{{sel()?.allowCustom ? 'Describe your requirement' : 'Description'}}</label><textarea id="b-desc" formControlName="description"></textarea></div>
        <div class="field"><label>Voice note (optional)</label><app-voice (fileChange)="audio = $event"/><span class="hint">Record or attach audio, like a WhatsApp voice message. Our team will hear it with your booking.</span></div>
        <div class="grid g2"><div class="field" [class.err]="e('quantity')"><label for="b-qty">Quantity</label><input id="b-qty" type="number" min="1" formControlName="quantity"></div>
          <div class="field" [class.err]="e('preferredDate')"><label for="b-date">Preferred date</label><input id="b-date" type="date" formControlName="preferredDate" [min]="today"><span class="err-t">{{e('preferredDate') ? 'Choose a date' : ''}}</span></div></div>
        <div class="field" [class.err]="e('address')"><label for="b-addr">Address</label><textarea id="b-addr" formControlName="address" style="min-height:70px"></textarea><span class="err-t">{{e('address') ? 'Address is required (min 5 characters)' : ''}}</span></div>
        <div class="field"><label for="b-add">Additional requirements</label><textarea id="b-add" formControlName="additional" style="min-height:60px"></textarea></div>
        <button class="btn btn-primary btn-block" [disabled]="busy()">{{busy() ? 'Submitting…' : 'Submit booking'}}</button>
      </form> }
  </app-modal>`,
  styles: [`
  .banners{background:var(--ink);padding:14px 0;border-bottom:3px solid var(--gold)}.bwrap{position:relative;border-radius:20px;overflow:hidden;aspect-ratio:16/6;background:#111}
  .slide{position:absolute;inset:0;opacity:0;transition:opacity .6s var(--ease);pointer-events:none}.slide.on{opacity:1;pointer-events:auto}.slide a,.slide img{display:block;width:100%;height:100%}.slide img{object-fit:cover}
  .cap{position:absolute;left:0;right:0;bottom:0;padding:34px 22px 16px;background:linear-gradient(transparent,rgba(0,0,0,.72));color:#fff;display:grid;gap:2px}.cap b{font:800 clamp(1.05rem,2.6vw,1.8rem) var(--display)}.cap span{font-size:clamp(.82rem,1.6vw,1rem);color:#EDE9DD}
  .bnav{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;display:grid;place-items:center;cursor:pointer;z-index:3}.bnav:hover{background:var(--gold);color:#1A1405}.prev{left:10px}.next{right:10px}
  .dots{position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;gap:7px;z-index:3}.dots button{width:9px;height:9px;border-radius:50%;border:0;background:rgba(255,255,255,.5);cursor:pointer;padding:0}.dots button.on{background:var(--gold);width:22px;border-radius:6px}
  @media(max-width:640px){.bwrap{aspect-ratio:16/9;border-radius:14px}.banners{padding:10px 0}.cap{padding:24px 14px 26px}}
  .hero{background:radial-gradient(900px 420px at 90% -10%,#F2E3B5 0,transparent 60%),#fff;border-bottom:1px solid var(--border);overflow:hidden}
  .hgrid{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding-block:64px 80px}.hcopy{display:grid;gap:26px;justify-items:start;min-width:0}
  .hcopy h1 em{font-style:normal;background:linear-gradient(transparent 62%,var(--gold-100) 62%);padding-inline:2px}.lead{color:var(--muted);font-size:1.15rem;max-width:48ch}
  .signin{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid var(--border);border-radius:16px;padding:10px 14px;box-shadow:var(--sh-sm)}.signin span{font-weight:600;color:var(--muted);font-size:.9rem}
  .facts{display:flex;gap:34px;flex-wrap:wrap;margin-top:4px}.facts div{display:grid}.facts b{font:800 1.9rem var(--display);color:var(--ink);letter-spacing:-.03em}.facts span{font-size:.8rem;color:var(--muted)}
  .collage{position:relative;min-height:440px}.collage>img{position:absolute;border-radius:24px;box-shadow:var(--sh-lg);object-fit:cover;background:var(--ink)}
  .c1{width:66%;aspect-ratio:4/5;right:0;top:0}.c2{width:50%;aspect-ratio:1;left:0;top:34%;border:6px solid #fff}.c3{width:44%;aspect-ratio:4/3;right:6%;bottom:-8px;border:6px solid #fff}
  .stamp{position:absolute;left:2%;top:0;width:116px;height:116px;border-radius:50%;background:var(--ink);display:grid;place-items:center;z-index:2;box-shadow:var(--sh-md);border:3px solid var(--gold)}.stamp img{width:78%;height:auto}
  .sec{padding:72px 0;scroll-margin-top:76px}.head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;margin-bottom:34px}.head h2{font-size:clamp(2rem,4.4vw,3.2rem)}.head p{max-width:42ch}
  .svcs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}
  .svc{display:flex;flex-direction:column;background:#fff;border:1px solid var(--border);border-radius:22px;overflow:hidden;box-shadow:var(--sh-sm);transition:transform .3s var(--ease),box-shadow .3s var(--ease),border-color .3s;min-width:0}
  .svc:hover{transform:translateY(-6px);box-shadow:var(--sh-md);border-color:var(--gold)}
  .media{position:relative;aspect-ratio:16/10;background:var(--ink);overflow:hidden}.media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .7s var(--ease)}.svc:hover .media img{transform:scale(1.05)}
  .media::after{content:'';position:absolute;inset:auto 0 0 0;height:4px;background:linear-gradient(90deg,var(--gold),var(--gold-2))}
  .tag{position:absolute;top:14px;left:14px;font:700 .68rem var(--font);letter-spacing:.08em;text-transform:uppercase;background:rgba(255,255,255,.94);color:var(--ink);padding:6px 12px;border-radius:999px}
  .num{position:absolute;top:12px;right:14px;font:800 1.5rem var(--display);color:var(--gold-2);opacity:.9;letter-spacing:-.02em}
  .in{display:flex;flex-direction:column;gap:12px;padding:20px 22px 22px;flex:1}.in h3{font-size:1.45rem;font-weight:800;color:var(--ink);letter-spacing:-.02em}.in p{font-size:.92rem;color:var(--muted);line-height:1.55}
  .chips{list-style:none;padding:0;margin:0;display:flex;gap:6px;flex-wrap:wrap}.chips li{font-size:.74rem;font-weight:600;padding:5px 11px;border-radius:999px;background:var(--gold-50);color:var(--gold-deep);border:1px solid var(--gold-100)}.chips .more{background:var(--ink);color:var(--gold-2);border-color:var(--ink)}
  .acts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:auto;padding-top:8px}.acts .btn{width:100%;justify-content:center;white-space:nowrap}
  .band{background:#fff;border-block:1px solid var(--border);padding:56px 0}.steps h3{font-size:1.5rem;margin-bottom:6px}
  .ticket{display:inline-block;font:600 .78rem ui-monospace,Menlo,monospace;background:var(--gold-50);color:var(--gold-deep);padding:5px 10px;border-radius:8px;margin-bottom:12px}
  .about{align-items:center;gap:40px}.ticks{list-style:none;padding:0;margin-top:16px;display:grid;gap:10px}.ticks li{display:flex;gap:10px;align-items:center;font-weight:600;color:var(--ink)}.ticks svg{color:var(--success);flex:none}
  .cta{background:var(--ink);color:#EDE9DD;border-radius:var(--r-lg);padding:30px;display:grid;gap:12px;justify-items:start;position:relative;overflow:hidden;border:1px solid var(--gold)}.cta h3{color:var(--gold-2);font-size:1.5rem}.ctam{width:70px;height:auto}
  .dimg{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:14px;margin-bottom:14px;background:var(--ink)}
  .okc{width:64px;height:64px;border-radius:50%;background:var(--success-50);color:var(--success);display:grid;place-items:center;margin:0 auto 14px}
  .bid{font:700 1.4rem ui-monospace,Menlo,monospace;color:var(--ink);background:var(--gold-50);border:1px dashed var(--gold);border-radius:12px;padding:12px;margin:8px 0 12px;word-break:break-all}
  @media(max-width:1000px){.svcs{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}}
  @media(max-width:900px){.hgrid{grid-template-columns:1fr;padding-block:34px 56px;gap:30px}.collage{min-height:330px}.stamp{width:84px;height:84px}.sec{padding:52px 0}}
  @media(max-width:640px){.hero h1{font-size:clamp(2.2rem,10.5vw,3rem)}.facts{gap:22px}.collage{min-height:290px}.svcs{grid-template-columns:1fr;gap:18px}.in{padding:18px}}`] })
export class HomePage implements OnInit, OnDestroy {
  api = inject(Api); auth = inject(Auth); router = inject(Router); toast = inject(ToastService); fb = inject(FormBuilder); site = inject(Site);
  tags = TAGS; services = signal<any[]>(DEFAULT_SERVICES); loading = signal(true); detail = signal<any>(null); sel = signal<any>(null); done = signal<any>(null); busy = signal(false);
  audio: File | null = null; today = new Date().toISOString().slice(0, 10);
  bf = this.fb.nonNullable.group({ mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]], serviceName: ['', [Validators.required, Validators.minLength(2)]], description: [''], quantity: [1, [Validators.required, Validators.min(1)]],
    address: ['', [Validators.required, Validators.minLength(5)]], preferredDate: ['', Validators.required], additional: [''] });
  banners = signal<any[]>([]); bi = signal(0); file = fileUrl; private bt: any;
  step(d: number) { const n = this.banners().length; if (n) this.bi.set((this.bi() + d + n) % n); this.restart(); }
  goto(i: number) { this.bi.set(i); this.restart(); }
  private restart() { clearInterval(this.bt); if (this.banners().length > 1) this.bt = setInterval(() => this.bi.set((this.bi() + 1) % this.banners().length), 5000); }
  ngOnDestroy() { clearInterval(this.bt); }
  ngOnInit() {
    this.api.get<any[]>('/banners').subscribe({ next: (b) => { this.banners.set(b); this.restart(); }, error: () => {} });
    this.api.get<any[]>('/services').subscribe({ next: (s) => { if (s.length) this.services.set(s); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  img(s: any) { return fileUrl(s.image) || `assets/services/${s.slug}.svg`; }
  e = (n: string) => showErr(this.bf.get(n));
  book(s: any) {
    if (!s) return;
    if (this.auth.me()?.role !== 'user') { this.toast.err('Please sign in to book a service'); this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } }); return; }
    this.sel.set(s); this.done.set(null); this.audio = null;
    this.bf.reset({ mobile: this.auth.me()!.mobile || '', quantity: 1, serviceName: '', description: '', address: '', preferredDate: '', additional: '' });
  }
  closeBook() { this.sel.set(null); this.done.set(null); }
  submitBook() {
    this.bf.markAllAsTouched(); if (this.bf.invalid) return;
    const v = this.bf.getRawValue(); const s = this.sel(); const fd = new FormData();
    fd.append('serviceName', v.serviceName.trim()); fd.append('category', s.name); if (!s.fallback) fd.append('serviceId', s._id);
    fd.append('mobile', v.mobile); fd.append('quantity', String(v.quantity)); fd.append('address', v.address.trim()); fd.append('preferredDate', v.preferredDate);
    if (v.description) fd.append('description', v.description); if (v.additional) fd.append('additional', v.additional);
    if (this.audio) fd.append('audio', this.audio, this.audio.name);
    this.busy.set(true);
    this.api.post<any>('/bookings', fd).subscribe({ next: (b) => { this.busy.set(false); this.done.set(b); this.toast.ok('Booking submitted'); }, error: (x) => { this.busy.set(false); this.toast.err(x); } });
  }
}
