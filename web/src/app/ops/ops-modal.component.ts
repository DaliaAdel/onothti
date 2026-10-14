import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ops-modal',
  template: `
    <div
      class="ops-modal-layer"
      [class.open]="open"
      [attr.aria-hidden]="open ? null : 'true'"
      (click)="onLayerClick()"
    >
      <div class="ops-modal-card" role="dialog" aria-modal="true" [attr.aria-label]="title" (click)="$event.stopPropagation()">
        <button class="ops-modal-close" type="button" aria-label="إغلاق" (click)="closed.emit()">×</button>
        @if (kicker) {
          <span class="ops-modal-kicker">{{ kicker }}</span>
        }
        <h2>{{ title }}</h2>
        <div class="ops-modal-body">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class OpsModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() kicker = '';
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.closed.emit();
    }
  }

  onLayerClick(): void {
    if (this.open) {
      this.closed.emit();
    }
  }
}
