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

  async selectCategory(name: string): Promise<void> {
    const loc = name.includes('Casual')
      ? this.categoryCasual
      : name.includes('Evening')
        ? this.categoryEvening
        : name.includes('Party')
          ? this.categoryParty
          : this.categoryBoho;
    if (!(await this.isVisible(loc))) {
      await loc.scrollIntoView();
    }
    await loc.click();
  }
}
