import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  template: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      @switch (name) {
        @case ('home') {
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5M9 21v-7h6v7" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        }
        @case ('heart') {
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        }
        @case ('bag') {
          <path d="M6 8h12l1 13H5L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        }
        @case ('bell') {
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        }
        @case ('user') {
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        }
        @case ('spark') {
          <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3ZM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16Z" />
        }
        @case ('image') {
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
          <path d="m21 15-5-5L5 20" />
        }
        @case ('star') {
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        }
        @case ('eye') {
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        }
        @case ('diamond') {
          <path d="m12 2 8 6-8 14L4 8l8-6Z" />
          <path d="m4 8 16 0M9 2l-2 6 5 14 5-14-2-6" />
        }
        @case ('help') {
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9a2.4 2.4 0 1 1 3 2.3c-.8.3-.8 1.2-.8 1.7M12 17h.01" />
        }
        @case ('chev') {
          <path d="m9 18 6-6-6-6" />
        }
        @case ('arrow') {
          <path d="M5 12h14M13 6l6 6-6 6" />
        }
        @case ('check') {
          <path d="m5 12 4 4L19 6" />
        }
        @case ('upload') {
          <path d="M12 16V4m0 0L7 9m5-5 5 5" />
          <path d="M4 15v5h16v-5" />
        }
        @case ('edit') {
          <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
          <path d="m14 7 3 3" />
        }
        @default {
          <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  @Input({ required: true }) name = 'spark';
}
