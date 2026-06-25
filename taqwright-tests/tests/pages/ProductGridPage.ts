import { Mobile, Locator } from '@taqwright/taqwright';
import { BasePage } from './BasePage.js';
import type { Category } from '../data/products.js';

/**
 * ProductGridPage — POM for the "All Dresses" / category listing grid.
 *
 * Ported from the reference repo (tests/pages/ProductGridPage.js) to taqwright.
 * This port covers the Catalog slice's needs only: grid load, sort menu, the
 * first-product read, the full-catalog and per-category integrity scans, and
 * cart entry. The §4 (Products) search / add-to-cart / cart-stepper helpers are
 * intentionally deferred to that slice.
 *
 * Selector notes carried from the reference:
 *  - The grid app-bar Sort + Cart icons are nameless on iOS (Flutter Key() does
 *    not reach accessibilityIdentifier) AND the Landing "only nameless visible
 *    button" trick fails here because the grid also exposes nameless per-card
 *    add-to-cart buttons. They are disambiguated geometrically in
 *    `iosAppBarActionBtn()` (top app-bar band, leftmost = Sort, rightmost = Cart).
 *  - Every product card carries a "$" price, so "$" in the a11y name uniquely
 *    identifies product cards for the audit scans.
 */
export class ProductGridPage extends BasePage {
  readonly resultCount: Locator;
  readonly clickableItems: Locator;
  readonly firstProductCard: Locator;

  // Sort menu
  readonly sortTitle: Locator;
  readonly sortOptionAZ: Locator;
  readonly sortOptionZA: Locator;
  readonly sortOptionPriceLowHigh: Locator;
  readonly sortOptionPriceHighLow: Locator;

  // Search (catalog grid): the lone text input + its two result-state messages.
  readonly searchField: Locator;
  readonly noResultsMsg: Locator;
  readonly searchCrashMsg: Locator;

  // iOS class-chain predicate for the nameless app-bar buttons.
  private static readonly IOS_NAMELESS_BTN =
    'type == "XCUIElementTypeButton" AND name == nil AND visible == 1';

  constructor(mobile: Mobile) {
    super(mobile);

    this.resultCount = this.pick(
      () => mobile.getByUiSelector('new UiSelector().descriptionContains("Showing")'),
      () => mobile.getByPredicate('type == "XCUIElementTypeStaticText" AND name BEGINSWITH "Showing"'),
    );

    // Every product card is a clickable Image whose a11y name carries the price.
    this.clickableItems = this.pick(
      () => mobile.getByUiSelector('new UiSelector().className("android.widget.ImageView").clickable(true)'),
      () => mobile.getByClassChain('**/XCUIElementTypeImage[`name CONTAINS "$"`]'),
    );

    // First visible product card. Android: positional instance(0). iOS reads
    // via the .all() iteration in getFirstProductDetails (WDA mis-reports the
    // indexed node as not-displayed), so this is only used on Android.
    this.firstProductCard = this.pick(
      () => mobile.getByUiSelector(
        'new UiSelector().className("android.widget.ImageView").clickable(true).instance(0)',
      ),
      () => mobile.getByClassChain('**/XCUIElementTypeImage[`name CONTAINS "$"`][1]'),
    );

    // Sort sheet — all options carry visible text → accessibility id on both.
    this.sortTitle = mobile.getByLabel('Sort By');
    this.sortOptionAZ = mobile.getByLabel('Name (A-Z)');
    this.sortOptionZA = mobile.getByLabel('Name (Z-A)');
    this.sortOptionPriceLowHigh = mobile.getByLabel('Price (Low-High)');
    this.sortOptionPriceHighLow = mobile.getByLabel('Price (High-Low)');

    // Search field: the only text input on the catalog grid (placeholder
    // "Search dresses..."). Android positional EditText; iOS the single
    // TextField. (Flutter Key()s are not exposed as Appium ids in this app, so
    // these mirror the LoginPage class/positional approach, not the test Keys.)
    this.searchField = this.pick(
      () => mobile.getByUiSelector('new UiSelector().className("android.widget.EditText").instance(0)'),
      () => mobile.getByClassChain('**/XCUIElementTypeTextField'),
    );
    // Result-state messages (plain Flutter Text → a11y id on both platforms).
    this.noResultsMsg = mobile.getByLabel('No dresses found');
    this.searchCrashMsg = mobile.getByLabel('App crashed on search result');
  }

  /**
   * Type a query into the catalog search field. Cross-platform typing mirrors
   * LoginPage.typeField: Android `fill()` (IME inject); iOS clear→click→
   * pressSequentially (single-shot fill leaves Flutter's controller empty).
   */
  async search(text: string): Promise<void> {
    await this.waitVisible(this.searchField, 10_000);
    if (this.isAndroid) {
      await this.searchField.fill(text);
    } else {
      await this.searchField.clear();
      if (text.length > 0) {
        await this.searchField.click();
        await this.searchField.pressSequentially(text);
      }
    }
    await this.settle(this.settlePause);
  }

  /** Names of the product cards currently rendered (post-search/filter). */
  async getVisibleProductNames(): Promise<string[]> {
    return (await this.scanProductCards()).map((c) => c.name);
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitVisible(this.resultCount, 20_000);
  }

  /**
   * iOS only: resolve a grid app-bar action button by position. Both the Sort
   * and Cart icons are nameless, so filter the nameless visible buttons to the
   * top app-bar band (per-card add buttons start well below it), then order by
   * x: leftmost = Sort, rightmost = Cart (matches Android instance(1)/(2)).
   */
  private async iosAppBarActionBtn(which: 'sort' | 'cart'): Promise<Locator> {
    const APP_BAR_BAND = 120; // app-bar height; per-card buttons sit far below
    const btns = await this.mobile.getByPredicate(ProductGridPage.IOS_NAMELESS_BTN).all();
    const inBar: { el: Locator; x: number }[] = [];
    for (const el of btns) {
      const box = await el.boundingBox();
      if (box.y < APP_BAR_BAND) inBar.push({ el, x: box.x });
    }
    inBar.sort((a, b) => a.x - b.x);
    if (inBar.length === 0) throw new Error(`iOS grid app-bar ${which} button not found`);
    return which === 'cart' ? inBar[inBar.length - 1].el : inBar[0].el;
  }

  /**
   * Android app-bar action button by header position (2nd Button = Sort, 3rd =
   * Cart). Built lazily at use-time, NOT in the constructor: `getByUiSelector`
   * throws on iOS, so eager construction broke every catalog test on the iOS
   * lane. iOS resolves these geometrically via `iosAppBarActionBtn` instead.
   */
  private androidAppBarBtn(instance: 1 | 2): Locator {
    return this.mobile.getByUiSelector(
      `new UiSelector().className("android.widget.Button").instance(${instance})`,
    );
  }

  async openSortMenu(): Promise<void> {
    const btn = this.isIOS ? await this.iosAppBarActionBtn('sort') : this.androidAppBarBtn(1);
    await btn.click();
    await this.waitVisible(this.sortTitle);
  }

  async selectSort(type: 'AZ' | 'ZA' | 'LowHigh' | 'HighLow'): Promise<void> {
    const loc =
      type === 'AZ'
        ? this.sortOptionAZ
        : type === 'ZA'
          ? this.sortOptionZA
          : type === 'LowHigh'
            ? this.sortOptionPriceLowHigh
            : this.sortOptionPriceHighLow;
    await loc.click();
    await this.settle(this.settlePause);
  }

  async navigateToCart(): Promise<void> {
    const btn = this.isIOS ? await this.iosAppBarActionBtn('cart') : this.androidAppBarBtn(2);
    await btn.click();
  }

  /**
   * Tablet-only nudge so the first grid row clears the app bar after a sort
   * (phones don't need it). No-op on phones. Mirrors the reference.
   */
  async nudgeToRevealFirstItem(): Promise<void> {
    const { width, height } = await this.getWindowRect();
    if (width <= 1200) return;
    const safeX = Math.round(width * 0.3);
    await this.swipe(safeX, Math.round(height * 0.75), safeX, Math.round(height * 0.1), 600);
  }

  /**
   * Read the a11y descriptor of the first visible product card.
   *
   * iOS: a positional class-chain proved unreliable (WDA returns the indexed
   * node but reports it not-displayed even when visible in the source XML), so
   * iterate the `.all()` result and return the first visible priced card in
   * document order (= top-left). Android keeps the positional selector.
   */
  async getFirstProductDetails(): Promise<string> {
    if (this.isIOS) {
      const cards = await this.clickableItems.all();
      for (const c of cards) {
        if (!(await c.isVisible().catch(() => false))) continue;
        const desc = await c.getAttribute(this.attrName);
        if (desc && desc.includes('$')) return desc;
      }
      throw new Error('iOS: no visible priced product card found in grid');
    }
    await this.firstProductCard.waitFor({ state: 'visible', timeout: 5000 });
    const desc = await this.firstProductCard.getAttribute(this.attrName);
    return desc ?? '';
  }

  /**
   * Data-driven integrity audit of a single category grid: scroll-collect every
   * card, validate (a) name, (b) price against the catalog, and (c) that each
   * product's container exposes its cart (add-to-cart) icon, then confirm the
   * full count was seen for both name and cart-icon. Cart-icon presence is
   * ACCUMULATED across flicks (an edge-clipped card has no Button until fully
   * on-screen). Mirrors the reference verifyCategoryIntegrity + the cart-icon check.
   */
  async verifyCategoryIntegrity(categoryData: Category): Promise<boolean> {
    const collected = new Set<string>();
    const cartVerified = new Set<string>();
    const maxFlicks = 12;
    const totalGoal = categoryData.count;

    const { width, height } = await this.getWindowRect();
    const isTablet = width > 1200;
    const safeX = Math.round(width * 0.3);

    const scanVisible = async () => {
      for (const card of await this.scanProductCards()) {
        const expected = categoryData.products.find((p) => p.name === card.name);
        if (!expected) continue;
        if (expected.price !== card.price) {
          throw new Error(`Data Mismatch: "${card.name}" expected ${expected.price}, got ${card.price}`);
        }
        collected.add(card.name);
        if (card.hasCartIcon) cartVerified.add(card.name);
      }
    };

    const enough = () =>
      collected.size >= totalGoal && (this.isIOS || cartVerified.size >= totalGoal);

    let scrollCount = 0;
    while (scrollCount < maxFlicks) {
      await scanVisible();
      if (enough()) break;
      // Re-scan the same position once (render-lag recovery — see the C04 note in
      // verifyFullCatalogIntegrity) before scrolling on.
      await this.settle(350);
      await scanVisible();
      if (enough()) break;
      // Smooth controlled half-viewport scroll (overlap keeps each row on-screen
      // across two snapshots); the swipe() built-in settle is the only pause.
      await this.swipe(safeX, Math.round(height * 0.78), safeX, Math.round(height * 0.42), 900);
      scrollCount++;
    }

    // Final bottom-edge tug(s) so the last row (and its cart icon) enters the tree.
    const settleCount = isTablet ? 2 : 1;
    for (let i = 0; i < settleCount; i++) {
      await this.swipe(safeX, Math.round(height * 0.8), safeX, Math.round(height * 0.08), 900);
    }
    await scanVisible();

    // Cart-icon presence is asserted on Android (where the Image→child-Button
    // nesting is verified). On iOS it's still collected/logged but NOT yet
    // required — the iOS node nesting is unconfirmed; un-gate after verifying it
    // from an iOS grid dump (Phase D). See [[catalog-scan-getpagesource]].
    const cartOk = this.isIOS || cartVerified.size === totalGoal;

    if (collected.size !== totalGoal || !cartOk) {
      const missingNames = categoryData.products.map((p) => p.name).filter((n) => !collected.has(n));
      const missingCarts = categoryData.products
        .map((p) => p.name)
        .filter((n) => collected.has(n) && !cartVerified.has(n));
      console.log(
        `[${categoryData.name}] names ${collected.size}/${totalGoal} missing:[${missingNames.join(', ')}] | ` +
          `cartIcons ${cartVerified.size}/${totalGoal} missing:[${missingCarts.join(', ')}]`,
      );
    }

    return collected.size === totalGoal && cartOk;
  }

  /**
   * Flick-and-verify of the ENTIRE 32-item catalog: scroll top→bottom collecting
   * (a) every product name and (b) that each product's container exposes its cart
   * (add-to-cart) icon. Half-viewport scrolls keep every row on-screen across two
   * snapshots (each row gets two chances to enter the a11y tree — fixes the
   * non-deterministic misses the reference saw); cart-icon presence is ACCUMULATED
   * because an edge-clipped card renders without its Button until fully on-screen.
   * The per-scan cost is now a single atomic getPageSource (see scanProductCards),
   * so the scroll is smoothed: a faster controlled swipe with only the swipe's
   * built-in settle, no extra per-flick pause. Mirrors the reference
   * verifyFullCatalogIntegrity + the cart-icon check.
   */
  async verifyFullCatalogIntegrity(): Promise<boolean> {
    // Reset to top so a Playwright retry doesn't start mid-scroll (a failed
    // attempt leaves the grid scrolled; later attempts would only see the bottom).
    await this.resetToTop(1);

    const collected = new Set<string>();
    const cartVerified = new Set<string>();
    // ~2s/flick now (single getPageSource + one settle). A full top→bottom
    // traversal with half-viewport overlap is ~22 flicks; 45 leaves headroom and
    // still finishes well inside the test budget. The loop breaks as soon as both
    // names and cart-icons reach 32.
    const maxFlicks = 45;
    const totalGoal = 32;

    const { width, height } = await this.getWindowRect();
    const isTablet = width > 1200;
    const safeX = Math.round(width * 0.3);
    const swipeDepth = isTablet ? 0.375 : 0.3;
    const swipeDuration = 900;

    const scanVisible = async () => {
      for (const card of await this.scanProductCards()) {
        collected.add(card.name);
        if (card.hasCartIcon) cartVerified.add(card.name);
      }
    };

    // Cart-icon presence is required on Android only for now (iOS node nesting
    // unconfirmed — collected/logged but not asserted until Phase D). See
    // [[catalog-scan-getpagesource]].
    const cartGoalMet = () => this.isIOS || cartVerified.size >= totalGoal;
    const done = () => collected.size >= totalGoal && cartGoalMet();

    let scrollCount = 0;
    while (!done() && scrollCount < maxFlicks) {
      await scanVisible();
      if (done()) break;
      // Second look at the SAME position after a brief settle. On CI's
      // render-lagged emulator a row occasionally misses the a11y tree on the
      // first snapshot (run 27867706941: names 30/32, cartIcons 28/32 — a
      // robustness near-miss, not a crash). A cheap re-scan recovers it without
      // an extra flick, and reaching 32 sooner means the loop breaks EARLIER
      // (not later), so this also tightens the CI time budget.
      await this.settle(350);
      await scanVisible();
      if (done()) break;
      await this.swipe(
        safeX,
        Math.round(height * 0.8),
        safeX,
        Math.round(height * (0.8 - swipeDepth)),
        swipeDuration,
      );
      scrollCount++;
    }

    // Final power-tug so the absolute bottom row (and its cart icon) enters focus.
    const settleCount = isTablet ? 2 : 1;
    for (let i = 0; i < settleCount; i++) {
      await this.swipe(safeX, Math.round(height * 0.8), safeX, Math.round(height * 0.08), 900);
    }
    await scanVisible();

    if (!done()) {
      // Failure-path diagnostic: name exactly which items / cart icons the scan
      // never surfaced.
      const { default: products } = await import('../data/products.js');
      const expected = Object.values(products.categories).flatMap((c) => c.products.map((p) => p.name));
      const missingNames = expected.filter((n) => !collected.has(n));
      const missingCarts = expected.filter((n) => collected.has(n) && !cartVerified.has(n));
      console.log(
        `[C04] names ${collected.size}/${totalGoal} missing:[${missingNames.join(', ')}] | ` +
          `cartIcons ${cartVerified.size}/${totalGoal} missing:[${missingCarts.join(', ')}]`,
      );
    }

    return done();
  }
}
