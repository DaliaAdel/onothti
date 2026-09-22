import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast" [class.show]="toast.visible()">{{ toast.message() }}</div>
  `,
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
