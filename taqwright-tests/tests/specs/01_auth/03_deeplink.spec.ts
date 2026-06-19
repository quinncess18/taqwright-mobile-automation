import { test, expect } from '@taqwright/taqwright';
import { LoginPage } from '../../pages/LoginPage.js';
import { CatalogLandingPage } from '../../pages/CatalogLandingPage.js';

// resetBetweenTests:false — shared session. The `03_` prefix runs this spec LAST
// in the auth slice, so it arrives logged out on the login screen (handed off by
// 02_negative's TC-N03). TC-N04 (invalid) runs BEFORE TC-L07 (valid) so the
// negative case starts from that clean logged-out screen; TC-L07 ends the whole
// auth slice logged in on the catalog, which is fine for the terminal test.
//
// Both exercise the v1.1.0 login-bypass deep link
// (`demoapp://login?username=&password=`) — net-new coverage, not in the
// reference repo's 01_auth.
test.describe('Login — Deep Link', () => {
  test('TC-N04: invalid deep link routes back to login with an error', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    await login.waitForPageLoad();

    await login.openLoginDeepLink('invalid-user', 'wrong-pass');

    // Bad creds are rejected: the snackbar shows and we stay on the login form.
    await expect(login.deepLinkError).toBeVisible();
    await expect(login.usernameField).toBeVisible();
  });

  test('TC-L07: valid deep link bypasses the form and lands on the catalog', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    const landing = new CatalogLandingPage(mobile);
    await login.waitForPageLoad();

    await login.openLoginDeepLink(login.defaultUser, login.defaultPass);

    // Valid creds skip the login form entirely and drop us on /home.
    await landing.waitForPageLoad();
    await expect(landing.shopAllBtn).toBeVisible();
  });
});
