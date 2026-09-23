import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import type { ProviderViews } from '../core/models';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-views',
  template: `
    <article class="card metric">
      <div>
        <span>مشاهدات آخر 30 يومًا</span>
        <strong>{{ data?.total ?? 0 }}</strong>
      </div>
    </article>
    @if (!data?.items?.length) {
      <p class="page-empty">لا توجد مشاهدات بعد.</p>
    } @else {
      <div class="grid two" style="margin-top:18px">
        @for (item of data!.items; track $index) {
          <article class="card">
            <h3 style="color:var(--plum);margin:0">{{ item.viewCount }}</h3>
            <p style="color:var(--muted);font-size:11px">
              {{ formatDate(item.date) }} · {{ locale.localizedName(item.city, '—') }}
            </p>
          </article>
        }
      </div>
    }
  `,
})
export class ProviderViewsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  data: ProviderViews | null = null;

  ngOnInit(): void {
    this.shell.set('المشاهدات', 'أداء ظهور ملفك');
    this.api.providerViews().subscribe({ next: (data) => (this.data = data) });
  }

  formatDate(value: string): string {
    return String(value).slice(0, 10);
  }
}
