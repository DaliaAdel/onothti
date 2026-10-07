import { Component, Input } from '@angular/core';

const APPROVED: Record<string, string> = {
  home: 'home',
  search: 'search',
  services: 'services',
  spark: 'expert',
  expert: 'expert',
  user: 'profile',
  profile: 'profile',
  bell: 'notifications',
  about: 'about',
  help: 'support',
  support: 'support',
  bag: 'support',
  card: 'package',
  package: 'package',
  chart: 'views',
  views: 'views',
  eye: 'views',
  star: 'ratings',
  ratings: 'ratings',
  pin: 'location',
  location: 'location',
  logout: 'logout',
  grid: 'services',
};

@Component({
  selector: 'app-icon',
  template: `
    @if (asset) {
      <img class="icon-img" [src]="asset" alt="" />
    } @else {
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        @switch (name) {
          @case ('heart') {
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
          }
          @case ('image') {
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9" r="1.5" />
            <path d="m21 15-5-5L5 20" />
          }
          @case ('diamond') {
            <path d="m12 2 8 6-8 14L4 8l8-6Z" />
            <path d="m4 8 16 0M9 2l-2 6 5 14 5-14-2-6" />
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
          @case ('brief') {
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M8 7V4h8v3M3 12h18" />
          }
          @default {
            <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
          }
        }
      </svg>
    }
  `,
})
export class IconComponent {
  @Input({ required: true }) name = 'spark';

  get asset(): string | null {
    const file = APPROVED[this.name];
    return file ? `/assets/approved-icons/${file}.png` : null;
  }
}
