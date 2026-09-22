import { Component, OnInit, inject } from '@angular/core';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-payment',
  imports: [IconComponent],
  template: `
    <div class="grid two">
      <section class="card">
        <div class="segmented">
          <button type="button" [class.active]="tab === 'file'" (click)="tab = 'file'">رفع إيصال التحويل</button>
          <button type="button" [class.active]="tab === 'text'" (click)="tab = 'text'">لصق رسالة التحويل</button>
        </div>
        @if (tab === 'file') {
          <label class="upload" style="margin-top:17px" [class.drag]="dragging" (dragenter)="onDrag($event, true)" (dragover)="onDrag($event, true)" (dragleave)="onDrag($event, false)" (drop)="onDrop($event)">
            <input type="file" hidden (change)="onFile()" />
            <div>
              <app-icon name="upload" />
              <h3>اسحبي صورة الإيصال هنا</h3>
              <p>أو اضغطي للاختيار · JPG أو PNG أو PDF · 5MB</p>
            </div>
          </label>
        } @else {
          <textarea class="input" style="margin-top:17px;min-height:180px" placeholder="الصقي نص رسالة التحويل هنا"></textarea>
        }
        <div class="notice" style="margin-top:13px">لا تشاركي رمز OTP أو بيانات بطاقتك البنكية داخل الإثبات.</div>
      </section>
      <aside class="card">
        <span class="eyebrow">ملخص الطلب</span>
        <h3 style="color:var(--plum)">تفعيل أو تمديد الباقة</h3>
        <p style="color:var(--muted);font-size:10px">سيراجع الفريق الإثبات قبل تفعيل الظهور</p>
        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0" />
        <button class="btn primary full" style="margin-top:25px" type="button" (click)="toast.show('إرسال الإثبات سيُربط بعد تفعيل واجهات المزودة')">
          إرسال الإثبات للمراجعة
        </button>
        <p style="color:var(--muted);font-size:9px;text-align:center">سيصلك إشعار عند تحديث حالة الطلب.</p>
      </aside>
    </div>
  `,
})
export class ProviderPaymentComponent implements OnInit {
  private readonly shell = inject(ShellService);
  readonly toast = inject(ToastService);
  tab: 'file' | 'text' = 'file';
  dragging = false;

  ngOnInit(): void {
    this.shell.set('إثبات التحويل', 'أرسلي صورة الإيصال أو نص رسالة التحويل للمراجعة');
  }

  onDrag(event: DragEvent, over: boolean): void {
    event.preventDefault();
    this.dragging = over;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    this.toast.show('تمت إضافة ملف الإثبات بنجاح');
  }

  onFile(): void {
    this.toast.show('تمت إضافة ملف الإثبات بنجاح');
  }
}
