import { Component, Input, inject } from '@angular/core';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-auth-layout',
  template: `
    <div class="auth-layout">
      <div class="auth-screen-bg" aria-hidden="true"></div>
      <div class="auth-lang lang-switch" role="group" aria-label="Language">
        <button type="button" [class.active]="locale.lang() === 'ar'" (click)="locale.set('ar')">عربي</button>
        <button type="button" [class.active]="locale.lang() === 'en'" (click)="locale.set('en')">EN</button>
      </div>
      <div class="auth-stage">
        <div class="auth-logo-lockup">
          <img src="/assets/logo-auth.png" alt="أنوثتي" width="512" height="512" />
          <p>منصة الأنوثة والجمال</p>
        </div>
        <section class="auth-panel">
          <ng-content />
        </section>
      </div>
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
