import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  imports: [FormsModule],
  template: `
    <div class="password-field">
      <input
        class="input"
        [attr.name]="name"
        [type]="visible ? 'text' : 'password'"
        [ngModel]="value"
        (ngModelChange)="onValueChange($event)"
        [ngModelOptions]="{ standalone: true }"
        [required]="required"
        [attr.minlength]="minlength || null"
        [attr.autocomplete]="autocomplete"
        [placeholder]="placeholder"
      />
      <button
        class="password-toggle"
        type="button"
        (click)="toggle()"
        [attr.aria-label]="visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'"
        [attr.aria-pressed]="visible"
      >
        @if (visible) {
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.2 3.9" />
            <path d="M6.6 6.6C4.1 8.3 2 12 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.4-1" />
          </svg>
        } @else {
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        }
      </button>
    </div>
  `,
})
export class PasswordInputComponent {
  @Input() name = 'password';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() autocomplete = 'current-password';
  @Input() required = true;
  @Input() minlength = 8;
  @Output() valueChange = new EventEmitter<string>();

  visible = false;

  onValueChange(next: string): void {
    this.value = next;
    this.valueChange.emit(next);
  }

  toggle(): void {
    this.visible = !this.visible;
  }
}
