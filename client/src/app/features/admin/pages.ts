import { Component, inject, signal, OnInit, OnDestroy, ElementRef, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Api, ToastService, inr, toPaise, fileUrl } from '../../core/core';
import { Confirm } from '../../shared/ui';
import { COMMON } from '../../shared/common';
Chart.register(...registerables);
export const dl = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };

/* ============ DASHBOARD ============ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="page-head"><div><h2>Dashboard</h2><p class="muted">Live overview of bookings, wallets and approvals.</p></div></div>
  @if (!d()) { <div class="grid g4"><div class="sk" style="height:84px"></div><div class="sk" style="height:84px"></div><div class="sk" style="height:84px"></div><div class="sk" style="height:84px"></div></div> } @else {
  <div class="grid g4">
    <app-stat icon="users" label="Registered users" [value]="d().stats.users"/><app-stat icon="check" label="Active users" [value]="d().stats.active"/>
    <app-stat icon="calendar-check" label="Total bookings" [value]="d().stats.bookings" [sub]="d().stats.pending + ' pending'"/><app-stat icon="check" label="Completed bookings" [value]="d().stats.completed"/>
    <app-stat icon="wallet" label="Total wallet balances" [value]="inr(d().stats.balances)"/><app-stat icon="lock" label="Principal held" [value]="inr(d().stats.principal)"/>
    <app-stat icon="trending-up" [gold]="true" label="Earned income held" [value]="inr(d().stats.earned)"/><app-stat icon="arrow-down-left" label="Total deposits" [value]="inr(d().stats.deposits)"/>
    <app-stat icon="percent" [gold]="true" label="Daily returns credited" [value]="inr(d().stats.returns)"/><app-stat icon="gift" [gold]="true" label="Referral commissions" [value]="inr(d().stats.commissions)"/>
    <a routerLink="/admin/deposits" class="card stat2"><b>{{d().stats.pendingD}}</b><span>deposit requests awaiting approval</span></a>
    <a routerLink="/admin/withdrawals" class="card stat2"><b>{{d().stats.pendingW}}</b><span>withdrawals in progress</span></a></div>
  <div class="grid g3 mt"><div class="card"><h3 class="mb">Monthly bookings</h3><canvas #c1 height="200"></canvas></div><div class="card"><h3 class="mb">Deposits vs withdrawals (₹)</h3><canvas #c2 height="200"></canvas></div><div class="card"><h3 class="mb">New users</h3><canvas #c3 height="200"></canvas></div></div>
  <div class="grid g2 mt" style="align-items:start"><div class="card"><div class="row between mb"><h3>Recent bookings</h3><a routerLink="/admin/bookings" class="sm">View all</a></div>
    @if (!d().recentBookings.length) { <app-empty title="No bookings yet"/> }
    @for (b of d().recentBookings; track b._id) { <div class="row between li"><div><b>{{b.bookingId}}</b><div class="sm muted">{{b.customerName}} · {{b.serviceName}}</div></div><app-badge [v]="b.status"/></div> }</div>
    <div class="card"><div class="row between mb"><h3>Recent transactions</h3><a routerLink="/admin/transactions" class="sm">View all</a></div>
    @if (!d().recentTransactions.length) { <app-empty title="No transactions yet"/> }
    @for (t of d().recentTransactions; track t._id) { <div class="row between li"><div><b style="text-transform:capitalize">{{t.type.replace('_',' ')}}</b><div class="sm muted">{{t.user?.name}} · {{t.createdAt | date:'d MMM, h:mm a'}}</div></div><b [style.color]="t.direction==='credit'?'var(--success)':'var(--danger)'">{{t.direction==='credit'?'+':'−'}}{{inr(t.amount)}}</b></div> }</div></div> }`,
  styles: [`.stat2{display:flex;gap:12px;align-items:center;color:var(--ink);border-style:dashed}.stat2 b{font-size:1.8rem;color:var(--gold-deep)}.stat2 span{font-size:.85rem;color:var(--muted)}.li{padding:10px 0;border-bottom:1px solid var(--border)}.li:last-child{border:0}`] })
export class DashboardPage implements OnInit, OnDestroy {
  api = inject(Api); inr = inr; d = signal<any>(null); charts: Chart[] = [];
  @ViewChild('c1') c1?: ElementRef<HTMLCanvasElement>; @ViewChild('c2') c2?: ElementRef<HTMLCanvasElement>; @ViewChild('c3') c3?: ElementRef<HTMLCanvasElement>;
  ngOnInit() { this.api.get<any>('/admin/dashboard').subscribe((r) => { this.d.set(r); setTimeout(() => this.draw(), 50); }); }
  ngOnDestroy() { this.charts.forEach((c) => c.destroy()); }
  draw() {
    const c = this.d()?.charts; if (!c) return;
    const months = Array.from(new Set([...c.bookings, ...c.deposits, ...c.withdrawals, ...c.users].map((x: any) => x._id))).sort() as string[];
    const series = (a: any[], div = 1) => months.map((m) => (a.find((x) => x._id === m)?.v || 0) / div);
    const opt: any = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#EEEADD' } }, x: { grid: { display: false } } } };
    const mk = (el: ElementRef<HTMLCanvasElement> | undefined, cfg: any) => { if (el) this.charts.push(new Chart(el.nativeElement, cfg)); };
    mk(this.c1, { type: 'bar', data: { labels: months, datasets: [{ data: series(c.bookings), backgroundColor: '#D4A53A', borderRadius: 8 }] }, options: opt });
    mk(this.c2, { type: 'bar', data: { labels: months, datasets: [{ label: 'Deposits', data: series(c.deposits, 100), backgroundColor: '#222226', borderRadius: 6 }, { label: 'Withdrawals', data: series(c.withdrawals, 100), backgroundColor: '#D4A53A', borderRadius: 6 }] }, options: { ...opt, plugins: { legend: { display: true } } } });
    mk(this.c3, { type: 'line', data: { labels: months, datasets: [{ data: series(c.users), borderColor: '#8A6410', backgroundColor: 'rgba(212,165,58,.18)', fill: true, tension: .35 }] }, options: opt });
  }
}

/* ============ ADD / DEDUCT FUNDS (shared modal) ============ */
@Component({ selector: 'app-adjust', standalone: true, imports: COMMON, template: `
  <app-modal [open]="open" title="Wallet adjustment" (close)="close.emit()">
    <p class="muted sm mb">Add money to, or deduct money from, a user's wallet. Every adjustment needs a reason and is recorded in the audit log and the user's ledger.</p>
    <div class="seg mb"><button type="button" [class.on]="dir==='credit'" (click)="dir='credit'">Add funds</button><button type="button" [class.on]="dir==='debit'" (click)="dir='debit'">Deduct funds</button></div>
    <div class="field"><label>User ID or mobile number</label><div class="row"><input class="grow" [(ngModel)]="walletId" (blur)="lookup()" (keyup.enter)="lookup()" placeholder="KL20260000 or 10-digit mobile"><button type="button" class="btn btn-ghost" (click)="lookup()">Find</button></div></div>
    @if (found) { <div class="found"><b>{{found.name}}</b> <span class="muted sm">({{found.userId}} · {{found.mobile}})</span>
      <div class="sm">Balance {{inr(found.balance)}} · Principal {{inr(found.principal)}} · Earned {{inr(found.earned)}}</div></div> }
    @if (lookupErr) { <div class="sm" style="color:var(--danger);margin-bottom:10px">{{lookupErr}}</div> }
    <div class="field"><label>{{dir==='credit'?'Add to':'Deduct from'}}</label><select [(ngModel)]="bucket"><option value="auto">{{dir==='credit'?'Principal (default)':'Principal first, then earned'}}</option><option value="principal">Principal only</option><option value="earned">Earned income only</option></select>
      <span class="hint">{{dir==='credit'?'Principal credits restart the principal lock period. Earned credits are immediately withdrawable.':'Deductions never take the balance below zero.'}}</span></div>
    <div class="field"><label>Amount (₹)</label><input type="number" min="1" step="0.01" [(ngModel)]="amount" inputmode="decimal"></div>
    <div class="field"><label>Reason (required)</label><textarea [(ngModel)]="reason" placeholder="e.g. Cash deposit received offline" style="min-height:64px"></textarea></div>
    <button type="button" class="btn btn-block" [class.btn-primary]="dir==='credit'" [class.btn-danger]="dir==='debit'" [disabled]="busy" (click)="submit()">{{busy?'Processing…':(dir==='credit'?'Add funds':'Deduct funds')}}</button>
  </app-modal>`,
  styles: [`.seg{display:grid;grid-template-columns:1fr 1fr;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:4px;gap:4px}.seg button{border:0;background:none;padding:10px;border-radius:9px;font:700 .88rem var(--font);cursor:pointer;color:var(--muted)}.seg button.on{background:var(--ink);color:var(--gold-2)}
  .found{background:var(--gold-50);border:1px solid #DDD7C4;border-radius:12px;padding:10px 12px;margin-bottom:14px}`] })
export class AdjustComponent {
  api = inject(Api); toast = inject(ToastService); inr = inr;
  @Input() open = false; @Input() set wallet(v: string) { if (v) { this.walletId = v; this.lookup(); } }
  @Output() close = new EventEmitter<void>(); @Output() done = new EventEmitter<void>();
  @Input() set direction(v: 'credit' | 'debit') { this.dir = v || 'credit'; }
  dir: 'credit' | 'debit' = 'credit'; walletId = ''; bucket = 'auto'; amount: number | null = null; reason = ''; found: any = null; lookupErr = ''; busy = false;
  lookup() {
    const id = this.walletId.trim().toUpperCase(); this.found = null; this.lookupErr = ''; if (id.length < 3) return;
    this.api.get<any>(`/admin/wallets/lookup/${encodeURIComponent(id)}`).subscribe({ next: (r) => (this.found = r), error: (e) => (this.lookupErr = e?.error?.message || 'User not found') });
  }
  submit() {
    const id = this.walletId.trim().toUpperCase(); const paise = toPaise(this.amount);
    if (!id) return this.toast.err('Enter a User ID or mobile number'); if (paise < 1) return this.toast.err('Enter a valid amount'); if (this.reason.trim().length < 5) return this.toast.err('Give a reason (at least 5 characters)');
    this.busy = true;
    this.api.post<any>('/admin/wallets/adjust', { ref: id, direction: this.dir, bucket: this.bucket, amount: paise, reason: this.reason.trim() }).subscribe({
      next: (r) => { this.busy = false; this.toast.ok(`Done. New balance ${inr(r.balance)}`); this.amount = null; this.reason = ''; this.found = null; this.walletId = ''; this.done.emit(); this.close.emit(); },
      error: (e) => { this.busy = false; this.toast.err(e); } });
  }
}

/* ============ BOOKINGS ============ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="page-head"><div><h2>Bookings</h2><p class="muted">Every booking submitted by users, live from the database.</p></div><button type="button" class="btn btn-ghost" (click)="exp()"><lucide-icon name="download" [size]="16"/> Export CSV</button></div>
  <div class="card flat mb"><div class="grid g4"><div class="field" style="margin:0"><label>Search</label><input [(ngModel)]="q.search" (keyup.enter)="load(1)" placeholder="ID, name, mobile…"></div>
    <div class="field" style="margin:0"><label>Status</label><select [(ngModel)]="q.status" (change)="load(1)"><option value="">All</option>@for (s of st; track s) {<option [value]="s">{{s.replace('_',' ')}}</option>}</select></div>
    <div class="field" style="margin:0"><label>Category</label><select [(ngModel)]="q.category" (change)="load(1)"><option value="">All</option>@for (c of cats(); track c) {<option>{{c}}</option>}</select></div>
    <div class="grid g2" style="gap:8px"><div class="field" style="margin:0"><label>From</label><input type="date" [(ngModel)]="q.from" (change)="load(1)"></div><div class="field" style="margin:0"><label>To</label><input type="date" [(ngModel)]="q.to" (change)="load(1)"></div></div></div>
    <div class="row mt"><button type="button" class="btn btn-primary btn-sm" (click)="load(1)">Search</button><button type="button" class="btn btn-ghost btn-sm" (click)="reset()">Reset</button></div></div>
  @if (loading()) { <app-skeleton [n]="6"/> } @else if (!items().length) { <div class="card"><app-empty title="No bookings found" text="Try changing the filters."/></div> } @else {
  <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Booking ID</th><th>Customer</th><th>Mobile</th><th>Service</th><th>Date</th><th>Voice</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  @for (b of items(); track b._id) { <tr><td data-l="Booking ID"><b>{{b.bookingId}}</b></td><td data-l="Customer">{{b.customerName}}<div class="sm muted">{{b.userCode}}</div></td><td data-l="Mobile">{{b.mobile}}</td>
    <td data-l="Service">{{b.serviceName}}<div class="sm muted">{{b.category}}</div></td><td data-l="Date">{{b.preferredDate | date:'dd MMM yyyy'}}</td>
    <td data-l="Voice">@if (b.audio) { <span class="badge b-active"><lucide-icon name="mic" [size]="12"/> yes</span> } @else { <span class="muted">—</span> }</td>
    <td data-l="Status"><app-badge [v]="b.status"/></td>
    <td data-l="Actions"><div class="row wrap" style="gap:6px"><button type="button" class="btn btn-ghost btn-sm" (click)="open(b)">View</button>
      @if (b.status==='pending') { <button type="button" class="btn btn-ok btn-sm" (click)="act(b,'confirmed')">Confirm</button><button type="button" class="btn btn-danger btn-sm" (click)="act(b,'cancelled')">Reject</button> }
      @if (b.status==='confirmed') { <button type="button" class="btn btn-ok btn-sm" (click)="act(b,'in_progress')">In progress</button> }
      @if (b.status==='in_progress') { <button type="button" class="btn btn-ok btn-sm" (click)="act(b,'completed')">Complete</button> }</div></td></tr> }</tbody></table></div>
  <app-pager [page]="page()" [limit]="10" [total]="total()" (go)="load($event)"/> }
  <app-modal [open]="!!sel()" [drawer]="true" [title]="sel()?.bookingId || ''" (close)="sel.set(null)">@if (sel(); as b) {
    <div class="row mb"><app-badge [v]="b.status"/><span class="muted sm">{{b.createdAt | date:'medium'}}</span></div>
    <dl class="dl mb"><dt>Customer</dt><dd>{{b.customerName}} ({{b.userCode}})</dd><dt>Mobile</dt><dd>{{b.mobile}}</dd><dt>Service</dt><dd>{{b.serviceName}} · {{b.category}}</dd><dt>Quantity</dt><dd>{{b.quantity}}</dd><dt>Date</dt><dd>{{b.preferredDate | date:'mediumDate'}}</dd><dt>Address</dt><dd>{{b.address}}</dd>
      @if (b.description) { <dt>Description</dt><dd>{{b.description}}</dd> } @if (b.additional) { <dt>Additional</dt><dd>{{b.additional}}</dd> }</dl>
    @if (b.audio) { <div class="voice mb"><div class="strong mb"><lucide-icon name="mic" [size]="14"/> Voice note from customer</div><audio controls preload="metadata" [src]="url(b.audio)" style="width:100%"></audio><a class="sm" [href]="url(b.audio)" download target="_blank" rel="noopener">Download audio</a></div> }
    <div class="field"><label>Admin remarks (visible to the customer)</label><textarea [(ngModel)]="remarks"></textarea></div>
    <div class="field"><label>Booking amount (₹) — used for referral commission when completed</label><input type="number" min="0" [(ngModel)]="amount"></div>
    <div class="row wrap"><button type="button" class="btn btn-primary" (click)="save(b)">Save remarks &amp; amount</button>
      <select class="btn btn-ghost" [ngModel]="''" (ngModelChange)="act(b, $event)"><option value="">Change status…</option>@for (s of st; track s) {<option [value]="s">{{s.replace('_',' ')}}</option>}</select></div>
    <h3 class="mt mb">Timeline</h3><ul class="timeline">@for (t of b.timeline; track $index) { <li><b style="text-transform:capitalize">{{t.status.replace('_',' ')}}</b><div class="sm muted">{{t.at | date:'medium'}} {{t.note}}</div></li> }</ul> }</app-modal>`,
  styles: [`.voice{background:var(--gold-50);border:1px solid #DDD7C4;border-radius:12px;padding:12px}`] })
export class AdminBookingsPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); confirm = inject(Confirm); url = fileUrl;
  st = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']; q: any = { search: '', status: '', category: '', from: '', to: '' };
  items = signal<any[]>([]); total = signal(0); page = signal(1); loading = signal(true); sel = signal<any>(null); cats = signal<string[]>([]); remarks = ''; amount: number | null = null;
  ngOnInit() { this.load(1); this.api.get<any[]>('/admin/services').subscribe({ next: (s) => this.cats.set(Array.from(new Set(s.map((x) => x.name)))), error: () => {} }); }
  load(p: number) { this.loading.set(true); this.page.set(p); this.api.get<any>('/admin/bookings', { ...this.q, page: p }).subscribe({ next: (r) => { this.items.set(r.items); this.total.set(r.total); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.err(e); } }); }
  reset() { this.q = { search: '', status: '', category: '', from: '', to: '' }; this.load(1); }
  open(b: any) { this.sel.set(b); this.remarks = b.remarks || ''; this.amount = b.amount ? b.amount / 100 : null; }
  async act(b: any, status: string) {
    if (!status) return;
    if (status === 'cancelled' && !(await this.confirm.ask('Reject / cancel this booking?', b.bookingId, true))) return;
    this.api.patch<any>(`/admin/bookings/${b._id}`, { status, remarks: this.remarks || undefined }).subscribe({ next: (r) => { this.toast.ok('Status updated'); if (this.sel()) this.sel.set(r); this.load(this.page()); }, error: (e) => this.toast.err(e) });
  }
  save(b: any) { this.api.patch<any>(`/admin/bookings/${b._id}`, { remarks: this.remarks, amount: toPaise(this.amount) }).subscribe({ next: (r) => { this.toast.ok('Saved'); this.sel.set(r); this.load(this.page()); }, error: (e) => this.toast.err(e) }); }
  exp() { this.api.blob('/admin/bookings/export', this.q).subscribe({ next: (b) => dl(b, 'bookings.csv'), error: (e) => this.toast.err(e) }); }
}

/* ============ USERS ============ */
@Component({ standalone: true, imports: [...COMMON, AdjustComponent], template: `
  <div class="page-head"><div><h2>Users</h2><p class="muted">All registered users with wallet balances. Add or deduct funds from here.</p></div>
    <button type="button" class="btn btn-gold" (click)="adj(null,'credit')"><lucide-icon name="plus" [size]="16"/> Add / deduct funds</button></div>
  <div class="card flat mb"><div class="row wrap"><input class="grow" style="min-width:200px" [(ngModel)]="search" (keyup.enter)="load(1)" placeholder="Search name, email, mobile or user ID…"><button type="button" class="btn btn-primary btn-sm" (click)="load(1)">Search</button></div></div>
  @if (loading()) { <app-skeleton [n]="6"/> } @else if (!items().length) { <div class="card"><app-empty title="No users found"/></div> } @else {
  <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>User</th><th>Contact</th><th>Principal</th><th>Earned</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  @for (u of items(); track u._id) { <tr><td data-l="User"><b>{{u.name}}</b><div class="sm muted">{{u.userId}} · &#64;{{u.username}}</div></td><td data-l="Contact">{{u.email}}<div class="sm muted">{{u.mobile}}</div></td>
    <td data-l="Principal">{{inr(u.principal)}}</td><td data-l="Earned">{{inr(u.earned)}}</td><td data-l="Status"><app-badge [v]="u.status"/></td>
    <td data-l="Actions"><div class="row wrap" style="gap:6px"><button type="button" class="btn btn-ok btn-sm" (click)="adj(u,'credit')">Add funds</button><button type="button" class="btn btn-ghost btn-sm" (click)="adj(u,'debit')">Deduct</button>
      <button type="button" class="btn btn-ghost btn-sm" (click)="view(u)">View</button><button type="button" class="btn btn-ghost btn-sm" (click)="edit(u)"><lucide-icon name="pencil" [size]="13"/> Edit</button>
      <button type="button" class="btn btn-sm" [class.btn-danger]="u.status==='active'" [class.btn-ok]="u.status!=='active'" (click)="toggle(u)">{{u.status==='active'?'Suspend':'Activate'}}</button></div></td></tr> }</tbody></table></div>
  <app-pager [page]="page()" [limit]="10" [total]="total()" (go)="load($event)"/> }
  <app-adjust [open]="adjOpen()" [wallet]="adjWallet" [direction]="adjDir" (close)="adjOpen.set(false)" (done)="load(page())"/>
  <app-modal [open]="!!ed()" [drawer]="true" [title]="'Edit ' + (ed()?.userId || 'user')" (close)="ed.set(null)">@if (ed(); as e) {
    <p class="muted sm mb">Changes are recorded in the audit log. User ID and wallet cannot be changed.</p>
    <div class="field"><label>Full name</label><input [(ngModel)]="e.name"></div>
    <div class="grid g2"><div class="field"><label>Mobile</label><input [(ngModel)]="e.mobile" maxlength="10" inputmode="numeric"></div><div class="field"><label>Username</label><input [(ngModel)]="e.username"></div></div>
    <div class="field"><label>Email</label><input type="email" [(ngModel)]="e.email"></div>
    <div class="field"><label>Address</label><textarea [(ngModel)]="e.address" style="min-height:60px"></textarea></div>
    <div class="grid g3"><div class="field"><label>City</label><input [(ngModel)]="e.city"></div><div class="field"><label>State</label><input [(ngModel)]="e.state"></div><div class="field"><label>PIN</label><input [(ngModel)]="e.pin" maxlength="6" inputmode="numeric"></div></div>
    <div class="grid g2"><div class="field"><label>Status</label><select [(ngModel)]="e.status"><option value="active">Active</option><option value="suspended">Suspended</option></select></div>
      <div class="field"><label>Set new password (optional)</label><input type="text" [(ngModel)]="e.newPassword" placeholder="leave empty to keep" autocomplete="off"></div></div>
    <button type="button" class="btn btn-primary btn-block" [disabled]="saving()" (click)="saveEdit()">{{saving() ? 'Saving…' : 'Save changes'}}</button> }</app-modal>
  <app-modal [open]="!!det()" [drawer]="true" [title]="det()?.user?.name || 'User'" (close)="det.set(null)">@if (det(); as d) {
    <dl class="dl mb"><dt>User ID</dt><dd>{{d.user.userId}}</dd><dt>Email</dt><dd>{{d.user.email || '—'}}</dd><dt>Mobile</dt><dd>{{d.user.mobile}}</dd><dt>Joined</dt><dd>{{d.user.createdAt | date:'mediumDate'}}</dd><dt>Nominee</dt><dd>@if (d.user.nominee?.name) { {{d.user.nominee.name}} ({{d.user.nominee.relation}})@if (d.user.nominee.mobile) { · {{d.user.nominee.mobile}} }@if (d.user.nominee.dob) { · DOB {{d.user.nominee.dob}} }@if (d.user.nominee.address) { · {{d.user.nominee.address}} } } @else { — }</dd>
      <dt>Balance</dt><dd>{{inr(d.wallet?.balance)}}</dd><dt>Principal</dt><dd>{{inr(d.wallet?.principal)}}</dd><dt>Earned</dt><dd>{{inr(d.wallet?.earned)}}</dd></dl>
    <h3 class="mb">Recent transactions</h3>@if (!d.transactions.length) { <p class="muted sm">None yet.</p> }
    @for (t of d.transactions; track t._id) { <div class="row between li"><div><b style="text-transform:capitalize">{{t.type.replace('_',' ')}}</b><div class="sm muted">{{t.note}} · {{t.createdAt | date:'d MMM, h:mm a'}}</div></div><b>{{t.direction==='credit'?'+':'−'}}{{inr(t.amount)}}</b></div> }
    <h3 class="mt mb">Recent bookings</h3>@if (!d.bookings.length) { <p class="muted sm">None yet.</p> }
    @for (b of d.bookings; track b._id) { <div class="row between li"><div><b>{{b.bookingId}}</b><div class="sm muted">{{b.serviceName}}</div></div><app-badge [v]="b.status"/></div> } }</app-modal>`,
  styles: [`.li{padding:9px 0;border-bottom:1px solid var(--border);gap:10px}.li:last-child{border:0}`] })
export class AdminUsersPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); confirm = inject(Confirm); inr = inr;
  items = signal<any[]>([]); total = signal(0); page = signal(1); loading = signal(true); search = ''; det = signal<any>(null);
  adjOpen = signal(false); adjWallet = ''; adjDir: 'credit' | 'debit' = 'credit';
  ngOnInit() { this.load(1); }
  load(p: number) { this.loading.set(true); this.page.set(p); this.api.get<any>('/admin/users', { search: this.search, page: p }).subscribe({ next: (r) => { this.items.set(r.items); this.total.set(r.total); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.err(e); } }); }
  adj(u: any, dir: 'credit' | 'debit') { this.adjWallet = u?.userId || ''; this.adjDir = dir; this.adjOpen.set(false); setTimeout(() => this.adjOpen.set(true), 0); }
  ed = signal<any>(null); saving = signal(false);
  edit(u: any) { this.ed.set({ _id: u._id, userId: u.userId, name: u.name || '', mobile: u.mobile || '', username: u.username || '', email: u.email || '', address: u.address || '', city: u.city || '', state: u.state || '', pin: u.pin || '', status: u.status, newPassword: '' }); }
  saveEdit() {
    const e = this.ed(); if (!e) return; const { _id, userId, newPassword, ...b } = e; const body: any = { ...b }; if (newPassword) body.newPassword = newPassword;
    this.saving.set(true);
    this.api.patch(`/admin/users/${_id}`, body).subscribe({ next: () => { this.saving.set(false); this.ed.set(null); this.toast.ok('User updated'); this.load(this.page()); }, error: (x) => { this.saving.set(false); this.toast.err(x); } });
  }
  view(u: any) { this.api.get<any>(`/admin/users/${u._id}`).subscribe({ next: (r) => this.det.set(r), error: (e) => this.toast.err(e) }); }
  async toggle(u: any) {
    const to = u.status === 'active' ? 'suspended' : 'active';
    if (!(await this.confirm.ask(`${to === 'suspended' ? 'Suspend' : 'Activate'} ${u.name}?`, to === 'suspended' ? 'They will not be able to log in.' : '', to === 'suspended'))) return;
    this.api.patch(`/admin/users/${u._id}`, { status: to }).subscribe({ next: () => { this.toast.ok('Updated'); this.load(this.page()); }, error: (e) => this.toast.err(e) });
  }
}

/* ============ SERVICES ============ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="page-head"><div><h2>Services</h2><p class="muted">Services shown on the home page with image and Book now button.</p></div><button type="button" class="btn btn-gold" (click)="edit(null)"><lucide-icon name="plus" [size]="16"/> Add service</button></div>
  @if (loading()) { <app-skeleton [n]="3" [h]="90"/> } @else if (!items().length) { <div class="card"><app-empty title="No services yet" text="Add your first service."/></div> } @else {
  <div class="grid g3">@for (s of items(); track s._id) { <div class="card svc"><div class="thumb">@if (s.image) { <img [src]="url(s.image)" alt=""> } @else { <lucide-icon name="image" [size]="28"/> }</div>
    <div class="row between"><h3>{{s.name}}</h3><app-badge [v]="s.active?'active':'inactive'"/></div><p class="sm muted">{{s.description}}</p>
    <div class="row wrap mt"><button type="button" class="btn btn-ghost btn-sm" (click)="edit(s)">Edit</button><button type="button" class="btn btn-ghost btn-sm" (click)="toggle(s)">{{s.active?'Disable':'Enable'}}</button><button type="button" class="btn btn-danger btn-sm" (click)="remove(s)">Delete</button></div></div> }</div> }
  <app-modal [open]="form()" [drawer]="true" [title]="cur ? 'Edit service' : 'Add service'" (close)="form.set(false)">
    <div class="field"><label>Name</label><input [(ngModel)]="m.name"></div>
    <div class="field"><label>Short description</label><textarea [(ngModel)]="m.description" style="min-height:64px"></textarea></div>
    <div class="field"><label>Included items (one per line)</label><textarea [(ngModel)]="m.items" style="min-height:90px"></textarea></div>
    <div class="field"><label>Image</label><input type="file" accept="image/png,image/jpeg,image/webp" (change)="pick($event)">@if (cur?.image && !file) { <span class="hint">Current image kept unless you choose a new one.</span> }</div>
    <label class="row sm" style="margin-bottom:10px"><input type="checkbox" [(ngModel)]="m.active"> Active (visible to users)</label>
    <label class="row sm" style="margin-bottom:14px"><input type="checkbox" [(ngModel)]="m.allowCustom"> Allow custom request</label>
    <button type="button" class="btn btn-primary btn-block" [disabled]="busy()" (click)="save()">{{busy()?'Saving…':'Save service'}}</button></app-modal>`,
  styles: [`.svc{display:grid;gap:8px}.thumb{height:130px;border-radius:12px;background:var(--gold-50);display:grid;place-items:center;overflow:hidden;color:var(--gold-deep)}.thumb img{width:100%;height:100%;object-fit:cover}`] })
export class AdminServicesPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); confirm = inject(Confirm); url = fileUrl;
  items = signal<any[]>([]); loading = signal(true); form = signal(false); busy = signal(false); cur: any = null; file: File | null = null;
  m: any = { name: '', description: '', items: '', active: true, allowCustom: false };
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/admin/services').subscribe({ next: (r) => { this.items.set(r); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.err(e); } }); }
  edit(s: any) { this.cur = s; this.file = null; this.m = s ? { name: s.name, description: s.description || '', items: (s.items || []).join('\n'), active: !!s.active, allowCustom: !!s.allowCustom } : { name: '', description: '', items: '', active: true, allowCustom: false }; this.form.set(true); }
  pick(e: Event) { this.file = (e.target as HTMLInputElement).files?.[0] || null; }
  save() {
    if (!this.m.name || this.m.name.trim().length < 2) return this.toast.err('Enter a service name');
    const fd = new FormData(); fd.append('name', this.m.name.trim()); fd.append('description', this.m.description || ''); fd.append('items', this.m.items || ''); fd.append('active', String(!!this.m.active)); fd.append('allowCustom', String(!!this.m.allowCustom)); if (this.file) fd.append('image', this.file);
    this.busy.set(true);
    const req = this.cur ? this.api.put(`/admin/services/${this.cur._id}`, fd) : this.api.post('/admin/services', fd);
    req.subscribe({ next: () => { this.busy.set(false); this.form.set(false); this.toast.ok('Service saved'); this.load(); }, error: (e) => { this.busy.set(false); this.toast.err(e); } });
  }
  toggle(s: any) { this.api.patch(`/admin/services/${s._id}/toggle`).subscribe({ next: () => this.load(), error: (e) => this.toast.err(e) }); }
  async remove(s: any) { if (!(await this.confirm.ask('Delete this service?', s.name, true))) return; this.api.del(`/admin/services/${s._id}`).subscribe({ next: () => { this.toast.ok('Deleted'); this.load(); }, error: (e) => this.toast.err(e) }); }
}

/* ============ WALLET MANAGEMENT ============ */
@Component({ standalone: true, imports: [...COMMON, AdjustComponent], template: `
  <div class="page-head"><div><h2>Wallet management</h2><p class="muted">Balances split into principal and earned income. Add or deduct funds with a recorded reason.</p></div>
    <div class="row wrap"><button type="button" class="btn btn-ok" (click)="adj(null,'credit')"><lucide-icon name="plus" [size]="16"/> Add funds</button><button type="button" class="btn btn-danger" (click)="adj(null,'debit')"><lucide-icon name="minus" [size]="16"/> Deduct funds</button></div></div>
  <div class="card flat mb"><div class="row wrap"><input class="grow" style="min-width:200px" [(ngModel)]="search" (keyup.enter)="load(1)" placeholder="Search user ID, name or mobile…"><button type="button" class="btn btn-primary btn-sm" (click)="load(1)">Search</button></div></div>
  @if (loading()) { <app-skeleton [n]="6"/> } @else if (!items().length) { <div class="card"><app-empty title="No wallets found"/></div> } @else {
  <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>User</th><th>Balance</th><th>Principal</th><th>Earned</th><th>Principal lock</th><th>Total returns</th><th>Actions</th></tr></thead><tbody>
  @for (w of items(); track w._id) { <tr><td data-l="User"><b>{{w.user?.name}}</b><div class="sm muted">{{w.user?.userId}}</div></td><td data-l="Balance"><b>{{inr(w.balance)}}</b></td>
    <td data-l="Principal">{{inr(w.principal)}}</td><td data-l="Earned">{{inr(w.earned)}}</td><td data-l="Principal lock">@if (w.lock?.locked) { <b>Locked</b><div class="sm muted">{{w.lock.unlockAt ? ('until ' + (w.lock.unlockAt | date:'d MMM y')) : 'date not set'}}</div> } @else { <span class="sm muted">{{w.principal > 0 ? 'Unlocked' : '—'}}</span> }</td><td data-l="Total returns">{{inr(w.totalReturns)}}</td>
    <td data-l="Actions"><div class="row wrap" style="gap:6px"><button type="button" class="btn btn-ok btn-sm" (click)="adj(w,'credit')">Add</button><button type="button" class="btn btn-ghost btn-sm" (click)="adj(w,'debit')">Deduct</button><button type="button" class="btn btn-ghost btn-sm" (click)="openLock(w)">Lock</button></div></td></tr> }</tbody></table></div>
  <app-pager [page]="page()" [limit]="10" [total]="total()" (go)="load($event)"/> }
  <app-adjust [open]="adjOpen()" [wallet]="adjWallet" [direction]="adjDir" (close)="adjOpen.set(false)" (done)="load(page())"/>
  <app-modal [open]="!!lw()" title="Principal lock" (close)="lw.set(null)">@if (lw(); as w) {
    <p class="muted sm mb">{{w.user?.name}} ({{w.user?.userId}}) · principal {{inr(w.principal)}} · @if (w.lock?.locked) { locked {{w.lock.unlockAt ? ('until ' + (w.lock.unlockAt | date:'d MMM y')) : '(no date set yet)'}} } @else { unlocked }</p>
    <div class="field"><label>Set lock</label><select [(ngModel)]="lm.mode"><option value="months">Lock for a number of months</option><option value="days">Lock for a number of days</option><option value="date">Lock until a date</option><option value="unlock">Unlock now</option><option value="default">Back to the default rule (Settings)</option></select></div>
    @if (lm.mode==='months') { <div class="field"><label>Months from today (12 = one year)</label><input type="number" min="1" max="120" [(ngModel)]="lm.months"></div> }
    @if (lm.mode==='days') { <div class="field"><label>Days from today</label><input type="number" min="0" max="3650" [(ngModel)]="lm.days"></div> }
    @if (lm.mode==='date') { <div class="field"><label>Unlock date</label><input type="date" [(ngModel)]="lm.date"></div> }
    <button type="button" class="btn btn-primary btn-block" [disabled]="lbusy()" (click)="saveLock()">{{lbusy() ? 'Saving…' : 'Save lock'}}</button> }</app-modal>`})
export class AdminWalletsPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); inr = inr;
  items = signal<any[]>([]); total = signal(0); page = signal(1); loading = signal(true); search = ''; adjOpen = signal(false); adjWallet = ''; adjDir: 'credit' | 'debit' = 'credit';
  ngOnInit() { this.load(1); }
  load(p: number) { this.loading.set(true); this.page.set(p); this.api.get<any>('/admin/wallets', { search: this.search, page: p }).subscribe({ next: (r) => { this.items.set(r.items); this.total.set(r.total); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.err(e); } }); }
  lw = signal<any>(null); lbusy = signal(false); lm: any = { mode: 'months', months: 1, days: 30, date: '' };
  openLock(w: any) { this.lm = { mode: 'months', months: 1, days: 30, date: '' }; this.lw.set(w); }
  saveLock() {
    const w = this.lw(); if (!w) return; const m = this.lm; this.lbusy.set(true);
    this.api.put<any>(`/admin/wallets/${w.user?._id}/lock`, { mode: m.mode, months: Number(m.months), days: Number(m.days), date: m.date || null }).subscribe({
      next: () => { this.lbusy.set(false); this.lw.set(null); this.toast.ok('Lock updated'); this.load(this.page()); }, error: (e) => { this.lbusy.set(false); this.toast.err(e); } });
  }
  adj(w: any, dir: 'credit' | 'debit') { this.adjWallet = w?.user?.userId || ''; this.adjDir = dir; this.adjOpen.set(false); setTimeout(() => this.adjOpen.set(true), 0); }
}
