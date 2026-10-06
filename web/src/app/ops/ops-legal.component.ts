import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsLegalPage } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-ops-legal',
  imports: [FormsModule],
  template: `
    <div class="section-head">
      <div>
        <h2>الشروط والسياسات</h2>
        <p>نصوص الشروط والأحكام وسياسة الخصوصية للعميلة والخبيرة. التعديل يظهر فورًا في صفحات التسجيل.</p>
      </div>
    </div>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else {
      <div class="grid two">
        @for (item of pages; track item.id) {
          <article class="card">
            <p class="muted small">{{ codeLabel(item.code) }} · نسخة {{ item.version }}</p>
            <div class="field" style="margin-top:10px">
              <label>العنوان</label>
              <input class="input" [(ngModel)]="item.titleAr" />
            </div>
            <div class="field">
              <label>النص</label>
              <textarea class="input" rows="10" [(ngModel)]="item.bodyAr"></textarea>
            </div>
            <button class="btn primary" type="button" (click)="save(item)">حفظ الصفحة</button>
          </article>
        }
      </div>
    }
  `,
})
export class OpsLegalComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  loading = true;
  pages: OpsLegalPage[] = [];

  ngOnInit(): void {
    this.shell.set('الشروط والسياسات', 'نصوص العميلة والخبيرة');
    this.api.opsLegal().subscribe({
      next: (pages) => {
        this.pages = pages;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الصفحات القانونية'));
      },
    });
  }

  codeLabel(code: string): string {
    const labels: Record<string, string> = {
      TERMS_CUSTOMER: 'شروط وأحكام العميلة',
      TERMS_PROVIDER: 'شروط وأحكام الخبيرة',
      POLICIES_CUSTOMER: 'سياسات العميلة',
      POLICIES_PROVIDER: 'سياسات الخبيرة',
    };
    return labels[code] || code;
  }

  save(item: OpsLegalPage): void {
    if (item.titleAr.trim().length < 2 || item.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي العنوان والنص');
      return;
    }
    this.api
      .opsPatchLegal(item.id, {
        titleAr: item.titleAr,
        bodyAr: item.bodyAr,
        titleEn: item.titleEn,
        bodyEn: item.bodyEn,
      })
      .subscribe({
        next: (row) => {
          item.version = row.version;
          this.toast.show('تم حفظ الصفحة');
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الصفحة')),
      });
  }
}
