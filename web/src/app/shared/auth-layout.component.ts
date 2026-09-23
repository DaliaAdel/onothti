import { Component, Input, inject } from '@angular/core';
import { LocaleService } from '../core/locale.service';
import { BrandComponent } from './brand.component';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-auth-layout',
  imports: [BrandComponent, IconComponent],
  template: `
    <div
      class="auth-shell"
      [class.researcher-signup]="variant === 'customer'"
      [class.provider-signup]="variant === 'provider'"
    >
      <div class="auth-brand">
        <app-brand />
        <div class="lang-switch" role="group" aria-label="Language">
          <button type="button" [class.active]="locale.lang() === 'ar'" (click)="locale.set('ar')">عربي</button>
          <button type="button" [class.active]="locale.lang() === 'en'" (click)="locale.set('en')">EN</button>
        </div>
      </div>
      <section class="auth-panel">
        <ng-content />
      </section>
      @if (variant === 'default') {
        <section class="auth-visual">
          <div class="visual-inner">
            <img class="visual-logo" src="/hero.png" alt="" />
            <h2>{{ locale.t('auth.visual.title') }}</h2>
            <p>{{ locale.t('auth.visual.text') }}</p>
            <div class="trust-row">
              <span><i>✓</i> {{ locale.t('auth.visual.reviewed') }}</span>
              <span><i>✓</i> {{ locale.t('auth.visual.private') }}</span>
              <span><i>✓</i> {{ locale.t('auth.visual.easy') }}</span>
            </div>
          </div>
        </section>
      } @else {
        <section class="auth-visual role-visual">
          <div class="visual-inner">
            <span class="role-orb"><app-icon [name]="visualIcon" /></span>
            <h2>{{ visualTitle }}</h2>
            <p>{{ visualSub }}</p>
            <div class="role-features">
              @for (item of visualFeatures; track item) {
                <span>{{ item }}</span>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly locale = inject(LocaleService);
  @Input() variant: 'default' | 'customer' | 'provider' = 'default';
  @Input() visualIcon = 'spark';
  @Input() visualTitle = '';
  @Input() visualSub = '';
  @Input() visualFeatures: string[] = [];
}
