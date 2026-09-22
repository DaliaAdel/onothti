import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ShellService } from '../core/shell.service';

interface FavoriteRow {
  targetType: string;
  targetId: string;
  item?: { id: string; displayName?: string; nameAr?: string } | null;
}

@Component({
  selector: 'app-customer-favorites',
  imports: [RouterLink],
  template: `
    @if (loading) {
      <p class="loading">جاري تحميل المفضلة...</p>
    } @else if (items.length === 0) {
      <article class="card coming-card">
        <h2>لا توجد عناصر في المفضلة</h2>
        <p>احفظي صانعات الجمال أو الخدمات التي تعجبكِ للرجوع إليها لاحقًا.</p>
        <a class="btn primary" routerLink="/c/services">تصفح الخدمات</a>
      </article>
    } @else {
      <div class="grid two">
        @for (row of items; track row.targetId) {
          <article class="card hover provider">
            <div class="provider-photo">{{ label(row).slice(0, 1) }}</div>
            <div>
              <h3>{{ label(row) }}</h3>
              <p>{{ row.targetType === 'PROVIDER' ? 'صانعة جمال' : 'خدمة' }}</p>
            </div>
            @if (row.targetType === 'PROVIDER') {
              <a class="btn ghost" [routerLink]="['/c/providers', row.targetId]">عرض الملف</a>
            }
          </article>
        }
      </div>
    }
  `,
})
export class CustomerFavoritesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  items: FavoriteRow[] = [];
  loading = true;

  ngOnInit(): void {
    this.shell.set('المفضلة', 'صانعات الجمال والخدمات التي حفظتِها');
    this.api.favorites().subscribe({
      next: (rows) => {
        this.items = rows as FavoriteRow[];
        this.loading = false;
      },
      error: () => {
        this.items = [];
        this.loading = false;
      },
    });
  }

  label(row: FavoriteRow): string {
    return row.item?.displayName || row.item?.nameAr || 'عنصر محفوظ';
  }
}
