import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  styleUrl: './landing.css',
  host: { class: 'landing-page', style: 'display:block' },
  template: `
    <div class="landing-page" [class.menu-open]="menuOpen">
      <header class="site-header" [class.scrolled]="scrolled" [class.menu-open]="menuOpen">
        <a class="site-brand" href="#top" aria-label="منصة الأنوثة والجمال">
          <img src="/assets/logo-auth.png" alt="شعار منصة الأنوثة والجمال" />
          <span>منصة الأنوثة والجمال</span>
        </a>
        <nav aria-label="التنقل الرئيسي">
          <a href="#services">الخدمات</a>
          <a href="#how">كيف تعمل المنصة؟</a>
          <a href="#experts">للخبيرات</a>
          <a href="#about">لماذا نحن؟</a>
        </nav>
        <div class="header-store-links" aria-label="تحميل التطبيق">
          <button class="store-badge google-play-badge" type="button" (click)="soon('Google Play')" aria-label="Get it on Google Play">
            <span><small>GET IT ON</small><strong>Google Play</strong></span>
          </button>
          <button class="store-badge app-store-badge" type="button" (click)="soon('App Store')" aria-label="Download on the App Store">
            <span><small>Download on the</small><strong>App Store</strong></span>
          </button>
        </div>
        <div class="header-actions">
          <a class="btn text-btn" routerLink="/login">تسجيل الدخول</a>
          <a class="btn primary" routerLink="/signup">إنشاء حساب</a>
        </div>
        <button class="menu-button" type="button" (click)="menuOpen = !menuOpen" aria-label="فتح القائمة">☰</button>
      </header>

      <main id="top">
        <section class="hero-section section-shell">
          <div class="hero-copy">
            <span class="eyebrow">خبرتكِ الجمالية أقرب مما تتخيلين</span>
            <h1>كل خدمات الجمال<br /><em>في مكان واحد</em></h1>
            <p>اكتشفي الخبيرة المناسبة في مدينتكِ، قارني الخدمات والتقييمات، وتواصلي معها مباشرة بخطوات بسيطة وواضحة.</p>
            <div class="hero-actions">
              <a class="btn primary large" routerLink="/signup">ابدئي الآن مجانًا</a>
              <a class="btn secondary large" href="#services">استكشفي الخدمات</a>
            </div>
            <div class="hero-proof"><span>✓ خبيرات متخصصات</span><span>✓ تواصل مباشر</span><span>✓ خدمات في مدينتكِ</span></div>
          </div>
          <div class="hero-visual">
            <img class="hero-photo" src="/assets/photos/hero-makeup.png" alt="خبيرة مكياج تجهز عميلة لمناسبتها" fetchpriority="high" decoding="async" />
            <div class="visual-orbit one"></div>
            <div class="visual-orbit two"></div>
            <div class="browser-card">
              <div class="browser-head"><i></i><i></i><i></i><small>منصة الأنوثة والجمال</small></div>
              <div class="browser-body">
                <div class="visual-title"><span>مساء الخير، سارة</span><small>ما الخدمة التي تبحثين عنها؟</small></div>
                <div class="visual-search">⌕ <span>ابحثي عن خدمة...</span><b>الرياض</b></div>
                <div class="visual-services">
                  <div><img src="/assets/icons/makeup.png" alt="" /><span>مكياج</span></div>
                  <div><img src="/assets/icons/hair.png" alt="" /><span>شعر</span></div>
                  <div><img src="/assets/icons/skincare.png" alt="" /><span>بشرة</span></div>
                </div>
                <div class="expert-mini">
                  <div class="mini-avatar">ن</div>
                  <div><b>نور للتجميل المنزلي</b><span>مكياج · تسريحات · الرياض</span></div>
                  <strong>★ 4.9</strong>
                </div>
              </div>
            </div>
            <div class="floating-card clients"><b>+50,000</b><span>عميلة على المنصة</span></div>
            <div class="floating-card verified">✦ <span>خيارات متنوعة بالقرب منكِ</span></div>
          </div>
        </section>

        <section class="trust-strip" aria-label="أرقام المنصة">
          <div><b>+1,200</b><span>خبيرة نشطة</span></div>
          <div><b>+60</b><span>خدمة فرعية</span></div>
          <div><b>15</b><span>مدينة مغطاة</span></div>
          <div><b>4.9</b><span>متوسط التقييمات</span></div>
        </section>

        <section class="service-marquee" aria-label="خدمات المنصة">
          <div class="marquee-track">
            <div class="marquee-group">
              @for (name of marquee; track name) {
                <span>{{ name }}</span><i>✦</i>
              }
            </div>
            <div class="marquee-group" aria-hidden="true">
              @for (name of marquee; track name + '-2') {
                <span>{{ name }}</span><i>✦</i>
              }
            </div>
          </div>
        </section>

        <section id="services" class="section-shell content-section">
          <div class="section-heading centered">
            <span class="eyebrow">اختاري ما يناسبكِ</span>
            <h2>خدمات الجمال التي تحتاجينها</h2>
            <p>من العناية اليومية إلى تجهيز المناسبات، ستجدين تخصصات متعددة وخبيرات بالقرب منكِ.</p>
          </div>
          <div class="service-grid">
            @for (service of services; track service.code) {
              <article class="photo-service-card">
                <img class="service-photo" [src]="'/assets/service-photos/' + service.photo" [alt]="service.name" loading="lazy" decoding="async" />
                <div>
                  <img [src]="'/assets/icons/' + service.icon" alt="" loading="lazy" decoding="async" />
                  <h3>{{ service.name }}</h3>
                  <p>{{ service.text }}</p>
                </div>
              </article>
            }
          </div>
          <div class="center-action"><a class="btn secondary" routerLink="/signup">شاهدي جميع الخدمات</a></div>
        </section>

        <section class="featured-section">
          <div class="section-shell">
            <div class="featured-intro">
              <div class="section-heading">
                <span class="eyebrow">اختيارات تثقين بها</span>
                <h2>خبيرات بين يديك</h2>
                <p>ملفات احترافية تعرض التخصص والخدمات ونماذج الأعمال والتقييمات لمساعدتكِ على اتخاذ قراركِ بثقة.</p>
              </div>
              <a class="btn primary" routerLink="/signup">اكتشفي الخبيرات</a>
            </div>
            <div class="featured-grid">
              <article class="featured-card featured-main">
                <div class="featured-cover has-photo">
                  <img src="/assets/expert-photos/expert-noor.webp" alt="" loading="lazy" decoding="async" />
                  <span>الأكثر طلبًا</span>
                </div>
                <div class="featured-info"><div><h3>نور للتجميل المنزلي</h3><p>مكياج عرائس · تسريحات</p></div><strong>★ 4.9</strong></div>
                <div class="featured-meta"><span>⌖ الرياض</span><span>42 تقييمًا</span><span>متاحة للتواصل</span></div>
                <a class="featured-action" routerLink="/signup">عرض الملف الاحترافي ←</a>
              </article>
              <article class="featured-card">
                <div class="featured-cover second has-photo">
                  <img src="/assets/expert-photos/expert-maha.webp" alt="" loading="lazy" decoding="async" />
                  <span>خبيرة مميزة</span>
                </div>
                <div class="featured-info"><div><h3>لمسة مها</h3><p>مكياج مناسبات · رموش</p></div><strong>★ 4.8</strong></div>
                <div class="featured-meta"><span>⌖ جدة</span><span>35 تقييمًا</span></div>
                <a class="featured-action" routerLink="/signup">عرض الملف الاحترافي ←</a>
              </article>
              <article class="featured-card">
                <div class="featured-cover third has-photo">
                  <img src="/assets/expert-photos/expert-reem.webp" alt="" loading="lazy" decoding="async" />
                  <span>اختيار العميلات</span>
                </div>
                <div class="featured-info"><div><h3>استوديو ريم</h3><p>تسريحات · عناية بالشعر</p></div><strong>★ 4.9</strong></div>
                <div class="featured-meta"><span>⌖ الرياض</span><span>51 تقييمًا</span></div>
                <a class="featured-action" routerLink="/signup">عرض الملف الاحترافي ←</a>
              </article>
            </div>
          </div>
        </section>

        <section id="how" class="how-section">
          <div class="section-shell">
            <div class="section-heading">
              <span class="eyebrow">رحلة بسيطة وواضحة</span>
              <h2>من البحث إلى التواصل في دقائق</h2>
              <p>صممنا التجربة لتصلي إلى الخبيرة الأنسب بدون خطوات معقدة.</p>
            </div>
            <div class="steps-grid">
              <article><span>01</span><div class="step-icon">⌕</div><h3>ابحثي وحددي موقعكِ</h3><p>اختاري الخدمة والمنطقة والمدينة لتظهر لكِ النتائج الأقرب.</p></article>
              <article><span>02</span><div class="step-icon">♡</div><h3>قارني واختاري</h3><p>راجعي الملفات والأعمال والتقييمات ثم احفظي ما يعجبكِ.</p></article>
              <article><span>03</span><div class="step-icon">↗</div><h3>تواصلي مباشرة</h3><p>انتقلي إلى وسيلة التواصل المتاحة واتفقي مع الخبيرة بسهولة.</p></article>
            </div>
          </div>
        </section>

        <section class="section-shell impact-section">
          <div class="impact-card customer-impact">
            <span class="impact-number">01</span>
            <div>
              <span class="eyebrow">للعميلة</span>
              <h2>خيارات أكثر، وقرار أسهل</h2>
              <p>بدل البحث العشوائي، اجمعي كل الخيارات في مكان واحد، قارني الملفات واحفظي المفضلة وتابعي طلباتكِ بسهولة.</p>
              <div class="impact-points"><span>بحث بالموقع والخدمة</span><span>ملفات وتقييمات واضحة</span><span>مفضلة وطلبات في مكان واحد</span></div>
              <a class="btn primary" routerLink="/signup/phone" [queryParams]="{ role: 'customer' }">ابدئي كعميلة</a>
            </div>
            <div class="impact-visual customer-visual has-customer-photo">
              <img src="/assets/photos/customer-browsing-clean.png" alt="عميلة تتصفح خبيرات الجمال" loading="lazy" decoding="async" />
            </div>
          </div>
          <div class="impact-card expert-impact">
            <span class="impact-number">02</span>
            <div>
              <span class="eyebrow light">للخبيرة</span>
              <h2>حضور احترافي وفرص نمو حقيقية</h2>
              <p>حوّلي خبرتكِ إلى ملف واضح يصل إلى عميلات يبحثن بالفعل عن خدماتكِ داخل مدينتكِ.</p>
              <div class="impact-points"><span>عرض الخدمات والألبومات</span><span>إحصاءات للمشاهدات</span><span>وصول لعميلات مهتمات</span></div>
              <a class="btn light-btn" routerLink="/signup/phone" [queryParams]="{ role: 'provider' }">ابدئي كخبيرة</a>
            </div>
            <div class="impact-visual expert-visual">
              <div class="growth-ring"><b>+38%</b><small>نمو المشاهدات</small></div>
              <div class="growth-bars"><i style="height:35%"></i><i style="height:48%"></i><i style="height:56%"></i><i style="height:76%"></i><i style="height:92%"></i></div>
            </div>
          </div>
        </section>

        <section id="experts" class="section-shell expert-section">
          <div class="expert-panel">
            <div class="expert-copy">
              <span class="eyebrow light">للخبيرات وصاحبات الأعمال</span>
              <h2>وسّعي حضوركِ<br />واصلي إلى عميلات أكثر</h2>
              <p>أنشئي ملفًا احترافيًا، اعرضي خدماتكِ وألبومات أعمالكِ، وتابعي المشاهدات وطلبات التواصل من مكان واحد.</p>
              <ul>
                <li>ملف احترافي يبرز خبرتكِ وأعمالكِ</li>
                <li>ظهور للعميلات حسب الخدمة والموقع</li>
                <li>إحصاءات واضحة للمشاهدات والتواصل</li>
                <li>باقات مرنة تناسب مرحلة عملكِ</li>
              </ul>
              <a class="btn light-btn large" routerLink="/signup/phone" [queryParams]="{ role: 'provider' }">انضمي كخبيرة</a>
            </div>
            <div class="expert-dashboard">
              <div class="dash-top"><span>نور للتجميل المنزلي</span><b>الباقة الذهبية · مفعّلة</b></div>
              <div class="dash-stats">
                <div><b>1,248</b><span>مشاهدة للملف</span></div>
                <div><b>86</b><span>مرة تواصل</span></div>
                <div><b>4.9</b><span>التقييم</span></div>
              </div>
              <small>أداء ملفكِ خلال آخر 7 أيام</small>
            </div>
          </div>
        </section>

        <section id="about" class="section-shell content-section">
          <div class="section-heading centered">
            <span class="eyebrow">تجربة مبنية على الثقة</span>
            <h2>لماذا منصة الأنوثة والجمال؟</h2>
          </div>
          <div class="benefit-grid">
            <article><i>◇</i><h3>اختيارات متنوعة</h3><p>خدمات وتخصصات متعددة تساعدكِ على إيجاد ما يناسب احتياجكِ.</p></article>
            <article><i>⌖</i><h3>نتائج حسب موقعكِ</h3><p>حددي المنطقة والمدينة للوصول إلى الخبيرات القريبات منكِ.</p></article>
            <article><i>☆</i><h3>ملفات واضحة</h3><p>شاهدي الخدمات ونماذج الأعمال والتقييمات قبل التواصل.</p></article>
            <article><i>↗</i><h3>تواصل مباشر</h3><p>رحلة بسيطة من البحث وحتى بدء التواصل مع الخبيرة.</p></article>
          </div>
        </section>

        <section id="faq" class="section-shell faq-section">
          <div class="section-heading centered">
            <span class="eyebrow">الأسئلة الشائعة</span>
            <h2>كل ما تحتاجين معرفته</h2>
          </div>
          <div class="faq-list">
            <details open>
              <summary>كيف أبدأ استخدام المنصة؟</summary>
              <p>أنشئي حسابًا، اختاري نوع الحساب، ثم أكملي بياناتكِ الأساسية لتبدئي التصفح أو عرض خدماتكِ.</p>
            </details>
            <details>
              <summary>هل التواصل مع الخبيرة مباشر؟</summary>
              <p>نعم، بعد اختيار الخبيرة يمكنكِ استخدام وسيلة التواصل المتاحة في ملفها وفق إعدادات المنصة.</p>
            </details>
            <details>
              <summary>كيف تظهر خدمات الخبيرة للعميلات؟</summary>
              <p>بعد اختيار الباقة واعتماد الحساب، تضيف الخبيرة خدماتها وألبوماتها لتظهر ضمن نتائج البحث المناسبة.</p>
            </details>
            <details>
              <summary>هل أستطيع تغيير المدينة لاحقًا؟</summary>
              <p>نعم، يمكن تعديل المدينة من الملف الشخصي، بينما تُحدد منطقة البحث والمدينة عند كل عملية بحث.</p>
            </details>
          </div>
        </section>

        <section class="final-cta">
          <div>
            <img src="/assets/logo-auth.png" alt="" />
            <h2>ابدئي تجربتكِ اليوم</h2>
            <p>سواء كنتِ تبحثين عن خدمة جمال أو ترغبين في الوصول إلى عميلات أكثر، مكانكِ هنا.</p>
            <div>
              <a class="btn light-btn large" routerLink="/signup/phone" [queryParams]="{ role: 'customer' }">إنشاء حساب عميلة</a>
              <a class="btn outline-light large" routerLink="/signup/phone" [queryParams]="{ role: 'provider' }">إنشاء حساب خبيرة</a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div class="footer-brand">
          <img src="/assets/logo-auth.png" alt="" />
          <div>
            <b>منصة الأنوثة والجمال</b>
            <span>الجمال أقرب إليكِ</span>
            <p>منصة تجمع العميلات والخبيرات وتسهّل اكتشاف خدمات الجمال والتواصل بشأنها.</p>
          </div>
        </div>
        <div>
          <b>المنصة</b>
          <a href="#services">الخدمات</a>
          <a href="#how">كيف تعمل؟</a>
          <a href="#experts">للخبيرات</a>
        </div>
        <div>
          <b>المساعدة</b>
          <a href="#faq">الأسئلة الشائعة</a>
          <a routerLink="/legal/policies">سياسة الخصوصية</a>
          <a routerLink="/legal/terms">الشروط والأحكام</a>
        </div>
        <div>
          <b>الحساب</b>
          <a routerLink="/login">تسجيل الدخول</a>
          <a routerLink="/signup">إنشاء حساب</a>
        </div>
        <small>© 2026 منصة الأنوثة والجمال. جميع الحقوق محفوظة.</small>
      </footer>

      @if (toast) {
        <div class="placeholder-toast show" role="status">{{ toast }}</div>
      }
    </div>
  `,
})
export class LandingComponent {
  menuOpen = false;
  scrolled = false;
  toast = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly marquee = [
    'خبيرة الشعر',
    'خبيرة مكياج',
    'المايكروبليدنج',
    'خبيرة الأظافر',
    'حناء ونقش',
    'العناية بالبشرة',
    'العناية بالجسم',
    'منسقة موسيقى (دي جي)',
    'منسقة الحفلات',
    'فساتين الأعراس',
    'المصورات',
    'المودل',
    'ركن المشروبات',
    'التخريم',
  ];

  readonly services = [
    { code: 'hair', photo: 'hair.webp', icon: 'hair.png', name: 'خبيرة الشعر', text: 'قص وتسريحات وصبغات ومعالجات احترافية للشعر.' },
    { code: 'makeup', photo: 'makeup.webp', icon: 'makeup.png', name: 'خبيرة مكياج', text: 'مكياج مناسبات وعرائس وإطلالات يومية.' },
    { code: 'microblading', photo: 'microblading.webp', icon: 'microblading.png', name: 'المايكروبليدنج', text: 'تحديد الحواجب ورفع الحواجب والرموش باحترافية.' },
    { code: 'nails', photo: 'nails.webp', icon: 'nails.png', name: 'خبيرة الأظافر', text: 'تركيب الأظافر والعناية بها والمانيكير والباديكير.' },
    { code: 'henna', photo: 'henna.webp', icon: 'henna.png', name: 'حناء ونقش', text: 'نقوش عصرية وتقليدية لمناسباتكِ.' },
    { code: 'skincare', photo: 'skincare.webp', icon: 'skincare.png', name: 'العناية بالبشرة', text: 'جلسات عناية وتنظيف تناسب نوع بشرتكِ.' },
    { code: 'bodycare', photo: 'bodycare.webp', icon: 'bodycare.png', name: 'العناية بالجسم', text: 'سبا ومساج وحمام مغربي وعناية متكاملة بالجسم.' },
    { code: 'dj', photo: 'dj.webp', icon: 'dj.png', name: 'منسقة موسيقى', text: 'تنسيق الموسيقى والفرق الغنائية وعروض المناسبات.' },
    { code: 'events', photo: 'events.webp', icon: 'events.png', name: 'منسقة الحفلات', text: 'تنظيم وتنسيق الحفلات والمناسبات والديكور والضيافة.' },
    { code: 'dresses', photo: 'dresses.webp', icon: 'dresses.png', name: 'فساتين الأعراس', text: 'بيع وتأجير وتصميم فساتين الأعراس.' },
    { code: 'photography', photo: 'photography.webp', icon: 'photography.png', name: 'المصورات', text: 'تصوير الأعراس والحفلات والمنتجات والمحتوى.' },
    { code: 'model', photo: 'model.webp', icon: 'model.png', name: 'المودل', text: 'مودل لعرض خدمات الجمال والمنتجات والمحتوى.' },
    { code: 'drinks', photo: 'drinks.webp', icon: 'drinks.png', name: 'ركن المشروبات', text: 'بوث القهوة والمشروبات للمناسبات المختلفة.' },
    { code: 'piercing', photo: 'piercing.webp', icon: 'piercing.png', name: 'التخريم', text: 'خدمات تخريم احترافية وفق معايير النظافة والسلامة.' },
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 24;
    if (this.menuOpen && window.scrollY > 8) {
      this.menuOpen = false;
    }
  }

  soon(name: string): void {
    this.toast = `سيتم تفعيل رابط ${name} عند إضافة البيانات الرسمية.`;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => (this.toast = ''), 2600);
  }
}
