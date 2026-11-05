import { Injectable, signal } from '@angular/core';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly open = signal(false);
  readonly title = signal('');
  readonly message = signal('');
  readonly confirmLabel = signal('تأكيد');
  readonly cancelLabel = signal('إلغاء');
  private resolver: ((value: boolean) => void) | null = null;

  ask(options: ConfirmOptions): Promise<boolean> {
    this.finish(false);
    this.title.set(options.title);
    this.message.set(options.message);
    this.confirmLabel.set(options.confirmLabel ?? 'تأكيد');
    this.cancelLabel.set(options.cancelLabel ?? 'إلغاء');
    this.open.set(true);
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  accept(): void {
    this.finish(true);
  }

  dismiss(): void {
    this.finish(false);
  }

  private finish(value: boolean): void {
    this.open.set(false);
    const resolve = this.resolver;
    this.resolver = null;
    resolve?.(value);
  }
}
