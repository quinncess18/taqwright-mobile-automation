import { Mobile, Locator, Platform } from '@taqwright/taqwright';

/**
 * BasePage — foundational Page Object for the Taqelah demo app, ported from
 * the WebdriverIO reference repo to taqwright's Playwright-ergonomics surface.
 *
 * The reference repo branched every selector inline (`isAndroid ? 'android=…'
 * : '~…'`). taqwright's `getByLabel()` already maps to `accessibility id` on
 * BOTH platforms (Android content-desc / iOS accessibilityIdentifier→name),
 * so most cross-platform selectors collapse to a single `getByLabel(text)`.
 * Only positional / type / predicate selectors need an explicit branch — use
 * `pick()` (lazy thunks, because getByUiSelector throws on iOS and
 * getByPredicate/getByClassChain throw on Android).
 */
export class BasePage {
  protected mobile: Mobile;
  readonly isAndroid: boolean;
  readonly isIOS: boolean;
  readonly bundleId: string;

  // Platform attribute name for reading an element's a11y description
  // (content-desc on Android, label on iOS). Single source of truth used by
  // every POM that reads product/cart descriptors. Mirrors the reference repo.
  readonly attrName: 'content-desc' | 'label';

  // Render-settle buffer after gestures. The reference repo injects this per
  // device (800ms phone); on CI's render-lagged emulator it widens the window
  // so the Flutter a11y bridge can catch up between a scroll landing and the
  // next scan (the reference's workflow overrides it to 1500ms on CI).
  readonly settlePause: number;

  // Shared header selectors (cross-platform via accessibility id).
  readonly title: Locator;
  readonly navMenuBtn: Locator;
  readonly backBtn: Locator;

  constructor(mobile: Mobile) {
    this.mobile = mobile;
    this.isAndroid = mobile.getPlatform() === Platform.ANDROID;
    this.isIOS = !this.isAndroid;
    this.bundleId = this.isAndroid ? 'com.taqelah.demo_app' : 'com.taqelah.demoApp';
    this.attrName = this.isAndroid ? 'content-desc' : 'label';
    this.settlePause = process.env.CI ? 1500 : 500;

    this.title = mobile.getByLabel('DemoApp');
    this.navMenuBtn = mobile.getByLabel('Open navigation menu');
    this.backBtn = mobile.getByLabel('Back');
  }

  /** Lazily pick a platform-specific locator (thunks avoid the cross-platform throw). */
  protected pick(android: () => Locator, ios: () => Locator): Locator {
    return this.isAndroid ? android() : ios();
  }

  /** Wait until a locator is visible (Playwright-style). */
  async waitVisible(loc: Locator, timeout = 15_000): Promise<void> {
    await loc.waitFor({ state: 'visible', timeout });
  }

  /** Safe visibility check that never throws. */
  async isVisible(loc: Locator): Promise<boolean> {
    try {
      return await loc.isVisible();
    } catch {
      return false;
    }
  }

  /** Hardware/system Back. */
  async deviceBack(): Promise<void> {
    if (this.isAndroid) {
      await this.mobile.pressButton('BACK');
      return;
    }
    // iOS: prefer the app-bar Back button; fall back to edge-swipe.
    if (await this.isVisible(this.backBtn)) {
      await this.backBtn.click();
    } else {
      await this.mobile.goBack();
    }
  }

  /** Send the app to the background (Home), without killing it. */
  async deviceHome(): Promise<void> {
    if (this.isAndroid) {
      await this.mobile.pressButton('HOME');
    } else {
      await this.mobile.backgroundApp(-1);
    }
  }

  /** Re-foreground the (still-running) app. */
  async deviceForeground(): Promise<void> {
    await this.mobile.activateApp(this.bundleId);
  }

  /** Force a fresh process: terminate then relaunch (no reinstall). */
  async killAndRelaunch(): Promise<void> {
    await this.mobile.terminateApp(this.bundleId);
    await this.mobile.waitForTimeout(1500);
    await this.mobile.activateApp(this.bundleId);
  }

  async settle(ms = 800): Promise<void> {
    await this.mobile.waitForTimeout(ms);
  }

  /** Screen dimensions in device units (px on Android, pt on iOS). */
  async getWindowRect(): Promise<{ width: number; height: number }> {
    return this.mobile.getScreenSize();
  }

  /**
   * Coordinate-based W3C swipe — the reference repo's primitive, ported via
   * taqwright's raw WebDriver client. taqwright's own `mobile.swipe()` is
   * direction-based; the catalog scans need exact start/end coordinates, so we
   * drive `performActions` directly. `origin: 'viewport'` keeps the end point
   * absolute (not relative to the press point).
   */
  async swipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration = 1200,
  ): Promise<void> {
    await this.mobile.raw.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration, origin: 'viewport', x: endX, y: endY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await this.mobile.raw.releaseActions();
    await this.settle(this.settlePause);
  }

  /**
   * Single-shot structural scan of the CURRENT page source for product cards.
   *
   * One `getPageSource()` per scan replaces the per-element `.all()` +
   * N×getAttribute storm the reference repo used: that issued ~10 round-trips
   * per flick which, across the 32-item catalog scan, reliably crashed the
   * UiAutomator2 instrumentation under load. The single atomic snapshot is far
   * lighter and keeps the instrumentation alive.
   *
   * Each product card is a clickable Image (content-desc on Android / label on
   * iOS = "Name\n$Price") whose CHILD is the per-card cart (add-to-cart) Button.
   * So for each priced Image we also report whether it contains a Button child —
   * the "cart icon present in this product's container" check. A card clipped at
   * the viewport edge renders as a self-closing Image (no child Button yet); it
   * is re-confirmed on a later flick once fully on-screen, so callers ACCUMULATE
   * cart-icon presence across the scroll rather than asserting per frame.
   *
   * NOTE (iOS): the cart-Button-as-Image-child nesting is verified on Android;
   * re-confirm against an iOS grid dump when the catalog reaches the iOS lane.
   */
  protected async scanProductCards(): Promise<
    Array<{ name: string; price: string; hasCartIcon: boolean }>
  > {
    // iOS does NOT go through getPageSource: WDA's source serialization does not
    // surface the Flutter card's "Name\n$Price" a11y string in a form the Android
    // regex below can parse (the getPageSource scan was validated on Android only;
    // on iOS it matched 0 cards in run 27867706941 → C04 collected names 0/32 on
    // every attempt). TC-C03 proves the element-query path works on iOS, so reuse
    // it. The per-element round-trips that crashed UiAutomator2 under load on
    // Android are not a problem for WDA (the reference scanned iOS this way too).
    if (this.isIOS) return this.scanProductCardsViaElements();

    const xml = await this.mobile.raw.getPageSource();
    const imgClass = this.isAndroid ? 'android.widget.ImageView' : 'XCUIElementTypeImage';
    const btnClass = this.isAndroid ? 'android.widget.Button' : 'XCUIElementTypeButton';
    const re = new RegExp(
      `<${imgClass}\\b[^>]*?${this.attrName}="([^"]*\\$[^"]*)"[^>]*?(/?)>`,
      'g',
    );
    const out: Array<{ name: string; price: string; hasCartIcon: boolean }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const [name, price] = this.decodeXmlEntities(m[1]).split('\n');
      let hasCartIcon = false;
      if (m[2] !== '/') {
        // Open (non-self-closing) Image → inspect its children for the Button.
        const close = xml.indexOf(`</${imgClass}>`, re.lastIndex);
        const inner = close === -1 ? xml.slice(re.lastIndex) : xml.slice(re.lastIndex, close);
        hasCartIcon = inner.includes(`<${btnClass}`);
      }
      out.push({ name, price, hasCartIcon });
    }
    return out;
  }

  /**
   * iOS card scan via element queries (the getPageSource path is Android-only).
   * Query the priced product Images (name CONTAINS "$") and read each visible
   * one's a11y descriptor ("Name\n$Price"). Mirrors getFirstProductDetails /
   * TC-C03, which are proven on the iOS lane. Cart-icon presence is asserted on
   * Android only (the iOS Image→Button nesting is unconfirmed — Phase D), so it
   * is reported false here.
   */
  private async scanProductCardsViaElements(): Promise<
    Array<{ name: string; price: string; hasCartIcon: boolean }>
  > {
    const out: Array<{ name: string; price: string; hasCartIcon: boolean }> = [];
    const cards = await this.mobile
      .getByClassChain('**/XCUIElementTypeImage[`name CONTAINS "$"`]')
      .all();
    for (const c of cards) {
      if (!(await c.isVisible().catch(() => false))) continue;
      const desc = await c.getAttribute(this.attrName).catch(() => null);
      if (!desc || !desc.includes('$')) continue;
      const [name, price] = desc.split('\n');
      out.push({ name, price, hasCartIcon: false });
    }
    return out;
  }

  /** Un-escape the XML entities Appium emits in page-source attribute values. */
  private decodeXmlEntities(s: string): string {
    return s
      .replace(/&#10;/g, '\n')
      .replace(/&#13;/g, '\r')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  /**
   * Is the element's vertical CENTRE inside the 20%–80% "comfort zone" of the
   * viewport? More reliable than a raw visibility check for Flutter edge
   * elements (which report visible while half-clipped at a screen edge).
   * Mirrors the reference repo's BasePage.isInsideViewport.
   */
  async isInsideViewport(loc: Locator): Promise<boolean> {
    try {
      if (!(await loc.isVisible())) return false;
      const box = await loc.boundingBox();
      const { height: screenHeight } = await this.getWindowRect();
      const centerY = box.y + box.height / 2;
      return centerY >= screenHeight * 0.2 && centerY <= screenHeight * 0.8;
    } catch {
      return false;
    }
  }

  /**
   * Universal reset-to-top (pure navigation, no nudge). Returns a scrollable
   * screen to its ceiling. Phone = short downward drags; tablet = power swipes.
   * Mirrors the reference repo's BasePage.resetToTop.
   */
  async resetToTop(count?: number): Promise<void> {
    const { width, height } = await this.getWindowRect();
    const isTablet = width > 1200;
    const safeX = Math.round(width * 0.3);
    const resetCount = count ?? (isTablet ? 2 : 1);

    for (let i = 0; i < resetCount; i++) {
      if (!isTablet) {
        await this.swipe(
          safeX,
          Math.round(height * 0.45),
          safeX,
          Math.round(height * 0.65),
          400,
        );
        await this.mobile.waitForTimeout(150);
      } else {
        await this.swipe(
          safeX,
          Math.round(height * 0.25),
          safeX,
          Math.round(height * 0.9),
          600,
        );
        await this.mobile.waitForTimeout(200);
      }
    }
    await this.mobile.waitForTimeout(500);
  }
}
