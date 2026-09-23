import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../core/favorites.service';
import type { FavoriteRow } from '../core/models';
import { ShellService } from '../core/shell.service';
import { FavoriteBtnComponent } from '../shared/favorite-btn.component';

@Component({
  selector: 'app-customer-favorites',
  imports: [RouterLink, FavoriteBtnComponent],
  template: `
    @if (!favorites.loaded()) {
      <p class="loading">جاري تحميل المفضلة...</p>
    } @else if (favorites.items().length === 0) {
      <article class="card coming-card">
        <h2>لا توجد عناصر في المفضلة</h2>
        <p>اضغطي القلب على ملف صانعة الجمال أو بطاقة الخدمة لحفظها هنا.</p>
        <a class="btn primary" routerLink="/c/services">تصفح الخدمات</a>
      </article>
    } @else {
      <div class="grid two">
        @for (row of favorites.items(); track row.targetType + row.targetId) {
          <article class="card hover provider">
            <div class="provider-photo">{{ label(row).slice(0, 1) }}</div>
            <div>
              <h3>{{ label(row) }}</h3>
              <p>{{ row.targetType === 'PROVIDER' ? 'صانعة جمال' : 'خدمة' }}</p>
            </div>
            <div class="provider-actions">
              <app-favorite-btn [targetType]="row.targetType" [targetId]="row.targetId" />
              @if (row.targetType === 'PROVIDER') {
                <a class="btn ghost" [routerLink]="['/c/providers', row.targetId]">عرض الملف</a>
              } @else {
                <a class="btn ghost" [routerLink]="['/c/providers']" [queryParams]="{ serviceId: row.targetId }">عرض النتائج</a>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class CustomerFavoritesComponent implements OnInit {
  readonly favorites = inject(FavoritesService);
  private readonly shell = inject(ShellService);

  ngOnInit(): void {
    this.shell.set('المفضلة', 'صانعات الجمال والخدمات التي حفظتِها');
    this.favorites.reload();
  }

  label(row: FavoriteRow): string {
    return row.item?.displayName || row.item?.nameAr || 'عنصر محفوظ';
  }
}
