import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of, type Observable } from 'rxjs';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage } from '../core/phone';
import type { OpsManagedAccount, OpsMediaItem, OpsPendingProvider, OpsProfileChange, OpsRating } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { clip, newestFirst, opsDate } from './ops-ui';

type ApprovalKind = 'account' | 'name' | 'photo' | 'bio' | 'rating' | 'portfolio' | 'receipt';
type ApprovalView = 'all' | 'accounts' | ApprovalKind;
type Tone = 'pending' | 'approved' | 'rejected';

type ApprovalItem = {
  id: string;
  kind: ApprovalKind;
  createdAt: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  accountType?: string;
  summary: string;
  previewUrl?: string;
  isVideo?: boolean;
  isPdf?: boolean;
  rating?: OpsRating;
  change?: OpsProfileChange;
  media?: OpsMediaItem;
  provider?: OpsPendingProvider;
};

type AccountGroup = {
  key: string;
  accountId: string;
  name: string;
  code: string;
  type: string;
  previewUrl?: string;
  createdAt: string;
  items: ApprovalItem[];
};

type KindChip = { kind: ApprovalKind; tone: Tone; label: string };

@Component({
  selector: 'app-ops-approvals',
  imports: [FormsModule],
  template: `
    <div class="appr">
      <div class="appr-head">
        <div>
          <h2>قائمة الاعتمادات</h2>
          <p>مراجعة واعتماد الحسابات واسم العرض وصورة العرض والنبذة والتقييم والأعمال والإيصالات.</p>
        </div>
        <span class="appr-status pending">{{ pendingCount }} بانتظار الاعتماد</span>
      </div>

      <div class="appr-summary">
        <div class="appr-metric"><span>طلبات الاعتماد</span><b>{{ items.length }}</b></div>
        <div class="appr-metric"><span>بانتظار الاعتماد</span><b>{{ pendingCount }}</b></div>
        <div class="appr-metric"><span>تم اعتمادها</span><b>{{ approvedCount }}</b></div>
        <div class="appr-metric"><span>حسابات مكتملة</span><b>{{ completeCount }}</b></div>
      </div>

      <div class="appr-toolbar">
        <div class="appr-search">
          <svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg>
          <input [(ngModel)]="search" placeholder="بحث باسم العرض أو رقم الحساب" />
        </div>
        <select class="appr-control" [(ngModel)]="roleFilter">
          <option value="">جميع أنواع الحسابات</option>
          <option value="PROVIDER">خبيرة</option>
          <option value="CUSTOMER">عميلة</option>
        </select>
        <select class="appr-control" [(ngModel)]="statusFilter" (ngModelChange)="onStatusFilter()">
          <option value="">جميع الحالات</option>
          <option value="pending">بانتظار الاعتماد</option>
          <option value="approved">تم الاعتماد</option>
          <option value="rejected">مرفوض</option>
        </select>
        <button class="appr-clear" type="button" (click)="clearFilters()">إعادة ضبط</button>
      </div>

      <div class="appr-tabs">
        <button class="appr-tab" type="button" [class.active]="view === 'all'" (click)="setView('all')">
          الكل <span class="count">{{ pendingCount }}</span>
        </button>
        <button class="appr-tab" type="button" [class.active]="view === 'accounts'" (click)="setView('accounts')">
          الحسابات <span class="count">{{ pendingGroupsCount }}</span>
        </button>
        @for (tab of kindTabs; track tab.id) {
          @if (tab.visible) {
            <button class="appr-tab" type="button" [class.active]="view === tab.id" (click)="setView(tab.id)">
              {{ tab.label }} <span class="count">{{ kindCount(tab.id) }}</span>
            </button>
          }
        }
      </div>

      @if (loading || (decidedLoading && (statusFilter === 'approved' || statusFilter === 'rejected'))) {
        <p class="appr-loading">جاري التحميل...</p>
      } @else if (view === 'accounts' && !visibleGroups.length) {
        <p class="appr-empty">لا توجد نتائج مطابقة للفلاتر الحالية.</p>
      } @else if (view !== 'accounts' && !visibleItems.length) {
        <p class="appr-empty">لا توجد نتائج مطابقة للفلاتر الحالية.</p>
      } @else if (view === 'accounts') {
        <div class="appr-table-card">
          <table class="appr-table">
            <thead>
              <tr>
                <th>الحساب</th>
                <th>نوع الحساب</th>
                <th>عناصر الاعتماد الخاصة بالحساب</th>
                <th>المعتمد</th>
                <th>بانتظار الاعتماد</th>
                <th>الحالة العامة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              @for (group of visibleGroups; track group.key) {
                <tr (click)="openGroup(group)">
                  <td>
                    <div class="appr-account">
                      <div class="appr-avatar">
                        @if (group.previewUrl) {
                          <img [src]="group.previewUrl" alt="" />
                        } @else {
                          {{ group.name.slice(0, 1) }}
                        }
                      </div>
                      <div>
                        <b>{{ group.name }}</b>
                        <small>{{ group.code }}</small>
                      </div>
                    </div>
                  </td>
                  <td><span class="appr-role">{{ accountLabel(group.type) }}</span></td>
                  <td>
                    <div class="appr-progress">
                      @for (chip of chips(group); track chip.kind) {
                        <span class="appr-mini" [class.ok]="chip.tone === 'approved'" [class.wait]="chip.tone === 'pending'" [class.no]="chip.tone === 'rejected'">
                          {{ chip.label }} · {{ toneLabel(chip.tone) }}
                        </span>
                      }
                    </div>
                  </td>
                  <td><span class="appr-status approved">{{ approvedIn(group) }}</span></td>
                  <td><span class="appr-status pending">{{ pendingIn(group) }}</span></td>
                  <td>
                    <span class="appr-status" [class.approved]="isComplete(group)" [class.partial]="!isComplete(group)">
                      {{ approvedIn(group) }} من {{ group.items.length }}
                    </span>
                  </td>
                  <td><button class="appr-btn ghost" type="button" (click)="openGroup(group, $event)">عرض</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="appr-table-card">
          <table class="appr-table">
            <thead>
              <tr>
                <th>الحساب</th>
                <th>نوع الحساب</th>
                <th>نوع الاعتماد</th>
                <th>البيانات المقدمة</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              @for (item of visibleItems; track item.id) {
                <tr (click)="openItem(item)">
                  <td>
                    <div class="appr-account">
                      <div class="appr-avatar">
                        @if (item.previewUrl && !item.isVideo && !item.isPdf) {
                          <img [src]="item.previewUrl" alt="" />
                        } @else {
                          {{ item.accountName.slice(0, 1) }}
                        }
                      </div>
                      <div>
                        <b>{{ item.accountName }}</b>
                        <small>{{ item.accountCode }}</small>
                      </div>
                    </div>
                  </td>
                  <td><span class="appr-role">{{ accountLabel(item.accountType) }}</span></td>
                  <td>
                    <span class="appr-type"><i>{{ kindIcon(item.kind) }}</i>{{ kindLabel(item.kind) }}</span>
                  </td>
                  <td class="appr-preview">
                    @if (item.kind === 'photo') {
                      <span class="appr-mini">معاينة الصورة داخل الحساب</span>
                    } @else {
                      {{ clip(item.summary, 70) }}
                    }
                  </td>
                  <td><span class="appr-status {{ itemTone(item) }}">{{ statusLabel(item) }}</span></td>
                  <td>{{ opsDate(item.createdAt) }}</td>
                  <td><button class="appr-btn ghost" type="button" (click)="openItem(item, $event)">عرض</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <div class="appr-backdrop" [class.open]="!!selectedGroup" (click)="closeDrawer()">
      <aside class="appr-drawer" role="dialog" aria-label="تفاصيل الحساب والاعتمادات" (click)="$event.stopPropagation()">
        <div class="appr-drawer-head">
          <div>
            <small class="muted small">تفاصيل الحساب والاعتمادات</small>
            <h3>{{ drawerTitle }}</h3>
          </div>
          <button class="appr-close" type="button" aria-label="إغلاق" (click)="closeDrawer()">×</button>
        </div>
        @if (selectedGroup; as group) {
          <div class="appr-summary-row">
            <div class="appr-avatar">
              @if (group.previewUrl) {
                <img [src]="group.previewUrl" alt="" />
              } @else {
                {{ group.name.slice(0, 1) }}
              }
            </div>
            <div>
              <h4>{{ group.name }}</h4>
              <span class="appr-role">{{ accountLabel(group.type) }}</span>
              <small class="muted small" style="margin-right:7px">{{ group.code }}</small>
            </div>
          </div>
          @if (!focusedKind) {
            <p class="appr-hint">راجعي كل عنصر واعتمديه أو ارفضيه بصورة مستقلة.</p>
          }
          @for (item of drawerItems; track item.id) {
            <section class="appr-card" [class.focus]="!focusedKind || focusedKind === item.kind">
              <div class="appr-card-head">
                <h5>{{ kindLabel(item.kind) }}</h5>
                <span class="appr-status {{ itemTone(item) }}">{{ statusLabel(item) }}</span>
              </div>
              @if (item.provider) {
                <div class="appr-value">
                  حساب خبيرة بانتظار الاعتماد
                  @if (item.provider.city?.nameAr; as city) {
                    · {{ city }}
                  }
                  @if (item.provider.package?.nameAr; as pack) {
                    · {{ pack }}
                  }
                  <div dir="ltr" style="margin-top:6px">{{ item.provider.mobile }}</div>
                </div>
                @if (accountFileLoading) {
                  <p class="muted small">جاري تحميل الملف...</p>
                }
                @if (accountFile) {
                  <div class="appr-value">
                    {{ accountFile.bio || 'لا توجد نبذة بعد.' }}
                  </div>
                }
                @if (canDecide(item) && canApproveAccounts) {
                  <div class="appr-card-actions">
                    <button class="appr-btn approve" type="button" (click)="reviewProvider(item, true)">اعتماد</button>
                    <button class="appr-btn reject" type="button" (click)="reviewProvider(item, false)">رفض</button>
                    <button class="appr-btn ghost" type="button" (click)="reopen(item)">إعادة للمراجعة</button>
                  </div>
                }
              }
              @if (item.change) {
                <div class="appr-value" [class.appr-photo-value]="item.kind === 'photo' && item.previewUrl">
                  @if (item.kind === 'photo' && item.previewUrl) {
                    <img class="appr-photo" [src]="item.previewUrl" alt="صورة العرض" (click)="openLightbox(item.previewUrl)" />
                    <div class="appr-photo-copy">
                      <b>{{ item.summary }}</b>
                      <p>اضغطي على الصورة لعرضها بالحجم الكامل</p>
                    </div>
                  } @else {
                    <p class="muted small" style="margin:0 0 8px">القيمة الحالية: {{ item.change.oldValue || '—' }}</p>
                    {{ item.change.newValue }}
                  }
                </div>
                @if (canDecide(item) && canSeeProfile) {
                  <div class="appr-card-actions">
                    <button class="appr-btn approve" type="button" (click)="reviewChange(item, true)">اعتماد</button>
                    <button class="appr-btn reject" type="button" (click)="reviewChange(item, false)">رفض</button>
                    <button class="appr-btn ghost" type="button" (click)="reopen(item)">إعادة للمراجعة</button>
                  </div>
                }
              }
              @if (item.rating) {
                <div class="appr-value">
                  <div style="letter-spacing:2px;color:var(--appr-brown);font-size:18px;margin-bottom:6px">{{ stars(item.rating.stars) }}</div>
                  {{ item.rating.note || 'بدون ملاحظة' }}
                  <p class="muted small" style="margin:8px 0 0">{{ item.rating.customer.displayName }} → {{ item.rating.provider.displayName }}</p>
                </div>
                @if (canDecide(item) && canSeeProfile) {
                  <textarea class="input" rows="2" placeholder="ملاحظة اختيارية" [(ngModel)]="ratingNotes[item.rating.id]"></textarea>
                  <div class="appr-card-actions" style="margin-top:10px">
                    <button class="appr-btn approve" type="button" (click)="reviewRating(item, true)">اعتماد</button>
                    <button class="appr-btn reject" type="button" (click)="reviewRating(item, false)">رفض</button>
                    <button class="appr-btn ghost" type="button" (click)="reopen(item)">إعادة للمراجعة</button>
                  </div>
                }
              }
              @if (item.media) {
                <div class="appr-value" [class.appr-photo-value]="!item.isVideo && !item.isPdf && item.previewUrl">
                  @if (item.isVideo && item.previewUrl) {
                    <video [src]="item.previewUrl" controls style="width:100%;border-radius:12px"></video>
                  } @else if (item.isPdf && item.previewUrl) {
                    <a class="appr-btn ghost" [href]="item.previewUrl" target="_blank" rel="noopener">فتح ملف الإيصال</a>
                  } @else if (item.previewUrl) {
                    <img class="appr-photo" [src]="item.previewUrl" alt="معاينة" (click)="openLightbox(item.previewUrl)" />
                    <div class="appr-photo-copy">
                      <b>{{ item.summary }}</b>
                      <p>اضغطي على الصورة لعرضها بالحجم الكامل</p>
                    </div>
                  } @else {
                    {{ item.media.text || item.summary }}
                  }
                </div>
                @if (item.media.proofs.length && canApproveMedia(item.media)) {
                  <div class="appr-dates">
                    <div class="field">
                      <label>تاريخ التفعيل</label>
                      <input class="input" type="date" [(ngModel)]="dates[item.media.id].startAt" />
                    </div>
                    <div class="field">
                      <label>تاريخ الانتهاء</label>
                      <input class="input" type="date" [(ngModel)]="dates[item.media.id].endAt" />
                    </div>
                  </div>
                }
                <textarea class="input" rows="2" placeholder="ملاحظة اختيارية" [(ngModel)]="notes[item.media.id]"></textarea>
                <div class="appr-card-actions" style="margin-top:10px">
                  @if (canEscalate(item.media)) {
                    <button class="appr-btn finance" type="button" (click)="escalate(item)">تحويل للمالية</button>
                  }
                  @if (canApproveMedia(item.media) && canDecide(item)) {
                    <button class="appr-btn approve" type="button" (click)="reviewMedia(item, true)">اعتماد</button>
                    <button class="appr-btn reject" type="button" (click)="reviewMedia(item, false)">رفض</button>
                    <button class="appr-btn ghost" type="button" (click)="reopen(item)">إعادة للمراجعة</button>
                  }
                  @if (item.media.purpose === 'RECEIPT' && canSeeReceipts && itemTone(item) === 'pending') {
                    <button class="appr-btn ghost" type="button" (click)="clearer(item)">طلب صورة أوضح</button>
                  }
                </div>
              }
            </section>
          }
          @if (!focusedKind) {
            <div class="appr-history">
              <h5>سجل الاعتمادات</h5>
              @for (item of historyItems; track item.id) {
                <div class="appr-history-item">
                  <i></i>
                  <div>
                    <b>{{ kindLabel(item.kind) }} — {{ statusLabel(item) }}</b>
                    <small>{{ opsDate(item.createdAt) }}</small>
                  </div>
                </div>
              } @empty {
                <small class="muted small">{{ decidedLoading ? 'جاري تحميل السجل...' : 'لا توجد إجراءات سابقة.' }}</small>
              }
            </div>
          }
          <div class="appr-drawer-foot">
            <button class="appr-btn ghost" type="button" (click)="closeDrawer()">إغلاق</button>
          </div>
        }
      </aside>
    </div>

    <div class="appr-lightbox" [class.open]="!!lightboxUrl" (click)="lightboxUrl = null">
      @if (lightboxUrl) {
        <img [src]="lightboxUrl" alt="صورة العرض بالحجم الكامل" (click)="$event.stopPropagation()" />
      }
    </div>
  `,
})
export class OpsApprovalsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly opsDate = opsDate;
  readonly clip = clip;

  view: ApprovalView = 'all';
  search = '';
  roleFilter = '';
  statusFilter = '';
  loading = true;
  decidedLoading = false;
  private decidedLoaded = false;
  items: ApprovalItem[] = [];
  groups: AccountGroup[] = [];
  selectedGroup: AccountGroup | null = null;
  focusedKind: ApprovalKind | null = null;
  lightboxUrl: string | null = null;
  accountFile: OpsManagedAccount | null = null;
  accountFileLoading = false;
  ratingNotes: Record<string, string> = {};
  notes: Record<string, string> = {};
  dates: Record<string, { startAt: string; endAt: string }> = {};

  kindTabs: { id: ApprovalKind; label: string; visible: boolean }[] = [];

  get canSeeProfile(): boolean {
    return this.session.hasAnyPermission('PRO-02', 'PRO-05', 'PRO-07', 'RAT-01');
  }

  get canSeeContent(): boolean {
    return this.session.hasAnyPermission('PRO-03', 'PRO-06', 'PRO-08', 'PRO-09');
  }

  get canSeeReceipts(): boolean {
    return this.session.hasAnyPermission('FIN-01', 'FIN-02', 'FIN-03', 'FIN-05', 'FIN-06', 'PKG-02');
  }

  get canApproveAccounts(): boolean {
    return this.session.hasAnyPermission('PROVIDERS_APPROVE', 'PRO-05', 'PRO-06', 'PRO-07');
  }

  get pendingCount(): number {
    return this.items.filter((item) => this.itemTone(item) === 'pending').length;
  }

  get pendingGroupsCount(): number {
    return this.groups.filter((group) => group.items.some((item) => this.itemTone(item) === 'pending')).length;
  }

  get approvedCount(): number {
    return this.items.filter((item) => this.itemTone(item) === 'approved').length;
  }

  get completeCount(): number {
    return this.groups.filter((group) => this.isComplete(group)).length;
  }

  get visibleItems(): ApprovalItem[] {
    return this.items.filter((item) => {
      if (this.view !== 'all' && item.kind !== this.view) {
        return false;
      }
      return this.matchesFilters(item);
    });
  }

  get visibleGroups(): AccountGroup[] {
    return this.groups.filter((group) => {
      if (this.roleFilter && group.type !== this.roleFilter) {
        return false;
      }
      if (this.search && !this.matchesQuery(group.name, group.code)) {
        return false;
      }
      if (this.statusFilter && !group.items.some((item) => this.itemTone(item) === this.statusFilter)) {
        return false;
      }
      return true;
    });
  }

  get drawerItems(): ApprovalItem[] {
    const group = this.selectedGroup;
    if (!group) {
      return [];
    }
    const items = group.items.filter((item) => item.kind !== 'account');
    if (this.focusedKind && this.focusedKind !== 'account') {
      return items.filter((item) => item.kind === this.focusedKind);
    }
    return items;
  }

  get historyItems(): ApprovalItem[] {
    return (
      this.selectedGroup?.items.filter((item) => item.kind !== 'account' && this.itemTone(item) !== 'pending') ?? []
    );
  }

  get drawerTitle(): string {
    if (this.focusedKind) {
      return `مراجعة ${this.kindLabel(this.focusedKind)}`;
    }
    return 'اعتمادات الحساب';
  }

  ngOnInit(): void {
    this.shell.set('قائمة الاعتمادات', 'الحسابات والملف والأعمال والإيصالات والتقييم');
    this.refreshTabs();
    this.route.queryParamMap.subscribe((params) => {
      this.view = this.mapQuery(params.get('kind'), params.get('purpose'));
      const account = params.get('account');
      if (account && this.groups.length) {
        this.openAccountKey(account);
      }
    });
    if (this.router.url.includes('/ops/accounts')) {
      this.view = 'accounts';
      void this.router.navigate(['/ops/approvals'], {
        queryParams: { kind: 'accounts' },
        replaceUrl: true,
      });
    }
    this.load();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightboxUrl) {
      this.lightboxUrl = null;
      return;
    }
    if (this.selectedGroup) {
      this.closeDrawer();
    }
  }

  setView(view: ApprovalView): void {
    this.view = view;
    this.closeDrawer();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { kind: view === 'all' ? null : view, purpose: null, account: null },
      queryParamsHandling: 'merge',
    });
  }

  clearFilters(): void {
    this.search = '';
    this.roleFilter = '';
    this.statusFilter = '';
  }

  onStatusFilter(): void {
    if (this.statusFilter === 'approved' || this.statusFilter === 'rejected') {
      this.loadDecided();
    }
  }

  kindCount(kind: ApprovalKind): number {
    return this.items.filter((item) => item.kind === kind && this.itemTone(item) === 'pending').length;
  }

  kindLabel(kind: ApprovalKind): string {
    const labels: Record<ApprovalKind, string> = {
      account: 'الحساب',
      name: 'اسم العرض',
      photo: 'صورة العرض',
      bio: 'النبذة',
      rating: 'التقييم',
      portfolio: 'الأعمال',
      receipt: 'الإيصال',
    };
    return labels[kind];
  }

  kindIcon(kind: ApprovalKind): string {
    const icons: Record<ApprovalKind, string> = {
      account: 'ح',
      name: 'أ',
      photo: '▧',
      bio: '≡',
      rating: '★',
      portfolio: '▦',
      receipt: '▤',
    };
    return icons[kind];
  }

  accountLabel(type?: string): string {
    if (type === 'CUSTOMER') {
      return 'عميلة';
    }
    if (type === 'PROVIDER') {
      return 'خبيرة';
    }
    return 'حساب';
  }

  stars(count: number): string {
    return '★'.repeat(Math.max(0, Math.min(5, count))) + '☆'.repeat(Math.max(0, 5 - count));
  }

  itemTone(item: ApprovalItem): Tone {
    if (item.provider) {
      return item.provider.status === 'ACTIVE' ? 'approved' : 'pending';
    }
    const opsStatus = item.media?.proofs[0]?.opsStatus;
    const status = item.media?.status || item.rating?.status || item.change?.status || 'PENDING';
    if (opsStatus === 'APPROVED' || status === 'APPROVED') {
      return 'approved';
    }
    if (status === 'REJECTED') {
      return 'rejected';
    }
    return 'pending';
  }

  toneLabel(tone: Tone): string {
    if (tone === 'approved') {
      return 'تم الاعتماد';
    }
    if (tone === 'rejected') {
      return 'مرفوض';
    }
    return 'بانتظار الاعتماد';
  }

  statusLabel(item: ApprovalItem): string {
    const opsStatus = item.media?.proofs[0]?.opsStatus;
    if (opsStatus === 'ESCALATED') {
      return 'محوّل للمالية';
    }
    if (item.media?.status === 'NEED_CLEARER') {
      return 'صورة أوضح';
    }
    return this.toneLabel(this.itemTone(item));
  }

  chips(group: AccountGroup): KindChip[] {
    const order: ApprovalKind[] = ['account', 'name', 'photo', 'bio', 'rating', 'portfolio', 'receipt'];
    return order
      .filter((kind) => kind !== 'account')
      .filter((kind) => group.items.some((item) => item.kind === kind))
      .map((kind) => {
        const rows = group.items.filter((item) => item.kind === kind);
        const tone: Tone = rows.some((row) => this.itemTone(row) === 'pending')
          ? 'pending'
          : rows.some((row) => this.itemTone(row) === 'rejected')
            ? 'rejected'
            : 'approved';
        return { kind, tone, label: this.kindLabel(kind) };
      });
  }

  approvedIn(group: AccountGroup): number {
    return group.items.filter((item) => this.itemTone(item) === 'approved').length;
  }

  pendingIn(group: AccountGroup): number {
    return group.items.filter((item) => this.itemTone(item) === 'pending').length;
  }

  isComplete(group: AccountGroup): boolean {
    return group.items.length > 0 && group.items.every((item) => this.itemTone(item) === 'approved');
  }

  openGroup(group: AccountGroup, event?: Event): void {
    event?.stopPropagation();
    this.selectedGroup = group;
    this.focusedKind = null;
    this.prepareDrawer(group);
    this.loadDecided();
  }

  openItem(item: ApprovalItem, event?: Event): void {
    event?.stopPropagation();
    const group = this.groups.find((row) => row.key === item.accountId) ?? null;
    this.selectedGroup = group;
    this.focusedKind = item.kind;
    if (group) {
      this.prepareDrawer(group);
    }
    this.loadDecided();
  }

  closeDrawer(): void {
    this.selectedGroup = null;
    this.focusedKind = null;
    this.accountFile = null;
  }

  private afterReview(): void {
    this.focusedKind = null;
    this.load();
  }

  openLightbox(url?: string): void {
    this.lightboxUrl = url || null;
  }

  canApproveMedia(file: OpsMediaItem): boolean {
    if (file.purpose === 'RECEIPT') {
      return this.session.hasPermission('FIN-03');
    }
    return this.canSeeContent;
  }

  canDecide(item: ApprovalItem): boolean {
    return this.itemTone(item) !== 'approved';
  }

  canEscalate(file: OpsMediaItem): boolean {
    if (file.purpose !== 'RECEIPT' || !this.session.hasPermission('PKG-02')) {
      return false;
    }
    const opsStatus = file.proofs[0]?.opsStatus;
    return opsStatus !== 'ESCALATED' && opsStatus !== 'APPROVED';
  }

  reviewMedia(item: ApprovalItem, approve: boolean): void {
    const file = item.media;
    if (!file) {
      return;
    }
    const dates = this.dates[file.id];
    this.api
      .opsReviewMedia(file.id, {
        approve,
        note: this.notes[file.id],
        startAt: dates?.startAt ? new Date(dates.startAt).toISOString() : undefined,
        endAt: dates?.endAt ? new Date(dates.endAt).toISOString() : undefined,
      })
      .subscribe({
        next: () => {
          this.toast.show(approve ? 'تم الاعتماد' : 'تم الرفض');
          this.afterReview();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر تنفيذ المراجعة')),
      });
  }

  escalate(item: ApprovalItem): void {
    const file = item.media;
    if (!file) {
      return;
    }
    this.api.opsEscalateReceipt(file.id).subscribe({
      next: (row) => {
        this.toast.show('تم تحويل الإيصال للمالية');
        this.replaceItem(this.fromFile(row));
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحويل الإيصال')),
    });
  }

  clearer(item: ApprovalItem): void {
    const file = item.media;
    if (!file) {
      return;
    }
    this.api.opsReviewMedia(file.id, { requestClearer: true, note: this.notes[file.id] }).subscribe({
      next: () => {
        this.toast.show('تم طلب صورة أوضح');
        this.afterReview();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الطلب')),
    });
  }

  reviewRating(item: ApprovalItem, approve: boolean): void {
    const rating = item.rating;
    if (!rating) {
      return;
    }
    this.api.opsReviewRating(rating.id, approve, this.ratingNotes[rating.id]).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد التقييم' : 'تم رفض التقييم');
        this.afterReview();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر مراجعة التقييم')),
    });
  }

  reviewChange(item: ApprovalItem, approve: boolean): void {
    const change = item.change;
    if (!change) {
      return;
    }
    this.api.opsReviewChange(change.id, approve).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد التعديل' : 'تم رفض التعديل');
        this.afterReview();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر مراجعة التعديل')),
    });
  }

  reviewProvider(item: ApprovalItem, approve: boolean): void {
    const provider = item.provider;
    if (!provider) {
      return;
    }
    this.api.opsReviewProvider(provider.id, approve).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد الحساب' : 'تم إيقاف الحساب');
        this.afterReview();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تنفيذ القرار')),
    });
  }

  reopen(item: ApprovalItem): void {
    const done = {
      next: () => {
        this.toast.show('أُعيد للمراجعة');
        this.afterReview();
      },
      error: (err: unknown) => this.toast.show(apiMessage(err, 'تعذر إعادة العنصر للمراجعة')),
    };
    if (item.provider) {
      this.api.opsReviewProvider(item.provider.id, false, undefined, true).subscribe(done);
      return;
    }
    if (item.change) {
      this.api.opsReviewChange(item.change.id, false, true).subscribe(done);
      return;
    }
    if (item.rating) {
      this.api.opsReviewRating(item.rating.id, false, this.ratingNotes[item.rating.id], true).subscribe(done);
      return;
    }
    if (item.media) {
      this.api.opsReviewMedia(item.media.id, { reopen: true, note: this.notes[item.media.id] }).subscribe(done);
    }
  }

  private refreshTabs(): void {
    this.kindTabs = [
      { id: 'name', label: 'الاسم', visible: this.canSeeProfile },
      { id: 'photo', label: 'الصورة', visible: this.canSeeContent },
      { id: 'bio', label: 'النبذة', visible: this.canSeeProfile },
      { id: 'rating', label: 'التقييم', visible: this.canSeeProfile },
      { id: 'portfolio', label: 'أعمال', visible: this.canSeeContent },
      { id: 'receipt', label: 'إيصالات', visible: this.canSeeReceipts },
    ];
  }

  private mapQuery(kind: string | null, purpose: string | null): ApprovalView {
    if (kind === 'all' || !kind) {
      return 'all';
    }
    if (kind === 'accounts' || kind === 'account') {
      return kind === 'accounts' ? 'accounts' : 'account';
    }
    if (kind === 'works' || kind === 'portfolio') {
      return 'portfolio';
    }
    if (
      kind === 'name' ||
      kind === 'photo' ||
      kind === 'bio' ||
      kind === 'rating' ||
      kind === 'receipt'
    ) {
      return kind;
    }
    if (purpose === 'RECEIPT') {
      return 'receipt';
    }
    if (purpose === 'PORTFOLIO') {
      return 'portfolio';
    }
    if (purpose === 'AVATAR') {
      return 'photo';
    }
    return 'all';
  }

  private matchesFilters(item: ApprovalItem): boolean {
    if (this.roleFilter && item.accountType !== this.roleFilter) {
      return false;
    }
    if (this.search && !this.matchesQuery(item.accountName, item.accountCode)) {
      return false;
    }
    if (this.statusFilter && this.itemTone(item) !== this.statusFilter) {
      return false;
    }
    return true;
  }

  private matchesQuery(name: string, code: string): boolean {
    const q = this.search.trim().toLowerCase();
    return name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
  }

  private openAccountKey(accountId: string): void {
    const group = this.groups.find((row) => row.key === accountId);
    if (group) {
      this.openGroup(group);
    }
  }

  private prepareDrawer(group: AccountGroup): void {
    for (const item of group.items) {
      if (item.media) {
        this.notes[item.media.id] ??= '';
        this.dates[item.media.id] ??= { startAt: '', endAt: '' };
      }
      if (item.rating) {
        this.ratingNotes[item.rating.id] ??= '';
      }
    }
  }

  private listOrEmpty<T>(enabled: boolean, source: Observable<T[]>): Observable<T[]> {
    if (!enabled) {
      return of([]);
    }
    return source.pipe(catchError((): Observable<T[]> => of([])));
  }

  private load(): void {
    this.loading = true;
    this.decidedLoaded = false;
    const filesEnabled = this.canSeeContent || this.canSeeReceipts;
    forkJoin({
      changes: this.listOrEmpty(this.canSeeProfile, this.api.opsProfileChanges('PENDING')),
      ratings: this.listOrEmpty(this.canSeeProfile, this.api.opsRatings('PENDING')),
      files: this.listOrEmpty(filesEnabled, this.api.opsMedia()),
      providers: this.listOrEmpty(this.canApproveAccounts, this.api.opsPendingProviders()),
    }).subscribe({
      next: (payload) => {
        this.setItems(this.rowsFrom(payload));
        const openAccount = this.route.snapshot.queryParamMap.get('account');
        if (!this.selectedGroup && openAccount) {
          this.openAccountKey(openAccount);
        }
        this.loading = false;
        if (this.selectedGroup || this.statusFilter === 'approved' || this.statusFilter === 'rejected') {
          this.loadDecided();
        }
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الاعتمادات'));
      },
    });
  }

  private loadDecided(): void {
    if (this.decidedLoaded || this.decidedLoading) {
      return;
    }
    this.decidedLoading = true;
    const filesEnabled = this.canSeeContent || this.canSeeReceipts;
    forkJoin({
      changesApproved: this.listOrEmpty(this.canSeeProfile, this.api.opsProfileChanges('APPROVED')),
      changesRejected: this.listOrEmpty(this.canSeeProfile, this.api.opsProfileChanges('REJECTED')),
      ratingsApproved: this.listOrEmpty(this.canSeeProfile, this.api.opsRatings('APPROVED')),
      ratingsRejected: this.listOrEmpty(this.canSeeProfile, this.api.opsRatings('REJECTED')),
      filesApproved: this.listOrEmpty(filesEnabled, this.api.opsMedia({ status: 'APPROVED' })),
      filesRejected: this.listOrEmpty(filesEnabled, this.api.opsMedia({ status: 'REJECTED' })),
    }).subscribe({
      next: (payload) => {
        this.setItems([
          ...this.items,
          ...this.rowsFrom({
            files: [...payload.filesApproved, ...payload.filesRejected],
            changes: [...payload.changesApproved, ...payload.changesRejected],
            ratings: [...payload.ratingsApproved, ...payload.ratingsRejected],
          }),
        ]);
        this.decidedLoaded = true;
        this.decidedLoading = false;
      },
      error: () => {
        this.decidedLoading = false;
      },
    });
  }

  private rowsFrom(payload: {
    providers?: OpsPendingProvider[];
    files: OpsMediaItem[];
    changes: OpsProfileChange[];
    ratings: OpsRating[];
  }): ApprovalItem[] {
    const files = this.uniqueById(payload.files);
    const changes = this.uniqueById(payload.changes);
    const ratings = this.uniqueById(payload.ratings);
    const fileIds = new Set(files.map((row) => row.id));
    return [
      ...(payload.providers ?? []).map((row) => this.fromProvider(row)),
      ...files.map((file) => this.fromFile(file)),
      ...changes
        .filter((row) => row.field === 'DISPLAY_NAME' || row.field === 'BIO' || row.field === 'AVATAR')
        .filter((row) => row.field !== 'AVATAR' || !fileIds.has(row.newValue))
        .map((row) => this.fromChange(row)),
      ...ratings.map((row) => this.fromRating(row)),
    ];
  }

  private setItems(rows: ApprovalItem[]): void {
    const unique = this.uniqueById(rows);
    const fileIds = new Set(unique.filter((item) => item.media).map((item) => item.media?.id || ''));
    this.items = newestFirst(
      unique.filter((item) => item.change?.field !== 'AVATAR' || !fileIds.has(item.change.newValue)),
    );
    this.groups = this.buildGroups(this.items);
    this.refreshTabs();
    const selectedKey = this.selectedGroup?.key;
    this.selectedGroup = selectedKey ? this.groups.find((row) => row.key === selectedKey) ?? null : null;
    if (this.selectedGroup) {
      this.prepareDrawer(this.selectedGroup);
    }
    for (const item of this.items) {
      if (item.rating) {
        this.ratingNotes[item.rating.id] ??= '';
      }
      if (item.media) {
        this.notes[item.media.id] ??= '';
        this.dates[item.media.id] ??= { startAt: '', endAt: '' };
      }
    }
  }

  private uniqueById<T extends { id: string }>(rows: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) {
        continue;
      }
      seen.add(row.id);
      out.push(row);
    }
    return out;
  }

  private buildGroups(items: ApprovalItem[]): AccountGroup[] {
    const map = new Map<string, AccountGroup>();
    for (const item of items) {
      const current = map.get(item.accountId);
      if (current) {
        current.items.push(item);
        if (!current.previewUrl && item.previewUrl && !item.isVideo && !item.isPdf) {
          current.previewUrl = item.previewUrl;
        }
        if (Date.parse(item.createdAt) > Date.parse(current.createdAt)) {
          current.createdAt = item.createdAt;
          current.name = item.accountName;
        }
        continue;
      }
      map.set(item.accountId, {
        key: item.accountId,
        accountId: item.accountId,
        name: item.accountName,
        code: item.accountCode,
        type: item.accountType || 'PROVIDER',
        previewUrl: item.isVideo || item.isPdf ? undefined : item.previewUrl,
        createdAt: item.createdAt,
        items: [item],
      });
    }
    return newestFirst([...map.values()]).map((group) => ({
      ...group,
      items: newestFirst(group.items),
    }));
  }

  private replaceItem(updated: ApprovalItem): void {
    this.items = this.items.map((entry) => (entry.id === updated.id ? updated : entry));
    this.groups = this.buildGroups(this.items);
    if (this.selectedGroup) {
      this.selectedGroup = this.groups.find((row) => row.key === this.selectedGroup?.key) ?? null;
    }
  }

  private fromProvider(row: OpsPendingProvider): ApprovalItem {
    return {
      id: `account-${row.id}`,
      kind: 'account',
      createdAt: row.createdAt,
      accountId: row.id,
      accountName: row.displayName,
      accountCode: row.accountCode,
      accountType: 'PROVIDER',
      summary: row.city?.nameAr ? `حساب خبيرة · ${row.city.nameAr}` : 'حساب خبيرة بانتظار الاعتماد',
      provider: row,
    };
  }

  private fromFile(file: OpsMediaItem): ApprovalItem {
    const kind: ApprovalKind = file.purpose === 'RECEIPT' ? 'receipt' : file.purpose === 'PORTFOLIO' ? 'portfolio' : 'photo';
    const proof = file.proofs[0];
    return {
      id: `file-${file.id}`,
      kind,
      createdAt: file.createdAt,
      accountId: file.owner.id,
      accountName: file.owner.displayName,
      accountCode: file.owner.accountCode,
      accountType: file.owner.accountType,
      summary:
        kind === 'receipt' && proof
          ? `إيصال ${proof.package.nameAr} · ${proof.amount} ر.س`
          : kind === 'portfolio'
            ? file.kind === 'VIDEO'
              ? 'فيديو أعمال'
              : 'صورة أعمال'
            : 'صورة الحساب بانتظار الاعتماد',
      previewUrl: mediaUrl(file.url) || undefined,
      isVideo: file.kind === 'VIDEO',
      isPdf: file.kind === 'PDF' || (file.mime || '').toLowerCase().includes('pdf'),
      media: file,
    };
  }

  private fromChange(row: OpsProfileChange): ApprovalItem {
    const kind: ApprovalKind =
      row.field === 'DISPLAY_NAME' ? 'name' : row.field === 'BIO' ? 'bio' : 'photo';
    return {
      id: `change-${row.id}`,
      kind,
      createdAt: row.createdAt,
      accountId: row.user.id,
      accountName: row.user.displayName,
      accountCode: row.user.accountCode,
      accountType: row.user.accountType,
      summary: row.newValue,
      previewUrl: kind === 'photo' ? mediaUrl(row.newValue) || undefined : undefined,
      change: row,
    };
  }

  private fromRating(row: OpsRating): ApprovalItem {
    return {
      id: `rating-${row.id}`,
      kind: 'rating',
      createdAt: row.createdAt,
      accountId: row.customer.id,
      accountName: row.customer.displayName,
      accountCode: row.customer.accountCode,
      accountType: row.customer.accountType || 'CUSTOMER',
      summary: row.note || `تقييم ${row.stars} نجوم على حساب ${row.provider.displayName}`,
      rating: row,
    };
  }
}
