import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import type { AppNotification } from '../core/models';
import { ShellService } from '../core/shell.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-ops-notifications',
  imports: [IconComponent],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>التنبيهات</h2>
        <p>إشعارات الحساب ومهام التشغيل.</p>
      </div>
      <button class="btn ghost" type="button" (click)="readAll()">تحديد الكل كمقروء</button>
    </div>
    <div class="grid two">
      <article class="card">
        <h3>التنبيهات الجديدة</h3>
        @if (!items.length) {
          <p class="muted small" style="margin:0">لا توجد تنبيهات حاليًا.</p>
        } @else {
          <div class="list">
            @for (item of items; track item.id) {
              <button class="list-row notification-row" type="button" (click)="read(item)" [class.unread]="!item.readAt">
                <div class="notification-mark" [class.success]="!!item.readAt" [class.warning]="!item.readAt">
                  <span class="ico"><app-icon name="bell" /></span>
                </div>
                <div class="copy">
                  <b>{{ locale.localizedName({ nameAr: item.titleAr, nameEn: item.titleEn }, 'إشعار') }}</b>
                  <p>{{ locale.localizedName({ nameAr: item.bodyAr, nameEn: item.bodyEn }) }}</p>
                </div>
                <span class="small muted">{{ when(item.createdAt) }}</span>
              </button>
            }
          </div>
        }
      </article>
      <article class="card">
        <h3>ملخص التنبيهات</h3>
        <div class="grid two">
          <div class="card metric">
            <div>
              <span>غير مقروء</span>
              <strong>{{ unread }}</strong>
            </div>
          </div>
          <div class="card metric">
            <div>
              <span>الإجمالي</span>
              <strong>{{ items.length }}</strong>
            </div>
          </div>
        </div>
      </article>
    </div>
  `,
})
export class OpsNotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  items: AppNotification[] = [];

  get unread(): number {
    return this.items.filter((item) => !item.readAt).length;
  }

  ngOnInit(): void {
    this.shell.set('التنبيهات', 'تنبيهات لوحة  المعلومات');
    this.reload();
  }

  read(item: AppNotification): void {
    if (item.readAt) {
      return;
    }
    this.api.readNotification(item.id).subscribe({
      next: () => {
        item.readAt = new Date().toISOString();
      },
    });
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
