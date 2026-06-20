import { test, expect, Mobile } from '@taqwright/taqwright';
import { LoginPage } from '../../pages/LoginPage.js';
import { CatalogLandingPage } from '../../pages/CatalogLandingPage.js';
import { ProductGridPage } from '../../pages/ProductGridPage.js';
import { CartPage } from '../../pages/CartPage.js';
import products from '../../data/products.js';
import type { Category } from '../../data/products.js';

// Each category test is self-contained: it enters from the homepage, audits the
// category grid (sorting truths + data integrity + empty cart), and returns to
// the homepage. `beforeEach` therefore just guarantees the starting state
// (logged in, on Home) on every attempt — which also makes a Playwright retry
// safe without the cascade-replay the landing spec needs. The shared session
// (resetBetweenTests:false) carries over from the landing spec, so we may arrive
// deep in the grid; ensureOnHome() backs out to the homepage.

let login: LoginPage;
let landing: CatalogLandingPage;
let grid: ProductGridPage;
let cart: CartPage;

function buildPages(mobile: Mobile): void {
  login = new LoginPage(mobile);
  landing = new CatalogLandingPage(mobile);
  grid = new ProductGridPage(mobile);
  cart = new CartPage(mobile);
}

async function ensureOnHome(): Promise<void> {
  if (await login.isVisible(login.loginButton)) {
    await login.login(login.defaultUser, login.defaultPass);
    await landing.waitForPageLoad();
    return;
  }
  // Already authenticated — back out of any pushed screen until Home shows.
  for (let i = 0; i < 4; i++) {
    if (await landing.isVisible(landing.shopAllBtn)) return;
    await landing.deviceBack();
    await landing.settle(landing.settlePause);
  }
  await landing.waitForPageLoad();
}

async function performCategoryFunctionalAudit(data: Category): Promise<void> {
  await landing.selectCategory(data.name);
  await grid.waitForPageLoad();

  const sorts: Array<'LowHigh' | 'HighLow' | 'ZA' | 'AZ'> = ['LowHigh', 'HighLow', 'ZA', 'AZ'];
  for (let i = 0; i < sorts.length; i++) {
    await grid.openSortMenu();
    await grid.selectSort(sorts[i]);
    if (i === 0) await grid.nudgeToRevealFirstItem();

    const details = await grid.getFirstProductDetails();
    const anchor =
      sorts[i] === 'LowHigh'
        ? data.anchors.cheapest
        : sorts[i] === 'HighLow'
          ? data.anchors.mostExpensive
          : sorts[i] === 'ZA'
            ? data.anchors.alphaLast
            : data.anchors.alphaFirst;
    expect(details).toContain(anchor);
  }

  const integrity = await grid.verifyCategoryIntegrity(data);
  expect(integrity).toBe(true);

  await grid.navigateToCart();
  await cart.waitForPageLoad();
  await expect(cart.cartTitle).toBeVisible();

  await cart.clickContinueShopping();
  await grid.waitForPageLoad();

  await grid.deviceBack();
  await landing.waitForPageLoad();
}

test.describe('Catalog Module — Category Data & Functional Integrity', () => {
  test.beforeEach(async ({ mobile }) => {
    buildPages(mobile);
    await ensureOnHome();
  });

  test('TC-C08: Casual Dresses data and functional integrity', async () => {
    await performCategoryFunctionalAudit(products.categories.casual);
  });

  test('TC-C09: Evening Dresses data and functional integrity', async () => {
    await performCategoryFunctionalAudit(products.categories.evening);
  });

  test('TC-C10: Party Dresses data and functional integrity', async () => {
    await performCategoryFunctionalAudit(products.categories.party);
  });

  test('TC-C11: Boho Dresses data and functional integrity', async () => {
    await performCategoryFunctionalAudit(products.categories.boho);
  });
});
