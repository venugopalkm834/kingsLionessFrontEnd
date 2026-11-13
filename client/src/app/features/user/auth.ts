import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, Auth, ToastService } from '../../core/core';
import { debounceTime, distinctUntilChanged, of, switchMap, catchError } from 'rxjs';
import { PasswordFieldComponent } from '../../shared/ui';

@Component({ selector: 'app-auth', standalone: true, imports: [ReactiveFormsModule, RouterLink, PasswordFieldComponent], template: `
  <div class="wrap2">
    <aside class="side"><a routerLink="/" class="lg"><img src="assets/brand/logo-full.png" alt="Kings Lioness"></a>
      <div><h2>{{admin ? 'Admin console' : reg() ? 'Join Kings Lioness.' : 'Welcome back.'}}</h2>
        <p>{{admin ? 'Manage bookings, wallets, approvals and settings securely.' : 'Book trusted services and manage your wallet in one place.'}}</p></div>
      <small>© Kings Lioness</small></aside>
    <section class="formc"><div class="box">
      <a routerLink="/" class="mlogo"><img src="assets/brand/logo-full.png" alt="Kings Lioness"></a>
      <h2>{{reg() ? 'Create your account' : admin ? 'Admin sign in' : 'Sign in'}}</h2><p class="muted mb">{{reg() ? 'It takes less than a minute.' : (admin ? 'Enter your details to continue.' : 'Sign in with your mobile number or username.')}}</p>
      <form [formGroup]="f" (ngSubmit)="submit()" novalidate>
        @if (reg()) {
          <div class="field" [class.err]="bad('name')"><label for="a-name">Full name</label><input id="a-name" formControlName="name" autocomplete="name"><span class="err-t">{{bad('name') ? 'Enter your name' : ''}}</span></div>
          <div class="grid g2"><div class="field" [class.err]="bad('username')"><label for="a-user">Username</label><input id="a-user" formControlName="username" autocomplete="username" autocapitalize="none"><span class="err-t">{{bad('username') ? '3–24 letters, numbers or _' : ''}}</span></div>
            <div class="field" [class.err]="bad('mobile')"><label for="a-mob">Mobile</label><input id="a-mob" type="tel" formControlName="mobile" inputmode="numeric" maxlength="10" autocomplete="tel-national" (input)="digits()"><span class="err-t">{{bad('mobile') ? '10-digit mobile number' : ''}}</span></div></div>
          <div class="grid g2"><div class="field" [class.err]="bad('aadhaar')"><label for="a-aad">Aadhaar number</label><input id="a-aad" formControlName="aadhaar" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="XXXX XXXX XXXX" (input)="fmtAadhaar()"><span class="err-t">{{bad('aadhaar') ? 'Enter your 12-digit Aadhaar number' : ''}}</span></div>
            <div class="field" [class.err]="bad('pan')"><label for="a-pan">PAN card number</label><input id="a-pan" formControlName="pan" maxlength="10" autocapitalize="characters" autocomplete="off" placeholder="ABCDE1234F" style="text-transform:uppercase" (input)="fmtPan()"><span class="err-t">{{bad('pan') ? 'Enter a valid PAN, e.g. ABCDE1234F' : ''}}</span></div></div>
        } @else {
          <div class="field" [class.err]="bad('identifier')"><label for="a-id">{{admin ? 'Email or username' : 'Mobile number or username'}}</label><input id="a-id" formControlName="identifier" autocomplete="username" autocapitalize="none"><span class="err-t">{{bad('identifier') ? 'Required' : ''}}</span></div>
        }
        <div class="field" [class.err]="bad('password')"><label for="a-pw">Password</label><app-password inputId="a-pw" [control]="f.controls.password" [autocomplete]="reg() ? 'new-password' : 'current-password'"/><span class="err-t">{{bad('password') ? (reg() ? 'Min 8 characters with a letter and a number' : 'Required') : ''}}</span></div>
        @if (reg()) { <div class="field"><label for="a-ref">Referral code (optional)</label><input id="a-ref" formControlName="referralCode" style="text-transform:uppercase" autocomplete="off">
          @switch (up().state) {
            @case ('checking') { <span class="hint">Checking referral code…</span> }
            @case ('ok') { <span class="upline ok">Referred by <b>{{up().name}}</b></span> }
            @case ('bad') { <span class="err-t">Referral code not found. Check it or leave it blank.</span> }
            @case ('off') { <span class="hint">Could not check the code right now. It will be checked when you register.</span> }
          } </div> }
        <button class="btn btn-primary btn-block" [disabled]="busy()">{{busy() ? 'Please wait…' : reg() ? 'Create account' : 'Sign in'}}</button>
      </form>
      @if (!admin) { <p class="sm muted mt center">{{reg() ? 'Already registered?' : 'New here?'}} <a [routerLink]="reg() ? '/login' : '/register'">{{reg() ? 'Sign in' : 'Create an account'}}</a></p> }
    </div></section></div>`,
  styles: [`.upline{display:block;margin-top:4px;padding:8px 12px;border-radius:10px;font-size:.85rem}.upline.ok{background:var(--gold-50);color:var(--gold-deep);border:1px solid var(--gold-2)}.wrap2{display:grid;grid-template-columns:1fr 1fr;min-height:100dvh;background:#fff}
  .side{background:radial-gradient(600px 400px at 20% 0,#5A4A1A,transparent 70%),var(--ink);color:#EDE9DD;padding:40px;display:flex;flex-direction:column;justify-content:space-between;gap:30px;border-right:3px solid var(--gold)}
  .lg img{width:min(380px,100%);height:auto}.side h2{color:var(--gold-2);font-size:clamp(1.8rem,3vw,2.6rem)}.side p{margin-top:12px;color:#B9B3A0;max-width:38ch}.side small{color:#8A8575}
  .formc{display:grid;place-items:center;padding:28px 18px}.box{width:min(440px,100%)}.mlogo{display:none;background:var(--ink);border-radius:16px;padding:14px;margin-bottom:22px}.mlogo img{height:54px;width:auto;margin:auto}
  @media(max-width:820px){.wrap2{grid-template-columns:1fr}.side{display:none}.mlogo{display:block}.formc{place-items:start center;padding-top:max(20px,env(safe-area-inset-top))}}`] })
export class AuthPage {
  fb = inject(FormBuilder); auth = inject(Auth); router = inject(Router); toast = inject(ToastService); route = inject(ActivatedRoute); api = inject(Api);
  admin = !!this.route.snapshot.data['admin']; reg = signal(!!this.route.snapshot.data['register']); busy = signal(false);
  f = this.fb.nonNullable.group({ identifier: [''], name: [''], username: [''], mobile: [''], aadhaar: [''], pan: [''], password: ['', Validators.required], referralCode: [(this.route.snapshot.queryParamMap.get('ref') || '').toUpperCase()] });
  up = signal<{ state: 'none' | 'checking' | 'ok' | 'bad' | 'off'; name: string }>({ state: 'none', name: '' });
  constructor() {
    this.route.data.subscribe((d) => { this.reg.set(!!d['register']); this.setV(); }); this.setV();
    // Shows who the code belongs to: for a ?ref= link and for a typed code.
    this.f.controls.referralCode.valueChanges.pipe(
      distinctUntilChanged(),
      switchMap((v) => { const c = (v || '').trim().toUpperCase(); if (c.length < 4) { this.up.set({ state: 'none', name: '' }); return of(null); }
        this.up.set({ state: 'checking', name: '' }); return of(c).pipe(debounceTime(350), switchMap((x) => this.api.get<{ valid: boolean; name?: string }>('/auth/referral/' + encodeURIComponent(x)).pipe(catchError(() => of({ valid: false, name: '', failed: true } as any))))); })
    ).subscribe((r: any) => { if (!r) return; this.up.set(r.failed ? { state: 'off', name: '' } : r.valid ? { state: 'ok', name: r.name } : { state: 'bad', name: '' }); });
    const pre = this.f.controls.referralCode.value; if (pre) this.f.controls.referralCode.setValue(pre);
  }
  setV() {
    const c = this.f.controls; const on = this.reg();
    c.identifier.setValidators(on ? [] : [Validators.required]); c.name.setValidators(on ? [Validators.required, Validators.minLength(2)] : []);
    c.username.setValidators(on ? [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]{3,24}$/)] : []); c.mobile.setValidators(on ? [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)] : []);
    c.aadhaar.setValidators(on ? [Validators.required, Validators.pattern(/^[2-9]\d{3} ?\d{4} ?\d{4}$/)] : []); c.pan.setValidators(on ? [Validators.required, Validators.pattern(/^[A-Za-z]{5}\d{4}[A-Za-z]$/)] : []);
    c.password.setValidators(on ? [Validators.required, Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)] : [Validators.required]);
    Object.values(c).forEach((x) => x.updateValueAndValidity());
  }
  fmtAadhaar() { const c = this.f.controls.aadhaar; const d = c.value.replace(/\D/g, '').slice(0, 12); const t = d.replace(/(\d{4})(?=\d)/g, '$1 '); if (t !== c.value) c.setValue(t); }
  fmtPan() { const c = this.f.controls.pan; const t = c.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10); if (t !== c.value) c.setValue(t); }
  digits() { const c = this.f.controls.mobile; const d = c.value.replace(/\D/g, '').slice(0, 10); if (d !== c.value) c.setValue(d); }
  bad(n: string) { const c = this.f.get(n)!; return c.invalid && (c.touched || c.dirty); }
  submit() {
    this.f.markAllAsTouched(); if (this.f.invalid) return; this.busy.set(true); const v = this.f.getRawValue();
    const o = this.reg() ? this.auth.register({ name: v.name.trim(), username: v.username.trim(), mobile: v.mobile, aadhaar: v.aadhaar.replace(/\D/g, ''), pan: v.pan.toUpperCase(), password: v.password, referralCode: v.referralCode.trim() || undefined })
      : this.auth.login(v.identifier.trim(), v.password, this.admin);
    o.subscribe({ next: () => {
      this.toast.ok('Welcome!'); const ret = this.route.snapshot.queryParamMap.get('returnUrl');
      this.router.navigateByUrl(this.admin ? '/admin' : ret && ret.startsWith('/') && !ret.startsWith('//') ? ret : '/');
    }, error: (e) => { this.busy.set(false); this.toast.err(e); } });
  }
}
