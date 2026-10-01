import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-coming-soon',
  template: `
    <article class="card coming-card">
      <h2>{{ heading }}</h2>
      <p>{{ message }}</p>
    </article>
  `,
})
export class ComingSoonComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly shell = inject(ShellService);

  heading = 'قريبًا';
  message = 'هذه الصفحة جاهزة في التصميم، وسنربطها بالخدمات في الخطوة التالية.';

  ngOnInit(): void {
    this.heading = (this.route.snapshot.data['heading'] as string) ?? this.heading;
    this.message = (this.route.snapshot.data['message'] as string) ?? this.message;
    this.shell.set(
      (this.route.snapshot.data['title'] as string) ?? this.heading,
      (this.route.snapshot.data['subtitle'] as string) ?? this.message,
    );
  }
}
