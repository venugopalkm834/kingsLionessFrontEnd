import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/core';
import { ICONS } from './shared/icons';
/** After a new deploy the old page may still ask for chunk files that no longer exist. Reload once to pick up the new version. */
class ChunkAwareErrorHandler implements ErrorHandler {
  handleError(e: any) {
    const msg = String(e?.message || e || '');
    if (/dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(msg)) {
      try {
        const last = Number(sessionStorage.getItem('kl_chunk_reload') || 0);
        if (Date.now() - last > 60000) { sessionStorage.setItem('kl_chunk_reload', String(Date.now())); location.reload(); return; } // once a minute at most, so it can never loop
      } catch { /* storage blocked: just log */ }
    }
    console.error(e);
  }
}
export const appConfig: ApplicationConfig = {
  providers: [{ provide: ErrorHandler, useClass: ChunkAwareErrorHandler }, provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })), provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(LucideAngularModule.pick(ICONS))],
};
