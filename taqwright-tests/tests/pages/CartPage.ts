import { Mobile, Locator } from '@taqwright/taqwright';
import { BasePage } from './BasePage.js';

/**
 * CartPage — POM for the shopping-cart screen.
 *
 * Ported from the reference repo (tests/pages/CartPage.js), but the Catalog
 * slice only exercises the EMPTY-cart state (TC-C02/C06: open cart from
 * Home/Grid, see the empty message, continue shopping). The full line-item /
 * quantity-stepper / total-reconciliation surface is intentionally deferred to
 * the §4 (Products) slice.
 */
export class CartPage extends BasePage {
  readonly cartTitle: Locator;
  readonly emptyCartMsg: Locator;
  readonly continueShoppingBtn: Locator;
  readonly proceedToCheckoutBtn: Locator;

  constructor(mobile: Mobile) {
    super(mobile);

    // All carry visible text → resolved via accessibility id on both platforms.
    this.cartTitle = mobile.getByLabel('My Cart');
    this.emptyCartMsg = mobile.getByLabel('Your cart is empty');
    this.continueShoppingBtn = mobile.getByLabel('Continue Shopping');
    this.proceedToCheckoutBtn = mobile.getByLabel('Proceed to Checkout');
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitVisible(this.cartTitle);
  }

  async clickContinueShopping(): Promise<void> {
    await this.continueShoppingBtn.click();
  }
}
