import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../core/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (confirm.open()) {
      <div class="logout-layer" (click)="confirm.dismiss()">
        <div
          class="logout-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          (click)="$event.stopPropagation()"
        >
          <button class="logout-close" type="button" aria-label="إغلاق" (click)="confirm.dismiss()">×</button>
          <div class="logout-heart" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
            </svg>
          </div>
          <h2 id="confirm-title">{{ confirm.title() }}</h2>
          <p>{{ confirm.message() }}</p>
          <div class="logout-actions">
            <button class="btn primary" type="button" (click)="confirm.dismiss()">{{ confirm.cancelLabel() }}</button>
            <button class="btn ghost" type="button" (click)="confirm.accept()">{{ confirm.confirmLabel() }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly confirm = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirm.open()) {
      this.confirm.dismiss();
    }
  }
}
