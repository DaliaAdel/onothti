import { Component, Input } from '@angular/core';
import { mediaUrl } from '../core/media';
import type { OpsManagedAccount } from '../core/models';

@Component({
  selector: 'app-ops-account-file',
  template: `
    <article class="card" style="margin-bottom:18px">
      <div class="avatar-pick" [class.has-photo]="true" style="margin-bottom:16px">
        @if (account.avatarUrl) {
          <img [src]="mediaUrl(account.avatarUrl)" [alt]="account.displayName" />
        } @else {
          <div class="profile-photo" style="width:72px;height:72px;font-size:28px;border-width:0">
            {{ account.displayName.slice(0, 1) }}
          </div>
        }
        <div>
          <p class="muted small" style="margin:0">ملف {{ typeLabel }} — للعرض فقط</p>
          <b>{{ account.accountCode }}</b>
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>الاسم</label>
          <input class="input" [value]="account.displayName" readonly />
        </div>
        <div class="field">
          <label>الجوال</label>
          <input class="input" dir="ltr" [value]="account.mobile" readonly />
        </div>
        @if (account.accountType === 'PROVIDER') {
          <div class="field">
            <label>واتساب</label>
            <input class="input" dir="ltr" [value]="account.whatsapp || account.mobile" readonly />
          </div>
        }
        @if (account.email) {
          <div class="field">
            <label>البريد</label>
            <input class="input" dir="ltr" [value]="account.email" readonly />
          </div>
        }
        <div class="field">
          <label>المدينة</label>
          <input class="input" [value]="cityLine" readonly />
        </div>
      </div>
      <div class="field" style="margin-top:14px">
        <label>نبذة عني</label>
        <textarea class="input" rows="4" [value]="account.bio || 'لا توجد نبذة بعد.'" readonly></textarea>
      </div>
      @if (account.accountType === 'PROVIDER') {
        @if (services.length) {
          <p class="muted small" style="margin:16px 0 8px">الخدمات</p>
          <div class="filters" style="margin:0">
            @for (service of services; track service) {
              <span class="chip">{{ service }}</span>
            }
          </div>
        }
        @if (coverage.length) {
          <p class="muted small" style="margin:16px 0 8px">أحياء التغطية</p>
          <div class="filters" style="margin:0">
            @for (area of coverage; track area) {
              <span class="chip">{{ area }}</span>
            }
          </div>
        }
      }
    </article>
  `,
})
export class OpsAccountFileComponent {
  @Input({ required: true }) account!: OpsManagedAccount;
  readonly mediaUrl = mediaUrl;

  get typeLabel(): string {
    return this.account.accountType === 'PROVIDER' ? 'الخبيرة' : 'العميلة';
  }

  get cityLine(): string {
    const city =
      this.account.providerProfile?.city?.nameAr || this.account.customerProfile?.city?.nameAr;
    const region = this.account.providerProfile?.region?.nameAr;
    if (city && region) {
      return `${city} · ${region}`;
    }
    return city || 'بدون مدينة';
  }

  get services(): string[] {
    return (this.account.providerProfile?.services ?? []).map((row) => row.nameAr);
  }

  get coverage(): string[] {
    return (this.account.providerProfile?.coverage ?? []).map((row) => row.nameAr);
  }
}
