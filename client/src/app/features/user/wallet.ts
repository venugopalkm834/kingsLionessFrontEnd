import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Api, Auth, ToastService, inr, toPaise, uid, copyText, daysLeft } from '../../core/core';
import { COMMON, showErr } from '../../shared/common';

@Component({ standalone: true, imports: COMMON, template: `
  <div class="container pg">
  @if (!d()) { <app-skeleton [n]="3" [h]="150"/> } @else {
    <section class="whero">
      <div class="wtop">
        <div class="grow"><div class="lbl">Available balance</div><div class="bal mono">{{inr(d().wallet.balance)}}</div>
          <div class="row wrap" style="gap:8px"><span class="wid">User ID <b>{{me()?.userId}}</b></span><button type="button" class="cp" (click)="copy(me()?.userId)"><lucide-icon name="copy" [size]="14"/> Copy</button></div></div>
        <div class="today"><small>Today's calculated return</small><b class="mono">{{inr(d().todayReturn)}}</b>
          <small>{{d().settings.returnsEnabled ? (d().settings.dailyPercent | number:'1.2-4') + '% a day' : 'Daily earning is inactive'}}</small></div>
      </div>
      <div class="split">
        <div><small>Principal</small><b class="mono">{{inr(d().wallet.principal)}}</b></div>
        <div><small>Earned income</small><b class="mono">{{inr(d().wallet.earned)}}</b></div>
        <div class="hl"><small>Withdrawable now</small><b class="mono">{{inr(d().lock.withdrawable)}}</b></div>
      </div>
    </section>

    @if (d().settings.principalLock.enabled) {
      <div class="lockbar" [class.open]="!d().lock.locked"><lucide-icon [name]="d().lock.locked ? 'lock' : 'lock-open'" [size]="20"/>
        <div>@if (d().lock.locked) { <b>Principal is locked</b>
            <span> @if (d().lock.unlockAt) { until {{d().lock.unlockAt | date:'d MMM y'}} ({{days(d().lock.unlockAt)}} days left) } @else { until the administrator sets an unlock date }. Only your earned income, {{inr(d().wallet.earned)}}, can be withdrawn right now.</span> }
          @else { <b>Principal unlocked</b><span> Your full balance can be withdrawn.</span> }</div></div>
    }

    <div class="grid g4 keep acts mt">
      <button type="button" class="act" (click)="open('deposit')"><span class="ic"><lucide-icon name="arrow-down-left" [size]="22"/></span><b>Deposit</b></button>
      <button type="button" class="act" (click)="open('withdraw')"><span class="ic"><lucide-icon name="arrow-up-right" [size]="22"/></span><b>Withdraw</b></button>
      <button type="button" class="act" (click)="open('transfer')"><span class="ic"><lucide-icon name="send" [size]="22"/></span><b>Transfer funds</b></button>
      <a class="act" routerLink="/banks"><span class="ic"><lucide-icon name="landmark" [size]="22"/></span><b>Bank accounts</b></a>
    </div>

    <div class="stats mt"><div><small>Total deposits</small><b class="mono">{{inr(d().wallet.totalDeposits)}}</b></div><div><small>Total withdrawals</small><b class="mono">{{inr(d().wallet.totalWithdrawals)}}</b></div>
      <div><small>Total returns earned</small><b class="mono">{{inr(d().wallet.totalReturns)}}</b></div><div><small>Total transfers</small><b class="mono">{{inr(d().wallet.totalTransfers)}}</b></div></div>

    <div class="cols mt">
      <div class="card"><div class="card-h"><h3>Transactions</h3><a routerLink="/history" class="sm">Full history</a><div class="chips-scroll" style="max-width:100%">@for (t of types; track t) { <button type="button" class="chip" [class.on]="type() === t" (click)="type.set(t); loadTx(1)">{{t ? t.replace('_', ' ') : 'All'}}</button> }</div></div>
        @if (!tx().length) { <app-empty title="No transactions" text="Deposits, transfers and returns will appear here."/> }
        @else { @for (t of tx(); track t._id) {
          <div class="tx"><div class="ti" [class.dr]="t.direction === 'debit'"><lucide-icon [name]="t.direction === 'credit' ? 'arrow-down-left' : 'arrow-up-right'" [size]="16"/></div>
            <div class="grow"><div class="strong" style="text-transform:capitalize">{{t.type.replace('_', ' ')}}</div><div class="sm muted">{{t.note}}</div><div class="sm muted">{{t.createdAt | date:'d MMM, h:mm a'}} · Ref {{t.reference}}</div></div>
            <div class="right"><div class="strong mono" [style.color]="t.direction === 'credit' ? 'var(--success)' : 'var(--danger)'">{{t.direction === 'credit' ? '+' : '−'}}{{inr(t.amount)}}</div><div class="sm muted mono">Bal {{inr(t.balanceAfter)}}</div></div></div> }
          <app-pager [page]="txPage()" [limit]="10" [total]="txTotal()" (go)="loadTx($event)"/> }</div>

      <div class="card"><div class="card-h"><h3>Daily earning</h3><app-badge [v]="d().settings.returnsEnabled ? 'active' : 'suspended'"/></div>
        @if (d().settings.returnsEnabled) {
          <p class="sm">Daily earning rate <b>{{d().settings.dailyPercent | number:'1.2-4'}}%</b>@if (d().settings.inputMode === 'monthly') { (from {{d().settings.monthlyPercent}}% monthly) }, credited to your earned income each day on your {{info()?.returns?.base === 'balance' ? 'balance' : 'principal'}}.</p>
          <p class="sm muted" style="margin-top:6px">Example: ₹10,000 × {{d().settings.dailyPercent | number:'1.2-4'}}% ≈ ₹{{10000 * d().settings.dailyPercent / 100 | number:'1.2-2'}} for a day.</p>
        } @else { <p class="sm muted">The daily returns program is currently switched off by the administrator.</p> }
        <div class="mp mt"><div class="row between"><b>Month-end principal return</b><app-badge [v]="d().settings.principalReturn.enabled ? 'active' : 'suspended'"/></div>
          @if (d().settings.principalReturn.enabled) { <p class="sm" style="margin-top:6px"><b>{{d().settings.principalReturn.percent}}%</b> of your principal is credited to your earned income at the end of each month (next: {{d().settings.nextMonthEnd | date:'d MMM'}}). Expected on today's principal: <b>{{inr(d().expectedMonthEnd)}}</b>.</p> }
          @else { <p class="sm muted" style="margin-top:6px">Not active right now.</p> } </div>
        <div class="note mt"><b>Please read.</b> Returns are an administrator-set program benefit, not a guaranteed investment return. They can change, pause or end, and apply only to eligible balances (minimum {{inr(info()?.returns?.minBalance)}}). Your principal is not protected by this program.</div>
        @if (info()?.returns?.conditions) { <p class="sm muted mt">{{info().returns.conditions}}</p> }
        <h3 class="mt mb">Return history</h3>
        @if (!rets().length) { <p class="sm muted">No returns credited yet.</p> }
        @else { @for (r of rets(); track r._id) { <div class="row between sm hr"><span>{{r.date}}</span><span class="muted mono">on {{inr(r.basis)}}</span><b class="mono" style="color:var(--success)">+{{inr(r.amount)}}</b></div> } }
      </div>
    </div>
  }
  </div>

  <app-modal [open]="mode() === 'deposit'" [drawer]="true" title="Deposit funds" (close)="mode.set('')">
    <p class="sm muted mb">{{info()?.wallet?.depositInstructions}} Your wallet is credited only after an administrator verifies the payment.</p>
    @if (d()?.settings.principalLock.enabled) { <div class="note mb">Deposits are held as <b>principal</b>. {{lockText()}}</div> }
    <form [formGroup]="df" (ngSubmit)="deposit()" novalidate>
      <div class="field" [class.err]="er(df, 'amount')"><label for="d-amt">Amount (₹)</label><input id="d-amt" type="number" inputmode="decimal" formControlName="amount" min="1"><span class="hint">Minimum {{inr(info()?.wallet?.minDeposit)}}</span><span class="err-t">{{er(df, 'amount') ? 'Enter an amount' : ''}}</span></div>
      <div class="field"><label for="d-met">Payment method</label><select id="d-met" formControlName="method">@for (m of info()?.wallet?.methods || []; track m) { <option [value]="m">{{m}}</option> }</select></div>
      <div class="field" [class.err]="er(df, 'txnRef')"><label for="d-ref">Transaction ID / UTR (required)</label><input id="d-ref" formControlName="txnRef"><span class="err-t">{{er(df, 'txnRef') ? 'Enter the reference number (min 4 characters)' : ''}}</span></div>
      <div class="field" [class.err]="!!fileErr()"><label for="d-file">Payment receipt (optional · PNG, JPG, WEBP or PDF · max 5 MB)</label><input id="d-file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" (change)="pick($event)"><span class="err-t">{{fileErr()}}</span></div>
      <button class="btn btn-primary btn-block" [disabled]="busy()">{{busy() ? 'Submitting…' : 'Submit deposit request'}}</button></form>
  </app-modal>

  <app-modal [open]="mode() === 'withdraw'" [drawer]="true" title="Withdraw funds" (close)="mode.set('')">
    <div class="note mb">Withdrawable now: <b>{{inr(d()?.lock.withdrawable)}}</b> · Minimum {{inr(d()?.settings.minWithdrawal)}}
      @if (d()?.lock.locked) { <br>Your principal is locked, so only earned income can be withdrawn. }</div>
    @if (!banks().length) { <app-empty title="No verified bank account" text="Add a bank account and wait for admin verification."><a routerLink="/banks" class="btn btn-gold btn-sm" (click)="mode.set('')">Manage bank accounts</a></app-empty> }
    @else {
      <form [formGroup]="wf" (ngSubmit)="withdraw()" novalidate>
        <div class="field" [class.err]="wErr()"><label for="w-amt">Withdrawal amount (₹)</label><input id="w-amt" type="number" inputmode="decimal" formControlName="amount"><span class="err-t">{{wErr()}}</span></div>
        <div class="field"><label for="w-bank">Bank account</label><select id="w-bank" formControlName="bankId">@for (b of banks(); track b._id) { <option [value]="b._id">{{b.bankName}} {{b.masked}}</option> }</select></div>
        <div class="field"><label for="w-note">Notes (optional)</label><textarea id="w-note" formControlName="notes" style="min-height:60px"></textarea></div>
        <div class="sum">
          <div class="row between"><span>Amount requested</span><b class="mono">{{inr(amountP())}}</b></div>
          @if (d().settings.tds.enabled) { <div class="row between"><span>{{d().settings.tds.label}} ({{d().settings.tds.percent}}%)</span><b class="mono">− {{inr(fees().tds)}}</b></div> }
          @if (d().settings.service.enabled) { <div class="row between"><span>{{d().settings.service.label}} ({{d().settings.service.percent}}%)</span><b class="mono">− {{inr(fees().service)}}</b></div> }
          <div class="row between tot"><span>Net amount you receive</span><b class="mono">{{inr(fees().net)}}</b></div></div>
        <button class="btn btn-primary btn-block mt" [disabled]="busy()">{{busy() ? 'Submitting…' : 'Request withdrawal'}}</button>
      </form> }
  </app-modal>

  <app-modal [open]="mode() === 'transfer'" [drawer]="true" [title]="receipt() ? 'Transfer receipt' : 'Transfer funds'" (close)="mode.set('')">
    @if (receipt(); as r) {
      <div class="center"><div class="okc"><lucide-icon name="check" [size]="28"/></div><h3>Transfer successful</h3><div class="big mono">{{inr(r.amount)}}</div></div>
      <dl class="dl mt mb"><dt>To</dt><dd>{{r.recipientName}} ({{r.toUserId}})</dd><dt>From</dt><dd>{{r.source === 'earned' ? 'Earned income' : 'Principal'}}</dd>@if (r.lockUntil) { <dt>Recipient lock</dt><dd>Until {{r.lockUntil | date:'mediumDate'}}</dd> }<dt>Reference</dt><dd class="mono">{{r.reference}}</dd><dt>Date</dt><dd>{{r.createdAt | date:'medium'}}</dd>@if (r.note) { <dt>Note</dt><dd>{{r.note}}</dd> }</dl>
      <button type="button" class="btn btn-ghost btn-block" (click)="mode.set('')">Done</button>
    } @else {
      <form [formGroup]="tf" (ngSubmit)="lookup()" novalidate>
        <div class="field"><label for="t-by">Find recipient by</label><select id="t-by" formControlName="by" (change)="tf.patchValue({value: ''}); found.set(null); lookupErr.set('')"><option value="userId">User ID</option><option value="mobile">Mobile number</option></select></div>
        <div class="field" [class.err]="vErr() || lookupErr()"><label for="t-w">{{tf.value.by === 'mobile' ? 'Recipient mobile number' : 'Recipient User ID'}}</label>
          <input id="t-w" formControlName="value" [attr.inputmode]="tf.value.by === 'mobile' ? 'numeric' : 'text'" [maxlength]="tf.value.by === 'mobile' ? 10 : 12" [placeholder]="tf.value.by === 'mobile' ? '10-digit mobile' : 'KL20260000'" (input)="onValue()" autocomplete="off" autocapitalize="characters">
          <span class="err-t">{{vErr() ? (tf.value.by === 'mobile' ? 'Enter a valid 10-digit mobile number' : 'User ID looks like KL20260000') : lookupErr()}}</span>
          @if (looking()) { <span class="hint">Searching…</span> }
          @if (found(); as f) { <div class="found"><lucide-icon name="check" [size]="16"/> <div><b>{{f.name}}</b><div class="sm muted">{{f.userId}} · {{f.mobile}}</div></div></div> }</div>
        <div class="field"><label for="t-s">Transfer from</label><select id="t-s" formControlName="source" (change)="rcpt.set(null)"><option value="principal">Principal ({{inr(d().wallet.principal)}})</option><option value="earned">Earned income ({{inr(d().wallet.earned)}})</option></select>
          <span class="hint">@if (tf.value.source === 'earned') { Earned income stays in the recipient's earned section and can be withdrawn by them. } @else if (d().lock.locked) { Your principal is locked{{d().lock.unlockAt ? ' until ' + (d().lock.unlockAt | date:'mediumDate') : ''}}. The recipient's received principal stays locked for the same period. } @else { Principal is currently unlocked, so the recipient receives it unlocked. }</span></div>
        <div class="field" [class.err]="er(tf, 'amount') || aErr()"><label for="t-a">Amount (₹)</label><input id="t-a" type="number" inputmode="decimal" formControlName="amount" (input)="rcpt.set(null)"><span class="err-t">{{aErr()}}</span></div>
        <div class="field"><label for="t-n">Description</label><input id="t-n" formControlName="note"></div>
        @if (!rcpt()) { <button class="btn btn-primary btn-block" [disabled]="busy()">{{busy() ? 'Checking…' : 'Review transfer'}}</button> }
      </form>
      @if (rcpt(); as r) {
        <div class="sum"><div class="row between"><span>Recipient</span><b>{{r.name}}</b></div><div class="row between"><span>User ID</span><b class="mono">{{r.userId}}</b></div>@if (r.mobile) { <div class="row between"><span>Mobile</span><b class="mono">{{r.mobile}}</b></div> }
          <div class="row between"><span>From</span><b>{{tf.value.source === 'earned' ? 'Earned income' : 'Principal'}}</b></div>
          @if (tf.value.source === 'principal' && d().lock.locked) { <div class="row between"><span>Recipient lock</span><b>{{d().lock.unlockAt ? 'Until ' + (d().lock.unlockAt | date:'mediumDate') : 'Locked'}}</b></div> }
          <div class="row between tot"><span>Amount</span><b class="mono">{{inr(tp(tf.value.amount))}}</b></div></div>
        <div class="row mt"><button type="button" class="btn btn-ghost grow" (click)="rcpt.set(null)">Edit</button><button type="button" class="btn btn-gold grow" [disabled]="busy()" (click)="transfer()">{{busy() ? 'Sending…' : 'Confirm transfer'}}</button></div> } }
  </app-modal>`,
  styles: [`
  .whero{background:radial-gradient(520px 260px at 90% 0,#5A4A1A,transparent 70%),var(--ink);color:#EFEBDF;border-radius:26px;padding:30px;box-shadow:var(--sh-md);position:relative;overflow:hidden;border:1px solid rgba(212,165,58,.4)}
  .wtop{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:flex-end}.lbl{font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:#9A9482}
  .bal{font:800 clamp(2.3rem,7.5vw,4.4rem)/1.05 var(--display);letter-spacing:-.04em;margin:6px 0 12px;color:#fff;overflow-wrap:anywhere}
  .wid{background:rgba(255,255,255,.08);padding:7px 12px;border-radius:999px;font-size:.82rem}.wid b{margin-left:6px;letter-spacing:.04em;color:var(--gold-2)}
  .cp{border:0;background:rgba(212,165,58,.18);color:var(--gold-2);border-radius:999px;padding:7px 12px;cursor:pointer;font:600 .8rem var(--font);display:inline-flex;gap:6px;align-items:center}
  .today{border:1.5px solid rgba(212,165,58,.5);border-radius:18px;padding:16px 20px;display:grid;gap:2px;min-width:210px}.today b{font:800 1.8rem var(--display);color:var(--gold-2);letter-spacing:-.03em}.today small{color:#9A9482;font-size:.78rem}
  .split{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:22px;padding-top:20px;border-top:1px solid rgba(255,255,255,.12)}.split div{display:grid;min-width:0}.split small{color:#9A9482;font-size:.78rem}
  .split b{font:700 1.25rem var(--display);color:#fff;overflow-wrap:anywhere}.split .hl b{color:var(--gold-2)}
  .lockbar{display:flex;gap:12px;align-items:flex-start;margin-top:14px;background:var(--gold-50);border:1px solid var(--gold-100);color:#3A3A40;border-radius:16px;padding:14px 16px;font-size:.88rem}.lockbar lucide-icon{flex:none;margin-top:2px;color:var(--gold-deep)}.lockbar.open{background:var(--success-50);border-color:#bfe5cb;color:#14532d}.lockbar.open lucide-icon{color:var(--success)}
  .act{display:flex;flex-direction:column;align-items:flex-start;gap:22px;background:#fff;border:1px solid var(--border);border-radius:20px;padding:18px;font:700 1rem var(--display);color:var(--ink);cursor:pointer;transition:all .2s var(--ease);text-align:left;text-decoration:none}
  .act:hover{border-color:var(--gold);transform:translateY(-3px);box-shadow:var(--sh-md)}.act .ic{width:46px;height:46px;border-radius:14px;background:var(--ink);color:var(--gold-2);display:grid;place-items:center}
  .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--border);border-radius:20px;background:#fff;overflow:hidden}.stats>div{padding:18px 20px;border-right:1px solid var(--border);min-width:0}.stats>div:last-child{border:0}
  .stats small{color:var(--muted);font-size:.8rem}.stats b{display:block;font:700 1.3rem var(--display);letter-spacing:-.02em;margin-top:2px;overflow-wrap:anywhere}
  .cols{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:start}
  .tx{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 0;border-top:1px solid var(--border)}.tx:first-of-type{border-top:0}.tx .grow{min-width:0;overflow-wrap:anywhere}
  .ti{width:40px;height:40px;border-radius:12px;background:var(--success-50);color:var(--success);display:grid;place-items:center}.ti.dr{background:var(--danger-50);color:var(--danger)}
  .hr{padding:8px 0;border-bottom:1px solid var(--border)}
  .sum{background:var(--bg);border-radius:14px;padding:14px;display:grid;gap:8px;margin-top:6px;font-size:.9rem}.sum .tot{border-top:1px dashed var(--border);padding-top:8px;font-size:1rem}
  .found{display:flex;gap:10px;align-items:center;margin-top:8px;background:var(--success-50);border:1px solid #bfe5cb;color:var(--success);border-radius:12px;padding:10px 12px}.found b{color:var(--ink)}
  .mp{border:1px dashed var(--gold);background:var(--gold-50);border-radius:14px;padding:14px}
  .okc{width:60px;height:60px;border-radius:50%;background:var(--success-50);color:var(--success);display:grid;place-items:center;margin:0 auto 12px}.big{font:800 2.1rem var(--display);color:var(--ink)}
  @media(max-width:980px){.cols{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.stats>div:nth-child(2){border-right:0}.stats>div:nth-child(-n+2){border-bottom:1px solid var(--border)}}
  @media(max-width:640px){.whero{padding:22px 18px;border-radius:22px}.split{gap:8px}.split b{font-size:1rem}.today{width:100%}.tx{grid-template-columns:36px minmax(0,1fr)}.tx .right{grid-column:2;text-align:left}.act{padding:16px;gap:16px}}`] })
export class WalletPage implements OnInit {
  api = inject(Api); toast = inject(ToastService); fb = inject(FormBuilder);
  inr = inr; days = daysLeft; tp = (v: any) => toPaise(v); er = (f: any, n: string) => showErr(f.get(n));
  d = signal<any>(null); info = signal<any>(null); tx = signal<any[]>([]); txPage = signal(1); txTotal = signal(0); rets = signal<any[]>([]); banks = signal<any[]>([]);
  types = ['', 'deposit', 'withdrawal', 'withdrawal_refund', 'transfer_in', 'transfer_out', 'return', 'referral', 'adjustment']; type = signal('');
  mode = signal(''); busy = signal(false); file: File | null = null; fileErr = signal(''); rcpt = signal<any>(null); receipt = signal<any>(null); private key = uid();
  df = this.fb.nonNullable.group({ amount: [null as number | null, [Validators.required, Validators.min(1)]], method: ['UPI'], txnRef: ['', [Validators.required, Validators.minLength(4)]] });
  wf = this.fb.nonNullable.group({ amount: [null as number | null, [Validators.required, Validators.min(1)]], bankId: [''], notes: [''] });
  tf = this.fb.nonNullable.group({ by: ['userId'], value: ['', Validators.required], source: ['principal'], amount: [null as number | null, [Validators.required, Validators.min(1)]], note: [''] });

  amountP() { return toPaise(this.wf.value.amount); }
  fees() {
    const s = this.d()?.settings; const a = this.amountP(); if (!s) return { tds: 0, service: 0, fee: 0, net: a };
    const tds = s.tds.enabled ? Math.round((a * s.tds.percent) / 100) : 0; const service = s.service.enabled ? Math.round((a * s.service.percent) / 100) : 0;
    return { tds, service, fee: tds + service, net: a - tds - service };
  }
  wErr() {
    const c = this.wf.controls.amount; if (!(c.touched || c.dirty)) return ''; const a = this.amountP(); const s = this.d()?.settings;
    if (!a) return 'Enter an amount'; if (a < s.minWithdrawal) return `Minimum withdrawal is ${inr(s.minWithdrawal)}`;
    if (a > this.d().lock.withdrawable) return this.d().lock.locked ? `Only earned income can be withdrawn now: up to ${inr(this.d().lock.withdrawable)}` : `You can withdraw up to ${inr(this.d().lock.withdrawable)}`;
    return '';
  }
  lockText() {
    const L = this.d()?.settings.principalLock; if (!L?.enabled) return '';
    return L.mode === 'date' ? (L.date ? `It cannot be withdrawn until ${L.date}.` : 'It stays locked until the administrator sets an unlock date.') : `It cannot be withdrawn until ${L.days} days after your latest deposit.`;
  }
  ngOnInit() { this.load(); this.api.get('/program-info').subscribe((i) => this.info.set(i)); this.loadTx(1); this.loadRets(); }
  load() { this.api.get('/wallet').subscribe({ next: (r) => this.d.set(r), error: (e) => this.toast.err(e) }); }
  loadRets() { this.api.get<any>('/wallet/returns', { limit: 6 }).subscribe((r) => this.rets.set(r.items)); }
  loadTx(p: number) { this.txPage.set(p); this.api.get<any>('/wallet/transactions', { page: p, type: this.type() }).subscribe((r) => { this.tx.set(r.items); this.txTotal.set(r.total); }); }
  async copy(t: string) { const ok = await copyText(t); this.toast.show(ok ? 'ok' : 'err', ok ? 'Copied' : 'Could not copy'); }
  open(m: string) {
    this.key = uid(); this.mode.set(m); this.receipt.set(null); this.rcpt.set(null); this.busy.set(false); this.load();
    if (m === 'withdraw') this.api.get<any[]>('/banks').subscribe((b) => { const v = b.filter((x) => x.status === 'verified'); this.banks.set(v); this.wf.patchValue({ bankId: (v.find((x) => x.isDefault) || v[0])?._id || '' }); });
  }
  pick(e: Event) { const f = (e.target as HTMLInputElement).files?.[0] || null; this.file = f; this.fileErr.set(f && f.size > 5 * 1024 * 1024 ? 'File is larger than 5 MB' : ''); }
  done(msg: string) { this.busy.set(false); this.toast.ok(msg); this.load(); this.loadTx(1); }
  fail = (e: any) => { this.busy.set(false); this.toast.err(e); };
  deposit() {
    this.df.markAllAsTouched(); if (this.df.invalid) return;
    if (this.fileErr()) return;
    const v = this.df.getRawValue(); const fd = new FormData(); fd.append('amount', String(toPaise(v.amount))); fd.append('method', v.method); fd.append('txnRef', v.txnRef.trim()); if (this.file) fd.append('proof', this.file); this.busy.set(true);
    this.api.post('/wallet/deposits', fd, this.key).subscribe({ next: () => { this.mode.set(''); this.df.reset({ method: 'UPI' }); this.file = null; this.fileErr.set(''); this.done('Deposit request submitted. Status: Pending'); }, error: this.fail });
  }
  withdraw() {
    this.wf.markAllAsTouched(); if (this.wf.invalid || !this.wf.value.bankId || this.wErr()) return;
    this.busy.set(true); const v = this.wf.getRawValue();
    this.api.post('/wallet/withdrawals', { amount: toPaise(v.amount), bankId: v.bankId, notes: v.notes || undefined }, this.key).subscribe({ next: () => { this.mode.set(''); this.wf.reset({ bankId: v.bankId }); this.done('Withdrawal requested'); }, error: this.fail });
  }
  found = signal<any>(null); lookupErr = signal(''); looking = signal(false); private timer: any; me = inject(Auth).me;
  validVal() { const v = this.tf.value; return v.by === 'mobile' ? /^[6-9]\d{9}$/.test(v.value || '') : /^KL\d{8,9}$/i.test(v.value || ''); }
  vErr() { const t = this.tf.get('value'); if (!t?.touched && !t?.dirty) return false; return !!(this.tf.value.value) && !this.validVal(); }
  onValue() {
    this.rcpt.set(null); this.found.set(null); this.lookupErr.set(''); clearTimeout(this.timer);
    if (!this.validVal()) return; const v = this.tf.getRawValue(); this.looking.set(true);
    this.timer = setTimeout(() => this.api.get<any>('/wallet/lookup', { by: v.by, value: v.by === 'mobile' ? v.value : v.value.toUpperCase() }).subscribe({
      next: (r) => { this.looking.set(false); if (this.tf.value.value === v.value) this.found.set(r); }, error: (e) => { this.looking.set(false); this.lookupErr.set(e?.error?.message || 'No user found'); } }), 350);
  }
  aErr() { const v = this.tf.value; const amt = toPaise(v.amount); if (!this.tf.get('amount')?.touched) return ''; if (!(amt >= 1)) return 'Enter an amount'; const avail = v.source === 'earned' ? this.d().wallet.earned : this.d().wallet.principal; return amt > avail ? 'More than your available ' + (v.source === 'earned' ? 'earned income' : 'principal') : ''; }
  lookup() {
    this.tf.markAllAsTouched(); if (this.tf.invalid || !this.validVal() || this.aErr()) return;
    if (!this.found()) { this.toast.err(this.lookupErr() || 'Recipient not found yet. Check the details.'); return; }
    this.rcpt.set(this.found());
  }
  transfer() {
    const v = this.tf.getRawValue(); this.busy.set(true);
    this.api.post<any>('/wallet/transfers', { by: v.by, value: v.by === 'mobile' ? v.value : v.value.toUpperCase(), source: v.source, amount: toPaise(v.amount), note: v.note || undefined }, this.key).subscribe({ next: (r) => { this.receipt.set(r); this.tf.reset({ by: 'userId', source: 'principal' }); this.found.set(null); this.rcpt.set(null); this.done('Transfer complete'); }, error: this.fail });
  }
}
