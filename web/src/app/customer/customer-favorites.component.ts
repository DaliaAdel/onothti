import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../core/favorites.service';
import { serviceIcon, servicePhoto, type FavoriteRow } from '../core/models';
import { ShellService } from '../core/shell.service';
import { FavoriteBtnComponent } from '../shared/favorite-btn.component';
import { IconComponent } from '../shared/icon.component';

type FavTab = 'SERVICE' | 'PROVIDER';

@Component({
  selector: 'app-customer-favorites',
  imports: [RouterLink, FavoriteBtnComponent, IconComponent],
  template: `
    @if (!favorites.loaded()) {
      <p class="loading">جاري تحميل المفضلة...</p>
    } @else {
      <div class="filter-tabs fav-switch" role="tablist" aria-label="نوع المفضلة">
        <button
          type="button"
          role="tab"
          [class.active]="tab === 'SERVICE'"
          [attr.aria-selected]="tab === 'SERVICE'"
          (click)="setTab('SERVICE')"
        >
          الخدمات
          <span>{{ serviceCount }}</span>
        </button>
        <button
          type="button"
          role="tab"
          [class.active]="tab === 'PROVIDER'"
          [attr.aria-selected]="tab === 'PROVIDER'"
          (click)="setTab('PROVIDER')"
        >
          الخبيرات
          <span>{{ providerCount }}</span>
        </button>
      </div>
      @if (rows.length === 0) {
        <article class="card coming-card">
          <h2>{{ emptyTitle }}</h2>
          <p>{{ emptyText }}</p>
          <a class="btn primary" [routerLink]="emptyLink">{{ emptyAction }}</a>
        </article>
      } @else if (tab === 'SERVICE') {
        <div class="grid four">
          @for (row of rows; track row.targetType + row.targetId) {
            <article class="card hover service-card photo-service">
              <app-favorite-btn class="service-fav" targetType="SERVICE" [targetId]="row.targetId" />
              <a class="service-open" [routerLink]="['/c/providers']" [queryParams]="{ serviceId: row.targetId }">
                <div class="service-art">
                  <img class="service-cover" [src]="photoOf(row)" alt="" loading="lazy" decoding="async" />
                  <img class="service-mini-icon" [src]="iconOf(row)" alt="" loading="lazy" decoding="async" />
                </div>
                <div class="service-body">
                  <h3>{{ label(row) }}</h3>
                  <p>اكتشفي الخبيرات لهذه الخدمة</p>
                  <span class="arrow"><app-icon name="chev" /></span>
                </div>
              </a>
            </article>
          }
        </div>
      } @else {
        <div class="grid two">
          @for (row of rows; track row.targetType + row.targetId) {
            <article class="card hover provider">
              <div class="provider-photo">{{ label(row).slice(0, 1) }}</div>
              <div>
                <h3>{{ label(row) }}</h3>
                <p>خبيرة</p>
              </div>
              <div class="provider-actions">
                <app-favorite-btn targetType="PROVIDER" [targetId]="row.targetId" />
                <a class="btn ghost" [routerLink]="['/c/providers', row.targetId]">عرض الملف</a>
              </div>
            </article>
          }
        </div>
      }
    }
  `,
})
export class CustomerFavoritesComponent implements OnInit {
  readonly favorites = inject(FavoritesService);
  private readonly shell = inject(ShellService);
  tab: FavTab = 'SERVICE';

  ngOnInit(): void {
    this.shell.set('المفضلة', 'الخبيرات والخدمات التي حفظتِها');
    this.favorites.reload();
  }

  setTab(tab: FavTab): void {
    this.tab = tab;
  }

  get serviceCount(): number {
    return this.favorites.items().filter((row) => row.targetType === 'SERVICE').length;
  }

  get providerCount(): number {
    return this.favorites.items().filter((row) => row.targetType === 'PROVIDER').length;
  }

  get rows(): FavoriteRow[] {
    return this.favorites.items().filter((row) => row.targetType === this.tab);
  }

  get emptyTitle(): string {
    return this.tab === 'SERVICE' ? 'لا توجد خدمات في المفضلة' : 'لا توجد خبيرات في المفضلة';
  }

  get emptyText(): string {
    return this.tab === 'SERVICE'
      ? 'اضغطي القلب على بطاقة الخدمة لحفظها هنا.'
      : 'اضغطي القلب على ملف الخبيرة لحفظها هنا.';
  }

  get emptyLink(): string {
    return this.tab === 'SERVICE' ? '/c/services' : '/c/providers';
  }

  get emptyAction(): string {
    return this.tab === 'SERVICE' ? 'تصفح الخدمات' : 'تصفح الخبيرات';
  }

  label(row: FavoriteRow): string {
    return row.item?.displayName || row.item?.nameAr || 'عنصر محفوظ';
  }

  photoOf(row: FavoriteRow): string {
    return servicePhoto(row.item);
  }

  iconOf(row: FavoriteRow): string {
    return serviceIcon(row.item);
  }
}
