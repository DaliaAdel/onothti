import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage } from '../core/phone';
import { isLiveSubscription, type ProviderAlbum, type ProviderPortfolioItem } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-portfolio',
  imports: [RouterLink, FormsModule],
  template: `
    @if (locked) {
      <div class="page-head"><div><h1>الميزة غير متاحة</h1><p>يجب تفعيل الاشتراك أولًا</p></div></div>
      <div class="card subscription-lock">
        <div class="symbol">♢</div>
        <h2>اشتركي لتفعيل أدوات الخبيرة</h2>
        <p class="muted">بعد اختيار الباقة واعتماد الدفع يمكنكِ إضافة الخدمات ورفع الألبومات واستخدام الإحصاءات والتقييمات.</p>
        <a class="btn primary" routerLink="/p/package">عرض الباقات</a>
      </div>
    } @else if (album) {
      <div class="page-head">
        <div>
          <h1>{{ album.name }}</h1>
          <p>أضيفي صور وفيديوهات الألبوم</p>
        </div>
      </div>
      <button class="btn secondary album-back" type="button" (click)="closeAlbum()">← الرجوع إلى ألبوماتي</button>
      <div class="card album-upload">
        <button type="button" class="upload-icon album-upload-trigger" aria-label="رفع صور أو فيديوهات" (click)="fileInput.click()">＋</button>
        <div>
          <h3>رفع صور أو فيديوهات</h3>
          <p class="muted small">اختاري أكثر من ملف مرة واحدة · الصور والفيديوهات مدعومة</p>
        </div>
        <label class="btn primary">
          اختيار الملفات
          <input #fileInput type="file" accept="image/*,video/*" multiple hidden (change)="onFiles($event)" />
        </label>
        <span class="small muted">{{ fileName || 'لم يتم اختيار ملفات' }}</span>
      </div>
      <div class="section-title">
        <h3>محتوى الألبوم</h3>
        <span class="small muted">{{ items.length ? items.length + ' عنصر' : 'لا يوجد محتوى مرفوع' }}</span>
      </div>
      @if (!items.length) {
        <div class="album-empty">
          <div class="album-empty-icon">▧</div>
          <h3>الألبوم فارغ</h3>
          <p>ارفعي الصور أو الفيديوهات لتظهر هنا.</p>
        </div>
      } @else {
        <div class="album-media-grid">
          @for (item of items; track item.id) {
            <div class="album-media-preview">
              @if (item.url && item.kind === 'VIDEO') {
                <video [src]="mediaUrl(item.url)" controls preload="metadata"></video>
              } @else if (item.url) {
                <img [src]="mediaUrl(item.url)" [alt]="statusLabel(item.approvalStatus)" />
              } @else {
                <div class="album-cover"><span>{{ item.kind === 'VIDEO' ? 'فيديو' : 'عمل' }}</span></div>
              }
              <b>{{ statusLabel(item.approvalStatus) }}</b>
              <button class="btn ghost" type="button" style="width:100%;margin:0 0 8px" (click)="remove(item.id)">حذف</button>
            </div>
          }
        </div>
      }
    } @else {
      <div class="page-head">
        <div>
          <h1>ألبوماتي</h1>
          <p>اختاري الألبوم لإضافة الصور أو الفيديوهات</p>
        </div>
        <button class="btn primary" type="button" [disabled]="!canCreateAlbum" (click)="creating = true">إنشاء ألبوم</button>
      </div>
      <div class="album-usage card">
        <div class="usage-item">
          <div>
            <span>الصور المرفوعة</span>
            <b>{{ photos }} من {{ maxPhotos }} صورة</b>
          </div>
          <div class="usage-track"><i [style.width.%]="photoPercent"></i></div>
        </div>
        <div class="usage-item">
          <div>
            <span>الألبومات</span>
            <b>{{ realAlbumCount }} من {{ maxAlbums }} ألبوم</b>
          </div>
          <div class="usage-track"><i [style.width.%]="albumPercent"></i></div>
        </div>
        <small>الحدود الحالية حسب {{ packageName }}</small>
      </div>
      @if (creating) {
        <div class="card" style="margin-bottom:16px">
          <div class="field">
            <label>اسم الألبوم</label>
            <input name="newAlbumName" [(ngModel)]="newAlbumName" placeholder="مثال: مكياج عرائس" />
          </div>
          <div class="edit-service-actions">
            <button class="btn secondary" type="button" (click)="creating = false; newAlbumName = ''">إلغاء</button>
            <button class="btn primary" type="button" [disabled]="loading || newAlbumName.trim().length < 2" (click)="createAlbum()">حفظ الألبوم</button>
          </div>
        </div>
      }
      @if (!albums.length && !creating) {
        <div class="album-empty">
          <div class="album-empty-icon">▧</div>
          <h3>لا توجد ألبومات بعد</h3>
          <p>أنشئي ألبومًا ثم أضيفي الصور أو الفيديوهات داخله.</p>
        </div>
      } @else {
        <div class="album-grid">
          @for (item of albums; track item.id; let i = $index) {
            <div class="card album-card" (click)="openAlbum(item)">
              <div class="album-cover" [class.has-photo]="!!item.coverUrl" [style.background]="coverStyle(item, i)">
                <span>عرض المحتوى</span>
              </div>
              <div class="album-row">
                <div>
                  <b class="small album-name">{{ item.name }}</b>
                  <p class="small muted album-status">{{ item.isActive ? 'نشط' : 'غير نشط' }} · {{ item.itemCount }} عنصر</p>
                </div>
                @if (!item.virtual) {
                  <details class="album-menu" (click)="$event.stopPropagation()">
                    <summary>•••</summary>
                    <div>
                      <button type="button" (click)="setAlbumActive(item, true)">نشط</button>
                      <button type="button" (click)="setAlbumActive(item, false)">غير نشط</button>
                      <button type="button" (click)="renameAlbum(item)">إعادة التسمية</button>
                      <button type="button" class="danger-action" (click)="deleteAlbum(item)">حذف الألبوم</button>
                    </div>
                  </details>
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
  readonly toast = inject(ToastService);
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
  packageName = 'الباقة';
  fileName = '';
  loading = false;

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
    this.shell.set('ألبوماتي');
    this.api.providerSubscription().subscribe({
      next: (data) => {
        this.locked = !isLiveSubscription(data.current);
        this.maxPhotos = data.current?.package.maxPhotos ?? 40;
        this.maxAlbums = data.current?.package.maxAlbums ?? 5;
        this.packageName = data.current ? data.current.package.nameAr : 'بدون باقة';
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

  openAlbum(album: ProviderAlbum): void {
    this.api.providerAlbum(album.id).subscribe({
      next: (data) => {
        this.album = data.album;
        this.items = data.items;
        this.fileName = '';
        this.shell.set(data.album.name);
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر فتح الألبوم')),
    });
  }

  closeAlbum(): void {
    this.album = null;
    this.items = [];
    this.fileName = '';
    this.shell.set('ألبوماتي');
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
        this.toast.show('تم إنشاء الألبوم');
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر إنشاء الألبوم'));
      },
    });
  }

  setAlbumActive(album: ProviderAlbum, isActive: boolean): void {
    this.api.patchProviderAlbum(album.id, { isActive }).subscribe({
      next: () => {
        this.toast.show(isActive ? 'الألبوم نشط' : 'الألبوم غير نشط');
        this.reload();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث الألبوم')),
    });
  }

  renameAlbum(album: ProviderAlbum): void {
    const name = window.prompt('اكتبي اسم الألبوم الجديد', album.name)?.trim();
    if (!name || name === album.name) {
      return;
    }
    this.api.patchProviderAlbum(album.id, { name }).subscribe({
      next: () => {
        this.toast.show('تم تغيير اسم الألبوم');
        this.reload();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إعادة التسمية')),
    });
  }

  deleteAlbum(album: ProviderAlbum): void {
    if (!window.confirm('سيتم حذف الألبوم وكل محتواه. هل تريدين المتابعة؟')) {
      return;
    }
    this.api.removeProviderAlbum(album.id).subscribe({
      next: () => {
        this.toast.show('تم حذف الألبوم');
        this.reload();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حذف الألبوم')),
    });
  }

  async onFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || !this.album) {
      return;
    }
    this.fileName = files.length === 1 ? files[0].name : `تم اختيار ${files.length} ملف`;
    this.loading = true;
    try {
      for (const file of files) {
        const kind: 'IMAGE' | 'VIDEO' = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        await firstValueFrom(this.api.addProviderPortfolio(file, kind, this.album.id));
      }
      this.toast.show(files.length > 1 ? 'تم إرسال الأعمال للمراجعة' : 'تم إرسال العمل للمراجعة');
      this.openAlbum(this.album);
      this.api.providerPortfolio().subscribe({ next: (items) => (this.allItems = items) });
    } catch (err) {
      this.toast.show(apiMessage(err, 'تعذر إضافة العمل'));
    } finally {
      this.loading = false;
    }
  }

  remove(id: string): void {
    this.api.removeProviderPortfolio(id).subscribe({
      next: () => {
        this.toast.show('تم حذف العمل');
        if (this.album) {
          this.openAlbum(this.album);
        }
        this.api.providerPortfolio().subscribe({ next: (items) => (this.allItems = items) });
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حذف العمل')),
    });
  }

  statusLabel(status: string): string {
    if (status === 'PENDING') {
      return 'قيد المراجعة';
    }
    if (status === 'APPROVED') {
      return 'معتمد';
    }
    return status;
  }

  private reload(): void {
    this.api.providerAlbums().subscribe({ next: (albums) => (this.albums = albums) });
    this.api.providerPortfolio().subscribe({ next: (items) => (this.allItems = items) });
  }
}
