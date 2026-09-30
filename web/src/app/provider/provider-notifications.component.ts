import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import type { AppNotification } from '../core/models';
import { ShellService } from '../core/shell.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-notifications',
  imports: [IconComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>الإشعارات</h1>
        <p>تحديثات الحساب والاشتراك والطلبات</p>
      </div>
      <button class="btn ghost" type="button" (click)="readAll()">تحديد الكل كمقروء</button>
    </div>
    <div class="card">
      @if (!items.length) {
        <p class="muted small" style="margin:0">لا توجد إشعارات حاليًا.</p>
      } @else {
        <div class="list">
          @for (item of items; track item.id) {
            <div class="list-row notification-row">
              <div class="notification-mark" [class.success]="!!item.readAt" [class.warning]="!item.readAt">
                <span class="ico"><app-icon name="bell" /></span>
              </div>
              <div class="copy">
                <b>{{ locale.localizedName({ nameAr: item.titleAr, nameEn: item.titleEn }, 'إشعار') }}</b>
                <p>{{ locale.localizedName({ nameAr: item.bodyAr, nameEn: item.bodyEn }) }}</p>
              </div>
              <span class="small muted">{{ when(item.createdAt) }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProviderNotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  items: AppNotification[] = [];

  ngOnInit(): void {
    this.shell.set('الإشعارات');
    this.reload();
  }

  readAll(): void {
    this.api.readAllNotifications().subscribe({ next: () => this.reload() });
  }

  when(value: string): string {
    return value.slice(0, 16).replace('T', ' ');
  }

  private reload(): void {
    this.api.notifications().subscribe({ next: (items) => (this.items = items) });
  }
}
