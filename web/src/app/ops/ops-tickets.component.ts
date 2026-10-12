import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsTicket, TicketType } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { SessionService } from '../core/session.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { clip, keepSelected, newestFirst, opsDate, statusTone, ticketTitle } from './ops-ui';

@Component({
  selector: 'app-ops-tickets',
  imports: [FormsModule, OpsDrawerComponent, OpsModalComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>الطلبات</h2>
        <p>اختاري النوع ثم اكتبي عنوان المشكلة</p>
      </div>
      <button class="btn primary" type="button" (click)="openAdd()">+ إضافة طلب</button>
    </div>

    <div class="filters">
      <button class="chip" type="button" [class.active]="status === '' && !escalatedOnly" (click)="setStatus('')">الكل</button>
      <button class="chip" type="button" [class.active]="status === 'SENT'" (click)="setStatus('SENT')">جديدة</button>
      <button class="chip" type="button" [class.active]="status === 'IN_PROGRESS'" (click)="setStatus('IN_PROGRESS')">قيد المعالجة</button>
      <button class="chip" type="button" [class.active]="status === 'RESOLVED'" (click)="setStatus('RESOLVED')">محلولة</button>
      <button class="chip" type="button" [class.active]="status === 'CLOSED'" (click)="setStatus('CLOSED')">مغلقة</button>
      <button class="chip" type="button" [class.active]="escalatedOnly" (click)="setEscalated()">مصعّدة</button>
      <button class="chip" type="button" [class.active]="mineOnly" (click)="setMine()">طلباتي</button>
      <button class="chip" type="button" [class.active]="queue === 'OPS'" (click)="setQueue('OPS')">التشغيل</button>
      <button class="chip" type="button" [class.active]="queue === 'FINANCE'" (click)="setQueue('FINANCE')">المالية</button>
      <button class="chip" type="button" [class.active]="queue === 'ADMIN'" (click)="setQueue('ADMIN')">الإدارة</button>
    </div>

    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!items.length) {
      <p class="page-empty">لا توجد طلبات في هذا التبويب.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>النوع</th>
              <th>عنوان المشكلة</th>
              <th>المرسلة</th>
              <th>الملخص</th>
              <th>الحالة</th>
              <th>الفريق</th>
              <th>المسندة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items; track item.id) {
              <tr [class.active]="selected?.id === item.id" (click)="selected = item">
                <td><b>{{ item.refNo }}</b></td>
                <td>{{ item.type.nameAr }}</td>
                <td>{{ ticketTitle(item) }}</td>
                <td>{{ item.owner.displayName }}</td>
                <td class="clip">{{ clip(item.body) }}</td>
                <td><span class="status {{ statusTone(item.status) }}">{{ statusAr(item.status) }}</span></td>
                <td>{{ queueLabel(item.queue) }}</td>
                <td>{{ item.assignee?.displayName || '—' }}</td>
                <td>{{ opsDate(item.createdAt) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <app-ops-drawer
      [open]="!!selected"
      [title]="selected ? ticketTitle(selected) : ''"
      [kicker]="selected?.type?.nameAr || 'طلب دعم'"
      (closed)="selected = null"
    >
      @if (selected; as item) {
        <p class="muted small">{{ item.refNo }}</p>
        <p class="muted small">
          {{ item.owner.displayName }} · {{ item.owner.accountCode }} ·
          <span dir="ltr">{{ item.owner.mobile }}</span>
        </p>
        <p class="muted small">
          {{ opsDate(item.createdAt) }} · {{ statusAr(item.status) }} · {{ queueLabel(item.queue) }}
          @if (item.assignee) {
            · مسندة إلى {{ item.assignee.displayName }}
          }
        </p>
        <p style="margin:14px 0;white-space:pre-wrap;line-height:1.8">{{ item.body }}</p>
        @if (item.comments.length) {
          <h4 style="margin:18px 0 8px;color:var(--plum)">الردود</h4>
          @for (comment of item.comments; track comment.id) {
            <p class="muted small" style="margin:0 0 8px">
              <b>{{ comment.author.displayName }}:</b> {{ comment.body }}
              <span> · {{ opsDate(comment.createdAt) }}</span>
            </p>
          }
        }
        <textarea class="input" rows="3" placeholder="رد للخبيرة" [(ngModel)]="replies[item.id]"></textarea>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="reply(item)">إرسال الرد</button>
          @if (item.status !== 'IN_PROGRESS') {
            <button class="btn ghost" type="button" (click)="setTicketStatus(item, 'IN_PROGRESS')">معالجة</button>
          }
          @if (item.status !== 'RESOLVED') {
            <button class="btn ghost" type="button" (click)="setTicketStatus(item, 'RESOLVED')">تم الحل</button>
          }
          @if (item.status !== 'CLOSED') {
            <button class="btn ghost" type="button" (click)="setTicketStatus(item, 'CLOSED')">إغلاق</button>
          }
          @if (item.assignee?.id !== meId) {
            <button class="btn ghost" type="button" (click)="claim(item)">هذه لي</button>
          }
          <button class="btn ghost" type="button" (click)="openRoute(item)">توجيه الطلب</button>
        </div>
      }
    </app-ops-drawer>
    <app-ops-modal
      [open]="!!routeTarget"
      title="توجيه الطلب"
      [kicker]="routeTarget?.refNo || ''"
      (closed)="routeTarget = null"
    >
      <div class="field">
        <label>التوجيه</label>
        <select class="input" [(ngModel)]="routeDraft.queue">
          <option value="OPS">إعادة إلى فريق التشغيل</option>
          <option value="FINANCE">تصعيد إلى الفريق المالي</option>
          <option value="ADMIN">تصعيد إلى الإدارة</option>
        </select>
      </div>
      <div class="field">
        <label>ملاحظة الإدارة</label>
        <textarea class="input" rows="4" [(ngModel)]="routeDraft.note" placeholder="اكتبي الملاحظة أو القرار"></textarea>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="submitRoute()">حفظ وتوجيه الطلب</button>
    </app-ops-modal>
    <app-ops-modal [open]="adding" title="إضافة طلب" kicker="دعم وصيانة أو مقترحات" (closed)="adding = false">
      <div class="field">
        <label>النوع *</label>
        <select class="input" [(ngModel)]="draft.typeCode">
          <option value="">اختاري النوع</option>
          @for (type of types; track type.id) {
            <option [value]="type.code">{{ type.nameAr }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>عنوان المشكلة *</label>
        <input class="input" [(ngModel)]="draft.title" placeholder="اكتبي عنوان المشكلة" />
      </div>
      <div class="field">
        <label>التفاصيل</label>
        <textarea class="input" rows="4" [(ngModel)]="draft.body" placeholder="تفاصيل إضافية (اختياري)"></textarea>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createTicket()">إضافة الطلب</button>
    </app-ops-modal>
  `,
})
export class OpsTicketsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;
  readonly clip = clip;
  readonly ticketTitle = ticketTitle;
  readonly meId = this.session.user()?.id ?? '';

  loading = true;
  adding = false;
  status = 'SENT';
  escalatedOnly = false;
  mineOnly = false;
  queue = '';
  types: TicketType[] = [];
  items: OpsTicket[] = [];
  selected: OpsTicket | null = null;
  replies: Record<string, string> = {};
  routeTarget: OpsTicket | null = null;
  routeDraft = { queue: 'ADMIN' as 'OPS' | 'FINANCE' | 'ADMIN', note: '' };
  draft = { typeCode: '', title: '', body: '' };

  ngOnInit(): void {
    this.shell.set('الطلبات المصعّدة والدعم', 'الرد أو التصعيد وإغلاق الطلب');
    this.api.opsTicketTypes().subscribe({ next: (types) => (this.types = types) });
    if (this.route.snapshot.queryParamMap.get('priority') === '1') {
      this.escalatedOnly = true;
      this.status = '';
    }
    this.load();
  }

  setStatus(status: string): void {
    this.status = status;
    this.escalatedOnly = false;
    this.mineOnly = false;
    this.queue = '';
    this.selected = null;
    this.load();
  }

  setEscalated(): void {
    this.status = '';
    this.escalatedOnly = true;
    this.mineOnly = false;
    this.queue = '';
    this.selected = null;
    this.load();
  }

  setMine(): void {
    this.status = '';
    this.escalatedOnly = false;
    this.mineOnly = true;
    this.queue = '';
    this.selected = null;
    this.load();
  }

  setQueue(queue: string): void {
    this.status = '';
    this.escalatedOnly = false;
    this.mineOnly = false;
    this.queue = queue;
    this.selected = null;
    this.load();
  }

  openAdd(): void {
    this.draft = { typeCode: this.types[0]?.code ?? '', title: '', body: '' };
    this.adding = true;
  }

  createTicket(): void {
    if (!this.draft.typeCode) {
      this.toast.show('اختاري نوع الطلب');
      return;
    }
    if (this.draft.title.trim().length < 2) {
      this.toast.show('اكتبي عنوان المشكلة');
      return;
    }
    this.api
      .opsCreateTicket({
        typeCode: this.draft.typeCode,
        title: this.draft.title.trim(),
        body: this.draft.body.trim() || undefined,
      })
      .subscribe({
        next: (row) => {
          this.adding = false;
          this.status = 'SENT';
          this.escalatedOnly = false;
          this.mineOnly = false;
          this.queue = '';
          this.selected = row;
          this.replies[row.id] ??= '';
          this.toast.show('تم إضافة الطلب');
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الطلب')),
      });
  }

  queueLabel(queue?: string): string {
    if (queue === 'FINANCE') {
      return 'المالية';
    }
    if (queue === 'ADMIN') {
      return 'الإدارة';
    }
    return 'التشغيل';
  }

  statusAr(status: string): string {
    const labels: Record<string, string> = {
      SENT: 'جديدة',
      IN_PROGRESS: 'قيد المعالجة',
      RESOLVED: 'محلولة',
      CLOSED: 'مغلقة',
    };
    return labels[status] ?? status;
  }

  reply(item: OpsTicket): void {
    const body = this.replies[item.id]?.trim();
    if (!body || body.length < 2) {
      this.toast.show('أدخلي نص الرد');
      return;
    }
    this.api.opsCommentTicket(item.id, body).subscribe({
      next: (row) => {
        this.replace(row);
        this.replies[item.id] = '';
        this.toast.show('تم إرسال الرد');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الرد')),
    });
  }

  setTicketStatus(item: OpsTicket, status: 'SENT' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'): void {
    this.api.opsPatchTicket(item.id, { status }).subscribe({
      next: (row) => {
        this.replace(row);
        this.toast.show('تم تحديث حالة الطلب');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث الطلب')),
    });
  }

  claim(item: OpsTicket): void {
    this.api.opsPatchTicket(item.id, { claim: true }).subscribe({
      next: (row) => {
        this.replace(row);
        this.toast.show('تم إسناد الطلب إليكِ');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إسناد الطلب')),
    });
  }

  openRoute(item: OpsTicket): void {
    this.routeTarget = item;
    this.routeDraft = { queue: (item.queue as 'OPS' | 'FINANCE' | 'ADMIN') || 'ADMIN', note: '' };
  }

  submitRoute(): void {
    const item = this.routeTarget;
    if (!item) {
      return;
    }
    if (this.routeDraft.note.trim().length < 2) {
      this.toast.show('أدخلي ملاحظة التوجيه');
      return;
    }
    this.api
      .opsPatchTicket(item.id, {
        queue: this.routeDraft.queue,
        note: this.routeDraft.note,
        status: item.status === 'SENT' ? 'IN_PROGRESS' : undefined,
      })
      .subscribe({
        next: (row) => {
          this.replace(row);
          this.routeTarget = null;
          this.toast.show('تم توجيه الطلب');
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر توجيه الطلب')),
      });
  }

  private replace(row: OpsTicket): void {
    this.items = this.items.map((item) => (item.id === row.id ? row : item));
    if (
      (this.status && row.status !== this.status) ||
      (this.queue && row.queue !== this.queue) ||
      (this.mineOnly && row.assignee?.id !== this.meId) ||
      (this.escalatedOnly && row.priority !== 1)
    ) {
      this.items = this.items.filter((item) => item.id !== row.id);
      this.selected = null;
      return;
    }
    this.selected = keepSelected(this.items, row);
  }

  private load(): void {
    this.loading = true;
    this.api.opsTickets({
      status: this.status || undefined,
      priority: this.escalatedOnly ? 1 : undefined,
      queue: this.queue || undefined,
      mine: this.mineOnly || undefined,
    }).subscribe({
      next: (items) => {
        this.items = newestFirst(items);
        this.selected = keepSelected(this.items, this.selected);
        for (const item of items) {
          this.replies[item.id] ??= '';
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الطلبات'));
      },
    });
  }
}
