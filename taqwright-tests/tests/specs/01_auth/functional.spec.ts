import { test, expect } from '@taqwright/taqwright';
import { LoginPage } from '../../pages/LoginPage.js';
import { CatalogLandingPage } from '../../pages/CatalogLandingPage.js';

// resetBetweenTests:true reinstalls + relaunches the app before every test, so
// each TC is fully self-contained (no cross-test state cascade like the WDIO
// reference's single-session chain).
test.describe('Login — Functional', () => {
  test('TC-L01: login page elements are visible', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    await login.waitForPageLoad();

    await expect(login.title).toBeVisible();
    await expect(login.usernameField).toBeVisible();
    await expect(login.passwordField).toBeVisible();
    await expect(login.loginButton).toBeVisible();
  });

  test('TC-L02: toggle password visibility and keep layout stable', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    await login.waitForPageLoad();

    await login.fillCredentials(login.defaultUser, '12345678');
    await login.verifyPasswordMasked(8);

    await login.togglePasswordVisibility();
    await login.verifyPasswordPlaintext('12345678');

    await login.revealDemoCredentials();
    await expect(login.demoCredentials).toBeVisible();

    await login.togglePasswordVisibility();
    await login.verifyPasswordMasked(8);
  });

  test('TC-L03: preserve credential state when backgrounded (Home)', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    await login.waitForPageLoad();
    // v1.1.0 starts with an EMPTY username (the demo creds only show in the
    // info card), so type a value first, then verify it survives a Home
    // background/foreground round-trip.
    await login.fillCredentials(login.defaultUser, null);
    await login.verifyUsername(login.defaultUser);

    await login.deviceHome();
    await login.settle(3000);
    await login.deviceForeground();
    await login.waitForPageLoad();

    await login.verifyUsername(login.defaultUser);
  });

  test('TC-L04: clear unsaved credential state when exited (Back)', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    if (!login.isAndroid) test.skip(true, 'Back-exit semantics are Android-only');

    await login.waitForPageLoad();
    await login.fillPasswordOnly(login.defaultPass);

    // Back exits the activity; a destructive relaunch (terminate + activate ≈
    // the reference repo's deviceForeground(true) → startActivity stop:true)
    // must drop the unsaved password, restoring an empty form.
    await login.deviceBack();
    await login.settle(2000);
    await login.killAndRelaunch();
    await login.waitForPageLoad();

    await login.verifyUsername('');
    await login.verifyPasswordPlaintext('');
  });

  test('TC-L05: successful login with valid demo credentials', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    const landing = new CatalogLandingPage(mobile);
    await login.waitForPageLoad();

    await login.login(login.defaultUser, login.defaultPass);

    await landing.waitForPageLoad();
    await expect(landing.shopAllBtn).toBeVisible();
  });

  test('TC-L06: session persists across process kill, then logout', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    const landing = new CatalogLandingPage(mobile);
    // Shared session (resetBetweenTests:false) — we arrive already logged in
    // from TC-L05, mirroring the reference repo's noReset chain. (This couples
    // L06 to L05 by design; it is not self-contained under reset:true.)
    await landing.waitForPageLoad();

    // Kill + relaunch: the saved session should land us back on the catalog,
    // not the login screen.
    await login.killAndRelaunch();
    await landing.waitForPageLoad();
    await expect(landing.shopAllBtn).toBeVisible();

    await login.logout();
    await expect(login.title).toBeVisible();
    await expect(login.usernameField).toBeVisible();
  });
});
