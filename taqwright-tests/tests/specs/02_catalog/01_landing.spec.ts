import { test, expect, Mobile } from '@taqwright/taqwright';
import { LoginPage } from '../../pages/LoginPage.js';
import { CatalogLandingPage } from '../../pages/CatalogLandingPage.js';
import { ProductGridPage } from '../../pages/ProductGridPage.js';
import { CartPage } from '../../pages/CartPage.js';
import products from '../../data/products.js';

// ─────────────────────────────────────────────────────────────────────────────
// Order-dependent cascade (C01→C07) on the shared session (resetBetweenTests:
// false), mirroring the reference repo and the auth slice. Each TC owns the
// state it asserts and leaves the app where the next TC expects it (C03 lands on
// the grid; C04–C06 operate there; C07 routes back).
//
// taqwright's `mobile` fixture is test-scoped (unavailable in beforeAll), so the
// reference's "log in once in beforeAll" is emulated with the module-level
// `initialized` flag: the first test logs in, the rest flow on the shared
// session. Recovery on a retry relies on each TC's own waitForPageLoad — most
// TCs stay within their screen context, so a re-run picks up in place. A full
// retry-cascade-replay is deliberately deferred until/unless CI shows we need it.
// ─────────────────────────────────────────────────────────────────────────────

let login: LoginPage;
let landing: CatalogLandingPage;
let grid: ProductGridPage;
let cart: CartPage;
let initialized = false;

function buildPages(mobile: Mobile): void {
  login = new LoginPage(mobile);
  landing = new CatalogLandingPage(mobile);
  grid = new ProductGridPage(mobile);
  cart = new CartPage(mobile);
}

/**
 * Guarantee we start on the catalog home. On the first run this just logs in.
 * On a Playwright worker-restart-after-failure the module state resets and the
 * shared (resetBetweenTests:false) session may be parked deep in the grid, so —
 * mirroring the categories spec's ensureOnHome — back out to Home before
 * anchoring. This keeps a failed C04 from poisoning the whole cascade in setup.
 */
async function ensureLoggedInOnHome(): Promise<void> {
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

/**
 * Guarantee the app is on the "All Dresses" product grid. C04–C07 inherit the
 * grid from C03 on Android (resetBetweenTests:false keeps the screen on-screen
 * across the per-test session boundary), but on iOS each session relaunches the
 * app to Home, so the grid context is lost between tests and the scan would read
 * the landing page (0 product cards). Re-enter the grid from Home when needed;
 * a no-op when already on the grid (Android carryover).
 */
async function ensureOnGrid(): Promise<void> {
  if (await grid.isVisible(grid.resultCount)) return;
  await ensureLoggedInOnHome();
  await landing.navigateToShopAll();
  await grid.waitForPageLoad();
}

test.describe('Catalog Module — Landing UI Master Check', () => {
  test.beforeEach(async ({ mobile }) => {
    buildPages(mobile);
    // Emulated beforeAll: log in once at the start of the cascade; later TCs
    // flow on the shared session without disturbing the state they inherit.
    if (!initialized) {
      await ensureLoggedInOnHome();
      initialized = true;
    }
  });

  test('TC-C01: homepage comprehensive UI and adaptive scroll', async () => {
    await landing.waitForPageLoad();

    await expect(landing.navMenuBtn).toBeVisible();
    await expect(landing.title).toBeVisible();

    await landing.scrollToCategory('Boho');
    await expect(landing.categoryBoho).toBeVisible();

    await landing.resetToTop();
    await expect(landing.heroBanner).toBeVisible();
  });

  test('TC-C02: cart empty state from the homepage', async () => {
    await landing.navigateToCart();
    await cart.waitForPageLoad();

    await expect(cart.cartTitle).toBeVisible();
    await expect(cart.emptyCartMsg).toBeVisible();

    await cart.clickContinueShopping();
    await landing.waitForPageLoad();
  });

  test('TC-C03: "All Dresses" page default state', async () => {
    await landing.navigateToShopAll();
    await grid.waitForPageLoad();

    const first = await grid.getFirstProductDetails();
    expect(first).toContain(products.anchors.alphaFirst.name);
  });

  test('TC-C04: full catalog data integrity (all 32 items)', async () => {
    await ensureOnGrid();
    // The 32-item scan is ~66s locally (settlePause=500) but ~3x slower under
    // CI's settlePause=1500 on the weaker emulator — attempt 1 hit the 180s cap,
    // and the forced mid-scan teardown corrupted UiAutomator2 and cascaded into
    // C05–C11. Give it a 300s budget on CI (and on the denser/slower tablet) so
    // the slow-but-working scan completes. Mirrors the reference's headroom.
    const { width } = await grid.getWindowRect();
    const isTablet = width > 1200;
    test.setTimeout(isTablet || process.env.CI ? 300_000 : 180_000);
    const intact = await grid.verifyFullCatalogIntegrity();
    expect(intact).toBe(true);
  });

  test('TC-C05: all sorting modes via universal truths', async () => {
    await ensureOnGrid();
    const sorts: Array<{ mode: 'LowHigh' | 'HighLow' | 'ZA' | 'AZ'; anchor: string }> = [
      { mode: 'LowHigh', anchor: products.anchors.cheapest.price },
      { mode: 'HighLow', anchor: products.anchors.mostExpensive.price },
      { mode: 'ZA', anchor: products.anchors.alphaLast.name },
      { mode: 'AZ', anchor: products.anchors.alphaFirst.name },
    ];

    const { width } = await grid.getWindowRect();
    const isTablet = width > 1200;

    await grid.resetToTop(3);

    for (let i = 0; i < sorts.length; i++) {
      await grid.openSortMenu();
      await grid.selectSort(sorts[i].mode);
      if (i === 0) await grid.resetToTop(isTablet ? 3 : 2);

      const details = await grid.getFirstProductDetails();
      expect(details).toContain(sorts[i].anchor);
    }
  });

  test('TC-C06: cart empty state from the grid', async () => {
    await ensureOnGrid();
    await grid.navigateToCart();
    await cart.waitForPageLoad();
    await expect(cart.cartTitle).toBeVisible();

    await cart.clickContinueShopping();
    await grid.waitForPageLoad();
  });

  test('TC-C07: "View All" hyperlink routing', async () => {
    await ensureOnGrid(); // iOS starts each session on Home; normalize to grid first
    await grid.deviceBack();
    await landing.waitForPageLoad();

    await landing.navigateToViewAll();
    await grid.waitForPageLoad();

    const first = await grid.getFirstProductDetails();
    expect(first).toContain(products.anchors.alphaFirst.name);
  });
});
