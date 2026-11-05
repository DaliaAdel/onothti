import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import type { AppNotification } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-notify-list',
  imports: [IconComponent],
  template: `
    @if (!items.length) {
      <div class="notify-empty">
        <span class="notify-empty-icon"><app-icon name="bell" /></span>
        <b>لا توجد تنبيهات حاليًا</b>
        <p>ستظهر هنا التنبيهات الجديدة المتعلقة بحسابكِ.</p>
      </div>
    } @else {
      <div class="notify-list">
        @for (item of items; track item.id) {
          <button class="notify-card" type="button" [class.unread]="!item.readAt" (click)="opened.emit(item)">
            <span class="notify-icon" [class.fresh]="!item.readAt">
              <span class="ico"><app-icon name="bell" /></span>
            </span>
            <span class="notify-copy">
              <span class="notify-top">
                <b>{{ locale.localizedName({ nameAr: item.titleAr, nameEn: item.titleEn }, 'إشعار') }}</b>
                @if (!item.readAt) {
                  <em>جديد</em>
                }
              </span>
              <p>{{ locale.localizedName({ nameAr: item.bodyAr, nameEn: item.bodyEn }) }}</p>
              <small>{{ when(item.createdAt) }}</small>
            </span>
            <span class="notify-go" aria-hidden="true"><app-icon name="chev" /></span>
          </button>
        }
      </div>
    }
  `,
})
export class NotifyListComponent {
  readonly locale = inject(LocaleService);
  @Input() items: AppNotification[] = [];
  @Output() opened = new EventEmitter<AppNotification>();

  when(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) {
      return 'الآن';
    }
    if (minutes < 60) {
      return `منذ ${minutes} د`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `منذ ${hours} س`;
    }
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `منذ ${days} يوم`;
    }
    return date.toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
