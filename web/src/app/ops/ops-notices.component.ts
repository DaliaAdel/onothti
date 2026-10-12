import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsManagedAccount } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsModalComponent } from './ops-modal.component';

type BroadcastAudience = 'CUSTOMER' | 'PROVIDER' | 'ALL';

@Component({
  selector: 'app-ops-notices',
  imports: [FormsModule, OpsModalComponent],
  template: `
    @if (canBroadcast) {
      <div class="section-head">
        <div>
          <h2>إشعار جماعي</h2>
          <p>يصل للحسابات حسب الصلاحية الممنوحة للدور.</p>
        </div>
        <button class="btn primary" type="button" (click)="openBroadcast()">+ إرسال جماعي</button>
      </div>
    }

    @if (canDirect) {
      <div class="section-head">
        <div>
          <h2>إشعار فردي</h2>
          <p>إرسال لحساب خبيرة أو عميلة حسب صلاحيتكِ.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          @if (canNotifyProvider) {
            <button class="btn ghost" type="button" (click)="openDirect('PROVIDER')">+ إشعار لخبيرة</button>
          }
          @if (canNotifyCustomer) {
            <button class="btn ghost" type="button" (click)="openDirect('CUSTOMER')">+ إشعار لعميلة</button>
          }
        </div>
      </div>
    }

    @if (!canBroadcast && !canDirect) {
      <p class="page-empty">ليست لديكِ صلاحية إرسال إشعارات.</p>
    }

    <app-ops-modal [open]="addingBroadcast" title="إشعار جماعي" kicker="إرسال للمنصة" (closed)="addingBroadcast = false">
      <div class="form-grid">
        <div class="field">
          <label>الجمهور</label>
          <select class="input" [(ngModel)]="broadcast.audience">
            @for (option of broadcastOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>العنوان</label>
          <input class="input" [(ngModel)]="broadcast.titleAr" />
        </div>
        <div class="field full">
          <label>النص</label>
          <textarea class="input" rows="3" [(ngModel)]="broadcast.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="sendBroadcast()">إرسال الإشعار</button>
    </app-ops-modal>

    <app-ops-modal
      [open]="addingDirect"
      [title]="directType === 'PROVIDER' ? 'إشعار فردي لخبيرة' : 'إشعار فردي لعميلة'"
      kicker="بحث بالجوال أو الرمز"
      (closed)="addingDirect = false"
    >
      <div class="field">
        <label>بحث</label>
        <input class="input" [(ngModel)]="directQ" placeholder="الاسم أو الجوال أو الرمز" (keyup.enter)="searchDirect()" />
      </div>
      <button class="btn ghost" style="margin:10px 0 14px" type="button" (click)="searchDirect()">بحث</button>
      @if (directHits.length) {
        <div class="filters" style="margin:0 0 14px">
          @for (item of directHits; track item.id) {
            <button class="chip" type="button" [class.active]="directTarget?.id === item.id" (click)="directTarget = item">
              {{ item.displayName }} · {{ item.accountCode }}
            </button>
          }
        </div>
      }
      @if (directTarget) {
        <p class="muted small">المحددة: {{ directTarget.displayName }} · <span dir="ltr">{{ directTarget.mobile }}</span></p>
      }
      <div class="form-grid">
        <div class="field">
          <label>العنوان</label>
          <input class="input" [(ngModel)]="direct.titleAr" />
        </div>
        <div class="field full">
          <label>النص</label>
          <textarea class="input" rows="3" [(ngModel)]="direct.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="sendDirect()">إرسال الإشعار</button>
    </app-ops-modal>
  `,
})
export class OpsNoticesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  broadcast = { audience: 'CUSTOMER' as BroadcastAudience, titleAr: '', bodyAr: '' };
  addingBroadcast = false;
  addingDirect = false;
  directType: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER';
  directQ = '';
  directHits: OpsManagedAccount[] = [];
  directTarget: OpsManagedAccount | null = null;
  direct = { titleAr: '', bodyAr: '' };

  get canBroadcastAll(): boolean {
    return this.session.hasPermission('BROADCAST_ALL');
  }

  get canBroadcastProvider(): boolean {
    return this.session.hasPermission('BROADCAST_PROVIDER');
  }

  get canBroadcastCustomer(): boolean {
    return this.session.hasPermission('BROADCAST_CUSTOMER');
  }

  get canNotifyProvider(): boolean {
    return this.session.hasPermission('NOTIFY_PROVIDER');
  }

  get canNotifyCustomer(): boolean {
    return this.session.hasPermission('NOTIFY_CUSTOMER');
  }

  get canBroadcast(): boolean {
    return this.canBroadcastAll || this.canBroadcastProvider || this.canBroadcastCustomer;
  }

  get canDirect(): boolean {
    return this.canNotifyProvider || this.canNotifyCustomer;
  }

  get broadcastOptions(): { value: BroadcastAudience; label: string }[] {
    const options: { value: BroadcastAudience; label: string }[] = [];
    if (this.canBroadcastAll) {
      options.push({ value: 'ALL', label: 'خبيرة وعميلة' });
    }
    if (this.canBroadcastProvider) {
      options.push({ value: 'PROVIDER', label: 'خبيرة فقط' });
    }
    if (this.canBroadcastCustomer) {
      options.push({ value: 'CUSTOMER', label: 'عميلة فقط' });
    }
    return options;
  }

  ngOnInit(): void {
    this.shell.set('إشعارات المنصة', 'إرسال جماعي أو فردي حسب صلاحية الدور');
  }

  openBroadcast(): void {
    const first = this.broadcastOptions[0];
    if (!first) {
      this.toast.show('ليست لديكِ صلاحية إرسال جماعي');
      return;
    }
    this.broadcast = { audience: first.value, titleAr: '', bodyAr: '' };
    this.addingBroadcast = true;
  }

  openDirect(type: 'CUSTOMER' | 'PROVIDER'): void {
    if (type === 'PROVIDER' && !this.canNotifyProvider) {
      this.toast.show('ليست لديكِ صلاحية إشعار فردي للخبيرة');
      return;
    }
    if (type === 'CUSTOMER' && !this.canNotifyCustomer) {
      this.toast.show('ليست لديكِ صلاحية إشعار فردي للعميلة');
      return;
    }
    this.directType = type;
    this.directQ = '';
    this.directHits = [];
    this.directTarget = null;
    this.direct = { titleAr: '', bodyAr: '' };
    this.addingDirect = true;
  }

  searchDirect(): void {
    const q = this.directQ.trim();
    if (q.length < 2) {
      this.toast.show('أدخلي الاسم أو الجوال أو الرمز');
      return;
    }
    this.api.opsAccounts({ q, accountType: this.directType }).subscribe({
      next: (rows) => {
        this.directHits = rows.slice(0, 8);
        this.directTarget = this.directHits.length === 1 ? this.directHits[0] : null;
        if (!this.directHits.length) {
          this.toast.show('لا يوجد حساب مطابق');
        }
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر البحث عن الحساب')),
    });
  }

  sendDirect(): void {
    if (!this.directTarget) {
      this.toast.show('اختاري الحساب بعد البحث');
      return;
    }
    if (this.direct.titleAr.trim().length < 2 || this.direct.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي عنوان الإشعار ونصه');
      return;
    }
    this.api.opsNotifyAccount(this.directTarget.id, this.direct).subscribe({
      next: () => {
        this.toast.show(`تم إرسال الإشعار إلى ${this.directTarget?.displayName}`);
        this.addingDirect = false;
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الإشعار')),
    });
  }

  sendBroadcast(): void {
    if (!this.broadcastOptions.some((option) => option.value === this.broadcast.audience)) {
      this.toast.show('ليست لديكِ صلاحية هذا الجمهور');
      return;
    }
    if (this.broadcast.titleAr.trim().length < 2 || this.broadcast.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي عنوان الإشعار ونصه');
      return;
    }
    this.api.opsBroadcast(this.broadcast).subscribe({
      next: (res) => {
        this.toast.show(`تم إرسال الإشعار إلى ${res.sent} حسابًا`);
        this.broadcast = { audience: this.broadcast.audience, titleAr: '', bodyAr: '' };
        this.addingBroadcast = false;
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الإشعار')),
    });
  }
}
