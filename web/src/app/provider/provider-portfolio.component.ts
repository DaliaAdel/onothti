import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage } from '../core/phone';
import type { ProviderPortfolioItem } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-portfolio',
  imports: [FormsModule, IconComponent],
  template: `
    <form class="card form-card" (ngSubmit)="add()">
      <div class="form-grid">
        <div class="field">
          <label>نوع العمل</label>
          <select class="input" name="kind" [(ngModel)]="kind" (ngModelChange)="onKindChange()">
            <option value="IMAGE">صورة</option>
            <option value="VIDEO">فيديو</option>
          </select>
        </div>
        <div class="field">
          <label>{{ kind === 'VIDEO' ? 'ملف الفيديو' : 'صورة العمل' }}</label>
          <button class="input" type="button" style="text-align:right" (click)="picker.click()" [disabled]="loading">
            {{ fileName || (kind === 'VIDEO' ? 'اختيار فيديو' : 'رفع صورة العمل') }}
          </button>
          <input
            #picker
            type="file"
            hidden
            [accept]="kind === 'VIDEO' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'"
            (change)="onFile($event)"
          />
        </div>
        @if (previewUrl) {
          <div class="field full">
            <img class="upload-preview" [src]="previewUrl" alt="معاينة العمل" />
          </div>
        }
      </div>
      <button class="btn primary" style="margin-top:18px" type="submit" [disabled]="loading">
        <app-icon name="upload" />
        {{ loading ? 'جاري رفع العمل...' : 'إضافة للعمل ومراجعته' }}
      </button>
    </form>
    @if (items.length === 0) {
      <p class="page-empty">لا توجد أعمال بعد.</p>
    } @else {
      <div class="portfolio-grid">
        @for (item of items; track item.id) {
          <article class="portfolio-item">
            @if (item.url && item.kind !== 'VIDEO') {
              <img [src]="mediaUrl(item.url)" alt="" />
            } @else {
              <div>{{ item.kind === 'VIDEO' ? 'فيديو' : 'عمل' }}</div>
            }
            <div class="portfolio-meta">
              <span>{{ statusLabel(item.approvalStatus) }}</span>
              <button class="btn ghost" type="button" (click)="remove(item.id)">حذف</button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class ProviderPortfolioPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly toast = inject(ToastService);
  items: ProviderPortfolioItem[] = [];
  kind: 'IMAGE' | 'VIDEO' = 'IMAGE';
  file: File | null = null;
  fileName = '';
  previewUrl = '';
  loading = false;
  readonly mediaUrl = mediaUrl;

  ngOnInit(): void {
    this.shell.set('ألبومات أعمالي', 'أعمالك المعتمدة والمعلقة');
    this.reload();
  }

  onKindChange(): void {
    this.clearFile();
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (this.kind === 'IMAGE' && !/^image\/(jpeg|png|webp|jpg)$/i.test(file.type)) {
      this.toast.show('الصورة لازم تكون JPG أو PNG');
      return;
    }
    if (this.kind === 'VIDEO' && !/^video\/(mp4|webm|quicktime)$/i.test(file.type)) {
      this.toast.show('الفيديو لازم يكون MP4');
      return;
    }
    if (!isImage && !isVideo) {
      this.toast.show('اختاري صورة أو فيديو للعمل');
      return;
    }
    const maxMb = this.kind === 'VIDEO' ? 20 : 5;
    if (file.size > maxMb * 1024 * 1024) {
      this.toast.show(`حجم الملف يتجاوز ${maxMb}MB`);
      return;
    }
    this.clearPreview();
    this.file = file;
    this.fileName = file.name;
    this.previewUrl = isImage ? URL.createObjectURL(file) : '';
  }

  add(): void {
    if (!this.file) {
      this.toast.show(this.kind === 'VIDEO' ? 'اختاري ملف فيديو' : 'اختاري صورة للعمل');
      return;
    }
    this.loading = true;
    this.api.addProviderPortfolio(this.file, this.kind).subscribe({
      next: () => {
        this.loading = false;
        this.clearFile();
        this.toast.show('تم إرسال العمل للمراجعة');
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر إضافة العمل'));
      },
    });
  }

  remove(id: string): void {
    this.api.removeProviderPortfolio(id).subscribe({
      next: () => {
        this.toast.show('تم حذف العمل');
        this.reload();
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

  private clearFile(): void {
    this.file = null;
    this.fileName = '';
    this.clearPreview();
  }

  private clearPreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = '';
  }

  private reload(): void {
    this.api.providerPortfolio().subscribe({ next: (items) => (this.items = items) });
  }
}
