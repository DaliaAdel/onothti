import { Directive, ElementRef, effect, inject } from '@angular/core';
import { LocaleService } from '../core/locale.service';

@Directive({
  selector: 'input[type=date]',
})
export class LocaleDateDirective {
  private readonly locale = inject(LocaleService);
  private readonly el = inject(ElementRef<HTMLInputElement>);

  constructor() {
    effect(() => {
      const isAr = this.locale.lang() === 'ar';
      const input = this.el.nativeElement;
      input.lang = isAr ? 'ar-SA' : 'en-GB';
      input.dir = isAr ? 'rtl' : 'ltr';
      input.classList.add('locale-date');
    });
  }
}
