import { Mobile, Locator } from '@taqwright/taqwright';
import { BasePage } from './BasePage.js';

/**
 * CatalogLandingPage — POM for the marketing Homepage shown after login.
 * (Expanded in the Catalog slice; for the Login slice we only need the
 * landing anchor + cart/shop-all entry points.)
 */
export class CatalogLandingPage extends BasePage {
  readonly shopAllBtn: Locator;
  readonly viewAllCategoriesBtn: Locator;
  readonly heroBanner: Locator;
  readonly cartBtn: Locator;

  readonly categoryCasual: Locator;
  readonly categoryEvening: Locator;
  readonly categoryParty: Locator;
  readonly categoryBoho: Locator;

  constructor(mobile: Mobile) {
    super(mobile);

    this.shopAllBtn = mobile.getByLabel('Shop All');
    this.viewAllCategoriesBtn = mobile.getByLabel('View All');
    this.heroBanner = mobile.getByLabel("New Collection\nExplore the latest trends in women's fashion");

    // Icon-only cart button with no name on either platform → positional.
    this.cartBtn = this.pick(
      () => mobile.getByUiSelector('new UiSelector().className("android.widget.Button").instance(1)'),
      () => mobile.getByPredicate('type == "XCUIElementTypeButton" AND name == nil AND visible == 1'),
    );

    this.categoryCasual = mobile.getByLabel('Casual\nEveryday comfort & style\n8 items');
    this.categoryEvening = mobile.getByLabel('Evening\nElegant gowns & formal wear\n8 items');
    this.categoryParty = mobile.getByLabel('Party\nCocktail & party dresses\n8 items');
    this.categoryBoho = mobile.getByLabel('Boho\nFree-spirited & artistic\n8 items');
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitVisible(this.shopAllBtn);
  }

  async navigateToShopAll(): Promise<void> {
    await this.waitVisible(this.shopAllBtn, 15_000);
    await this.shopAllBtn.click();
  }

  async navigateToCart(): Promise<void> {
    await this.cartBtn.click();
  }

  async navigateToViewAll(): Promise<void> {
    await this.viewAllCategoriesBtn.click();
  }

  private categoryLocator(name: string): Locator {
    return name.includes('Casual')
      ? this.categoryCasual
      : name.includes('Evening')
        ? this.categoryEvening
        : name.includes('Party')
          ? this.categoryParty
          : this.categoryBoho;
  }

  /**
   * Select a category by name, scrolling it on-screen first if needed. Mirrors
   * the reference repo: only swipes when the card is physically off-screen, so
   * an already-visible card is tapped without disturbing scroll position.
   */
  async selectCategory(name: string): Promise<void> {
    const loc = this.categoryLocator(name);
    if (!(await this.isVisible(loc))) {
      const { width, height } = await this.getWindowRect();
      const safeX = Math.round(width * 0.3);
      await this.swipe(safeX, Math.round(height * 0.8), safeX, Math.round(height * 0.3), 1200);
    }
    await loc.click();
  }

  /**
   * Bring a category banner into the comfort zone with a single fluid 50%
   * swipe — only if it isn't already centred. Used by TC-C01's adaptive-scroll
   * check. Mirrors the reference repo's scrollToCategory.
   */
  async scrollToCategory(name: string): Promise<void> {
    const loc = this.categoryLocator(name);
    if (!(await this.isInsideViewport(loc))) {
      const { width, height } = await this.getWindowRect();
      const safeX = Math.round(width * 0.3);
      await this.swipe(safeX, Math.round(height * 0.7), safeX, Math.round(height * 0.2), 1200);
    }
  }
}
