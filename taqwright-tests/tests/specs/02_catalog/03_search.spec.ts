import { test, expect, Mobile } from '@taqwright/taqwright';
import { LoginPage } from '../../pages/LoginPage.js';
import { CatalogLandingPage } from '../../pages/CatalogLandingPage.js';
import { ProductGridPage } from '../../pages/ProductGridPage.js';

// ─────────────────────────────────────────────────────────────────────────────
// Search slice — KNOWN-DEFECT detection.
//
// The build under test (taqelah/demo-app v1.1.0) ships two PURPOSELY PLANTED
// search bugs, introduced in upstream PR #3 ("Controlled bugs and deeplink",
// lib/screens/product_catalog_screen.dart):
//   • SR03: query "red" is aliased to "black" (`query == 'red' ? 'black' : …`),
//           so a red search also leaks black dresses into the results.
//   • SR04: any query containing "*" renders a fake "App crashed on search
//           result" screen instead of the normal empty state.
//
// Both tests assert the CORRECT (baseline v1.0.0) behavior, so on v1.1.0 they
// FAIL — that failure is the deliverable (proof the suite detects the planted
// bug). They are marked `test.fail()` so CI stays green-as-a-gate while still
// documenting the defect: if the app is ever fixed, the expected-failure flips
// to an UNEXPECTED PASS and flags that the bug is gone.
//
// Shared session (resetBetweenTests:false) carries over from the catalog specs;
// `ensureOnHome` backs out to the homepage so each attempt starts clean.
// ─────────────────────────────────────────────────────────────────────────────

let login: LoginPage;
let landing: CatalogLandingPage;
let grid: ProductGridPage;

function buildPages(mobile: Mobile): void {
  login = new LoginPage(mobile);
  landing = new CatalogLandingPage(mobile);
  grid = new ProductGridPage(mobile);
}

async function ensureOnHome(): Promise<void> {
  if (await login.isVisible(login.loginButton)) {
    await login.login(login.defaultUser, login.defaultPass);
    await landing.waitForPageLoad();
    return;
  }
  for (let i = 0; i < 4; i++) {
    if (await landing.isVisible(landing.shopAllBtn)) return;
    await landing.deviceBack();
    await landing.settle(landing.settlePause);
  }
  await landing.waitForPageLoad();
}

test.describe('Catalog Module — Search (planted-bug detection)', () => {
  test.beforeEach(async ({ mobile }) => {
    buildPages(mobile);
    await ensureOnHome();
    await landing.navigateToShopAll();
    await grid.waitForPageLoad();
  });

  test('TC-SR03: searching "red" must not leak black dresses', async () => {
    // PLANTED BUG (taqelah/demo-app PR #3): "red" is aliased to "black".
    test.fail(true, 'taqelah/demo-app v1.1.0 planted bug: "red" search leaks black dresses');

    await grid.search('red');
    const names = await grid.getVisibleProductNames();

    // Correct behavior: every result name actually contains "red".
    expect(names.length, 'expected at least one "red" match').toBeGreaterThan(0);
    const leaked = names.filter((n) => n.toLowerCase().includes('black'));
    expect(leaked, `search "red" leaked black dresses: [${leaked.join(', ')}]`).toHaveLength(0);
  });

  test('TC-SR04: searching "*" shows empty state, not a crash screen', async () => {
    // PLANTED BUG (taqelah/demo-app PR #3): "*" renders a fake crash screen.
    test.fail(true, 'taqelah/demo-app v1.1.0 planted bug: "*" search renders a crash screen');

    await grid.search('*');

    // Correct behavior: "*" matches no product → the empty state, and the
    // planted crash screen must never appear.
    const crashed = await grid.isVisible(grid.searchCrashMsg);
    expect(crashed, 'search "*" rendered the planted "App crashed" screen').toBe(false);
    await expect(grid.noResultsMsg).toBeVisible();
  });
});
