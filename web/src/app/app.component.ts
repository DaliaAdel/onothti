import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LocaleService } from './core/locale.service';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';
import { ToastComponent } from './shared/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, ConfirmDialogComponent],
  template: `
    <router-outlet />
    <app-toast />
    <app-confirm-dialog />
  `,
})
export class AppComponent {
  constructor() {
    inject(LocaleService);
  }
}
