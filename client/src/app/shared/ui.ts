import { Component, Injectable, Input, Output, EventEmitter, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../core/core';

@Component({ selector: 'app-toasts', standalone: true, imports: [LucideAngularModule], template: `
  <div class="toasts" aria-live="polite">@for (t of toast.items(); track t.id) {
    <div class="toast" [class.err]="t.kind==='err'"><lucide-icon [name]="t.kind==='ok'?'check':'x'" [size]="16"/> <span>{{t.text}}</span></div>}</div>`,
  styles: [`.toasts{position:fixed;right:16px;top:calc(16px + env(safe-area-inset-top));z-index:400;display:grid;gap:8px;max-width:min(400px,calc(100vw - 32px))}
  .toast{display:flex;gap:10px;align-items:center;background:var(--ink);color:#fff;padding:12px 16px;border-radius:12px;box-shadow:var(--sh-lg);font-weight:600;font-size:.9rem;animation:in .25s var(--ease);border-left:4px solid var(--success)}
  .toast.err{border-left-color:var(--danger)} @keyframes in{from{opacity:0;transform:translateX(16px)}}
  @media(max-width:640px){.toasts{left:16px;right:16px;max-width:none}}`] })
export class ToastsComponent { toast = inject(ToastService); }

@Component({ selector: 'app-badge', standalone: true, template: `<span class="badge" [class]="'badge b-' + v">{{label}}</span>` })
export class BadgeComponent { @Input({ required: true }) v = ''; get label() { return (this.v || '').replace('_', ' '); } }

@Component({ selector: 'app-modal', standalone: true, imports: [LucideAngularModule], template: `
  @if (open) { <div class="backdrop" [class.drawer-bd]="drawer" (click)="close.emit()">
    <div [class]="drawer?'drawer':'modal'" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
      <div class="row between mb"><h3>{{title}}</h3><button type="button" class="btn btn-ghost btn-sm" (click)="close.emit()" aria-label="Close"><lucide-icon name="x" [size]="16"/></button></div>
      <ng-content/></div></div> }` })
export class ModalComponent {
  @Input() open = false; @Input() title = ''; @Input() drawer = false; @Output() close = new EventEmitter<void>();
  @HostListener('document:keydown.escape') esc() { if (this.open) this.close.emit(); }
}

@Component({ selector: 'app-empty', standalone: true, template: `
  <div class="empty"><svg width="120" height="90" viewBox="0 0 120 90" fill="none" aria-hidden="true"><rect x="14" y="22" width="92" height="56" rx="12" fill="#FBF5E3"/><rect x="26" y="12" width="68" height="46" rx="10" fill="#fff" stroke="#DDD7C4" stroke-width="2"/>
    <circle cx="60" cy="35" r="10" fill="#F2E3B5" stroke="#D4A53A" stroke-width="2"/><path d="M44 66h32" stroke="#E2DCC8" stroke-width="4" stroke-linecap="round"/></svg>
    <h3>{{title}}</h3><p class="sm">{{text}}</p><ng-content/></div>` })
export class EmptyComponent { @Input() title = 'Nothing here yet'; @Input() text = ''; }

@Component({ selector: 'app-skeleton', standalone: true, template: `@for (i of rows; track i) { <div class="sk" [style.height.px]="h" style="margin-bottom:10px"></div> }` })
export class SkeletonComponent { @Input() n = 4; @Input() h = 44; get rows() { return Array.from({ length: this.n }, (_, i) => i); } }

@Component({ selector: 'app-pager', standalone: true, imports: [LucideAngularModule], template: `
  @if (total > limit) { <div class="row between mt"><span class="sm muted">Page {{page}} of {{pages}} · {{total}} records</span>
    <div class="row"><button type="button" class="btn btn-ghost btn-sm" [disabled]="page<=1" (click)="go.emit(page-1)" aria-label="Previous page"><lucide-icon name="chevron-left" [size]="16"/></button>
    <button type="button" class="btn btn-ghost btn-sm" [disabled]="page>=pages" (click)="go.emit(page+1)" aria-label="Next page"><lucide-icon name="chevron-right" [size]="16"/></button></div></div> }` })
export class PagerComponent { @Input() page = 1; @Input() limit = 10; @Input() total = 0; @Output() go = new EventEmitter<number>(); get pages() { return Math.max(1, Math.ceil(this.total / this.limit)); } }

@Component({ selector: 'app-stat', standalone: true, imports: [LucideAngularModule], template: `
  <div class="card stat"><div class="ic" [class.gold]="gold"><lucide-icon [name]="icon" [size]="20"/></div><div class="tx"><div class="sm muted">{{label}}</div><div class="v">{{value}}</div>@if (sub) {<div class="sm muted">{{sub}}</div>}</div></div>`,
  styles: [`.stat{display:flex;gap:14px;align-items:center;padding:18px} .ic{width:44px;height:44px;border-radius:12px;background:var(--ink);color:var(--gold-2);display:grid;place-items:center;flex:none} .ic.gold{background:var(--gold-50);color:var(--gold-deep)}
  .tx{min-width:0}.v{font:800 1.4rem var(--display);color:var(--ink);letter-spacing:-.02em;overflow-wrap:anywhere}`] })
export class StatComponent { @Input() icon = 'wallet'; @Input() label = ''; @Input() value: string | number = ''; @Input() sub = ''; @Input() gold = false; }

@Injectable({ providedIn: 'root' })
export class Confirm {
  state = signal<{ title: string; text: string; danger: boolean; resolve: (v: boolean) => void } | null>(null);
  ask(title: string, text = '', danger = false) { return new Promise<boolean>((resolve) => this.state.set({ title, text, danger, resolve })); }
  done(v: boolean) { this.state()?.resolve(v); this.state.set(null); }
}
@Component({ selector: 'app-confirm', standalone: true, imports: [ModalComponent], template: `
  @if (c.state(); as s) { <app-modal [open]="true" [title]="s.title" (close)="c.done(false)"><p class="muted">{{s.text}}</p>
    <div class="row mt end"><button type="button" class="btn btn-ghost" (click)="c.done(false)">Cancel</button><button type="button" [class]="s.danger?'btn btn-danger':'btn btn-primary'" (click)="c.done(true)">Confirm</button></div></app-modal> }` })
export class ConfirmHostComponent { c = inject(Confirm); }

// WhatsApp-style voice note: record in the browser, or attach an audio file from the phone/computer.
@Component({ selector: 'app-voice', standalone: true, imports: [LucideAngularModule], template: `
  <div class="voice">
    @if (!file()) {
      <div class="row wrap">
        <button type="button" class="btn btn-ghost btn-sm" [class.rec]="recording()" (click)="recording() ? stop() : start()">
          <lucide-icon [name]="recording() ? 'square' : 'mic'" [size]="16"/> {{recording() ? 'Stop · ' + fmt(secs()) : 'Record voice note'}}</button>
        <label class="btn btn-ghost btn-sm"><lucide-icon name="paperclip" [size]="16"/> Upload audio
          <input type="file" hidden accept="audio/*,.opus,.ogg,.m4a,.mp3,.aac,.wav,.webm,.amr" (change)="pick($event)"></label>
      </div>
      @if (msg()) { <p class="hint" style="margin-top:6px">{{msg()}}</p> }
    } @else {
      <div class="row"><audio controls [src]="url()"></audio><button type="button" class="btn btn-ghost btn-sm" (click)="clear()" aria-label="Remove voice note"><lucide-icon name="trash-2" [size]="16"/></button></div>
    }
  </div>`,
  styles: [`.rec{border-color:var(--danger);color:var(--danger);animation:pulse 1.2s infinite}@keyframes pulse{50%{background:var(--danger-50)}}`] })
export class VoiceComponent implements OnDestroy {
  @Output() fileChange = new EventEmitter<File | null>();
  file = signal<File | null>(null); url = signal(''); recording = signal(false); secs = signal(0); msg = signal('');
  private rec?: MediaRecorder; private chunks: Blob[] = []; private timer: any; private stream?: MediaStream;
  async start() {
    this.msg.set('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { this.msg.set('Recording is not available here (it needs HTTPS or localhost). Please upload an audio file instead.'); return; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => (MediaRecorder as any).isTypeSupported?.(t)) || '';
      this.rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
      this.chunks = [];
      this.rec.ondataavailable = (e: any) => { if (e.data && e.data.size) this.chunks.push(e.data); };
      this.rec.onstop = () => {
        const type = (this.rec?.mimeType || mime || 'audio/webm').split(';')[0];
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        this.set(new File([new Blob(this.chunks, { type })], `voice-note.${ext}`, { type })); this.release();
      };
      this.rec.start(); this.recording.set(true); this.secs.set(0);
      this.timer = setInterval(() => { this.secs.update((s) => s + 1); if (this.secs() >= 180) this.stop(); }, 1000);
    } catch { this.msg.set('Microphone permission was denied. You can upload an audio file instead.'); this.release(); }
  }
  stop() { clearInterval(this.timer); if (this.rec && this.rec.state !== 'inactive') this.rec.stop(); this.recording.set(false); }
  pick(e: Event) {
    const input = e.target as HTMLInputElement; const f = input.files?.[0]; input.value = ''; if (!f) return;
    if (f.size > 10 * 1024 * 1024) { this.msg.set('This audio is larger than 10 MB.'); return; }
    this.msg.set(''); this.set(f);
  }
  private set(f: File) { this.file.set(f); this.url.set(URL.createObjectURL(f)); this.fileChange.emit(f); }
  clear() { if (this.url()) URL.revokeObjectURL(this.url()); this.file.set(null); this.url.set(''); this.fileChange.emit(null); }
  private release() { this.stream?.getTracks().forEach((t) => t.stop()); this.stream = undefined; }
  fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  ngOnDestroy() { clearInterval(this.timer); this.release(); if (this.url()) URL.revokeObjectURL(this.url()); }
}

// Password input with an eye button to show / hide what is typed.
@Component({ selector: 'app-password', standalone: true, imports: [ReactiveFormsModule, LucideAngularModule], template: `
  <div class="pw"><input [id]="inputId" [type]="shown() ? 'text' : 'password'" [formControl]="control" [attr.autocomplete]="autocomplete" autocapitalize="none" spellcheck="false">
    <button type="button" class="eye" (click)="shown.set(!shown())" [attr.aria-label]="shown() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="shown()">
      <lucide-icon [name]="shown() ? 'eye-off' : 'eye'" [size]="18"/></button></div>`,
  styles: [`.pw{position:relative}.pw input{width:100%;padding-right:48px}
  .eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:0;background:none;color:var(--muted);cursor:pointer;display:grid;place-items:center;border-radius:10px}
  .eye:hover,.eye:focus-visible{color:var(--ink);background:var(--bg)}`] })
export class PasswordFieldComponent { @Input({ required: true }) control!: FormControl<any>; @Input() inputId = ''; @Input() autocomplete = 'current-password'; shown = signal(false); }
