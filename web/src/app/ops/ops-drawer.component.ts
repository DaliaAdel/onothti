import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-ops-drawer',
  template: `
    @if (open) {
      <div class="ops-drawer-layer">
        <button class="ops-drawer-backdrop" type="button" [attr.aria-label]="locale.t('ui.close')" (click)="closed.emit()"></button>
        <aside class="ops-drawer" role="dialog" [attr.aria-label]="title || locale.t('ops.ui.details')">
          <header class="ops-drawer-head">
            <div>
              @if (kicker) {
                <p class="muted small">{{ kicker }}</p>
              }
              <h3>{{ title }}</h3>
            </div>
            <button class="btn ghost" type="button" (click)="closed.emit()">{{ locale.t('ui.close') }}</button>
          </header>
          <div class="ops-drawer-body">
            <ng-content />
          </div>
        </aside>
      </div>
    }
  `,
})
export class OpsDrawerComponent {
  readonly locale = inject(LocaleService);
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
}
