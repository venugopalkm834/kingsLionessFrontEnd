import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Api, ToastService, inr, fileUrl } from '../../core/core';
import { COMMON } from '../../shared/common';

const TABS: [string, string, string][] = [['transactions', 'All transactions', '/wallet/transactions'], ['deposits', 'Deposits', '/wallet/deposits'], ['withdrawals', 'Withdrawals', '/wallet/withdrawals'],
  ['transfers', 'Transfers', '/wallet/transfers'], ['daily', 'Daily earning', '/wallet/returns'], ['monthly', 'Month-end returns', '/wallet/monthly-returns']];

@Component({ standalone: true, imports: COMMON, template: `
  <div class="container pg">
    <div class="page-head"><div><h2>History</h2><p class="muted">Every deposit, withdrawal, transfer and earning on your account.</p></div><a routerLink="/wallet" class="btn btn-ghost btn-sm">Back to wallet</a></div>
    <div class="tabs">@for (t of tabs; track t[0]) { <button type="button" [class.on]="tab() === t[0]" (click)="go(t[0])">{{t[1]}}</button> }</div>
    @if (loading()) { <app-skeleton [n]="5"/> }
    @else if (!items().length) { <div class="card"><app-empty title="Nothing here yet" text="Records will appear here as soon as you use your wallet."/></div> }
    @else {
      @switch (tab()) {
        @case ('transactions') { <div class="card list">@for (t of items(); track t._id) {
          <div class="row-i"><div class="ti" [class.dr]="t.direction === 'debit'"><lucide-icon [name]="t.direction === 'credit' ? 'arrow-down-left' : 'arrow-up-right'" [size]="16"/></div>
            <div class="grow"><b style="text-transform:capitalize">{{t.type.replace('_', ' ')}}</b><div class="sm muted">{{t.note}}</div><div class="sm muted">{{t.createdAt | date:'d MMM yyyy, h:mm a'}} · Ref {{t.reference}}</div></div>
            <div class="right"><b class="mono" [style.color]="t.direction === 'credit' ? 'var(--success)' : 'var(--danger)'">{{t.direction === 'credit' ? '+' : '−'}}{{inr(t.amount)}}</b><div class="sm muted mono">Bal {{inr(t.balanceAfter)}}</div></div></div> }</div> }
        @case ('deposits') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Wallet</th><th>Transaction ID</th><th>Receipt</th><th>Status</th><th>Remarks</th></tr></thead><tbody>
          @for (d of items(); track d._id) { <tr><td data-l="Date">{{d.createdAt | date:'d MMM yyyy, h:mm a'}}</td><td data-l="Amount"><b>{{inr(d.amount)}}</b></td><td data-l="Method">{{d.method}}</td><td data-l="Wallet" style="text-transform:capitalize">{{d.target || 'principal'}}</td><td data-l="Transaction ID" class="mono">{{d.txnRef}}</td>
            <td data-l="Receipt">@if (d.proof) { <a [href]="file(d.proof)" target="_blank" rel="noopener">View</a> } @else { <span class="muted">—</span> }</td><td data-l="Status"><app-badge [v]="d.status"/></td><td data-l="Remarks">{{d.remarks || '—'}}</td></tr> }</tbody></table></div> }
        @case ('withdrawals') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>Amount</th><th>Fees</th><th>You receive</th><th>Bank</th><th>Status</th><th>Remarks</th></tr></thead><tbody>
          @for (w of items(); track w._id) { <tr><td data-l="Date">{{w.createdAt | date:'d MMM yyyy, h:mm a'}}</td><td data-l="Amount"><b>{{inr(w.amount)}}</b></td>
            <td data-l="Fees"><div class="sm">{{w.tdsLabel || 'TDS'}}: {{inr(w.tds)}}</div><div class="sm">{{w.serviceLabel || 'Service charges'}}: {{inr(w.serviceCharge)}}</div></td><td data-l="You receive"><b>{{inr(w.net ?? w.amount)}}</b></td>
            <td data-l="Bank">{{w.bank?.bankName || '—'}}@if (w.bank?.last4) { <span class="muted"> ••••{{w.bank.last4}}</span> }</td><td data-l="Status"><app-badge [v]="w.status"/></td><td data-l="Remarks">{{w.remarks || '—'}}</td></tr> }</tbody></table></div> }
        @case ('transfers') { <div class="card list">@for (t of items(); track t._id) {
          <div class="row-i"><div class="ti" [class.dr]="t.direction === 'sent'"><lucide-icon [name]="t.direction === 'sent' ? 'arrow-up-right' : 'arrow-down-left'" [size]="16"/></div>
            <div class="grow"><b>{{t.direction === 'sent' ? 'Sent to ' + t.to?.name : 'Received from ' + t.from?.name}}</b><div class="sm muted">{{t.direction === 'sent' ? t.to?.userId : t.from?.userId}} · Earned income</div>
              <div class="sm muted">{{t.createdAt | date:'d MMM yyyy, h:mm a'}} · Ref {{t.reference}}</div>@if (t.remarks) { <div class="sm muted">{{t.remarks}}</div> }</div>
            <div class="right"><b class="mono" [style.color]="t.direction === 'sent' ? 'var(--danger)' : 'var(--success)'">{{t.direction === 'sent' ? '−' : '+'}}{{inr(t.amount)}}</b><div><app-badge [v]="t.status === 'completed' ? 'approved' : t.status"/></div></div></div> }</div> }
        @case ('daily') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Date</th><th>Basis</th><th>Daily %</th><th>Credited</th></tr></thead><tbody>
          @for (r of items(); track r._id) { <tr><td data-l="Date">{{r.date}}</td><td data-l="Basis">{{inr(r.basis)}}</td><td data-l="Daily %">{{r.ratePercent}}%</td><td data-l="Credited"><b style="color:var(--success)">+{{inr(r.amount)}}</b></td></tr> }</tbody></table></div> }
        @case ('monthly') { <div class="tbl-wrap"><table class="stack-m"><thead><tr><th>Month</th><th>Principal</th><th>%</th><th>Credited</th></tr></thead><tbody>
          @for (r of items(); track r._id) { <tr><td data-l="Month">{{r.month}}</td><td data-l="Principal">{{inr(r.basis)}}</td><td data-l="%">{{r.percent}}%</td><td data-l="Credited"><b style="color:var(--success)">+{{inr(r.amount)}}</b></td></tr> }</tbody></table></div> }
      }
      <app-pager [page]="page()" [limit]="10" [total]="total()" (go)="load($event)"/> }
  </div>`,
  styles: [`.tabs{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:16px;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}
  .tabs button{flex:none;border:1px solid var(--border);background:#fff;border-radius:999px;padding:9px 16px;font:700 .85rem var(--font);color:var(--muted);cursor:pointer}.tabs button.on{background:var(--ink);color:var(--gold-2);border-color:var(--ink)}
  .list{padding:4px 18px}.row-i{display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--border)}.row-i:last-child{border:0}.right{text-align:right;flex:none}
  .ti{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--success-50);color:var(--success);flex:none}.ti.dr{background:var(--danger-50);color:var(--danger)}`] })
export class HistoryPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); route = inject(ActivatedRoute); inr = inr; file = fileUrl; tabs = TABS;
  tab = signal('transactions'); items = signal<any[]>([]); total = signal(0); page = signal(1); loading = signal(true);
  ngOnInit() { this.route.queryParamMap.subscribe((q) => { const t = q.get('tab'); if (t && TABS.some((x) => x[0] === t)) this.tab.set(t); this.load(1); }); }
  go(t: string) { this.tab.set(t); this.load(1); }
  load(p: number) {
    const url = TABS.find((x) => x[0] === this.tab())![2]; this.loading.set(true); this.page.set(p);
    this.api.get<any>(url, { page: p, limit: 10 }).subscribe({ next: (r) => { const a = Array.isArray(r) ? r : r.items; this.items.set(a || []); this.total.set(Array.isArray(r) ? a.length : r.total); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.items.set([]); this.toast.err(e); } });
  }
}
