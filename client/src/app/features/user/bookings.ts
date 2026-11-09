import { Component, inject, signal, OnInit } from '@angular/core';
import { Api, ToastService, fileUrl } from '../../core/core';
import { Confirm } from '../../shared/ui';
import { COMMON } from '../../shared/common';

@Component({ standalone: true, imports: COMMON, template: `
  <div class="container pg">
    <div class="page-head"><div><h2>My Bookings</h2><p class="muted">Track every request from submission to completion.</p></div><a routerLink="/" fragment="services" class="btn btn-gold"><lucide-icon name="plus" [size]="16"/> New booking</a></div>
    <div class="chips-scroll mb">@for (s of statuses; track s) { <button type="button" class="chip" [class.on]="status() === s" (click)="status.set(s); load(1)">{{s ? s.replace('_', ' ') : 'All'}}</button> }</div>
    @if (loading()) { <app-skeleton [n]="4" [h]="104"/> }
    @else if (!items().length) { <div class="card"><app-empty title="No bookings yet" text="Your service requests will show up here."><a routerLink="/" fragment="services" class="btn btn-gold btn-sm">Explore services</a></app-empty></div> }
    @else { <div class="grid">@for (b of items(); track b._id) {
      <div class="card bk"><div class="grow">
        <div class="row wrap" style="gap:8px"><b class="mono id">{{b.bookingId}}</b><app-badge [v]="b.status"/>@if (b.audio) { <span class="badge"><lucide-icon name="mic" [size]="12"/> voice note</span> }</div>
        <h3 style="margin-top:8px">{{b.serviceName}} <span class="muted sm" style="font-weight:500">· {{b.category}}</span></h3>
        <p class="muted sm">{{b.description || 'No description'}}</p>
        <p class="sm" style="margin-top:6px"><lucide-icon name="clock" [size]="13"/> {{b.preferredDate | date:'mediumDate'}}</p>
        @if (b.remarks) { <p class="rem sm"><b>Admin remarks:</b> {{b.remarks}}</p> }</div>
        <div class="row acts"><button type="button" class="btn btn-ghost btn-sm" (click)="view.set(b)">View details</button>@if (b.status === 'pending') { <button type="button" class="btn btn-danger btn-sm" (click)="cancel(b)">Cancel</button> }</div></div> }</div>
      <app-pager [page]="page()" [limit]="10" [total]="total()" (go)="load($event)"/> }
  </div>
  <app-modal [open]="!!view()" [drawer]="true" title="Booking details" (close)="view.set(null)">
    @if (view(); as b) {
      <div class="row wrap"><b class="mono">{{b.bookingId}}</b><app-badge [v]="b.status"/></div>
      <dl class="dl mt mb"><dt>Service</dt><dd>{{b.serviceName}} ({{b.category}})</dd><dt>Quantity</dt><dd>{{b.quantity}}</dd><dt>Preferred date</dt><dd>{{b.preferredDate | date:'mediumDate'}}</dd><dt>Mobile</dt><dd>{{b.mobile}}</dd><dt>Address</dt><dd>{{b.address}}</dd>
        @if (b.description) { <dt>Description</dt><dd>{{b.description}}</dd> } @if (b.additional) { <dt>Additional</dt><dd>{{b.additional}}</dd> } @if (b.remarks) { <dt>Admin remarks</dt><dd>{{b.remarks}}</dd> }</dl>
      @if (b.audio) { <h3 class="mb">Your voice note</h3><audio controls preload="none" [src]="url(b.audio)"></audio> }
      <h3 class="mb mt">Progress</h3>
      <ul class="timeline">@for (t of b.timeline; track $index) { <li><b style="text-transform:capitalize">{{t.status.replace('_', ' ')}}</b><div class="sm muted">{{t.at | date:'medium'}} {{t.note ? '· ' + t.note : ''}}</div></li> }</ul> }
  </app-modal>`,
  styles: [`.bk{display:flex;gap:16px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.id{letter-spacing:.02em}.rem{background:var(--gold-50);border-radius:10px;padding:8px 12px;margin-top:8px}.acts{flex-wrap:wrap}
  @media(max-width:640px){.bk{flex-direction:column}.acts{width:100%}.acts .btn{flex:1}}`] })
export class BookingsPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); confirm = inject(Confirm); url = fileUrl;
  statuses = ['', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled']; status = signal(''); items = signal<any[]>([]); total = signal(0); page = signal(1); loading = signal(true); view = signal<any>(null);
  ngOnInit() { this.load(1); }
  load(p: number) { this.loading.set(true); this.page.set(p); this.api.get<any>('/bookings', { page: p, status: this.status() }).subscribe({ next: (r) => { this.items.set(r.items); this.total.set(r.total); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.err(e); } }); }
  async cancel(b: any) {
    if (!(await this.confirm.ask('Cancel this booking?', b.bookingId, true))) return;
    this.api.post(`/bookings/${b._id}/cancel`).subscribe({ next: () => { this.toast.ok('Booking cancelled'); this.load(this.page()); }, error: (e) => this.toast.err(e) });
  }
}
