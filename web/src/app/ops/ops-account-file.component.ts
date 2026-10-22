import { Component, Input } from '@angular/core';
import { mediaUrl } from '../core/media';
import type { OpsManagedAccount } from '../core/models';
import { opsDate } from './ops-ui';

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
        @if (account.accountType === 'PROVIDER') {
          <div class="field">
            <label>الباقة</label>
            <input class="input" [value]="packageName" readonly />
          </div>
          <div class="field">
            <label>مدة الباقة</label>
            <input class="input" [value]="packageDuration" readonly />
          </div>
          <div class="field">
            <label>سعر الباقة</label>
            <input class="input" [value]="packagePrice" readonly />
          </div>
          <div class="field">
            <label>بداية الاشتراك</label>
            <input class="input" [value]="packageStart" readonly />
          </div>
          <div class="field">
            <label>انتهاء الاشتراك</label>
            <input class="input" [value]="packageEnd" readonly />
          </div>
        }
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

  get packageName(): string {
    const pack = this.account.package;
    if (!pack) {
      return 'لا توجد باقة نشطة';
    }
    return pack.code ? `${pack.nameAr} · ${pack.code}` : pack.nameAr;
  }

  get packageDuration(): string {
    const months = this.account.package?.durationMonths;
    return months ? `${months} شهر` : '—';
  }

  get packagePrice(): string {
    const price = this.account.package?.price;
    if (price == null || price === '') {
      return '—';
    }
    const before = this.account.package?.priceBefore;
    if (before != null && before !== '' && Number(before) > Number(price)) {
      return `${price} ر.س (قبل الخصم ${before} ر.س)`;
    }
    return `${price} ر.س`;
  }

  get packageStart(): string {
    return this.account.subscriptionStartAt ? opsDate(this.account.subscriptionStartAt) : '—';
  }

  get packageEnd(): string {
    return this.account.subscriptionEndAt ? opsDate(this.account.subscriptionEndAt) : '—';
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
}
