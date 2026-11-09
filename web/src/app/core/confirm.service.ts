import { Injectable, inject, signal } from '@angular/core';
import { LocaleService } from './locale.service';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly locale = inject(LocaleService);
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
    this.confirmLabel.set(options.confirmLabel ?? this.locale.t('ui.confirm'));
    this.cancelLabel.set(options.cancelLabel ?? this.locale.t('ui.cancel'));
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
