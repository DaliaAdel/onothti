import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <button class="toast" type="button" [class.show]="toast.visible()" (click)="toast.hide()" role="status">
      <span class="toast-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </span>
      <span class="toast-text">{{ toast.message() }}</span>
    </button>
  `,
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
