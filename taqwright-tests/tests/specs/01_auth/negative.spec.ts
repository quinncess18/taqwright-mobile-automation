import { test, expect } from '@taqwright/taqwright';
import { LoginPage } from '../../pages/LoginPage.js';

test.describe('Login — Negative', () => {
  test('TC-N01: validation errors when fields are empty', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    await login.waitForPageLoad();

    // Clear the pre-filled username so both fields submit empty.
    await login.fillCredentials('', '');
    await login.submitLogin();

    expect(await login.getErrorMessage('username')).toBe(login.errUsernameRequired);
    expect(await login.getErrorMessage('password')).toBe(login.errPasswordRequired);

    // Still on the login screen.
    await expect(login.title).toBeVisible();
  });

  test('TC-N02: error for invalid username format', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    await login.waitForPageLoad();

    await login.fillCredentials('invalid-user', login.defaultPass);
    await login.togglePasswordVisibility();
    await login.verifyUsername('invalid-user');
    await login.verifyPasswordPlaintext(login.defaultPass);

    await login.submitLogin();

    const error = await login.getErrorMessage('main');
    expect(error).toContain(login.errInvalidCreds);
    expect(error).toContain(`Hint: ${login.defaultUser} / ${login.defaultPass}`);
  });

  test('TC-N03: error for valid username with invalid password', async ({ mobile }) => {
    const login = new LoginPage(mobile);
    await login.waitForPageLoad();

    await login.fillCredentials(login.defaultUser, 'wrong-pass');
    await login.verifyUsername(login.defaultUser);
    // Reveal before reading plaintext: on iOS a masked secure field reads back
    // as bullets via getValue(), so without this the assertion sees "••••••••••"
    // instead of "wrong-pass". (TC-N02 toggles for the same reason; N03 had been
    // relying on N02's leftover visible state via the resetBetweenTests:false
    // chain, which broke once the WDA cold-build retry timing went away.)
    await login.togglePasswordVisibility();
    await login.verifyPasswordPlaintext('wrong-pass');

    await login.submitLogin();

    const error = await login.getErrorMessage('main');
    expect(error).toContain(login.errInvalidCreds);
  });
});
