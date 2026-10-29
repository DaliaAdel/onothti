import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage, isSaudiMobile, toMobile } from '../core/phone';
import type { CatalogPackage, OpsBannedPhone, OpsManagedAccount } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsAccountFileComponent } from './ops-account-file.component';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { keepSelected, newestFirst, opsDate, statusTone } from './ops-ui';

@Component({
  selector: 'app-ops-clients',
  imports: [FormsModule, OpsAccountFileComponent, OpsDrawerComponent, OpsModalComponent],
  template: `
    @if (!selected) {
      <div class="section-head">
        <div>
          <h2>حسابات عملاء المنصة</h2>
          <p>اضغطي على صف لعرض ملف الخبيرة أو العميلة</p>
        </div>
      </div>

      <div class="filters">
        <button class="chip" type="button" [class.active]="accountType === ''" (click)="setType('')">الكل</button>
        <button class="chip" type="button" [class.active]="accountType === 'PROVIDER'" (click)="setType('PROVIDER')">
          الخبيرات
        </button>
        <button class="chip" type="button" [class.active]="accountType === 'CUSTOMER'" (click)="setType('CUSTOMER')">
          العميلات
        </button>
      </div>

      <article class="card form-card" style="margin-bottom:18px">
        <div class="form-grid">
          <div class="field">
            <label>بحث</label>
            <input class="input" [(ngModel)]="q" placeholder="الاسم أو الجوال أو الرمز" (keyup.enter)="search()" />
          </div>
          <div class="field">
            <label>الحالة</label>
            <select class="input" [(ngModel)]="status" (ngModelChange)="search()">
              <option value="">غير المحذوف</option>
              <option value="ACTIVE">نشط</option>
              <option value="PENDING_APPROVAL">بانتظار الاعتماد</option>
              <option value="RESTRICTED">مقيّد</option>
              <option value="SUSPENDED">موقوف</option>
              <option value="CANCELLED">ملغى</option>
            </select>
          </div>
        </div>
        <button class="btn primary" style="margin-top:14px" type="button" (click)="search()">بحث</button>
      </article>

      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!accounts.length) {
        <p class="page-empty">لا توجد حسابات مطابقة.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>النوع</th>
                <th>الرمز</th>
                <th>الجوال</th>
                <th>المدينة</th>
                <th>الباقة</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                @if (showNotifyColumn) {
                  <th>{{ notifyColumnLabel }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (item of accounts; track item.id) {
                <tr (click)="openAccount(item)">
                  <td><b>{{ item.displayName }}</b></td>
                  <td>{{ typeAr(item.accountType) }}</td>
                  <td>{{ item.accountCode }}</td>
                  <td dir="ltr">{{ item.mobile }}</td>
                  <td>{{ item.customerProfile?.city?.nameAr || item.providerProfile?.city?.nameAr || '—' }}</td>
                  <td>
                    @if (item.accountType === 'PROVIDER') {
                      {{ item.package?.nameAr || 'بدون باقة' }}
                      @if (item.subscriptionEndAt) {
                        <div class="muted small">حتى {{ opsDate(item.subscriptionEndAt) }}</div>
                      }
                    } @else {
                      —
                    }
                  </td>
                  <td><span class="status {{ statusTone(item.status) }}">{{ statusAr(item.status) }}</span></td>
                  <td>{{ opsDate(item.createdAt) }}</td>
                  @if (showNotifyColumn) {
                    <td>
                      @if (canNotify(item)) {
                        <button class="btn ghost" type="button" (click)="onNotifyClick($event, item)">
                          {{ notifyLabel(item) }}
                        </button>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (canBan) {
        <div class="section-head">
          <div>
            <h2>أرقام محظورة</h2>
            <p>الرقم المحظور لا يستطيع إنشاء حساب عميلة أو خبيرة أو الدخول.</p>
          </div>
          <button class="btn primary" type="button" (click)="openBan()">+ حظر رقم</button>
        </div>
        @if (!banned.length) {
          <p class="page-empty">لا توجد أرقام محظورة.</p>
        } @else {
          <div class="ops-table-wrap">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>الجوال</th>
                  <th>السبب</th>
                  <th>بواسطة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                @for (item of banned; track item.mobile) {
                  <tr [class.active]="selectedBan?.mobile === item.mobile" (click)="selectBan(item)">
                    <td dir="ltr"><b>{{ item.mobile }}</b></td>
                    <td class="clip">{{ item.reason }}</td>
                    <td>{{ item.createdBy?.displayName || '—' }}</td>
                    <td>{{ opsDate(item.createdAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    } @else {
      <div class="section-head">
        <div>
          <button class="text-link back" type="button" (click)="closeAccount()">→ رجوع للحسابات</button>
          <h2>{{ selected.displayName }}</h2>
          <p>{{ typeAr(selected.accountType) }} · {{ selected.accountCode }}</p>
        </div>
      </div>

      @if (detailLoading) {
        <p class="loading">جاري تحميل الملف...</p>
      }
      <app-ops-account-file [account]="selected" />

      @if (hasAccountsAction() || canNotify(selected)) {
        <div class="ops-drawer-actions" style="margin-top:16px">
          @if (hasAccountsAction()) {
            <button class="btn primary" type="button" (click)="openAction(selected)">إجراء الحساب</button>
          }
          @if (canNotify(selected)) {
            <button class="btn ghost" type="button" (click)="openNotify(selected)">{{ notifyLabel(selected) }}</button>
          }
        </div>
      }
    }

    <app-ops-modal
      [open]="!!notifyTarget"
      [title]="notifyTarget ? notifyLabel(notifyTarget) : 'إشعار فردي'"
      [kicker]="notifyTarget ? notifyTarget.displayName : ''"
      (closed)="notifyTarget = null"
    >
      @if (notifyTarget) {
        <p class="muted small">{{ notifyTarget.accountCode }} · <span dir="ltr">{{ notifyTarget.mobile }}</span></p>
      }
      <div class="field">
        <label>العنوان</label>
        <input class="input" [(ngModel)]="notifyDraft.titleAr" />
      </div>
      <div class="field">
        <label>النص</label>
        <textarea class="input" rows="3" [(ngModel)]="notifyDraft.bodyAr"></textarea>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="sendNotify()">إرسال الإشعار</button>
    </app-ops-modal>

    <app-ops-modal [open]="addingBan" title="حظر رقم جوال" kicker="حسابات العميلة والخبيرة" (closed)="closeBan()">
      <div class="form-grid">
        <div class="field">
          <label>الجوال</label>
          <input
            class="input"
            dir="ltr"
            [class.invalid]="!!banMobileError"
            [ngModel]="banDraft.mobile"
            (ngModelChange)="onBanMobileChange($event)"
            (paste)="onBanMobilePaste($event)"
            (blur)="onBanMobileBlur()"
            inputmode="numeric"
            maxlength="10"
            placeholder="05xxxxxxxx"
            autocomplete="tel"
            [ngModelOptions]="{standalone: true}"
          />
          @if (banMobileError) {
            <p class="field-error">{{ banMobileError }}</p>
          }
        </div>
        <div class="field">
          <label>السبب</label>
          <input class="input" [(ngModel)]="banDraft.reason" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="ban()">حظر الرقم</button>
    </app-ops-modal>
    <app-ops-drawer
      [open]="!!selectedBan"
      [title]="selectedBan?.mobile || ''"
      kicker="رقم محظور"
      (closed)="selectedBan = null"
    >
      @if (selectedBan; as item) {
        <p class="muted small">{{ item.reason }}</p>
        <p class="muted small">{{ opsDate(item.createdAt) }} · {{ item.createdBy?.displayName || '' }}</p>
        <div class="ops-drawer-actions">
          <button class="btn ghost" type="button" (click)="unban(item.mobile)">رفع الحظر</button>
        </div>
      }
    </app-ops-drawer>

    <app-ops-modal
      [open]="actionOpen"
      title="إجراء الحساب"
      [kicker]="selected ? selected.displayName : ''"
      (closed)="closeAction()"
    >
      @if (selected) {
        <p class="muted small">تغيير الحالة أو الباقة فقط. بيانات الملف غير قابلة للتعديل من هنا.</p>
        <div class="form-grid">
          @if (statusOptions().length) {
            <div class="field">
              <label>الحالة</label>
              <select class="input" [(ngModel)]="nextStatus[selected.id]">
                @for (option of statusOptions(); track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
          }
          @if (selected.accountType === 'PROVIDER' && canChangePackage()) {
            <div class="field">
              <label>باقة الخبيرة</label>
              <select class="input" [(ngModel)]="nextPackage[selected.id]">
                <option value="">بدون تغيير</option>
                @for (pkg of packages; track pkg.id) {
                  <option [value]="pkg.id">{{ pkg.nameAr }}</option>
                }
              </select>
            </div>
          }
        </div>
        @if (selected.accountType === 'PROVIDER' && selected.package) {
          <p class="muted small">
            الحالية: {{ selected.package.nameAr }}@if (selected.subscriptionEndAt) { · حتى {{ opsDate(selected.subscriptionEndAt) }} }
          </p>
        }
        <div class="field" style="margin-top:14px">
          <label>سبب التعديل</label>
          <textarea class="input" rows="3" [(ngModel)]="reasons[selected.id]" placeholder="السبب مطلوب ويُحفظ في سجل الأحداث"></textarea>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="applyAccount(selected)">
          حفظ الإجراء
        </button>
      }
    </app-ops-modal>
  `,
})
export class OpsClientsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;

  accounts: OpsManagedAccount[] = [];
  selected: OpsManagedAccount | null = null;
  loading = true;
  detailLoading = false;
  q = '';
  accountType = '';
  status = '';
  packages: CatalogPackage[] = [];
  nextStatus: Record<string, string> = {};
  nextPackage: Record<string, string> = {};
  reasons: Record<string, string> = {};
  notifyTarget: OpsManagedAccount | null = null;
  notifyDraft = { titleAr: '', bodyAr: '' };
  actionOpen = false;
  banned: OpsBannedPhone[] = [];
  selectedBan: OpsBannedPhone | null = null;
  addingBan = false;
  banMobileTouched = false;
  banDraft = { mobile: '', reason: '' };

  ngOnInit(): void {
    this.shell.set('حسابات عملاء المنصة', 'الخبيرات والعميلات المسجّلات في المنصة');
    if (this.canBan) {
      this.loadBanned();
    }
    this.api.packages().subscribe({
      next: (rows) => (this.packages = rows),
      error: () => undefined,
    });
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type === 'CUSTOMER' || type === 'PROVIDER') {
      this.accountType = type;
    }
    this.search();
  }

  setType(type: string): void {
    this.accountType = type;
    this.search();
  }

  openAccount(item: OpsManagedAccount): void {
    this.selected = item;
    this.nextStatus[item.id] ??= item.status === 'PENDING_APPROVAL' ? 'ACTIVE' : item.status;
    this.nextPackage[item.id] ??= item.package?.id ?? '';
    this.reasons[item.id] ??= '';
    this.shell.set(item.displayName, this.typeAr(item.accountType));
    this.loadFile(item.id);
  }

  closeAccount(): void {
    this.actionOpen = false;
    this.selected = null;
    this.shell.set('حسابات عملاء المنصة', 'الخبيرات والعميلات المسجّلات في المنصة');
  }

  openAction(item: OpsManagedAccount): void {
    if (!this.hasAccountsAction()) {
      this.toast.show('ليست لديكِ صلاحية إجراء الحساب');
      return;
    }
    this.nextStatus[item.id] ??= item.status === 'PENDING_APPROVAL' ? 'ACTIVE' : item.status;
    this.nextPackage[item.id] ??= item.package?.id ?? '';
    this.reasons[item.id] ??= '';
    this.actionOpen = true;
  }

  closeAction(): void {
    this.actionOpen = false;
  }

  search(): void {
    this.loading = true;
    this.api
      .opsAccounts({
        q: this.q || undefined,
        accountType: this.accountType || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.accounts = newestFirst(rows);
          this.selected = keepSelected(this.accounts, this.selected);
          for (const row of rows) {
            this.nextStatus[row.id] ??= row.status === 'PENDING_APPROVAL' ? 'ACTIVE' : row.status;
            this.nextPackage[row.id] ??= row.package?.id ?? '';
            this.reasons[row.id] ??= '';
          }
          if (this.selected) {
            this.loadFile(this.selected.id);
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر تحميل الحسابات'));
        },
      });
  }

  get showNotifyColumn(): boolean {
    return this.session.hasAnyPermission('NOT-01');
  }

  get notifyColumnLabel(): string {
    const provider = this.session.hasPermission('NOT-01');
    const customer = this.session.hasPermission('NOT-01');
    if (provider && !customer) {
      return 'إشعار فردى للخبيرة';
    }
    if (customer && !provider) {
      return 'إشعار فردى للعميلة';
    }
    return 'إشعار فردي';
  }

  canNotify(item: OpsManagedAccount): boolean {
    if (item.accountType === 'PROVIDER') {
      return this.session.hasPermission('NOT-01');
    }
    if (item.accountType === 'CUSTOMER') {
      return this.session.hasPermission('NOT-01');
    }
    return false;
  }

  notifyLabel(item: OpsManagedAccount): string {
    return item.accountType === 'PROVIDER' ? 'إشعار فردى للخبيرة' : 'إشعار فردى للعميلة';
  }

  onNotifyClick(event: Event, item: OpsManagedAccount): void {
    event.stopPropagation();
    this.openNotify(item);
  }

  openNotify(item: OpsManagedAccount): void {
    if (!this.canNotify(item)) {
      this.toast.show(
        item.accountType === 'PROVIDER'
          ? 'ليست لديكِ صلاحية إشعار فردي للخبيرة'
          : 'ليست لديكِ صلاحية إشعار فردي للعميلة',
      );
      return;
    }
    this.notifyTarget = item;
    this.notifyDraft = { titleAr: '', bodyAr: '' };
  }

  sendNotify(): void {
    const item = this.notifyTarget;
    if (!item) {
      return;
    }
    if (this.notifyDraft.titleAr.trim().length < 2 || this.notifyDraft.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي عنوان الإشعار ونصه');
      return;
    }
    this.api.opsNotifyAccount(item.id, this.notifyDraft).subscribe({
      next: () => {
        this.toast.show(`تم إرسال الإشعار إلى ${item.displayName}`);
        this.notifyTarget = null;
        this.notifyDraft = { titleAr: '', bodyAr: '' };
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الإشعار')),
    });
  }

  get canBan(): boolean {
    return this.session.hasAnyPermission('USR-04');
  }

  get banMobileError(): string {
    const mobile = toMobile(this.banDraft.mobile);
    if (!mobile) {
      return this.banMobileTouched ? 'أدخلي رقم الجوال' : '';
    }
    if (isSaudiMobile(mobile)) {
      return '';
    }
    if (this.banMobileTouched || mobile.length >= 10 || !mobile.startsWith('05')) {
      return 'أدخلي جوالًا سعوديًا من 10 أرقام يبدأ بـ 05';
    }
    return '';
  }

  selectBan(item: OpsBannedPhone): void {
    this.selectedBan = item;
  }

  openBan(): void {
    this.banMobileTouched = false;
    this.banDraft = { mobile: '', reason: '' };
    this.addingBan = true;
  }

  closeBan(): void {
    this.addingBan = false;
    this.banDraft = { mobile: '', reason: '' };
    this.banMobileTouched = false;
  }

  onBanMobileChange(value: string): void {
    this.banDraft.mobile = toMobile(value);
  }

  onBanMobilePaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.banDraft.mobile = toMobile(event.clipboardData?.getData('text') ?? '');
  }

  onBanMobileBlur(): void {
    this.banMobileTouched = true;
  }

  ban(): void {
    this.banMobileTouched = true;
    const mobile = toMobile(this.banDraft.mobile);
    if (!isSaudiMobile(mobile)) {
      return;
    }
    if (this.banDraft.reason.trim().length < 4) {
      this.toast.show('أدخلي سبب الحظر');
      return;
    }
    this.api.opsBanPhone({ mobile, reason: this.banDraft.reason }).subscribe({
      next: () => {
        this.toast.show('تم حظر الرقم');
        this.closeBan();
        this.loadBanned();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حظر الرقم')),
    });
  }

  unban(mobile: string): void {
    this.api.opsUnbanPhone(mobile).subscribe({
      next: () => {
        this.toast.show('تم رفع الحظر');
        this.selectedBan = null;
        this.loadBanned();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر رفع الحظر')),
    });
  }

  hasAccountsAction(): boolean {
    return this.session.hasAnyPermission('USR-01', 'USR-05', 'USR-06') || this.canChangePackage();
  }

  canChangePackage(): boolean {
    return this.session.hasAnyPermission('USR-01', 'PKG-04');
  }

  statusOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    if (this.session.hasPermission('USR-01')) {
      options.push(
        { value: 'INACTIVE', label: 'غير نشط' },
        { value: 'ACTIVE', label: 'نشط' },
        { value: 'SUSPENDED', label: 'معطل' },
        { value: 'CANCELLED', label: 'رقم محذوف' },
      );
    }
    if (this.session.hasPermission('USR-05')) {
      options.push(
        { value: 'RESTRICTED', label: 'مقيّد' },
        { value: 'UNRESTRICTED', label: 'غير مقيّد' },
      );
    }
    if (this.session.hasPermission('USR-06')) {
      options.push({ value: 'DELETED', label: 'محذوف' });
    }
    return options;
  }

  applyAccount(item: OpsManagedAccount): void {
    if (!this.hasAccountsAction()) {
      this.toast.show('ليست لديكِ صلاحية إجراء الحساب');
      return;
    }
    const reason = (this.reasons[item.id] || '').trim();
    if (reason.length < 4) {
      this.toast.show('أدخلي سبب التعديل (4 أحرف على الأقل). يُحفظ في سجل الأحداث');
      return;
    }
    const status = this.nextStatus[item.id];
    const packageId = item.accountType === 'PROVIDER' ? this.nextPackage[item.id] || undefined : undefined;
    const statusChanged = Boolean(status && status !== item.status);
    const packageChanged = Boolean(packageId && packageId !== (item.package?.id || ''));
    if (!statusChanged && !packageChanged) {
      this.toast.show('لا يوجد تغيير للحفظ');
      return;
    }
    this.api
      .opsPatchAccount(item.id, {
        ...(statusChanged ? { status } : {}),
        ...(packageChanged ? { packageId } : {}),
        reason,
      })
      .subscribe({
        next: (row) => {
          this.selected = row;
          this.nextPackage[row.id] = row.package?.id ?? '';
          this.actionOpen = false;
          this.toast.show('تم حفظ إجراء الحساب');
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث الحساب')),
      });
  }

  typeAr(type: string): string {
    return type === 'PROVIDER' ? 'خبيرة' : 'عميلة';
  }

  statusAr(status: string): string {
    const labels: Record<string, string> = {
      ACTIVE: 'نشط',
      INACTIVE: 'غير نشط',
      PENDING_APPROVAL: 'بانتظار الاعتماد',
      RESTRICTED: 'مقيّد',
      SUSPENDED: 'موقوف',
      CANCELLED: 'ملغى',
      DELETED: 'محذوف',
    };
    return labels[status] ?? status;
  }

  private loadBanned(): void {
    this.api.opsBannedPhones().subscribe({
      next: (rows) => {
        this.banned = newestFirst(rows);
        this.selectedBan = this.selectedBan
          ? this.banned.find((row) => row.mobile === this.selectedBan?.mobile) ?? null
          : null;
      },
      error: () => undefined,
    });
  }

  private loadFile(id: string): void {
    this.detailLoading = true;
    this.api.opsAccount(id).subscribe({
      next: (row) => {
        this.selected = row;
        this.shell.set(row.displayName, this.typeAr(row.accountType));
        this.detailLoading = false;
      },
      error: (err) => {
        this.detailLoading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الملف'));
      },
    });
  }
}
