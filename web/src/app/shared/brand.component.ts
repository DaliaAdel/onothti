import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-brand',
  imports: [RouterLink],
  template: `
    <a class="brand" [routerLink]="link">
      <img class="brand-logo" src="/hero.png" [alt]="locale.t('brand.alt')" />
      <div>
        <strong>أنوثتي</strong>
        <small>{{ locale.t('brand.tagline') }}</small>
      </div>
    </a>
  `,
})
export class BrandComponent {
  readonly locale = inject(LocaleService);
  @Input() link = '/login';
}
