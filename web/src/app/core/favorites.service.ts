import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import type { FavoriteList, FavoriteRow } from './models';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly api = inject(ApiService);
  private readonly keys = signal(new Set<string>());
  readonly items = signal<FavoriteRow[]>([]);
  readonly loaded = signal(false);

  isSaved(type: 'PROVIDER' | 'SERVICE', id: string): boolean {
    return this.keys().has(`${type}:${id}`);
  }

  ensureLoaded(): void {
    if (this.loaded()) {
      return;
    }
    this.reload();
  }

  reload(): void {
    this.api.favorites().subscribe({
      next: (data) => this.apply(data),
      error: () => {
        this.items.set([]);
        this.keys.set(new Set());
        this.loaded.set(true);
      },
    });
  }

  toggle(type: 'PROVIDER' | 'SERVICE', id: string) {
    const saved = this.isSaved(type, id);
    const req = saved ? this.api.removeFavorite(type, id) : this.api.addFavorite(type, id);
    return req.pipe(
      tap(() => {
        const key = `${type}:${id}`;
        const next = new Set(this.keys());
        if (saved) {
          next.delete(key);
          this.items.set(this.items().filter((row) => `${row.targetType}:${row.targetId}` !== key));
        } else {
          next.add(key);
        }
        this.keys.set(next);
      }),
    );
  }

  private apply(data: FavoriteList): void {
    const rows = [...(data.provider ?? []), ...(data.service ?? [])];
    this.items.set(rows);
    this.keys.set(new Set(rows.map((row) => `${row.targetType}:${row.targetId}`)));
    this.loaded.set(true);
  }
}
