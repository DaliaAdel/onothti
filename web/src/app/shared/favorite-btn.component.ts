import { Component, Input, OnInit, inject } from '@angular/core';
import { FavoritesService } from '../core/favorites.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import { ToastService } from '../core/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-favorite-btn',
  imports: [IconComponent],
  template: `
    <button
      class="icon-btn fav-btn"
      type="button"
      [class.on]="favorites.isSaved(targetType, targetId)"
      [disabled]="busy"
      [attr.aria-pressed]="favorites.isSaved(targetType, targetId)"
      [attr.aria-label]="favorites.isSaved(targetType, targetId) ? locale.t('fav.remove') : locale.t('fav.add')"
      (click)="onClick($event)"
    >
      <app-icon name="heart" />
    </button>
  `,
})
export class FavoriteBtnComponent implements OnInit {
  private readonly toast = inject(ToastService);
  readonly favorites = inject(FavoritesService);
  readonly locale = inject(LocaleService);

  @Input({ required: true }) targetType!: 'PROVIDER' | 'SERVICE';
  @Input({ required: true }) targetId!: string;

  busy = false;

  ngOnInit(): void {
    this.favorites.ensureLoaded();
  }

  onClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.busy || !this.targetId) {
      return;
    }
    this.busy = true;
    const wasSaved = this.favorites.isSaved(this.targetType, this.targetId);
    this.favorites.toggle(this.targetType, this.targetId).subscribe({
      next: () => {
        this.busy = false;
        this.toast.show(wasSaved ? this.locale.t('fav.removed') : this.locale.t('fav.added'));
      },
      error: (err) => {
        this.busy = false;
        this.toast.show(apiMessage(err, this.locale.t('fav.fail')));
      },
    });
  }
}
