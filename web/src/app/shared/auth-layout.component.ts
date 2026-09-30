import { Component, Input, inject } from '@angular/core';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-auth-layout',
  template: `
    <div class="auth-layout">
      <div class="auth-lang lang-switch" role="group" aria-label="Language">
        <button type="button" [class.active]="locale.lang() === 'ar'" (click)="locale.set('ar')">عربي</button>
        <button type="button" [class.active]="locale.lang() === 'en'" (click)="locale.set('en')">EN</button>
      </div>
      <section class="auth-brand">
        <div class="auth-brand-copy auth-entry-brand">
          <img src="/assets/logo-auth.png" alt="أنوثتي" />
          <p>منصة الأنوثة والجمال</p>
        </div>
      </section>
      <section class="auth-panel">
        <ng-content />
      </section>
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly locale = inject(LocaleService);
  @Input() variant: 'default' | 'customer' | 'provider' = 'default';
  @Input() visualTitle = '';
  @Input() visualSub = '';
  @Input() visualFeatures: string[] = [];
}
