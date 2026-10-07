import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsLegalPage } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { keepSelected } from './ops-ui';

@Component({
  selector: 'app-ops-legal',
  imports: [FormsModule, OpsDrawerComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>الشروط والسياسات</h2>
        <p>اضغطي على الصفحة لتحرير النص الذي يظهر في التسجيل.</p>
      </div>
    </div>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الصفحة</th>
              <th>العنوان</th>
              <th>النسخة</th>
            </tr>
          </thead>
          <tbody>
            @for (item of pages; track item.id) {
              <tr [class.active]="selected?.id === item.id" (click)="selected = item">
                <td><b>{{ codeLabel(item.code) }}</b></td>
                <td>{{ item.titleAr }}</td>
                <td>{{ item.version }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <app-ops-drawer
      [open]="!!selected"
      [title]="selected ? codeLabel(selected.code) : ''"
      [kicker]="selected ? 'نسخة ' + selected.version : ''"
      (closed)="selected = null"
    >
      @if (selected; as item) {
        <div class="field">
          <label>العنوان</label>
          <input class="input" [(ngModel)]="item.titleAr" />
        </div>
        <div class="field">
          <label>النص</label>
          <textarea class="input" rows="12" [(ngModel)]="item.bodyAr"></textarea>
        </div>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="save(item)">حفظ الصفحة</button>
        </div>
      }
    </app-ops-drawer>
  `,
})
export class OpsLegalComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  loading = true;
  pages: OpsLegalPage[] = [];
  selected: OpsLegalPage | null = null;

  ngOnInit(): void {
    this.shell.set('الشروط والسياسات', 'نصوص العميلة والخبيرة');
    this.api.opsLegal().subscribe({
      next: (pages) => {
        this.pages = pages;
        this.selected = keepSelected(this.pages, this.selected);
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
