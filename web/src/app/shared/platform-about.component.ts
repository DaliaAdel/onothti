import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AccountType } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-platform-about',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>حول المنصة</h1>
        <p>{{ subtitle }}</p>
      </div>
    </div>
    <article class="card about-hero">
      <img src="/assets/logo.png" alt="أنوثتي" />
      <h2>منصة الأنوثة والجمال</h2>
      <p class="muted">{{ intro }}</p>
      <span class="status success">الإصدار 1.0.0</span>
    </article>
    <div class="grid two about-points">
      @for (card of cards; track card.title) {
        <article class="card">
          <h3>{{ card.title }}</h3>
          <p class="muted small">{{ card.text }}</p>
        </article>
      }
    </div>
    <div class="card about-legal">
      <h3>المساعدة والسياسات</h3>
      <p class="muted small">{{ helpText }}</p>
      <div class="hero-actions about-actions">
        <a class="btn ghost" routerLink="/legal/policies" [queryParams]="{ audience: audience }">سياسة الخصوصية</a>
        <a class="btn ghost" routerLink="/legal/terms" [queryParams]="{ audience: audience }">الشروط والأحكام</a>
        <a class="btn primary" [routerLink]="helpRoute">{{ helpLabel }}</a>
      </div>
      <p class="muted small about-mail">تواصل معنا: <b dir="ltr">info&#64;onothti.com</b></p>
    </div>
  `,
})
export class PlatformAboutComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);

  ngOnInit(): void {
    this.shell.set('حول المنصة', 'منصة الأنوثة والجمال');
  }

  get audience(): AccountType {
    const type = this.session.user()?.accountType;
    return type === 'PROVIDER' || type === 'STAFF' ? type : 'CUSTOMER';
  }

  get subtitle(): string {
    if (this.audience === 'PROVIDER') {
      return 'منصة تعرض ملفكِ وخدماتكِ للعميلات وتسهّل إدارة أعمالكِ باحتراف.';
    }
    if (this.audience === 'STAFF') {
      return 'منصة الأنوثة والجمال لإدارة الحسابات والخدمات بأمان.';
    }
    return 'منصة تجمع العميلات والخبيرات وتسهّل اكتشاف خدمات الجمال والتواصل بشأنها.';
  }

  get intro(): string {
    if (this.audience === 'PROVIDER') {
      return 'تربط العميلات بالخبيرات، وتعرض خدماتكِ وألبوماتكِ بعد الاعتماد من المنصة.';
    }
    if (this.audience === 'STAFF') {
      return 'تربط العميلات بالخبيرات وتسهّل إدارة الحسابات والاعتمادات من لوحة المعلومات.';
    }
    return 'تربط العميلات بالخبيرات وتسهّل اكتشاف خدمات الجمال والتواصل بشأنها.';
  }

  get cards(): { title: string; text: string }[] {
    if (this.audience === 'PROVIDER') {
      return [
        { title: 'ملف احترافي', text: 'اعرضي اسمكِ وخدماتكِ ونماذج أعمالكِ بعد اعتماد المنصة.' },
        { title: 'خدمات وألبومات', text: 'أضيفي خدماتكِ الفرعية وارفعِ صور وفيديوهات أعمالكِ للمراجعة.' },
        { title: 'ظهور للعميلات', text: 'بعد تفعيل الباقة يظهر ملفكِ في البحث حسب المدينة والتخصص.' },
        { title: 'تواصل ودعم', text: 'العميلات يتواصلن عبر واتساب خارج المنصة، وللمساعدة افتحي طلبًا من الطلبات.' },
      ];
    }
    if (this.audience === 'STAFF') {
      return [
        { title: 'اعتماد الحسابات', text: 'مراجعة بيانات الحسابات والاعمال والتقييمات وإدارة حالاتاعتمادها'},
        { title: 'إدارة التشغيل', text: 'الخدمات والمناطق والباقات والشروط من لوحة إعدادات المنصة.' },
        { title: 'طلبات الدعم', text: 'متابعة طلبات العميلات والخبيرات والرد عليها من مكان واحد.' },
        { title: 'تشغيل آمن', text: 'صلاحيات واضحة لكل دور لحماية بيانات الحسابات ومسار الاعتماد.' },
      ];
    }
    return [
      { title: 'اختيارات متنوعة', text: 'خدمات وتخصصات متعددة تساعدكِ على إيجاد ما يناسب احتياجكِ.' },
      { title: 'نتائج حسب موقعكِ', text: 'حددي المنطقة والمدينة للوصول إلى الخبيرات القريبات منكِ.' },
      { title: 'ملفات واضحة', text: 'شاهدي الخدمات ونماذج الأعمال والتقييمات قبل التواصل.' },
      { title: 'تواصل مباشر', text: 'رحلة بسيطة من البحث وحتى بدء التواصل مع الخبيرة عبر واتساب خارج المنصة.' },
    ];
  }

  get helpText(): string {
    if (this.audience === 'PROVIDER') {
      return 'راجعي الصفحات القانونية أو افتحي طلبًا من الطلبات عند الحاجة.';
    }
    if (this.audience === 'STAFF') {
      return 'راجعي سياسات المنصة أو عودي إلى لوحة المعلومات لمتابعة العمل.';
    }
    return 'الاطلاع على سياسات المنصة وشروط استخدامها , او العودة الى لوحة المعلومات';
  }

  get helpRoute(): string {
    if (this.audience === 'PROVIDER') {
      return '/p/support';
    }
    if (this.audience === 'STAFF') {
      return '/ops';
    }
    return '/c/requests';
  }

  get helpLabel(): string {
    if (this.audience === 'PROVIDER') {
      return 'الطلبات';
    }
    if (this.audience === 'STAFF') {
      return 'لوحة المعلومات';
    }
    return 'طلباتي';
  }
}
