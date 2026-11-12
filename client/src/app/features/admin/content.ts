import { Component, inject, signal, OnInit } from '@angular/core';
import { Api, ToastService, fileUrl } from '../../core/core';
import { Confirm } from '../../shared/ui';
import { COMMON } from '../../shared/common';

/* ============ PAYMENT DETAILS (bank + UPI that users deposit into) ============ */
const blankPay = () => ({ _id: '', type: 'bank', label: '', holderName: '', bankName: '', accountNumber: '', ifsc: '', branch: '', accountType: 'current', upiId: '', note: '', active: true, qrImage: '', removeQr: false });

@Component({ standalone: true, imports: COMMON, template: `
  <div class="page-head"><div><h2>Payment details</h2><p class="muted">Bank accounts and UPI IDs shown to users on the deposit form. Users pay into one of these, then send a deposit request with the transaction ID.</p></div>
    <button type="button" class="btn btn-gold" (click)="openForm(null)"><lucide-icon name="plus" [size]="16"/> Add payment account</button></div>
  @if (loading()) { <app-skeleton [n]="2" [h]="150"/> }
  @else if (!items().length) { <div class="card"><app-empty title="No payment accounts yet" text="Add a bank account or UPI ID. Until you do, users cannot submit deposit requests."/></div> }
  @else { <div class="grid g2">@for (a of items(); track a._id) {
    <div class="card pay" [class.off]="!a.active">
      <div class="row between"><div class="ic"><lucide-icon [name]="a.type === 'upi' ? 'smartphone' : 'landmark'" [size]="20"/></div><div class="row"><span class="badge">{{a.type === 'upi' ? 'UPI' : 'Bank'}}</span><app-badge [v]="a.active ? 'active' : 'suspended'"/></div></div>
      <h3>{{a.label || (a.type === 'upi' ? a.upiId : a.bankName)}}</h3>
      @if (a.type === 'upi') { <dl class="dl"><dt>UPI ID</dt><dd class="mono">{{a.upiId}}</dd>@if (a.holderName) { <dt>Name</dt><dd>{{a.holderName}}</dd> }</dl> }
      @else { <dl class="dl"><dt>Holder</dt><dd>{{a.holderName}}</dd><dt>Bank</dt><dd>{{a.bankName}}@if (a.branch) { · {{a.branch}} }</dd><dt>Account no.</dt><dd class="mono">{{a.accountNumber}}</dd><dt>IFSC</dt><dd class="mono">{{a.ifsc}}</dd><dt>Type</dt><dd style="text-transform:capitalize">{{a.accountType}}</dd></dl> }
      @if (a.qrImage) { <img [src]="file(a.qrImage)" class="qr" alt="QR code"> }
      @if (a.note) { <p class="sm muted">{{a.note}}</p> }
      <div class="row wrap mt"><button type="button" class="btn btn-ghost btn-sm" (click)="openForm(a)"><lucide-icon name="pencil" [size]="14"/> Edit</button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="toggle(a)">{{a.active ? 'Disable' : 'Enable'}}</button><button type="button" class="btn btn-danger btn-sm" (click)="remove(a)"><lucide-icon name="trash-2" [size]="14"/> Delete</button></div>
    </div> }</div> }

  <app-modal [open]="!!m" [drawer]="true" [title]="m?._id ? 'Edit payment account' : 'Add payment account'" (close)="m = null">
    @if (m) { <form (ngSubmit)="save()" novalidate>
      <div class="field"><label for="p-type">Type</label><select id="p-type" name="type" [(ngModel)]="m.type"><option value="bank">Bank account</option><option value="upi">UPI ID</option></select></div>
      <div class="field"><label for="p-label">Display name (optional)</label><input id="p-label" name="label" [(ngModel)]="m.label" maxlength="60" placeholder="e.g. Main HDFC account"></div>
      @if (m.type === 'bank') {
        <div class="field"><label for="p-holder">Account holder name</label><input id="p-holder" name="holderName" [(ngModel)]="m.holderName" maxlength="80"></div>
        <div class="grid g2"><div class="field"><label for="p-bank">Bank name</label><input id="p-bank" name="bankName" [(ngModel)]="m.bankName" maxlength="80"></div><div class="field"><label for="p-branch">Branch (optional)</label><input id="p-branch" name="branch" [(ngModel)]="m.branch" maxlength="80"></div></div>
        <div class="grid g2"><div class="field"><label for="p-acc">Account number</label><input id="p-acc" name="accountNumber" [(ngModel)]="m.accountNumber" inputmode="numeric" maxlength="18" autocomplete="off"></div>
          <div class="field"><label for="p-ifsc">IFSC code</label><input id="p-ifsc" name="ifsc" [(ngModel)]="m.ifsc" maxlength="11" style="text-transform:uppercase" autocomplete="off"></div></div>
        <div class="field"><label for="p-at">Account type</label><select id="p-at" name="accountType" [(ngModel)]="m.accountType"><option value="current">Current</option><option value="savings">Savings</option></select></div>
      } @else {
        <div class="field"><label for="p-upi">UPI ID</label><input id="p-upi" name="upiId" [(ngModel)]="m.upiId" maxlength="64" placeholder="name&#64;okbank" autocapitalize="none" autocomplete="off"></div>
        <div class="field"><label for="p-uname">Name on UPI (optional)</label><input id="p-uname" name="holderName" [(ngModel)]="m.holderName" maxlength="80"></div>
      }
      <div class="field"><label for="p-qr">QR code image (optional · PNG, JPG or WEBP · max 5 MB)</label><input id="p-qr" type="file" accept="image/png,image/jpeg,image/webp" (change)="pick($event)">
        @if (preview() || (m.qrImage && !m.removeQr)) { <img [src]="preview() || file(m.qrImage)" class="qr" alt="QR preview"> }
        @if (m._id && m.qrImage) { <label class="row sm"><input type="checkbox" name="removeQr" [(ngModel)]="m.removeQr"> Remove the current QR image</label> }</div>
      <div class="field"><label for="p-note">Note shown to users (optional)</label><textarea id="p-note" name="note" [(ngModel)]="m.note" maxlength="300" style="min-height:60px" placeholder="e.g. Pay only from your own account."></textarea></div>
      <label class="row sm mb"><input type="checkbox" name="active" [(ngModel)]="m.active"> Show this account to users</label>
      <button class="btn btn-primary btn-block" [disabled]="busy()">{{busy() ? 'Saving…' : 'Save payment account'}}</button>
    </form> }
  </app-modal>`,
  styles: [`.pay{display:grid;gap:8px;align-content:start}.pay.off{opacity:.65}.ic{width:42px;height:42px;border-radius:12px;background:var(--ink);color:var(--gold-2);display:grid;place-items:center}.qr{width:min(190px,100%);border-radius:12px;border:1px solid var(--border);background:#fff;margin-top:8px}`] })
export class AdminPaymentAccountsPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); confirm = inject(Confirm); file = fileUrl;
  items = signal<any[]>([]); loading = signal(true); busy = signal(false); preview = signal(''); m: any = null; qr: File | null = null;
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/admin/payment-accounts').subscribe({ next: (r) => { this.items.set(r); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.err(e); } }); }
  openForm(a: any) { this.qr = null; this.preview.set(''); this.m = a ? { ...blankPay(), ...a, removeQr: false } : blankPay(); }
  pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] || null;
    if (f && (!f.type.startsWith('image/') || f.size > 5 * 1024 * 1024)) { this.toast.err('Choose an image under 5 MB'); (e.target as HTMLInputElement).value = ''; return; }
    this.qr = f; this.preview.set(f ? URL.createObjectURL(f) : '');
  }
  save() {
    const m = this.m; const t = (v: any) => String(v || '').trim();
    if (m.type === 'bank') {
      if (t(m.holderName).length < 2) return this.toast.err('Enter the account holder name');
      if (t(m.bankName).length < 2) return this.toast.err('Enter the bank name');
      if (!/^\d{9,18}$/.test(t(m.accountNumber))) return this.toast.err('Account number must be 9 to 18 digits');
      if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(t(m.ifsc))) return this.toast.err('Invalid IFSC (example: HDFC0001234)');
    } else if (!/^[\w.\-]{2,64}@[A-Za-z][A-Za-z0-9]{1,30}$/.test(t(m.upiId))) return this.toast.err('Enter a valid UPI ID (example: name@okbank)');
    const fd = new FormData();
    for (const k of ['type', 'label', 'holderName', 'bankName', 'accountNumber', 'ifsc', 'branch', 'accountType', 'upiId', 'note']) fd.append(k, t(m[k]));
    fd.append('active', String(!!m.active)); fd.append('removeQr', String(!!m.removeQr)); if (this.qr) fd.append('qr', this.qr);
    this.busy.set(true);
    const req = m._id ? this.api.put<any>('/admin/payment-accounts/' + m._id, fd) : this.api.post<any>('/admin/payment-accounts', fd);
    req.subscribe({ next: () => { this.busy.set(false); this.m = null; this.toast.ok('Payment account saved'); this.load(); }, error: (e) => { this.busy.set(false); this.toast.err(e); } });
  }
  toggle(a: any) { this.api.patch('/admin/payment-accounts/' + a._id + '/toggle').subscribe({ next: () => this.load(), error: (e) => this.toast.err(e) }); }
  async remove(a: any) {
    if (!(await this.confirm.ask('Delete this payment account?', 'Past deposit requests keep their record. Users will no longer see this account.', true))) return;
    this.api.del('/admin/payment-accounts/' + a._id).subscribe({ next: () => { this.toast.ok('Deleted'); this.load(); }, error: (e) => this.toast.err(e) });
  }
}

/* ============ BANNERS (landing page) ============ */
@Component({ standalone: true, imports: COMMON, template: `
  <div class="page-head"><div><h2>Banners</h2><p class="muted">Images shown in a slider at the very top of the user landing page. Best size: 1600 × 600 px (wide). Lowest order number is shown first.</p></div>
    <button type="button" class="btn btn-gold" (click)="openForm(null)"><lucide-icon name="plus" [size]="16"/> Upload banner</button></div>
  @if (loading()) { <app-skeleton [n]="2" [h]="150"/> }
  @else if (!items().length) { <div class="card"><app-empty title="No banners yet" text="Upload an image to show it on the landing page."/></div> }
  @else { <div class="grid g2">@for (b of items(); track b._id) {
    <div class="card bn" [class.off]="!b.active"><img [src]="file(b.image)" alt="" class="bimg">
      <div class="row between"><div><b>{{b.title || 'Untitled banner'}}</b><div class="sm muted">{{b.subtitle}}</div>@if (b.link) { <div class="sm muted">{{b.link}}</div> }</div><app-badge [v]="b.active ? 'active' : 'suspended'"/></div>
      <div class="row wrap mt"><span class="sm muted">Order {{b.order}}</span><div class="grow"></div><button type="button" class="btn btn-ghost btn-sm" (click)="openForm(b)"><lucide-icon name="pencil" [size]="14"/> Edit</button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="toggle(b)">{{b.active ? 'Hide' : 'Show'}}</button><button type="button" class="btn btn-danger btn-sm" (click)="remove(b)"><lucide-icon name="trash-2" [size]="14"/> Delete</button></div>
    </div> }</div> }

  <app-modal [open]="!!m" [drawer]="true" [title]="m?._id ? 'Edit banner' : 'Upload banner'" (close)="m = null">
    @if (m) { <form (ngSubmit)="save()" novalidate>
      <div class="field"><label for="b-img">Banner image {{m._id ? '(leave empty to keep the current one)' : ''}}</label><input id="b-img" type="file" accept="image/png,image/jpeg,image/webp" (change)="pick($event)">
        @if (preview() || m.image) { <img [src]="preview() || file(m.image)" class="bimg" alt="Banner preview"> }</div>
      <div class="field"><label for="b-t">Title (optional)</label><input id="b-t" name="title" [(ngModel)]="m.title" maxlength="80"></div>
      <div class="field"><label for="b-s">Sub-title (optional)</label><input id="b-s" name="subtitle" [(ngModel)]="m.subtitle" maxlength="160"></div>
      <div class="field"><label for="b-l">Link when clicked (optional)</label><input id="b-l" name="link" [(ngModel)]="m.link" maxlength="300" placeholder="https://…" autocapitalize="none"></div>
      @if (m._id) { <div class="field"><label for="b-o">Order</label><input id="b-o" type="number" name="order" [(ngModel)]="m.order" min="0"></div> }
      <label class="row sm mb"><input type="checkbox" name="active" [(ngModel)]="m.active"> Show on the landing page</label>
      <button class="btn btn-primary btn-block" [disabled]="busy()">{{busy() ? 'Saving…' : 'Save banner'}}</button>
    </form> }
  </app-modal>`,
  styles: [`.bn{display:grid;gap:10px;align-content:start}.bn.off{opacity:.65}.bimg{width:100%;aspect-ratio:16/6;object-fit:cover;border-radius:12px;border:1px solid var(--border);background:#111}`] })
export class AdminBannersPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); confirm = inject(Confirm); file = fileUrl;
  items = signal<any[]>([]); loading = signal(true); busy = signal(false); preview = signal(''); m: any = null; img: File | null = null;
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/admin/banners').subscribe({ next: (r) => { this.items.set(r); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.err(e); } }); }
  openForm(b: any) { this.img = null; this.preview.set(''); this.m = b ? { ...b } : { _id: '', image: '', title: '', subtitle: '', link: '', order: 0, active: true }; }
  pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] || null;
    if (f && (!f.type.startsWith('image/') || f.size > 5 * 1024 * 1024)) { this.toast.err('Choose an image under 5 MB'); (e.target as HTMLInputElement).value = ''; return; }
    this.img = f; this.preview.set(f ? URL.createObjectURL(f) : '');
  }
  save() {
    const m = this.m; if (!m._id && !this.img) return this.toast.err('Choose a banner image');
    const link = String(m.link || '').trim(); if (link && !/^https?:\/\//i.test(link)) return this.toast.err('The link must start with http:// or https://');
    const fd = new FormData(); fd.append('title', String(m.title || '').trim()); fd.append('subtitle', String(m.subtitle || '').trim()); fd.append('link', link);
    fd.append('active', String(!!m.active)); fd.append('order', String(m.order || 0)); if (this.img) fd.append('image', this.img);
    this.busy.set(true);
    const req = m._id ? this.api.put<any>('/admin/banners/' + m._id, fd) : this.api.post<any>('/admin/banners', fd);
    req.subscribe({ next: () => { this.busy.set(false); this.m = null; this.toast.ok('Banner saved'); this.load(); }, error: (e) => { this.busy.set(false); this.toast.err(e); } });
  }
  toggle(b: any) { this.api.patch('/admin/banners/' + b._id + '/toggle').subscribe({ next: () => this.load(), error: (e) => this.toast.err(e) }); }
  async remove(b: any) {
    if (!(await this.confirm.ask('Delete this banner?', 'It will disappear from the landing page.', true))) return;
    this.api.del('/admin/banners/' + b._id).subscribe({ next: () => { this.toast.ok('Deleted'); this.load(); }, error: (e) => this.toast.err(e) });
  }
}
