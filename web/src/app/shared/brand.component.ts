import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-brand',
  imports: [RouterLink],
  template: `
    <a class="brand" [routerLink]="link">
      <img src="/assets/logo.png" [alt]="locale.t('brand.alt')" />
      <div>
        <small>منصة الأنوثة والجمال</small>
      </div>
    </a>
  `,
})
export class BrandComponent {
  readonly locale = inject(LocaleService);
  @Input() link = '/login';
}
