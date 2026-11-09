import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Api, ToastService, inr, fileUrl } from '../../core/core';
import { Confirm } from '../../shared/ui';
import { COMMON } from '../../shared/common';
import { dl } from './pages';

const rupees = (p: number) => Math.round((p || 0)) / 100;
const toP = (r: any) => Math.round(Number(r || 0) * 100);

/* ============ SETTINGS ============ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="page-head"><div><h2>Settings</h2><p class="muted">Daily earning, month-end principal return, withdrawal fees, principal lock, referral commissions and contact details.</p></div>
    <button type="button" class="btn btn-gold" [disabled]="busy()" (click)="save()">{{busy()?'Saving…':'Save all settings'}}</button></div>
  @if (!s) { <app-skeleton [n]="4" [h]="120"/> } @else {
  <div class="stack">
    <section class="card"><h3>Daily earning</h3>
      <p class="muted sm mb">Credited to each eligible user's <b>earned income</b> every day (00:10 server time). Type the daily percentage directly, or choose to split a monthly percentage into days. Earnings are an admin-configurable program benefit, not a guarantee.</p>
      <label class="row sm mb"><input type="checkbox" [(ngModel)]="s.returns.enabled"> Daily earning enabled</label>
      <div class="grid g3"><div class="field"><label>Set by</label><select [(ngModel)]="s.returns.inputMode"><option value="daily">Daily percentage</option><option value="monthly">Monthly percentage (split into days)</option></select></div>
        @if (s.returns.inputMode==='daily') { <div class="field"><label>Daily percentage (%)</label><input type="number" step="0.0001" min="0" [(ngModel)]="s.returns.dailyPercent"></div> }
        @else { <div class="field"><label>Monthly percentage (%)</label><input type="number" step="0.01" min="0" [(ngModel)]="s.returns.monthlyPercent"></div>
          <div class="field"><label>Days basis</label><select [(ngModel)]="s.returns.daysBasis"><option value="calendar">Actual days in the month</option><option value="fixed30">Fixed 30 days</option></select></div> }
        <div class="field"><label>Calculated on</label><select [(ngModel)]="s.returns.base"><option value="principal">Principal only</option><option value="balance">Total balance</option></select></div></div>
      <div class="grid g2"><div class="field"><label>Minimum balance to qualify (₹)</label><input type="number" min="0" [(ngModel)]="minBalance"></div>
        <div class="field"><label>Start date (optional)</label><input type="date" [(ngModel)]="s.returns.startDate"></div></div>
      <div class="preview"><lucide-icon name="percent" [size]="16"/> <span>Daily rate <b>{{daily()}}%</b> → on ₹10,000 a user earns <b>₹{{(10000 * Number(daily()) / 100).toFixed(2)}}</b> per day</span></div>
      <div class="field mt"><label>Conditions shown to users</label><textarea [(ngModel)]="s.returns.conditions" style="min-height:64px"></textarea></div></section>

    <section class="card"><h3>Month-end principal return</h3>
      <p class="muted sm mb">A separate setting. A percentage of each user's <b>principal</b> is credited once, at the end of the month (last day, 23:55 server time), to earned income. Admin can also run it manually from Daily Returns.</p>
      <label class="row sm mb"><input type="checkbox" [(ngModel)]="s.principalReturn.enabled"> Month-end principal return enabled</label>
      <div class="grid g2"><div class="field"><label>Percentage of principal (%)</label><input type="number" step="0.01" min="0" [(ngModel)]="s.principalReturn.percent"></div>
        <div class="field"><label>Minimum principal to qualify (₹)</label><input type="number" min="0" [(ngModel)]="minPrincipal"></div></div>
      <div class="preview"><lucide-icon name="info" [size]="16"/> <span>On ₹10,000 principal: <b>₹{{(10000 * Number(s.principalReturn.percent || 0) / 100).toFixed(2)}}</b> at month end</span></div>
      <div class="field mt"><label>Conditions shown to users</label><textarea [(ngModel)]="s.principalReturn.conditions" style="min-height:64px"></textarea></div></section>

    <section class="card"><h3>Withdrawal fees</h3>
      <p class="muted sm mb">Two deductions are applied to every withdrawal. Rename them and set each percentage. The user sees the full breakdown before confirming.</p>
      <div class="grid g2">
        <div class="fee"><label class="row sm mb"><input type="checkbox" [(ngModel)]="s.wallet.tds.enabled"> Fee 1 enabled</label>
          <div class="field"><label>Fee 1 text</label><input [(ngModel)]="s.wallet.tds.label" maxlength="40"></div><div class="field"><label>Fee 1 percent (%)</label><input type="number" step="0.01" min="0" max="50" [(ngModel)]="s.wallet.tds.percent"></div></div>
        <div class="fee"><label class="row sm mb"><input type="checkbox" [(ngModel)]="s.wallet.service.enabled"> Fee 2 enabled</label>
          <div class="field"><label>Fee 2 text</label><input [(ngModel)]="s.wallet.service.label" maxlength="40"></div><div class="field"><label>Fee 2 percent (%)</label><input type="number" step="0.01" min="0" max="50" [(ngModel)]="s.wallet.service.percent"></div></div></div>
      <div class="preview"><lucide-icon name="info" [size]="16"/> <span>On ₹1,000: {{s.wallet.tds.label}} ₹{{fee(s.wallet.tds)}} + {{s.wallet.service.label}} ₹{{fee(s.wallet.service)}} → user receives <b>₹{{net()}}</b></span></div>
      <div class="grid g2 mt"><div class="field"><label>Minimum withdrawal (₹)</label><input type="number" min="1" [(ngModel)]="minW"></div><div class="field"><label>Minimum deposit (₹)</label><input type="number" min="1" [(ngModel)]="minD"></div></div>
      <div class="field"><label>Payment methods (comma separated)</label><input [(ngModel)]="methods"></div>
      <div class="field"><label>Deposit instructions shown to users</label><textarea [(ngModel)]="s.wallet.depositInstructions" style="min-height:64px"></textarea></div></section>

    <section class="card"><h3>Principal lock</h3>
      <p class="muted sm mb">Principal (deposited / admin-added money) cannot be withdrawn while locked. Earned income (returns and referral commission) can always be withdrawn.</p>
      <label class="row sm mb"><input type="checkbox" [(ngModel)]="s.wallet.principalLock.enabled"> Lock principal</label>
      <div class="grid g3"><div class="field"><label>Lock mode</label><select [(ngModel)]="s.wallet.principalLock.mode"><option value="days">Days after the user's latest deposit</option><option value="date">Until a fixed date</option></select></div>
        @if (s.wallet.principalLock.mode==='days') { <div class="field"><label>Lock days</label><input type="number" min="0" [(ngModel)]="s.wallet.principalLock.days"></div> }
        @else { <div class="field"><label>Locked until</label><input type="date" [(ngModel)]="s.wallet.principalLock.date"></div> }</div></section>

    <section class="card"><h3>Referral commissions</h3>
      <p class="muted sm mb">Paid to the referrer's earned income. Four separate commission types, each with its own on/off and percentage.</p>
      <label class="row sm mb"><input type="checkbox" [(ngModel)]="s.referral.enabled"> Referral program enabled (master switch)</label>
      <div class="field" style="max-width:320px"><label>Approval</label><select [(ngModel)]="s.referral.autoApprove"><option [ngValue]="false">Manual approval by admin</option><option [ngValue]="true">Auto approve</option></select></div>
      <div class="mt" style="display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">
        <div class="fee"><b>1. Booking</b><label class="row sm mt"><input type="checkbox" [(ngModel)]="s.referral.bookingEnabled"> Enabled</label>
          <div class="field mt"><label>Commission (%)</label><input type="number" step="0.01" min="0" [(ngModel)]="s.referral.percent"></div>
          <div class="field"><label>Paid on</label><select [(ngModel)]="s.referral.eligibleActivity"><option value="first_completed_booking">First completed booking</option><option value="every_completed_booking">Every completed booking</option></select></div></div>
        <div class="fee"><b>2. Deposit</b><label class="row sm mt"><input type="checkbox" [(ngModel)]="s.referral.deposit.enabled"> Enabled</label>
          <div class="field mt"><label>Commission (%)</label><input type="number" step="0.01" min="0" [(ngModel)]="s.referral.deposit.percent"></div>
          <div class="field"><label>Paid on</label><select [(ngModel)]="s.referral.deposit.eligible"><option value="first_deposit">First approved deposit</option><option value="every_deposit">Every approved deposit</option></select></div>
          <div class="field"><label>Minimum deposit (₹)</label><input type="number" min="0" [(ngModel)]="refMinDeposit"></div></div>
        <div class="fee"><b>3. Holding</b><label class="row sm mt"><input type="checkbox" [(ngModel)]="s.referral.holding.enabled"> Enabled</label>
          <div class="field mt"><label>Commission (%)</label><input type="number" step="0.01" min="0" [(ngModel)]="s.referral.holding.percent"></div>
          <div class="field"><label>Paid</label><select [(ngModel)]="s.referral.holding.payout"><option value="daily">Daily (on principal held that day)</option><option value="month_end">At month end</option></select></div></div>
        <div class="fee"><b>4. Earning</b><label class="row sm mt"><input type="checkbox" [(ngModel)]="s.referral.earning.enabled"> Enabled</label>
          <div class="field mt"><label>Commission (%)</label><input type="number" step="0.01" min="0" [(ngModel)]="s.referral.earning.percent"></div>
          <div class="field"><label>Paid</label><select [(ngModel)]="s.referral.earning.payout"><option value="daily">Daily (on the earning credited that day)</option><option value="month_end">At month end (on the month's total earning)</option></select></div>
          <span class="hint">Commission on what each referred user earns (daily earning + month-end principal return).</span></div></div></section>

    <section class="card"><h3>Contact &amp; WhatsApp</h3>
      <p class="muted sm mb">The phone icon in the website header opens WhatsApp on this number.</p>
      <div class="grid g2"><div class="field"><label>WhatsApp number (digits with country code)</label><input [(ngModel)]="s.contact.whatsapp" inputmode="numeric" placeholder="919876543210"></div>
        <div class="field"><label>Pre-filled message</label><input [(ngModel)]="s.contact.message" maxlength="200"></div>
        <div class="field"><label>Phone shown on site</label><input [(ngModel)]="s.contact.phone"></div><div class="field"><label>Email</label><input [(ngModel)]="s.contact.email"></div></div>
      <div class="field"><label>Address</label><input [(ngModel)]="s.contact.address"></div></section>

    <section class="card legal"><label class="row"><input type="checkbox" [(ngModel)]="legal"> <span class="sm">I confirm legal / regulatory review is complete for daily returns and referral payouts. (Required only when switching earnings or referral payouts on.)</span></label></section>
    <div class="row end"><button type="button" class="btn btn-gold" [disabled]="busy()" (click)="save()">{{busy()?'Saving…':'Save all settings'}}</button></div>
  </div> }`,
  styles: [`.stack{display:grid;gap:16px}.preview{display:flex;gap:10px;align-items:center;background:var(--gold-50);border:1px solid #DDD7C4;border-radius:12px;padding:10px 14px;font-size:.9rem}.fee{border:1px solid var(--border);border-radius:14px;padding:14px}.legal{border-style:dashed}`] })
export class AdminSettingsPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); s: any = null; busy = signal(false);
  minBalance = 0; minW = 0; minD = 0; minPrincipal = 0; refMinDeposit = 0; methods = ''; legal = false; Number = Number;
  ngOnInit() {
    this.api.get<any>('/admin/settings').subscribe({ next: (r) => { this.s = r; this.minBalance = rupees(r.returns.minBalance); this.minW = rupees(r.wallet.minWithdrawal); this.minD = rupees(r.wallet.minDeposit); this.minPrincipal = rupees(r.principalReturn.minPrincipal); this.refMinDeposit = rupees(r.referral.deposit.minAmount); this.methods = (r.wallet.methods || []).join(', '); }, error: (e) => this.toast.err(e) });
  }
  daily() {
    const r = this.s.returns; if (r.inputMode !== 'monthly') return Number(r.dailyPercent || 0).toFixed(4);
    const m = Number(r.monthlyPercent || 0); const now = new Date(); const days = r.daysBasis === 'fixed30' ? 30 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (m / days).toFixed(4);
  }
  fee(f: any) { return f.enabled ? ((1000 * Number(f.percent || 0)) / 100).toFixed(2) : '0.00'; }
  net() { const t = this.s.wallet; return (1000 - Number(this.fee(t.tds)) - Number(this.fee(t.service))).toFixed(2); }
  save() {
    const s = this.s; const mp = Number(s.returns.monthlyPercent); const dp = Number(s.returns.dailyPercent);
    if (isNaN(mp) || mp < 0 || isNaN(dp) || dp < 0) return this.toast.err('Enter a valid percentage');
    if (!/^\d{8,15}$/.test(String(s.contact.whatsapp || '').replace(/\D/g, ''))) return this.toast.err('Enter the WhatsApp number with country code, digits only');
    const body = { principalReturn: { ...s.principalReturn, percent: Number(s.principalReturn.percent), minPrincipal: toP(this.minPrincipal) },
      returns: { ...s.returns, monthlyPercent: mp, dailyPercent: dp, minBalance: toP(this.minBalance), startDate: s.returns.startDate || null, frequency: 'daily' },
      referral: { ...s.referral, percent: Number(s.referral.percent), deposit: { ...s.referral.deposit, percent: Number(s.referral.deposit.percent), minAmount: toP(this.refMinDeposit) }, holding: { ...s.referral.holding, percent: Number(s.referral.holding.percent) }, earning: { ...s.referral.earning, percent: Number(s.referral.earning.percent) } },
      wallet: { ...s.wallet, minWithdrawal: toP(this.minW), minDeposit: toP(this.minD), methods: this.methods.split(',').map((x) => x.trim()).filter(Boolean),
        tds: { ...s.wallet.tds, percent: Number(s.wallet.tds.percent) }, service: { ...s.wallet.service, percent: Number(s.wallet.service.percent) },
        principalLock: { ...s.wallet.principalLock, days: Number(s.wallet.principalLock.days || 0), date: s.wallet.principalLock.date || null } },
      contact: { ...s.contact, whatsapp: String(s.contact.whatsapp).replace(/\D/g, '') }, legalReviewConfirmed: this.legal };
    this.busy.set(true);
    this.api.put<any>('/admin/settings', body).subscribe({ next: (r) => { this.busy.set(false); this.s = r; this.toast.ok('Settings saved'); }, error: (e) => { this.busy.set(false); this.toast.err(e); } });
  }
}

/* ============ DAILY EARNING + MONTH-END ============ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="page-head"><div><h2>Earnings</h2><p class="muted">Daily earning is credited automatically each day; the month-end principal return and holding commissions are credited on the last day of the month. Every run is safe to repeat: nobody is paid twice for the same day or month.</p></div>
    <div class="row wrap"><button type="button" class="btn btn-gold" [disabled]="running()" (click)="run('daily')"><lucide-icon name="rotate-cw" [size]="16"/> {{running()==='daily'?'Running…':'Run daily credit now'}}</button>
      <button type="button" class="btn btn-ghost" [disabled]="running()" (click)="run('month')"><lucide-icon name="rotate-cw" [size]="16"/> {{running()==='month'?'Running…':'Run month-end now'}}</button></div></div>
  @if (result()) { <div class="card flat mb">@if (result().skipped) { Not run: {{result().skipped}}. } @else if (result().month) { Month {{result().month}}: principal return credited to <b>{{result().credited}}</b> user(s), total <b>{{inr(result().total)}}</b>@if (result().principalReturn) { (principal return is disabled) }. Referral commissions created: <b>{{result().referralCommissions ?? result().holdingCommissions}}</b>. }
    @else { Credited <b>{{result().credited ?? 0}}</b> user(s) for {{result().date}}, total <b>{{inr(result().total)}}</b>@if (result().referralCommissions) { , referral commissions: <b>{{result().referralCommissions}}</b> }@if (result().duplicates) { ({{result().duplicates}} already credited) }. }</div> }
  <div class="seg2 mb"><button type="button" [class.on]="tab()==='daily'" (click)="tab.set('daily'); load(1)">Daily earnings</button><button type="button" [class.on]="tab()==='month'" (click)="tab.set('month'); load(1)">Month-end principal returns</button></div>
  @if (loading()) { <app-skeleton [n]="6"/> } @else if (!items().length) { <div class="card"><app-empty title="Nothing credited yet" text="Enable the program in Settings; credits will appear here."/></div> } @else {
  @if (tab()==='daily') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>User</th><th>Basis</th><th>Daily %</th><th>Credited</th></tr></thead><tbody>
    @for (r of items(); track r._id) { <tr><td data-l="Date">{{r.date}}</td><td data-l="User">{{r.user?.name}}<div class="sm muted">{{r.user?.userId}}</div></td><td data-l="Basis">{{inr(r.basis)}}</td><td data-l="Daily %">{{r.ratePercent}}%</td><td data-l="Credited"><b>{{inr(r.amount)}}</b></td></tr> }</tbody></table></div> }
  @else { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Month</th><th>User</th><th>Principal</th><th>%</th><th>Credited</th></tr></thead><tbody>
    @for (r of items(); track r._id) { <tr><td data-l="Month">{{r.month}}</td><td data-l="User">{{r.user?.name}}<div class="sm muted">{{r.user?.userId}}</div></td><td data-l="Principal">{{inr(r.basis)}}</td><td data-l="%">{{r.percent}}%</td><td data-l="Credited"><b>{{inr(r.amount)}}</b></td></tr> }</tbody></table></div> }
  <app-pager [page]="page()" [limit]="10" [total]="total()" (go)="load($event)"/> }`,
  styles: [`.seg2{display:inline-flex;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:4px;gap:4px;flex-wrap:wrap}.seg2 button{border:0;background:none;padding:9px 14px;border-radius:9px;font:700 .85rem var(--font);cursor:pointer;color:var(--muted)}.seg2 button.on{background:var(--ink);color:var(--gold-2)}`] })
export class AdminReturnsPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); confirm = inject(Confirm); inr = inr;
  tab = signal<'daily' | 'month'>('daily'); items = signal<any[]>([]); total = signal(0); page = signal(1); loading = signal(true); running = signal(''); result = signal<any>(null);
  ngOnInit() { this.load(1); }
  load(p: number) { this.loading.set(true); this.page.set(p); this.api.get<any>(this.tab() === 'daily' ? '/admin/returns' : '/admin/monthly-returns', { page: p }).subscribe({ next: (r) => { this.items.set(r.items); this.total.set(r.total); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.err(e); } }); }
  async run(kind: 'daily' | 'month') {
    const q = kind === 'daily' ? "Run today's daily credit?" : 'Run the month-end credit now?';
    if (!(await this.confirm.ask(q, 'Users already credited for this day/month are skipped, so this cannot double-pay.'))) return;
    this.running.set(kind);
    this.api.post<any>(kind === 'daily' ? '/admin/returns/run' : '/admin/returns/run-month-end').subscribe({ next: (r) => { this.running.set(''); this.result.set(r); this.toast.ok('Run complete'); this.load(1); }, error: (e) => { this.running.set(''); this.toast.err(e); } });
  }
}

/* ============ REPORTS ============ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="page-head"><div><h2>Reports</h2><p class="muted">Download CSV exports.</p></div></div>
  <div class="grid g3">@for (r of reports; track r.kind) { <div class="card"><div class="ic"><lucide-icon name="file-text" [size]="20"/></div><h3 class="mt">{{r.title}}</h3><p class="sm muted mb">{{r.text}}</p>
    <button type="button" class="btn btn-ghost btn-sm" [disabled]="busy()===r.kind" (click)="export(r)"><lucide-icon name="download" [size]="14"/> {{busy()===r.kind?'Preparing…':'Download CSV'}}</button></div> }</div>`,
  styles: [`.ic{width:42px;height:42px;border-radius:12px;background:var(--ink);color:var(--gold-2);display:grid;place-items:center}`] })
export class AdminReportsPage {
  api = inject(Api); toast = inject(ToastService); busy = signal('');
  reports = [
    { kind: 'bookings', title: 'Bookings', text: 'All bookings with status and voice-note flag.', server: true },
    { kind: 'transactions', title: 'Wallet transactions', text: 'Full ledger of credits and debits.', cols: ['createdAt', 'reference', 'user.userId', 'type', 'direction', 'amount', 'balanceAfter', 'note'] },
    { kind: 'deposits', title: 'Deposits', text: 'Deposit requests and decisions.', cols: ['createdAt', 'user.userId', 'amount', 'method', 'txnRef', 'status', 'remarks'] },
    { kind: 'withdrawals', title: 'Withdrawals', text: 'Withdrawals with fee breakdown.', cols: ['createdAt', 'user.userId', 'amount', 'tds', 'serviceCharge', 'net', 'fromEarned', 'fromPrincipal', 'status'] },
    { kind: 'returns', title: 'Daily earnings', text: 'Daily credits per user.', cols: ['date', 'user.userId', 'basis', 'monthlyPercent', 'ratePercent', 'amount'] },
    { kind: 'audit-logs', title: 'Audit log', text: 'Admin actions including wallet adjustments.', cols: ['createdAt', 'actor.name', 'action', 'target', 'reason'] }] as any[];
  get = (o: any, p: string) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  async export(r: any) {
    this.busy.set(r.kind);
    try {
      if (r.server) { const b = await new Promise<Blob>((ok, no) => this.api.blob('/admin/bookings/export').subscribe({ next: ok, error: no })); dl(b, 'bookings.csv'); return; }
      const rows: any[] = []; for (let p = 1; p <= 50; p++) { const res: any = await new Promise((ok, no) => this.api.get<any>('/admin/' + r.kind, { page: p, limit: 100 }).subscribe({ next: ok, error: no })); rows.push(...res.items); if (rows.length >= res.total) break; }
      const e = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const money = ['amount', 'balanceAfter', 'tds', 'serviceCharge', 'net', 'fromEarned', 'fromPrincipal', 'basis'];
      const csv = [r.cols.join(','), ...rows.map((x) => r.cols.map((c: string) => e(money.includes(c) && typeof this.get(x, c) === 'number' ? (this.get(x, c) / 100).toFixed(2) : this.get(x, c))).join(','))].join('\n');
      dl(new Blob([csv], { type: 'text/csv' }), r.kind + '.csv');
    } catch (e) { this.toast.err(e); } finally { this.busy.set(''); }
  }
}

/* ============ GENERIC LIST (deposits, withdrawals, transfers, banks, commissions, transactions, audit, notifications) ============ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="page-head"><div><h2 style="text-transform:capitalize">{{title()}}</h2></div></div>
  @if (kind() !== 'notifications') { <div class="card flat mb"><div class="row wrap">
    <input class="grow" style="min-width:180px" [(ngModel)]="search" (keyup.enter)="load(1)" placeholder="Search…">
    @if (hasStatus()) { <select [(ngModel)]="status" (change)="load(1)"><option value="">All statuses</option>@for (s of statuses(); track s) {<option [value]="s">{{s}}</option>}</select> }
    <button type="button" class="btn btn-primary btn-sm" (click)="load(1)">Search</button></div></div> }
  @if (loading()) { <app-skeleton [n]="6"/> } @else if (!items().length) { <div class="card"><app-empty title="Nothing here yet"/></div> } @else {
  @switch (kind()) {
    @case ('deposits') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Method</th><th>Reference</th><th>Proof</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      @for (d of items(); track d._id) { <tr><td data-l="Date">{{d.createdAt | date:'d MMM, h:mm a'}}</td><td data-l="User">{{d.user?.name}}<div class="sm muted">{{d.user?.userId}}</div></td><td data-l="Amount"><b>{{inr(d.amount)}}</b></td><td data-l="Method">{{d.method}}</td><td data-l="Reference">{{d.txnRef}}</td>
        <td data-l="Proof">@if (d.proof) { <a [href]="file(d.proof)" target="_blank" rel="noopener">View</a> } @else { — }</td><td data-l="Status"><app-badge [v]="d.status"/></td>
        <td data-l="Actions">@if (d.status==='pending') { <div class="row wrap" style="gap:6px"><button type="button" class="btn btn-ok btn-sm" (click)="decide(d,'approved')">Approve</button><button type="button" class="btn btn-danger btn-sm" (click)="decide(d,'rejected')">Reject</button></div> } @else { <span class="sm muted">{{d.remarks}}</span> }</td></tr> }</tbody></table></div> }
    @case ('withdrawals') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Fees</th><th>Net payable</th><th>Source</th><th>Bank</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      @for (w of items(); track w._id) { <tr><td data-l="Date">{{w.createdAt | date:'d MMM, h:mm a'}}</td><td data-l="User">{{w.user?.name}}<div class="sm muted">{{w.user?.userId}}</div></td><td data-l="Amount"><b>{{inr(w.amount)}}</b></td>
        <td data-l="Fees"><div class="sm">{{w.tdsLabel||'TDS'}} ({{w.tdsPercent||0}}%): {{inr(w.tds)}}</div><div class="sm">{{w.serviceLabel||'Service'}} ({{w.servicePercent||0}}%): {{inr(w.serviceCharge)}}</div></td>
        <td data-l="Net payable"><b>{{inr(w.net)}}</b></td><td data-l="Source"><div class="sm">Earned {{inr(w.fromEarned)}}</div><div class="sm">Principal {{inr(w.fromPrincipal)}}</div></td>
        <td data-l="Bank">{{w.bank?.bankName}}<div class="sm muted">{{w.bank?.holderName}} · {{w.bank?.ifsc}} · •••• {{w.bank?.last4}}</div>@if (w.bank?._id) { <button type="button" class="btn btn-ghost btn-sm" (click)="reveal(w.bank._id)">Show account no.</button> }</td>
        <td data-l="Status"><app-badge [v]="w.status"/></td>
        <td data-l="Actions"><div class="row wrap" style="gap:6px">
          @if (w.status==='pending') { <button type="button" class="btn btn-ok btn-sm" (click)="wd(w,'approved')">Approve</button> }
          @if (w.status==='pending' || w.status==='approved') { <button type="button" class="btn btn-ghost btn-sm" (click)="wd(w,'processing')">Processing</button> }
          @if (w.status==='approved' || w.status==='processing') { <button type="button" class="btn btn-ok btn-sm" (click)="wd(w,'completed')">Mark paid</button> }
          @if (w.status==='pending' || w.status==='approved' || w.status==='processing') { <button type="button" class="btn btn-danger btn-sm" (click)="wd(w,'rejected')">Reject</button> }</div></td></tr> }</tbody></table></div> }
    @case ('transfers') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>Reference</th><th>From</th><th>To</th><th>Source</th><th>Amount</th><th>Note</th></tr></thead><tbody>
      @for (t of items(); track t._id) { <tr><td data-l="Date">{{t.createdAt | date:'d MMM, h:mm a'}}</td><td data-l="Reference" class="mono">{{t.reference}}</td><td data-l="From">{{t.from?.name}}<div class="sm muted">{{t.from?.userId}}</div></td><td data-l="To">{{t.to?.name}}<div class="sm muted">{{t.to?.userId}}</div></td><td data-l="Source" style="text-transform:capitalize">{{t.source || 'principal'}}@if (t.lockUntil) { <div class="sm muted">locked until {{t.lockUntil | date:'d MMM yyyy'}}</div> }</td><td data-l="Amount"><b>{{inr(t.amount)}}</b></td><td data-l="Note">{{t.note}}</td></tr> }</tbody></table></div> }
    @case ('banks') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>User</th><th>Holder</th><th>Bank</th><th>Account</th><th>IFSC</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      @for (b of items(); track b._id) { <tr><td data-l="User">{{b.user?.name}}<div class="sm muted">{{b.user?.userId}}</div></td><td data-l="Holder">{{b.holderName}}</td><td data-l="Bank">{{b.bankName}}</td><td data-l="Account" class="mono">{{b.masked}}</td><td data-l="IFSC">{{b.ifsc}}</td><td data-l="Status"><app-badge [v]="b.status"/></td>
        <td data-l="Actions"><div class="row wrap" style="gap:6px">@if (b.status==='pending') { <button type="button" class="btn btn-ok btn-sm" (click)="bank(b,'verified')">Verify</button><button type="button" class="btn btn-danger btn-sm" (click)="bank(b,'rejected')">Reject</button> }
          <button type="button" class="btn btn-ghost btn-sm" (click)="reveal(b._id)">Show account no.</button></div></td></tr> }</tbody></table></div> }
    @case ('commissions') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>Referrer</th><th>Referred</th><th>Type</th><th>Basis</th><th>%</th><th>Commission</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      @for (c of items(); track c._id) { <tr><td data-l="Date">{{c.createdAt | date:'d MMM yyyy'}}</td><td data-l="Referrer">{{c.referrer?.name}}</td><td data-l="Referred">{{c.referred?.name}}</td><td data-l="Type" style="text-transform:capitalize">{{c.kind || 'booking'}}</td><td data-l="Basis">{{inr(c.basis)}}</td><td data-l="%">{{c.percent}}%</td><td data-l="Commission"><b>{{inr(c.amount)}}</b></td><td data-l="Status"><app-badge [v]="c.status"/></td>
        <td data-l="Actions">@if (c.status==='pending') { <div class="row wrap" style="gap:6px"><button type="button" class="btn btn-ok btn-sm" (click)="comm(c,'approved')">Approve</button><button type="button" class="btn btn-danger btn-sm" (click)="comm(c,'rejected')">Reject</button></div> }</td></tr> }</tbody></table></div> }
    @case ('transactions') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>Reference</th><th>User</th><th>Type</th><th>Amount</th><th>Principal Δ</th><th>Earned Δ</th><th>Balance after</th><th>Note</th></tr></thead><tbody>
      @for (t of items(); track t._id) { <tr><td data-l="Date">{{t.createdAt | date:'d MMM, h:mm a'}}</td><td data-l="Reference" class="mono">{{t.reference}}</td><td data-l="User">{{t.user?.name}}<div class="sm muted">{{t.user?.userId}}</div></td><td data-l="Type" style="text-transform:capitalize">{{t.type.replace('_',' ')}}</td>
        <td data-l="Amount"><b [style.color]="t.direction==='credit'?'var(--success)':'var(--danger)'">{{t.direction==='credit'?'+':'−'}}{{inr(t.amount)}}</b></td><td data-l="Principal Δ">{{inr(t.principalDelta)}}</td><td data-l="Earned Δ">{{inr(t.earnedDelta)}}</td><td data-l="Balance after">{{inr(t.balanceAfter)}}</td><td data-l="Note">{{t.note}}</td></tr> }</tbody></table></div> }
    @case ('audit-logs') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>Admin</th><th>Action</th><th>Target</th><th>Reason</th><th>IP</th></tr></thead><tbody>
      @for (a of items(); track a._id) { <tr><td data-l="Date">{{a.createdAt | date:'d MMM, h:mm a'}}</td><td data-l="Admin">{{a.actor?.name}}</td><td data-l="Action"><b>{{a.action}}</b></td><td data-l="Target">{{a.target}}</td><td data-l="Reason">{{a.reason}}</td><td data-l="IP">{{a.ip}}</td></tr> }</tbody></table></div> }
    @case ('notifications') { <div class="card" style="padding:6px 18px">@for (n of items(); track n._id) { <div class="row between li"><div><div class="strong">{{n.title}}</div><div class="sm muted">{{n.body}}</div></div><div class="sm muted">{{n.createdAt | date:'d MMM, h:mm a'}}</div></div> }</div> }
    @default { <div class="card"><app-empty title="Unknown section"/></div> }
  }
  @if (kind() !== 'notifications') { <app-pager [page]="page()" [limit]="10" [total]="total()" (go)="load($event)"/> } }

  <app-modal [open]="!!acct()" title="Bank account details" (close)="acct.set(null)">@if (acct(); as a) {
    <p class="sm muted mb">Full account numbers are shown only to pay a withdrawal. This view is recorded in the audit log.</p>
    <dl class="dl"><dt>Holder</dt><dd>{{a.holderName}}</dd><dt>Bank</dt><dd>{{a.bankName}}</dd><dt>Account no.</dt><dd class="mono">{{a.accountNumber}}</dd><dt>IFSC</dt><dd>{{a.ifsc}}</dd><dt>Type</dt><dd>{{a.type}}</dd></dl>
    <button type="button" class="btn btn-ghost btn-block mt" (click)="copyAcct(a.accountNumber)">Copy account number</button> }</app-modal>
  <app-modal [open]="!!note()" [title]="note()?.title || ''" (close)="note.set(null)">@if (note(); as n) {
    <p class="muted sm mb">{{n.text}}</p><div class="field"><label>Remarks {{n.required?'(required)':'(optional)'}}</label><textarea [(ngModel)]="remarks" style="min-height:70px"></textarea></div>
    <div class="row end"><button type="button" class="btn btn-ghost" (click)="note.set(null)">Cancel</button><button type="button" class="btn" [class.btn-danger]="n.danger" [class.btn-primary]="!n.danger" (click)="n.go()">Confirm</button></div> }</app-modal>`,
  styles: [`.li{padding:12px 0;border-bottom:1px solid var(--border);gap:12px}.li:last-child{border:0}`] })
export class AdminListPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); route = inject(ActivatedRoute); inr = inr;
  kind = signal(''); items = signal<any[]>([]); total = signal(0); page = signal(1); loading = signal(true); search = ''; status = '';
  acct = signal<any>(null); note = signal<any>(null); remarks = '';
  private STATUSES: Record<string, string[]> = { deposits: ['pending', 'approved', 'rejected'], withdrawals: ['pending', 'approved', 'processing', 'completed', 'rejected'], banks: ['pending', 'verified', 'rejected'], commissions: ['pending', 'approved', 'rejected'] };
  statuses = () => this.STATUSES[this.kind()] || []; hasStatus = () => !!this.STATUSES[this.kind()];
  title = () => ({ 'audit-logs': 'audit log', commissions: 'referral commissions', deposits: 'deposit requests', withdrawals: 'withdrawal requests', transfers: 'fund transfers', banks: 'bank accounts' } as any)[this.kind()] || this.kind();
  file = fileUrl;
  ngOnInit() { this.route.paramMap.subscribe((pm) => { this.kind.set(pm.get('kind') || ''); this.search = ''; this.status = ''; this.items.set([]); this.load(1); }); }
  load(p: number) {
    const k = this.kind(); this.loading.set(true); this.page.set(p);
    this.api.get<any>(k === 'notifications' ? '/admin/notifications' : '/admin/' + k, { search: this.search, status: this.status, page: p }).subscribe({
      next: (r) => { const arr = Array.isArray(r) ? r : r.items; this.items.set(arr || []); this.total.set(Array.isArray(r) ? arr.length : r.total); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.items.set([]); this.toast.err(e); } });
  }
  private ask(title: string, text: string, required: boolean, danger: boolean, run: (remarks: string) => void) {
    this.remarks = ''; this.note.set({ title, text, required, danger, go: () => { if (required && this.remarks.trim().length < 3) return this.toast.err('Please add a remark'); const r = this.remarks.trim(); this.note.set(null); run(r); } });
  }
  private patch(url: string, body: any, msg: string) { this.api.patch(url, body).subscribe({ next: () => { this.toast.ok(msg); this.load(this.page()); }, error: (e) => this.toast.err(e) }); }
  decide(d: any, status: string) { this.ask(status === 'approved' ? 'Approve deposit' : 'Reject deposit', `${inr(d.amount)} from ${d.user?.name}. ${status === 'approved' ? 'This credits their principal balance.' : ''}`, status === 'rejected', status === 'rejected', (r) => this.patch(`/admin/deposits/${d._id}`, { status, remarks: r || undefined }, 'Deposit ' + status)); }
  wd(w: any, status: string) { this.ask('Withdrawal: ' + status, `${inr(w.amount)} (net ${inr(w.net)}) for ${w.user?.name}. ${status === 'rejected' ? 'The full amount is refunded to the original balances.' : ''}`, status === 'rejected', status === 'rejected', (r) => this.patch(`/admin/withdrawals/${w._id}`, { status, remarks: r || undefined }, 'Withdrawal ' + status)); }
  bank(b: any, status: string) { this.ask(status === 'verified' ? 'Verify bank account' : 'Reject bank account', `${b.bankName} ${b.masked}`, status === 'rejected', status === 'rejected', (r) => this.patch(`/admin/banks/${b._id}`, { status, remarks: r || undefined }, 'Bank account ' + status)); }
  comm(c: any, status: string) { this.ask(status === 'approved' ? 'Approve commission' : 'Reject commission', `${inr(c.amount)} for ${c.referrer?.name}`, false, status === 'rejected', () => this.patch(`/admin/commissions/${c._id}`, { status }, 'Commission ' + status)); }
  reveal(id: string) { this.api.get<any>(`/admin/banks/${id}/reveal`).subscribe({ next: (r) => this.acct.set(r), error: (e) => this.toast.err(e) }); }
  async copyAcct(t: string) { try { await navigator.clipboard.writeText(t); this.toast.ok('Copied'); } catch { this.toast.err('Could not copy'); } }
}
