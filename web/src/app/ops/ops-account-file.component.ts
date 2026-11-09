import { Component, Input, inject } from '@angular/core';
import { mediaUrl } from '../core/media';
import type { OpsManagedAccount } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { IconComponent } from '../shared/icon.component';
import { opsDate } from './ops-ui';

@Component({
  selector: 'app-ops-account-file',
  imports: [IconComponent],
  template: `
    <article class="card" style="margin-bottom:18px">
      <div class="avatar-pick" [class.has-photo]="true" style="margin-bottom:16px">
        @if (account.avatarUrl) {
          <img [src]="mediaUrl(account.avatarUrl)" [alt]="account.displayName" />
        } @else {
          <div class="profile-photo" style="width:72px;height:72px;border-width:0">
            <app-icon name="profile" />
          </div>
        }
        <div>
          <p class="muted small" style="margin:0">{{ locale.tf('ops.file.viewOnly', { type: typeLabel }) }}</p>
          <b>{{ account.accountCode }}</b>
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.name') }}</label>
          <div class="name-field">
            <input class="input" [value]="account.displayName" readonly />
            <span class="name-field-icon" aria-hidden="true"><app-icon name="profile" /></span>
          </div>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.mobile') }}</label>
          <input class="input" dir="ltr" [value]="account.mobile" readonly />
        </div>
        @if (account.email) {
          <div class="field">
            <label>{{ locale.t('ops.ui.email') }}</label>
            <input class="input" dir="ltr" [value]="account.email" readonly />
          </div>
        }
        <div class="field">
          <label>{{ locale.t('ops.ui.city') }}</label>
          <input class="input" [value]="cityLine" readonly />
        </div>
        @if (account.accountType === 'PROVIDER') {
          <div class="field">
            <label>{{ locale.t('ops.ui.package') }}</label>
            <input class="input" [value]="packageName" readonly />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.file.pkgDuration') }}</label>
            <input class="input" [value]="packageDuration" readonly />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.file.pkgPrice') }}</label>
            <input class="input" [value]="packagePrice" readonly />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.file.pkgStart') }}</label>
            <input class="input" [value]="packageStart" readonly />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.file.pkgEnd') }}</label>
            <input class="input" [value]="packageEnd" readonly />
          </div>
        }
      </div>
      <div class="field" style="margin-top:14px">
        <label>{{ locale.t('ops.ui.bio') }}</label>
        <textarea class="input" rows="4" [value]="account.bio || locale.t('ops.appr.noBio')" readonly></textarea>
      </div>
      @if (account.accountType === 'PROVIDER') {
        @if (services.length) {
          <p class="muted small" style="margin:16px 0 8px">{{ locale.t('ops.file.services') }}</p>
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
  readonly locale = inject(LocaleService);

  get typeLabel(): string {
    return this.account.accountType === 'PROVIDER'
      ? this.locale.t('ops.file.provider')
      : this.locale.t('ops.file.customer');
  }

  get packageName(): string {
    const pack = this.account.package;
    if (!pack) {
      return this.locale.t('ops.file.noPackage');
    }
    const name = this.locale.localizedName(pack);
    return pack.code ? `${name} · ${pack.code}` : name;
  }

  get packageDuration(): string {
    const months = this.account.package?.durationMonths;
    return months ? this.locale.tf('p.pkg.months', { n: months }) : '—';
  }

  get packagePrice(): string {
    const price = this.account.package?.price;
    if (price == null || price === '') {
      return '—';
    }
    const before = this.account.package?.priceBefore;
    if (before != null && before !== '' && Number(before) > Number(price)) {
      return this.locale.tf('ops.file.priceDisc', { price, before });
    }
    return this.locale.tf('ops.file.price', { price });
  }

  get packageStart(): string {
    return this.account.subscriptionStartAt ? opsDate(this.account.subscriptionStartAt) : '—';
  }

  get packageEnd(): string {
    return this.account.subscriptionEndAt ? opsDate(this.account.subscriptionEndAt) : '—';
  }

  get cityLine(): string {
    const cityItem = this.account.providerProfile?.city || this.account.customerProfile?.city;
    const city = this.locale.localizedName(cityItem);
    const region = this.locale.localizedName(this.account.providerProfile?.region);
    if (city && region) {
      return `${city} · ${region}`;
    }
    return city || this.locale.t('ops.file.noCity');
  }

  get services(): string[] {
    return (this.account.providerProfile?.services ?? []).map((row) => this.locale.localizedName(row));
  }
}
