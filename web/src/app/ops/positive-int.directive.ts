import { Directive, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[positiveInt]',
})
export class PositiveIntDirective {
  private readonly control = inject(NgControl, { optional: true, self: true });

  @HostListener('keydown', ['$event'])
  blockNonDigits(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const nav = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight'];
    if (nav.includes(event.key)) {
      return;
    }
    if (event.key.length !== 1 || !/[0-9]/.test(event.key)) {
      event.preventDefault();
      return;
    }
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const preview = input.value.slice(0, start) + event.key + input.value.slice(end);
    if (!digitsGreaterThanZero(preview)) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const text = event.clipboardData?.getData('text') ?? '';
    this.apply(input, input.value.slice(0, start) + text + input.value.slice(end));
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.apply(input, input.value);
  }

  private apply(input: HTMLInputElement, raw: string): void {
    const next = digitsGreaterThanZero(raw);
    if (input.value !== next) {
      const pos = Math.min(input.selectionStart ?? next.length, next.length);
      input.value = next;
      input.setSelectionRange(pos, pos);
    }
    this.control?.control?.setValue(next === '' ? '' : Number(next), {
      emitModelToViewChange: false,
    });
  }
}

function digitsGreaterThanZero(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}
