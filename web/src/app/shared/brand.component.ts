import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-brand',
  imports: [RouterLink],
  template: `
    <a class="brand" [routerLink]="link">
      <img [src]="locale.logoSrc()" [alt]="locale.t('brand.alt')" />
      <div>
        <small>{{ locale.t('brand.platform') }}</small>
      </div>
    </a>
  `,
})
export class BrandComponent {
  readonly locale = inject(LocaleService);
  @Input() link = '/login';
}
