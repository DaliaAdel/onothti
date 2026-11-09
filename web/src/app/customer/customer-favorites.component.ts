import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../core/favorites.service';
import { LocaleService } from '../core/locale.service';
import { InitialsPipe } from '../core/name-initials';
import { serviceIcon, servicePhoto, type FavoriteRow } from '../core/models';
import { ShellService } from '../core/shell.service';
import { FavoriteBtnComponent } from '../shared/favorite-btn.component';
import { IconComponent } from '../shared/icon.component';

type FavTab = 'SERVICE' | 'PROVIDER';

@Component({
  selector: 'app-customer-favorites',
  imports: [RouterLink, FavoriteBtnComponent, IconComponent, InitialsPipe],
  template: `
    @if (!favorites.loaded()) {
      <p class="loading">{{ locale.t('c.fav.loading') }}</p>
    } @else {
      <div class="filter-tabs fav-switch" role="tablist" [attr.aria-label]="locale.t('c.fav.typeAria')">
        <button
          type="button"
          role="tab"
          [class.active]="tab === 'SERVICE'"
          [attr.aria-selected]="tab === 'SERVICE'"
          (click)="setTab('SERVICE')"
        >
          {{ locale.t('c.fav.services') }}
          <span>{{ serviceCount }}</span>
        </button>
        <button
          type="button"
          role="tab"
          [class.active]="tab === 'PROVIDER'"
          [attr.aria-selected]="tab === 'PROVIDER'"
          (click)="setTab('PROVIDER')"
        >
          {{ locale.t('c.fav.experts') }}
          <span>{{ providerCount }}</span>
        </button>
      </div>
      @if (rows.length === 0) {
        <article class="card coming-card">
          <h2>{{ emptyTitle }}</h2>
          <p>{{ emptyText }}</p>
          <a class="btn primary" [routerLink]="emptyLink">{{ emptyAction }}</a>
        </article>
      } @else if (tab === 'SERVICE') {
        <div class="grid four">
          @for (row of rows; track row.targetType + row.targetId) {
            <article class="card hover service-card photo-service">
              <app-favorite-btn class="service-fav" targetType="SERVICE" [targetId]="row.targetId" />
              <a class="service-open" [routerLink]="['/c/providers']" [queryParams]="{ serviceId: row.targetId }">
                <div class="service-art">
                  <img class="service-cover" [src]="photoOf(row)" alt="" loading="lazy" decoding="async" />
                  <img class="service-mini-icon" [src]="iconOf(row)" alt="" loading="lazy" decoding="async" />
                </div>
                <div class="service-body">
                  <h3>{{ label(row) }}</h3>
                  <p>{{ locale.t('c.serviceFallback') }}</p>
                  <span class="arrow"><app-icon name="chev" /></span>
                </div>
              </a>
            </article>
          }
        </div>
      } @else {
        <div class="grid two">
          @for (row of rows; track row.targetType + row.targetId) {
            <article class="card hover provider">
              <div class="provider-photo">{{ label(row) | initials }}</div>
              <div>
                <h3>{{ label(row) }}</h3>
                <p>{{ locale.t('c.fav.expert') }}</p>
              </div>
              <div class="provider-actions">
                <app-favorite-btn targetType="PROVIDER" [targetId]="row.targetId" />
                <a class="btn ghost" [routerLink]="['/c/providers', row.targetId]">{{ locale.t('c.view') }}</a>
              </div>
            </article>
          }
        </div>
      }
    }
  `,
})
export class CustomerFavoritesComponent implements OnInit {
  readonly favorites = inject(FavoritesService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  tab: FavTab = 'SERVICE';

  ngOnInit(): void {
    this.shell.set('c.fav.title', 'c.fav.sub');
    this.favorites.reload();
  }

  setTab(tab: FavTab): void {
    this.tab = tab;
  }

  get serviceCount(): number {
    return this.favorites.items().filter((row) => row.targetType === 'SERVICE').length;
  }

  get providerCount(): number {
    return this.favorites.items().filter((row) => row.targetType === 'PROVIDER').length;
  }

  get rows(): FavoriteRow[] {
    return this.favorites.items().filter((row) => row.targetType === this.tab);
  }

  get emptyTitle(): string {
    return this.tab === 'SERVICE' ? this.locale.t('c.fav.emptyServices') : this.locale.t('c.fav.emptyExperts');
  }

  get emptyText(): string {
    return this.tab === 'SERVICE' ? this.locale.t('c.fav.emptyServicesText') : this.locale.t('c.fav.emptyExpertsText');
  }

  get emptyLink(): string {
    return this.tab === 'SERVICE' ? '/c/services' : '/c/providers';
  }

  get emptyAction(): string {
    return this.tab === 'SERVICE' ? this.locale.t('c.fav.browseServices') : this.locale.t('c.fav.browseExperts');
  }

  label(row: FavoriteRow): string {
    return row.item?.displayName || this.locale.localizedName(row.item, this.locale.t('c.fav.savedItem'));
  }

  photoOf(row: FavoriteRow): string {
    return servicePhoto(row.item);
  }

  iconOf(row: FavoriteRow): string {
    return serviceIcon(row.item);
  }
}
