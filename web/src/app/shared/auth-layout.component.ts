import { Component, Input } from '@angular/core';
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
      <div class="auth-brand"><app-brand /></div>
      <section class="auth-panel">
        <ng-content />
      </section>
      @if (variant === 'default') {
        <section class="auth-visual">
          <div class="visual-inner">
            <img class="visual-logo" src="/hero.png" alt="" />
            <h2>مساحتكِ للجمال بثقة</h2>
            <p>منصة أنثوية تجمع الباحثات عن خدمات الجمال بصانعات جمال محترفات في تجربة واضحة وآمنة.</p>
            <div class="trust-row">
              <span><i>✓</i> حسابات مراجعة</span>
              <span><i>✓</i> خصوصية آمنة</span>
              <span><i>✓</i> تجربة سهلة</span>
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
  @Input() variant: 'default' | 'customer' | 'provider' = 'default';
  @Input() visualIcon = 'spark';
  @Input() visualTitle = '';
  @Input() visualSub = '';
  @Input() visualFeatures: string[] = [];
}
