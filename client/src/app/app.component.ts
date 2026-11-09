import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastsComponent, ConfirmHostComponent } from './shared/ui';
import { Auth, Site } from './core/core';
@Component({ selector: 'app-root', standalone: true, imports: [RouterOutlet, ToastsComponent, ConfirmHostComponent],
  template: `<router-outlet/><app-toasts/><app-confirm/>` })
export class AppComponent implements OnInit {
  private a = inject(Auth); private site = inject(Site);
  ngOnInit() { this.site.load(); if (this.a.token) this.a.refresh().subscribe({ error: () => {} }); }
}
