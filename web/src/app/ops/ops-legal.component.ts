import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { LegalAudience, LegalKind, OpsLegalPage } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { keepSelected } from './ops-ui';

const emptyDraft = () => ({
  audience: 'CUSTOMER' as LegalAudience,
  kind: 'TERMS' as LegalKind,
  titleAr: '',
  bodyAr: '',
  isActive: true,
});

@Component({
  selector: 'app-ops-legal',
  imports: [FormsModule, OpsDrawerComponent, OpsModalComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>الشروط والسياسات</h2>
        <p>أضيفي صفحة وحددي الجمهور والنوع وهل هي نشطة.</p>
      </div>
      @if (canManage) {
        <button class="btn primary" type="button" (click)="openAdd()">+ إضافة صفحة</button>
      }
    </div>

    <app-ops-modal [open]="adding" title="إضافة صفحة" kicker="شروط وسياسات" (closed)="adding = false">
      <div class="form-grid">
        <div class="field">
          <label>الجمهور</label>
          <select class="input" [(ngModel)]="draft.audience">
            <option value="CUSTOMER">العميلة</option>
            <option value="PROVIDER">الخبيرة</option>
            <option value="STAFF">موظفو المنصة</option>
          </select>
        </div>
        <div class="field">
          <label>النوع</label>
          <select class="input" [(ngModel)]="draft.kind">
            <option value="TERMS">شروط وأحكام</option>
            <!-- <option value="POLICIES">سياسة</option> -->
            <option value="PRIVACY">سياسة الخصوصية</option>
            <!-- <option value="OTHER">أخرى</option> -->
          </select>
        </div>
        <div class="field">
          <label>الحالة</label>
          <select class="input" [(ngModel)]="draft.isActive">
            <option [ngValue]="true">نشطة</option>
            <option [ngValue]="false">غير نشطة</option>
          </select>
        </div>
        <div class="field full">
          <label>العنوان</label>
          <input class="input" [(ngModel)]="draft.titleAr" />
        </div>
        <div class="field full">
          <label>النص</label>
          <textarea class="input" rows="8" [(ngModel)]="draft.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="create()">إضافة الصفحة</button>
    </app-ops-modal>

    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!pages.length) {
      <p class="page-empty">لا توجد صفحات بعد.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الجمهور</th>
              <th>النوع</th>
              <th>العنوان</th>
              <th>النسخة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            @for (item of pages; track item.id) {
              <tr [class.active]="selected?.id === item.id" (click)="selected = item">
                <td><b>{{ audienceLabel(item.audience) }}</b></td>
                <td>{{ kindLabel(item.kind) }}</td>
                <td>{{ item.titleAr }}</td>
                <td>{{ item.version }}</td>
                <td>
                  <span class="status {{ item.isActive ? 'success' : 'error' }}">
                    {{ item.isActive ? 'نشطة' : 'غير نشطة' }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <app-ops-drawer
      [open]="!!selected"
      [title]="selected ? selected.titleAr : ''"
      [kicker]="selected ? audienceLabel(selected.audience) + ' · ' + kindLabel(selected.kind) : ''"
      (closed)="selected = null"
    >
      @if (selected; as item) {
        <div class="form-grid">
          <div class="field">
            <label>الجمهور</label>
            <select class="input" [(ngModel)]="item.audience">
              <option value="CUSTOMER">العميلة</option>
              <option value="PROVIDER">الخبيرة</option>
              <option value="STAFF">موظفو المنصة</option>
            </select>
          </div>
          <div class="field">
            <label>النوع</label>
            <select class="input" [(ngModel)]="item.kind">
              <option value="TERMS">شروط وأحكام</option>
              <option value="POLICIES">سياسة</option>
              <option value="PRIVACY">سياسة الخصوصية</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>العنوان</label>
          <input class="input" [(ngModel)]="item.titleAr" />
        </div>
        <div class="field">
          <label>النص</label>
          <textarea class="input" rows="12" [(ngModel)]="item.bodyAr"></textarea>
        </div>
        @if (canManage) {
          <div class="ops-drawer-actions">
            <button class="btn primary" type="button" (click)="save(item)">حفظ الصفحة</button>
            <button class="btn ghost" type="button" (click)="toggle(item)">
              {{ item.isActive ? 'اخفاء' : 'اظهار' }}
            </button>
          </div>
        }
      }
    </app-ops-drawer>
  `,
})
export class OpsLegalComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  get canManage(): boolean {
    return this.session.hasAnyPermission('LEGAL_MANAGE', 'RAT-05');
  }

  loading = true;
  adding = false;
  pages: OpsLegalPage[] = [];
  selected: OpsLegalPage | null = null;
  draft = emptyDraft();

  ngOnInit(): void {
    this.shell.set('الشروط والسياسات', 'صفحات العميلة والخبيرة وموظفي المنصة');
    this.load();
  }

  audienceLabel(value: string): string {
    if (value === 'PROVIDER') {
      return 'الخبيرة';
    }
    if (value === 'STAFF') {
      return 'موظفو المنصة';
    }
    return 'العميلة';
  }

  kindLabel(value: string): string {
    if (value === 'POLICIES') {
      return 'سياسة';
    }
    if (value === 'PRIVACY') {
      return 'سياسة الخصوصية';
    }
    if (value === 'OTHER') {
      return 'أخرى';
    }
    return 'شروط وأحكام';
  }

  openAdd(): void {
    if (!this.canManage) {
      this.toast.show('ليست لديكِ صلاحية هذا الإجراء');
      return;
    }
    this.draft = emptyDraft();
    this.adding = true;
  }

  create(): void {
    if (!this.canManage) {
      this.toast.show('ليست لديكِ صلاحية هذا الإجراء');
      return;
    }
    if (this.draft.titleAr.trim().length < 2 || this.draft.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي العنوان والنص');
      return;
    }
    this.api.opsCreateLegal(this.draft).subscribe({
      next: (row) => {
        this.pages = [...this.pages, row];
        this.selected = row;
        this.adding = false;
        this.draft = emptyDraft();
        this.toast.show('تمت إضافة الصفحة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الصفحة')),
    });
  }

  save(item: OpsLegalPage): void {
    if (!this.canManage) {
      this.toast.show('ليست لديكِ صلاحية هذا الإجراء');
      return;
    }
    if (item.titleAr.trim().length < 2 || item.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي العنوان والنص');
      return;
    }
    this.api
      .opsPatchLegal(item.id, {
        titleAr: item.titleAr,
        bodyAr: item.bodyAr,
        audience: item.audience,
        kind: item.kind,
      })
      .subscribe({
        next: (row) => {
          Object.assign(item, row);
          this.toast.show('تم حفظ الصفحة');
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الصفحة')),
      });
  }

  toggle(item: OpsLegalPage): void {
    if (!this.canManage) {
      this.toast.show('ليست لديكِ صلاحية هذا الإجراء');
      return;
    }
    this.api.opsPatchLegal(item.id, { isActive: !item.isActive }).subscribe({
      next: (row) => {
        Object.assign(item, row);
        this.toast.show(row.isActive ? 'الصفحة نشطة' : 'تم إيقاف الصفحة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث الحالة')),
    });
  }

  private load(): void {
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
}
