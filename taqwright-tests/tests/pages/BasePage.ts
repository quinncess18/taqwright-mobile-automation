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

  // Shared header selectors (cross-platform via accessibility id).
  readonly title: Locator;
  readonly navMenuBtn: Locator;
  readonly backBtn: Locator;

  constructor(mobile: Mobile) {
    this.mobile = mobile;
    this.isAndroid = mobile.getPlatform() === Platform.ANDROID;
    this.isIOS = !this.isAndroid;
    this.bundleId = this.isAndroid ? 'com.taqelah.demo_app' : 'com.taqelah.demoApp';

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
}
