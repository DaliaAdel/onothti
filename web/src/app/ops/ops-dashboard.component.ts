import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsDashboard, OpsInboxItem } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { SessionService } from '../core/session.service';
import { IconComponent } from '../shared/icon.component';
import { opsDate } from './ops-ui';
import { canOpenOpsPage, type OpsPage } from './ops-access';

@Component({
  selector: 'app-ops-dashboard',
  imports: [RouterLink, IconComponent],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>{{ locale.t('ops.dash.heading') }}</h2>
        <p>{{ locale.t('ops.dash.intro') }}</p>
      </div>
    </div>
    <div class="stats stats-6">
      @if (canPage('clients')) {
        <a class="stat" routerLink="/ops/clients" [queryParams]="{ type: 'CUSTOMER' }">
          <div class="top"><span>{{ locale.t('ops.dash.customers') }}</span><span class="head-icon"><app-icon name="profile" /></span></div>
          <b>{{ dash?.customers ?? '—' }}</b>
          <span>{{ locale.t('ops.dash.customersHint') }}</span>
        </a>
        <a class="stat" routerLink="/ops/clients" [queryParams]="{ type: 'PROVIDER' }">
          <div class="top"><span>{{ locale.t('ops.dash.providers') }}</span><span class="head-icon"><app-icon name="expert" /></span></div>
          <b>{{ dash?.activeProviders ?? '—' }}</b>
          <span>{{ locale.t('ops.dash.providersHint') }}</span>
        </a>
        <!-- <a class="stat" routerLink="/ops/clients" [queryParams]="{ type: 'CUSTOMER' }">
          <div class="top"><span>{{ locale.t('ops.dash.onlineCustomers') }}</span><span class="head-icon online"><app-icon name="profile" /></span></div>
          <b>{{ dash?.onlineCustomers ?? 0 }}</b>
          <span>{{ locale.t('ops.dash.onlineNow') }}</span>
        </a>
        <a class="stat" routerLink="/ops/clients" [queryParams]="{ type: 'PROVIDER' }">
          <div class="top"><span>{{ locale.t('ops.dash.onlineProviders') }}</span><span class="head-icon online"><app-icon name="expert" /></span></div>
          <b>{{ dash?.onlineProviders ?? 0 }}</b>
          <span>{{ locale.t('ops.dash.onlineNow') }}</span>
        </a> -->
      } @else {
        <article class="stat">
          <div class="top"><span>{{ locale.t('ops.dash.customers') }}</span><span class="head-icon"><app-icon name="profile" /></span></div>
          <b>{{ dash?.customers ?? '—' }}</b>
          <span>{{ locale.t('ops.dash.customersHint') }}</span>
        </article>
        <article class="stat">
          <div class="top"><span>{{ locale.t('ops.dash.providers') }}</span><span class="head-icon"><app-icon name="expert" /></span></div>
          <b>{{ dash?.activeProviders ?? '—' }}</b>
          <span>{{ locale.t('ops.dash.providersHint') }}</span>
        </article>
        <!-- <article class="stat">
          <div class="top"><span>{{ locale.t('ops.dash.onlineCustomers') }}</span><span class="head-icon online"><app-icon name="profile" /></span></div>
          <b>{{ dash?.onlineCustomers ?? 0 }}</b>
          <span>{{ locale.t('ops.dash.onlineNow') }}</span>
        </article>
        <article class="stat">
          <div class="top"><span>{{ locale.t('ops.dash.onlineProviders') }}</span><span class="head-icon online"><app-icon name="expert" /></span></div>
          <b>{{ dash?.onlineProviders ?? 0 }}</b>
          <span>{{ locale.t('ops.dash.onlineNow') }}</span>
        </article> -->
      }
      <article class="stat">
        <div class="top"><span>{{ locale.t('ops.dash.active') }}</span><span class="head-icon"><app-icon name="home" /></span></div>
        <b>{{ dash?.activeAccounts ?? '—' }}</b>
        <span>{{ locale.t('ops.dash.activeHint') }}</span>
      </article>
      @if (canPage('staff')) {
        <a class="stat" routerLink="/ops/staff">
          <div class="top"><span>{{ locale.t('ops.dash.staff') }}</span><span class="head-icon"><app-icon name="profile" /></span></div>
          <b>{{ dash?.staffCount ?? '—' }}</b>
          <span>{{ locale.t('ops.dash.staffHint') }}</span>
        </a>
      } @else {
        <article class="stat">
          <div class="top"><span>{{ locale.t('ops.dash.staff') }}</span><span class="head-icon"><app-icon name="profile" /></span></div>
          <b>{{ dash?.staffCount ?? '—' }}</b>
          <span>{{ locale.t('ops.dash.staffHint') }}</span>
        </article>
      }
      @if (canPage('tickets')) {
        <a class="stat" routerLink="/ops/tickets" [queryParams]="{ priority: '1' }">
          <div class="top"><span>{{ locale.t('ops.dash.escalated') }}</span><span class="head-icon"><app-icon name="support" /></span></div>
          <b>{{ dash?.escalatedTickets ?? 0 }}</b>
          <span>{{ locale.t('ops.dash.escalatedHint') }}</span>
        </a>
      } @else {
        <article class="stat">
          <div class="top"><span>{{ locale.t('ops.dash.escalated') }}</span><span class="head-icon"><app-icon name="support" /></span></div>
          <b>{{ dash?.escalatedTickets ?? 0 }}</b>
          <span>{{ locale.t('ops.dash.escalatedHint') }}</span>
        </article>
      }
      @if (canPage('events')) {
        <a class="stat" routerLink="/ops/events">
          <div class="top"><span>{{ locale.t('ops.dash.events') }}</span><span class="head-icon"><app-icon name="views" /></span></div>
          <b>{{ dash?.eventsToday ?? 0 }}</b>
          <span>{{ locale.t('ops.dash.eventsHint') }}</span>
        </a>
      } @else {
        <article class="stat">
          <div class="top"><span>{{ locale.t('ops.dash.events') }}</span><span class="head-icon"><app-icon name="views" /></span></div>
          <b>{{ dash?.eventsToday ?? 0 }}</b>
          <span>{{ locale.t('ops.dash.eventsHint') }}</span>
        </article>
      }
    </div>

    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.dash.tasks') }}</h2>
        <p>{{ locale.t('ops.dash.tasksSub') }}</p>
      </div>
    </div>

    @if (loading) {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr><th>{{ locale.t('ops.dash.kind') }}</th><th>{{ locale.t('ops.dash.details') }}</th><th>{{ locale.t('ops.dash.date') }}</th></tr>
          </thead>
          <tbody>
            @for (row of skeleton; track row) {
              <tr>
                <td><div class="ops-skeleton" style="width:72px"></div></td>
                <td><div class="ops-skeleton" style="width:220px"></div></td>
                <td><div class="ops-skeleton" style="width:110px"></div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!inbox.length) {
      <p class="page-empty">{{ locale.t('ops.dash.noTasks') }}</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>{{ locale.t('ops.dash.kind') }}</th>
              <th>{{ locale.t('ops.dash.details') }}</th>
              <th>{{ locale.t('ops.dash.date') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of inbox; track item.kind + item.id) {
              <tr [routerLink]="inboxRoute(item)" [queryParams]="inboxQuery(item)">
                <td><span class="ops-inbox-kind">{{ kindLabel(item.kind) }}</span></td>
                <td>
                  <b>{{ item.title }}</b>
                  <div class="muted small">{{ item.subtitle }}</div>
                </td>
                <td>{{ opsDate(item.createdAt) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="grid two" style="margin-top:22px">
      <article class="card">
        <h3>{{ locale.t('ops.dash.today') }}</h3>
        @if (canPage('approvals')) {
          <a class="activity" routerLink="/ops/approvals">
            <span class="dot"></span>
            <div><b>{{ locale.t('ops.dash.approvals') }}</b><span>{{ countLabel(pendingApprovals, 'ops.count.item', 'ops.count.items') }}</span></div>
          </a>
          <a class="activity" routerLink="/ops/approvals" [queryParams]="{ kind: 'receipt' }">
            <span class="dot"></span>
            <div><b>{{ locale.t('ops.dash.receipts') }}</b><span>{{ countLabel(dash?.pendingReceipts ?? 0, 'ops.count.receipt', 'ops.count.receipts') }}</span></div>
          </a>
          <a class="activity" routerLink="/ops/approvals" [queryParams]="{ kind: 'accounts' }">
            <span class="dot"></span>
            <div><b>{{ locale.t('ops.dash.pendingProviders') }}</b><span>{{ countLabel(dash?.pendingProviders ?? 0, 'ops.count.account', 'ops.count.accounts') }}</span></div>
          </a>
        }
        @if (canPage('reviews')) {
          <a class="activity" routerLink="/ops/reviews">
            <span class="dot"></span>
            <div><b>{{ locale.t('ops.dash.complaints') }}</b><span>{{ countLabel(dash?.openComplaints ?? 0, 'ops.count.complaint', 'ops.count.complaints') }}</span></div>
          </a>
        }
        @if (canPage('packages')) {
          <a class="activity" routerLink="/ops/packages">
            <span class="dot"></span>
            <div><b>{{ locale.t('ops.dash.expiring') }}</b><span>{{ countLabel(dash?.expiringSubscriptions ?? 0, 'ops.count.package', 'ops.count.packages') }}</span></div>
          </a>
        }
      </article>
      <article class="card">
        <h3>{{ locale.t('ops.dash.shortcuts') }}</h3>
        <div class="ops-shortcuts">
          @if (canPage('approvals')) {
            <a class="btn ghost" routerLink="/ops/approvals">{{ locale.t('ops.nav.approvals') }}</a>
          }
          @if (canPage('catalog')) {
            <a class="btn ghost" routerLink="/ops/catalog">{{ locale.t('ops.short.catalog') }}</a>
          }
          @if (canPage('geo')) {
            <a class="btn ghost" routerLink="/ops/geo">{{ locale.t('ops.short.geo') }}</a>
          }
          @if (canPage('packages')) {
            <a class="btn ghost" routerLink="/ops/packages">{{ locale.t('ops.short.packages') }}</a>
          }
          @if (canPage('settings')) {
            <a class="btn ghost" routerLink="/ops/settings">{{ locale.t('ops.short.settings') }}</a>
          }
          @if (canPage('notices')) {
            <a class="btn ghost" routerLink="/ops/notices">{{ locale.t('ops.nav.notices') }}</a>
          }
          @if (canPage('clients')) {
            <a class="btn ghost" routerLink="/ops/clients">{{ locale.t('ops.short.clients') }}</a>
          }
          @if (canPage('org')) {
            <a class="btn ghost" routerLink="/ops/org">{{ locale.t('ops.nav.settingsOrg') }}</a>
          }
          @if (canPage('staff')) {
            <a class="btn ghost" routerLink="/ops/staff">{{ locale.t('ops.short.staff') }}</a>
          }
          @if (canPage('legal')) {
            <a class="btn ghost" routerLink="/ops/legal">{{ locale.t('ops.short.legal') }}</a>
          }
          @if (canPage('activity')) {
            <a class="btn ghost" routerLink="/ops/activity">{{ locale.t('ops.nav.activity') }}</a>
          }
        </div>
        <p class="notice" style="margin-top:16px">
         {{ locale.t('ops.dash.notice') }}
        </p>
      </article>
    </div>
  `,
})
export class OpsDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  readonly session = inject(SessionService);
  readonly locale = inject(LocaleService);
  readonly opsDate = opsDate;
  readonly skeleton = [1, 2, 3, 4, 5];

  dash: OpsDashboard | null = null;
  loading = true;

  canPage(page: OpsPage): boolean {
    return canOpenOpsPage(this.session, page);
  }

  get inbox(): OpsInboxItem[] {
    return this.dash?.inbox ?? [];
  }

  get pendingApprovals(): number {
    return (
      (this.dash?.pendingRatings ?? 0) +
      (this.dash?.pendingProfileChanges ?? 0) +
      (this.dash?.pendingMedia ?? 0) +
      (this.dash?.pendingProviders ?? 0)
    );
  }

  countLabel(count: number, singular: string, plural: string): string {
    if (count <= 0) {
      return this.locale.t('ops.dash.none');
    }
    if (count === 1) {
      return `1 ${this.locale.t(singular)}`;
    }
    return `${count} ${this.locale.t(plural)}`;
  }

  ngOnInit(): void {
    this.shell.set('ops.dash.title', 'ops.dash.sub');
    this.api.opsDashboard().subscribe({
      next: (dash) => {
        this.dash = dash;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.dash.loadFail')));
      },
    });
  }

  kindLabel(kind: string): string {
    const key = `ops.kind.${kind}`;
    const label = this.locale.t(key);
    return label === key ? kind : label;
  }

  inboxRoute(item: OpsInboxItem): string {
    if (item.kind === 'TICKET') {
      return this.canPage('tickets') ? '/ops/tickets' : '/ops';
    }
    if (item.kind === 'COMPLAINT') {
      return this.canPage('reviews') ? '/ops/reviews' : '/ops';
    }
    return this.canPage('approvals') ? '/ops/approvals' : '/ops';
  }

  inboxQuery(item: OpsInboxItem): Record<string, string> {
    if (item.kind === 'PROVIDER') {
      return { kind: 'accounts', account: item.id };
    }
    if (item.kind === 'RATING') {
      return { kind: 'rating' };
    }
    if (item.kind === 'AVATAR') {
      return { kind: 'photo' };
    }
    if (item.kind === 'RECEIPT') {
      return { kind: 'receipt' };
    }
    if (item.kind === 'MEDIA') {
      return { kind: 'portfolio' };
    }
    if (item.kind === 'CHANGE') {
      if (item.field === 'DISPLAY_NAME') {
        return { kind: 'name' };
      }
      if (item.field === 'BIO') {
        return { kind: 'bio' };
      }
      if (item.field === 'AVATAR') {
        return { kind: 'photo' };
      }
    }
    return {};
  }
}
