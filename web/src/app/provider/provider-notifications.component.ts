import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { AppNotification } from '../core/models';
import { notificationLink } from '../core/notification-link';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { NotifyListComponent } from '../shared/notify-list.component';

@Component({
  selector: 'app-provider-notifications',
  imports: [NotifyListComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>الإشعارات</h1>
        <p>تحديثات الحساب والاشتراك والطلبات</p>
      </div>
      <div class="notify-actions">
        @if (unread) {
          <span class="notify-badge">{{ unread }} غير مقروء</span>
        }
        <button class="btn ghost" type="button" (click)="readAll()">تحديد الكل كمقروء</button>
      </div>
    </div>
    <app-notify-list [items]="items" (opened)="open($event)" />
  `,
})
export class ProviderNotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  items: AppNotification[] = [];

  get unread(): number {
    return this.items.filter((item) => !item.readAt).length;
  }

  ngOnInit(): void {
    this.shell.set('الإشعارات');
    this.reload();
  }

  open(item: AppNotification): void {
    this.markRead(item);
    void this.router.navigateByUrl(notificationLink(this.session.user()?.accountType, item));
  }

  readAll(): void {
    this.api.readAllNotifications().subscribe({ next: () => this.reload() });
  }

  private markRead(item: AppNotification): void {
    if (item.readAt) {
      return;
    }
    this.api.readNotification(item.id).subscribe({
      next: () => {
        item.readAt = new Date().toISOString();
      },
    });
  }

  private reload(): void {
    this.api.notifications().subscribe({ next: (items) => (this.items = items) });
  }
}
