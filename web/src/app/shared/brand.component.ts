import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-brand',
  imports: [RouterLink],
  template: `
    <a class="brand" [routerLink]="link">
      <img class="brand-logo" src="/hero.png" alt="شعار أنوثتي" />
      <div>
        <strong>أنوثتي</strong>
        <small>جمالك أقرب إليك</small>
      </div>
    </a>
  `,
})
export class BrandComponent {
  @Input() link = '/login';
}
