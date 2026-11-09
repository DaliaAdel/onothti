import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage } from '../core/phone';
import { isLiveSubscription, type ProviderAlbum, type ProviderPortfolioItem } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { ShellService } from '../core/shell.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-portfolio',
  imports: [RouterLink, FormsModule],
  template: `
    @if (locked) {
      <div class="page-head"><div><h1>{{ locale.t('p.locked.title') }}</h1><p>{{ locale.t('p.locked.sub') }}</p></div></div>
      <div class="card subscription-lock">
        <div class="symbol">♢</div>
        <h2>{{ locale.t('p.locked.ctaTitle') }}</h2>
        <p class="muted">{{ locale.t('p.locked.ctaText') }}</p>
        <a class="btn primary" routerLink="/p/package">{{ locale.t('p.locked.viewPackages') }}</a>
      </div>
    } @else if (album) {
      <div class="page-head">
        <div>
          <h1>{{ album.name }}</h1>
          <p>{{ locale.t('p.album.addMedia') }}</p>
        </div>
      </div>
      <button class="btn secondary back album-back" type="button" (click)="closeAlbum()">{{ locale.t('p.album.back') }}</button>
      <div class="card album-upload">
        <button type="button" class="upload-icon album-upload-trigger" [attr.aria-label]="locale.t('p.album.upload')" (click)="fileInput.click()">＋</button>
        <div>
          <h3>{{ locale.t('p.album.upload') }}</h3>
          <p class="muted small">{{ locale.t('p.album.uploadHint') }}</p>
        </div>
        <label class="btn primary">
          {{ locale.t('p.album.pickFiles') }}
          <input #fileInput type="file" accept="image/*,video/*" multiple hidden (change)="onFiles($event)" />
        </label>
        <span class="small muted">{{ fileName || locale.t('p.album.noFiles') }}</span>
      </div>
      <div class="section-title">
        <h3>{{ locale.t('p.album.content') }}</h3>
        <span class="small muted">{{ items.length ? locale.tf('p.album.nItems', { n: items.length }) : locale.t('p.album.noContent') }}</span>
      </div>
      @if (!items.length) {
        <div class="album-empty">
          <div class="album-empty-icon">▧</div>
          <h3>{{ locale.t('p.album.emptyTitle') }}</h3>
          <p>{{ locale.t('p.album.emptyText') }}</p>
        </div>
      } @else {
        <div class="album-media-grid">
          @for (item of items; track item.id) {
            <div class="album-media-preview">
              @if (item.url && item.kind === 'VIDEO') {
                <video [src]="mediaUrl(item.url)" controls preload="metadata"></video>
              } @else if (item.url) {
                <img [src]="mediaUrl(item.url)" [alt]="statusLabel(item.approvalStatus)" loading="lazy" decoding="async" />
              } @else {
                <div class="album-cover"><span>{{ item.kind === 'VIDEO' ? locale.t('c.profile.video') : locale.t('c.profile.work') }}</span></div>
              }
              <b>{{ statusLabel(item.approvalStatus) }}</b>
              <button class="btn ghost" type="button" style="width:100%;margin:0 0 8px" (click)="remove(item.id)">{{ locale.t('ui.delete') }}</button>
            </div>
          }
        </div>
      }
    } @else {
      <div class="page-head">
        <div>
          <h1>{{ locale.t('p.album.listTitle') }}</h1>
          <p>{{ locale.t('p.album.listSub') }}</p>
        </div>
        <button class="btn primary" type="button" [disabled]="!canCreateAlbum" (click)="creating = true">{{ locale.t('p.album.create') }}</button>
      </div>
      <div class="album-usage card">
        <div class="usage-item">
          <div>
            <span>{{ locale.t('p.album.photos') }}</span>
            <b>{{ locale.tf('p.album.photosOf', { a: photos, b: maxPhotos }) }}</b>
          </div>
          <div class="usage-track"><i [style.width.%]="photoPercent"></i></div>
        </div>
        <div class="usage-item">
          <div>
            <span>{{ locale.t('p.album.albums') }}</span>
            <b>{{ locale.tf('p.album.albumsOf', { a: realAlbumCount, b: maxAlbums }) }}</b>
          </div>
          <div class="usage-track"><i [style.width.%]="albumPercent"></i></div>
        </div>
        <small>{{ locale.tf('p.album.limitsBy', { name: packageName }) }}</small>
      </div>
      @if (creating) {
        <div class="card" style="margin-bottom:16px">
          <div class="field">
            <label>{{ locale.t('p.album.name') }}</label>
            <input name="newAlbumName" [(ngModel)]="newAlbumName" [placeholder]="locale.t('p.album.namePh')" />
          </div>
          <div class="edit-service-actions">
            <button class="btn secondary" type="button" (click)="creating = false; newAlbumName = ''">{{ locale.t('ui.cancel') }}</button>
            <button class="btn primary" type="button" [disabled]="loading || newAlbumName.trim().length < 2" (click)="createAlbum()">{{ locale.t('p.album.save') }}</button>
          </div>
        </div>
      }
      @if (!albums.length && !creating) {
        <div class="album-empty">
          <div class="album-empty-icon">▧</div>
          <h3>{{ locale.t('p.album.emptyTitle2') }}</h3>
          <p>{{ locale.t('p.album.emptyText2') }}</p>
        </div>
      } @else {
        <div class="album-grid">
          @for (item of albums; track item.id; let i = $index) {
            <div class="card album-card" [class.menu-open]="openMenuId === item.id" (click)="openAlbum(item)">
              <div class="album-cover" [class.has-photo]="!!item.coverUrl" [style.background]="coverStyle(item, i)">
                <span>{{ locale.t('p.album.viewContent') }}</span>
              </div>
              <div class="album-row">
                <div>
                  <b class="small album-name">{{ item.name }}</b>
                  <p class="small muted album-status">{{ locale.tf('p.album.statusLine', { status: item.isActive ? locale.t('ops.status.ACTIVE') : locale.t('ops.status.INACTIVE'), n: item.itemCount }) }}</p>
                </div>
                @if (!item.virtual) {
                  <div class="album-menu" [class.open]="openMenuId === item.id" (click)="$event.stopPropagation()">
                    <button class="album-menu-toggle" type="button" [attr.aria-label]="locale.t('p.album.menuAria')" (click)="toggleAlbumMenu(item.id, $event)">•••</button>
                    @if (openMenuId === item.id) {
                      <div class="album-menu-panel">
                        <button type="button" (click)="setAlbumActive(item, true)">{{ locale.t('ops.status.ACTIVE') }}</button>
                        <button type="button" (click)="setAlbumActive(item, false)">{{ locale.t('ops.status.INACTIVE') }}</button>
                        <button type="button" (click)="renameAlbum(item)">{{ locale.t('p.album.rename') }}</button>
                        <button type="button" class="danger-action" (click)="deleteAlbum(item)">{{ locale.t('p.album.delete') }}</button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    }
  `,
})
export class ProviderPortfolioPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly mediaUrl = mediaUrl;
  albums: ProviderAlbum[] = [];
  album: ProviderAlbum | null = null;
  items: ProviderPortfolioItem[] = [];
  allItems: ProviderPortfolioItem[] = [];
  locked = false;
  creating = false;
  newAlbumName = '';
  maxPhotos = 40;
  maxAlbums = 5;
  packageName = '';
  fileName = '';
  loading = false;
  openMenuId = '';

  get photos(): number {
    return this.allItems.filter((item) => item.kind !== 'VIDEO').length;
  }

  get realAlbumCount(): number {
    return this.albums.filter((item) => !item.virtual).length;
  }

  get canCreateAlbum(): boolean {
    return this.realAlbumCount < this.maxAlbums;
  }

  get photoPercent(): number {
    return Math.round((this.photos / Math.max(1, this.maxPhotos)) * 100);
  }

  get albumPercent(): number {
    return Math.round((this.realAlbumCount / Math.max(1, this.maxAlbums)) * 100);
  }

  ngOnInit(): void {
    this.shell.set('nav.portfolio');
    this.api.providerSubscription().subscribe({
      next: (data) => {
        this.locked = !isLiveSubscription(data.current);
        this.maxPhotos = data.current?.package.maxPhotos ?? 40;
        this.maxAlbums = data.current?.package.maxAlbums ?? 5;
        this.packageName = data.current ? this.locale.localizedName(data.current.package) : this.locale.t('p.album.noPackage');
      },
    });
    this.reload();
  }

  coverStyle(album: ProviderAlbum, index: number): string {
    if (album.coverUrl) {
      return `center / cover url("${this.mediaUrl(album.coverUrl)}")`;
    }
    const tint = index % 2 ? '#C98668' : 'var(--blush)';
    return `linear-gradient(${135 + index * 12}deg,var(--soft),${tint})`;
  }

  toggleAlbumMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? '' : id;
  }

  @HostListener('document:click', ['$event'])
  closeAlbumMenu(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.album-menu')) {
      return;
    }
    this.openMenuId = '';
  }

  openAlbum(album: ProviderAlbum): void {
    this.openMenuId = '';
    this.api.providerAlbum(album.id).subscribe({
      next: (data) => {
        this.album = data.album;
        this.items = data.items;
        this.fileName = '';
        this.shell.set(data.album.name);
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('p.album.toast.openFail'))),
    });
  }

  closeAlbum(): void {
    this.album = null;
    this.items = [];
    this.fileName = '';
    this.shell.set('nav.portfolio');
    this.reload();
  }

  createAlbum(): void {
    const name = this.newAlbumName.trim();
    if (name.length < 2) {
      return;
    }
    this.loading = true;
    this.api.createProviderAlbum(name).subscribe({
      next: () => {
        this.loading = false;
        this.creating = false;
        this.newAlbumName = '';
        this.toast.show(this.locale.t('p.album.toast.created'));
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('p.album.toast.createFail')));
      },
    });
  }

  setAlbumActive(album: ProviderAlbum, isActive: boolean): void {
    this.openMenuId = '';
    this.api.patchProviderAlbum(album.id, { isActive }).subscribe({
      next: () => {
        this.toast.show(isActive ? this.locale.t('p.album.toast.active') : this.locale.t('p.album.toast.inactive'));
        this.reload();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('p.album.toast.patchFail'))),
    });
  }

  renameAlbum(album: ProviderAlbum): void {
    this.openMenuId = '';
    const name = window.prompt(this.locale.t('p.album.renamePrompt'), album.name)?.trim();
    if (!name || name === album.name) {
      return;
    }
    this.api.patchProviderAlbum(album.id, { name }).subscribe({
      next: () => {
        this.toast.show(this.locale.t('p.album.toast.renamed'));
        this.reload();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('p.album.toast.renameFail'))),
    });
  }

  async deleteAlbum(album: ProviderAlbum): Promise<void> {
    this.openMenuId = '';
    const ok = await this.confirm.ask({
      title: this.locale.t('ops.ui.confirmDelete'),
      message: this.locale.t('p.album.deleteMsg'),
      confirmLabel: this.locale.t('ui.delete'),
      cancelLabel: this.locale.t('ui.cancel'),
    });
    if (!ok) {
      return;
    }
    this.api.removeProviderAlbum(album.id).subscribe({
      next: () => {
        this.toast.show(this.locale.t('p.album.toast.deleted'));
        this.reload();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('p.album.toast.deleteFail'))),
    });
  }

  async onFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || !this.album) {
      return;
    }
    this.fileName = files.length === 1 ? files[0].name : this.locale.tf('p.album.filesPicked', { n: files.length });
    this.loading = true;
    try {
      for (const file of files) {
        const kind: 'IMAGE' | 'VIDEO' = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        await firstValueFrom(this.api.addProviderPortfolio(file, kind, this.album.id));
      }
      this.toast.show(files.length > 1 ? this.locale.t('p.album.toast.sentMany') : this.locale.t('p.album.toast.sentOne'));
      this.openAlbum(this.album);
      this.api.providerPortfolio().subscribe({ next: (items) => (this.allItems = items) });
    } catch (err) {
      this.toast.show(apiMessage(err, this.locale.t('p.album.toast.addFail')));
    } finally {
      this.loading = false;
    }
  }

  remove(id: string): void {
    this.api.removeProviderPortfolio(id).subscribe({
      next: () => {
        this.toast.show(this.locale.t('p.album.toast.itemDeleted'));
        if (this.album) {
          this.openAlbum(this.album);
        }
        this.api.providerPortfolio().subscribe({ next: (items) => (this.allItems = items) });
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('p.album.toast.itemDeleteFail'))),
    });
  }

  statusLabel(status: string): string {
    if (status === 'PENDING') {
      return this.locale.t('p.album.st.pending');
    }
    if (status === 'APPROVED') {
      return this.locale.t('p.album.st.approved');
    }
    return status;
  }

  private reload(): void {
    this.api.providerAlbums().subscribe({ next: (albums) => (this.albums = albums) });
    this.api.providerPortfolio().subscribe({ next: (items) => (this.allItems = items) });
  }
}
