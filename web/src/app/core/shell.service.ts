import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShellService {
  readonly title = signal('land.brand');
  readonly subtitle = signal('');

  set(title: string, subtitle = ''): void {
    this.title.set(title);
    this.subtitle.set(subtitle);
  }
}
