import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Api, Auth, ToastService, inr, copyText, fileUrl } from '../../core/core';
import { Confirm } from '../../shared/ui';
import { COMMON, showErr } from '../../shared/common';

/* ============================ BANKS ============================ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="container pg">
    <div class="page-head"><div><h2>Bank accounts</h2><p class="muted">Add an account to receive withdrawals. Accounts are verified by our team before use.</p></div>
      <button type="button" class="btn btn-gold" (click)="add.set(true)"><lucide-icon name="plus" [size]="16"/> Add bank account</button></div>
    @if (loading()) { <app-skeleton [n]="2" [h]="140"/> }
    @else if (!list().length) { <div class="card"><app-empty title="No bank accounts" text="Add your first account to enable withdrawals."/></div> }
    @else { <div class="grid g3">@for (b of list(); track b._id) {
      <div class="card bank"><div class="row between"><div class="ic"><lucide-icon name="landmark" [size]="20"/></div><app-badge [v]="b.status"/></div>
        <div class="acc">{{b.masked}}</div><div class="strong">{{b.bankName}}</div><div class="sm muted">{{b.holderName}} · {{b.ifsc}} · {{b.type}}</div>
        @if (b.status === 'rejected' && b.rejectReason) { <div class="sm" style="color:var(--danger);margin-top:6px">Reason: {{b.rejectReason}}</div> }
        <div class="row mt wrap">@if (b.isDefault) { <span class="badge b-active">Default</span> } @else if (b.status === 'verified') { <button type="button" class="btn btn-ghost btn-sm" (click)="makeDefault(b)">Make default</button> }
          <button type="button" class="btn btn-danger btn-sm" (click)="remove(b)">Remove</button></div></div> }</div> }
  </div>
  <app-modal [open]="add()" [drawer]="true" title="Add bank account" (close)="add.set(false)">
    <form [formGroup]="f" (ngSubmit)="save()" novalidate>
      @if (serverErr()) { <div class="alert-err mb">{{serverErr()}}</div> }
      <div class="field" [class.err]="e('holderName')"><label>Account holder name</label><input formControlName="holderName" autocomplete="off"><span class="err-t">{{e('holderName')?'Enter the name as on the account':''}}</span></div>
      <div class="field" [class.err]="e('bankName')"><label>Bank name</label><input formControlName="bankName" autocomplete="off"><span class="err-t">{{e('bankName')?'Enter bank name':''}}</span></div>
      <div class="grid g2"><div class="field" [class.err]="e('accountNumber')"><label>Account number</label><input formControlName="accountNumber" inputmode="numeric" autocomplete="off"><span class="err-t">{{e('accountNumber')?'9–18 digits, numbers only':''}}</span></div>
        <div class="field" [class.err]="e('ifsc')"><label>IFSC code</label><input formControlName="ifsc" style="text-transform:uppercase" maxlength="11" autocomplete="off"><span class="err-t">{{e('ifsc')?'Format: ABCD0123456':''}}</span></div></div>
      <div class="field"><label>Account type</label><select formControlName="type"><option value="savings">Savings</option><option value="current">Current</option></select></div>
      <label class="row sm" style="margin-bottom:14px"><input type="checkbox" formControlName="isDefault"> Set as default</label>
      <button class="btn btn-primary btn-block" [disabled]="busy()">{{busy() ? 'Saving…' : 'Submit for verification'}}</button></form></app-modal>`,
  styles: [`.bank{display:grid;gap:6px}.ic{width:42px;height:42px;border-radius:12px;background:var(--ink);color:var(--gold-2);display:grid;place-items:center}.acc{font-size:1.25rem;font-weight:800;letter-spacing:.12em;color:var(--ink);margin:12px 0 4px}
  .alert-err{background:#fdecec;color:#8a1f1f;border:1px solid #f3c2c2;border-radius:10px;padding:10px 12px;font-size:.88rem;font-weight:600}`] })
export class BanksPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); fb = inject(FormBuilder); confirm = inject(Confirm);
  list = signal<any[]>([]); loading = signal(true); add = signal(false); busy = signal(false); serverErr = signal('');
  f = this.fb.nonNullable.group({ holderName: ['', [Validators.required, Validators.minLength(2)]], bankName: ['', [Validators.required, Validators.minLength(2)]], accountNumber: ['', [Validators.required, Validators.pattern(/^\d{9,18}$/)]],
    ifsc: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/)]], type: ['savings'], isDefault: [false] });
  e = (n: string) => showErr(this.f.get(n));
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/banks').subscribe({ next: (r) => { this.list.set(r); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.err(e); } }); }
  save() {
    this.f.markAllAsTouched(); this.serverErr.set(''); if (this.f.invalid) return;
    const v = this.f.getRawValue(); const body = { ...v, accountNumber: v.accountNumber.replace(/\s/g, ''), ifsc: v.ifsc.trim().toUpperCase(), holderName: v.holderName.trim(), bankName: v.bankName.trim() };
    this.busy.set(true);
    this.api.post('/banks', body).subscribe({
      next: () => { this.busy.set(false); this.add.set(false); this.f.reset({ holderName: '', bankName: '', accountNumber: '', ifsc: '', type: 'savings', isDefault: false }); this.toast.ok('Bank account submitted for verification'); this.load(); },
      error: (e) => { this.busy.set(false); this.serverErr.set(e?.error?.message || (e?.status === 0 ? 'Cannot reach the server' : 'Could not save the bank account')); this.toast.err(e); } });
  }
  makeDefault(b: any) { this.api.patch(`/banks/${b._id}/default`).subscribe({ next: () => this.load(), error: (e) => this.toast.err(e) }); }
  async remove(b: any) { if (!(await this.confirm.ask('Remove this bank account?', `${b.bankName} ${b.masked}`, true))) return; this.api.del(`/banks/${b._id}`).subscribe({ next: () => { this.toast.ok('Removed'); this.load(); }, error: (e) => this.toast.err(e) }); }
}

/* ============================ REFERRALS ============================ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="container pg"><div class="page-head"><div><h2>Referrals</h2><p class="muted">Invite friends to Kings Lioness.</p></div></div>
  @if (!d()) { <app-skeleton [n]="3" [h]="100"/> } @else {
  @if (!d().program.enabled) { <div class="note mb">The referral rewards program is currently inactive. You can still share your link; rewards apply only while the program is active and are subject to the program terms.</div> }
  <div class="card share"><div class="grow"><div class="sm muted">Your referral link</div><div class="link">{{link()}}</div><div class="row sm mt"><span class="muted">Code</span><b class="code">{{d().code}}</b></div></div>
    <div class="row wrap"><button type="button" class="btn btn-gold" (click)="copy(link())"><lucide-icon name="copy" [size]="16"/> Copy link</button><button type="button" class="btn btn-ghost" (click)="share()"><lucide-icon name="share-2" [size]="16"/> Share</button></div></div>
  <div class="grid g3 mt"><app-stat icon="users" label="Direct referrals" [value]="d().total"/><app-stat icon="clock" label="Eligible (pending)" [value]="inr(d().eligible)"/><app-stat icon="gift" [gold]="true" label="Total referral earnings" [value]="inr(d().earned)"/></div>
<div class="card mt"><h3 class="mb">How you earn</h3><div style="display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))">
    <div class="rule"><b>Booking</b><span>@if (d().program.enabled && d().program.bookingEnabled !== false) { {{d().program.percent}}% on {{d().program.eligibleActivity==='first_completed_booking'?"a referred user's first completed booking":'each completed booking'}} } @else { Not active }</span><em>Earned: {{inr(d().breakdown.booking)}}</em></div>
    <div class="rule"><b>Deposit</b><span>@if (d().program.enabled && d().program.deposit?.enabled) { {{d().program.deposit.percent}}% of {{d().program.deposit.eligible==='first_deposit'?"a referred user's first approved deposit":'every approved deposit'}}@if (d().program.deposit.minAmount) { (min {{inr(d().program.deposit.minAmount)}}) } } @else { Not active }</span><em>Earned: {{inr(d().breakdown.deposit)}}</em></div>
    <div class="rule"><b>Holding</b><span>@if (d().program.enabled && d().program.holding?.enabled) { {{d().program.holding.percent}}% of each referred user's principal, {{d().program.holding.payout==='daily'?'every day':'at month end'}} } @else { Not active }</span><em>Earned: {{inr(d().breakdown.holding)}}</em></div>
    <div class="rule"><b>Earnings</b><span>@if (d().program.enabled && d().program.earning?.enabled) { {{d().program.earning.percent}}% of what your referred users earn, {{d().program.earning.payout==='daily'?'credited every day':'credited at month end'}} } @else { Not active }</span><em>Earned: {{inr(d().breakdown.earning)}}</em></div></div>
    <p class="sm muted mt">Commissions are credited to your earned income after approval. Self-referrals and duplicate commissions are not eligible.</p></div>
  <div class="card mt"><h3 class="mb">Referred users</h3>@if (!d().list.length) { <app-empty title="No referrals yet" text="Share your link to get started."/> } @else {
    <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>User</th><th>User ID</th><th>Registered</th><th>Status</th><th>Commission</th><th>Commission status</th></tr></thead><tbody>
    @for (r of d().list; track r.userId) { <tr><td data-l="User">{{r.name}}</td><td data-l="User ID">{{r.userId}}</td><td data-l="Registered">{{r.joined | date:'mediumDate'}}</td><td data-l="Status"><app-badge [v]="r.status==='active'?'active':'pending'"/></td><td data-l="Commission">{{inr(r.commission)}}</td><td data-l="Commission status">{{r.commissionStatus}}</td></tr> }</tbody></table></div> }</div> }</div>`,
  styles: [`.rule{border:1px solid var(--border);border-radius:14px;padding:14px;display:grid;gap:6px;background:var(--gold-50)}.rule span{font-size:.88rem;color:var(--muted)}.rule em{font-style:normal;font-weight:700;color:var(--gold-deep);font-size:.88rem}.share{display:flex;gap:20px;justify-content:space-between;align-items:center;flex-wrap:wrap;background:linear-gradient(120deg,#fff,var(--gold-50))}.link{font-weight:700;color:var(--ink);word-break:break-all}
  .code{background:var(--ink);color:var(--gold-2);padding:4px 10px;border-radius:8px;letter-spacing:.1em}.note{background:var(--gold-50);border:1px solid #DDD7C4;border-radius:12px;padding:12px 14px;font-size:.88rem;color:#8A6410}`] })
export class ReferralsPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); inr = inr; d = signal<any>(null);
  ngOnInit() { this.api.get('/referrals').subscribe({ next: (r) => this.d.set(r), error: (e) => this.toast.err(e) }); }
  link = () => `${location.origin}/register?ref=${this.d()?.code}`;
  async copy(t: string) { (await copyText(t)) ? this.toast.ok('Link copied') : this.toast.err('Could not copy'); }
  share() { const u = this.link(); if ((navigator as any).share) (navigator as any).share({ title: 'Join Kings Lioness', text: 'Book trusted services on Kings Lioness', url: u }).catch(() => {}); else this.copy(u); }
}

/* ============================ PROFILE ============================ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="container pg"><div class="page-head"><h2>Profile</h2></div>@if (me(); as m) {
  <div class="grid pgrid"><div class="card c"><div class="avl">@if (m.avatar) {<img [src]="url(m.avatar)" alt="">} @else {<span>{{m.name[0]}}</span>}</div><h3>{{m.name}}</h3><div class="muted sm">&#64;{{m.username}}</div><app-badge [v]="m.status"/>
      <label class="btn btn-ghost btn-sm mt">Change photo<input type="file" hidden accept="image/png,image/jpeg,image/webp" (change)="avatar($event)"></label>
      <div class="col mt"><button type="button" class="btn btn-primary btn-block" (click)="edit.set(true)">Edit profile</button><button type="button" class="btn btn-ghost btn-block" (click)="pw.set(true)">Change password</button><a routerLink="/banks" class="btn btn-ghost btn-block">Manage bank accounts</a><button type="button" class="btn btn-danger btn-block" (click)="auth.logout()">Logout</button></div></div>
    <div class="card"><h3 class="mb">Account details</h3><dl class="dl"><dt>User ID</dt><dd>{{m.userId}}</dd><dt>Email</dt><dd>{{m.email}}</dd><dt>Mobile</dt><dd>{{m.mobile}}</dd>
      <dt>Address</dt><dd>{{m.address || '—'}}</dd><dt>City</dt><dd>{{m.city || '—'}}</dd><dt>State</dt><dd>{{m.state || '—'}}</dd><dt>PIN code</dt><dd>{{m.pin || '—'}}</dd><dt>Registered</dt><dd>{{m.createdAt | date:'mediumDate'}}</dd><dt>Referral code</dt><dd>{{m.referralCode}}</dd></dl></div></div> }
  <app-modal [open]="edit()" title="Edit profile" (close)="edit.set(false)"><form [formGroup]="ef" (ngSubmit)="saveP()" novalidate>
    <div class="field" [class.err]="e(ef,'name')"><label>Full name</label><input formControlName="name"></div><div class="field" [class.err]="e(ef,'mobile')"><label>Mobile</label><input formControlName="mobile" maxlength="10" inputmode="numeric"></div>
    <div class="field"><label>Address</label><textarea formControlName="address" style="min-height:64px"></textarea></div>
    <div class="grid g3"><div class="field"><label>City</label><input formControlName="city"></div><div class="field"><label>State</label><input formControlName="state"></div><div class="field" [class.err]="e(ef,'pin')"><label>PIN</label><input formControlName="pin" maxlength="6" inputmode="numeric"></div></div>
    <button class="btn btn-primary btn-block">Save changes</button></form></app-modal>
  <app-modal [open]="pw()" title="Change password" (close)="pw.set(false)"><form [formGroup]="pf" (ngSubmit)="savePw()" novalidate>
    <div class="field" [class.err]="e(pf,'current')"><label>Current password</label><input type="password" formControlName="current" autocomplete="current-password"></div>
    <div class="field" [class.err]="e(pf,'next')"><label>New password</label><input type="password" formControlName="next" autocomplete="new-password"><span class="hint">Min 8 characters with a letter and a number</span></div>
    <button class="btn btn-primary btn-block">Update password</button></form></app-modal></div>`,
  styles: [`.pgrid{grid-template-columns:320px 1fr;align-items:start}@media(max-width:860px){.pgrid{grid-template-columns:1fr}}.c{text-align:center;display:grid;justify-items:center;gap:6px}.col{display:grid;gap:8px;width:100%}
  .avl{width:96px;height:96px;border-radius:50%;background:var(--ink);color:var(--gold-2);display:grid;place-items:center;font:800 2.2rem var(--font);overflow:hidden;box-shadow:0 0 0 5px var(--gold-50)}.avl img{width:100%;height:100%;object-fit:cover}`] })
export class ProfilePage implements OnInit {
  auth = inject(Auth); api = inject(Api); toast = inject(ToastService); fb = inject(FormBuilder); me = this.auth.me; edit = signal(false); pw = signal(false); url = fileUrl; e = (f: any, n: string) => showErr(f.get(n));
  ef = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.minLength(2)]], mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]], address: [''], city: [''], state: [''], pin: ['', Validators.pattern(/^(\d{6})?$/)] });
  pf = this.fb.nonNullable.group({ current: ['', Validators.required], next: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)]] });
  ngOnInit() { this.ef.patchValue(this.me() as any); this.auth.refresh().subscribe({ next: () => this.ef.patchValue(this.me() as any), error: () => {} }); }
  saveP() { this.ef.markAllAsTouched(); if (this.ef.invalid) return; this.api.put('/auth/me', this.ef.getRawValue()).subscribe({ next: () => { this.auth.refresh().subscribe(); this.edit.set(false); this.toast.ok('Profile updated'); }, error: (x) => this.toast.err(x) }); }
  savePw() { this.pf.markAllAsTouched(); if (this.pf.invalid) return; this.api.post('/auth/change-password', this.pf.getRawValue()).subscribe({ next: () => { this.pw.set(false); this.pf.reset(); this.toast.ok('Password changed'); }, error: (x) => this.toast.err(x) }); }
  avatar(ev: Event) { const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return; const fd = new FormData(); fd.append('avatar', f); this.api.post('/profile/avatar', fd).subscribe({ next: () => { this.auth.refresh().subscribe(); this.toast.ok('Photo updated'); }, error: (x) => this.toast.err(x) }); }
}

/* ============================ NOTIFICATIONS ============================ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="container pg"><div class="page-head"><h2>Notifications</h2><button type="button" class="btn btn-ghost btn-sm" (click)="readAll()">Mark all read</button></div>
  @if (loading()) { <app-skeleton [n]="4"/> } @else if (!items().length) { <div class="card"><app-empty title="You're all caught up" text="Booking and wallet updates will appear here."/></div> }
  @else { <div class="card" style="padding:6px 18px">@for (n of items(); track n._id) { <div class="n" [class.un]="!n.read"><div class="dot"></div><div class="grow"><div class="strong">{{n.title}}</div><div class="sm muted">{{n.body}}</div></div><div class="sm muted">{{n.createdAt | date:'d MMM, h:mm a'}}</div></div> }</div> }</div>`,
  styles: [`.n{display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--border)}.n:last-child{border:0}.dot{width:9px;height:9px;border-radius:50%;background:transparent;flex:none}.un .dot{background:var(--gold)}`] })
export class NotificationsPage implements OnInit {
  api = inject(Api); items = signal<any[]>([]); loading = signal(true);
  ngOnInit() { this.api.get<any[]>('/notifications').subscribe({ next: (r) => { this.items.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  readAll() { this.api.post('/notifications/read-all').subscribe(() => this.items.update((a) => a.map((n) => ({ ...n, read: true })))); }
}
