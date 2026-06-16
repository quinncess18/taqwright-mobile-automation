import { Mobile, Locator } from '@taqwright/taqwright';
import { BasePage } from './BasePage.js';

/**
 * LoginPage — POM for the Taqelah demo login screen.
 *
 * Selector notes carried over from the reference repo:
 *  - Flutter TextFields expose no id/hint on Android → positional EditText
 *    instance(0/1). On iOS the InputDecoration labelText surfaces as the
 *    accessibility name, so `getByLabel('Username'|'Password')` works.
 *  - The password-visibility toggle is a nameless Button child of the password
 *    field on Android; on iOS it's the only nameless visible button.
 *  - The main error renders multi-line ("Invalid username or password.\nHint:…")
 *    so both platforms match by prefix, not exact.
 */
export class LoginPage extends BasePage {
  readonly usernameField: Locator;
  readonly passwordField: Locator;
  readonly loginButton: Locator;
  readonly logoutBtn: Locator;
  readonly demoCredentials: Locator;

  readonly mainError: Locator;
  readonly usernameFieldError: Locator;
  readonly passwordFieldError: Locator;
  readonly passwordToggle: Locator;

  // Universal truths (demo credentials).
  readonly defaultUser = 'emma@demoapp.com';
  readonly defaultPass = '10203040';

  readonly errUsernameRequired = 'Please enter your username';
  readonly errPasswordRequired = 'Please enter your password';
  readonly errInvalidCreds = 'Invalid username or password';

  constructor(mobile: Mobile) {
    super(mobile);

    this.usernameField = this.pick(
      () => mobile.getByUiSelector('new UiSelector().className("android.widget.EditText").instance(0)'),
      () => mobile.getByLabel('Username'),
    );
    this.passwordField = this.pick(
      () => mobile.getByUiSelector('new UiSelector().className("android.widget.EditText").instance(1)'),
      () => mobile.getByLabel('Password'),
    );
    this.loginButton = this.pick(
      () => mobile.getByUiSelector('new UiSelector().className("android.widget.Button").description("Login")'),
      () => mobile.getByLabel('Login'),
    );
    this.logoutBtn = mobile.getByLabel('Logout');
    this.demoCredentials = mobile.getByLabel('Demo Credentials');

    this.mainError = this.pick(
      () => mobile.getByUiSelector('new UiSelector().descriptionStartsWith("Invalid username or password")'),
      () => mobile.getByPredicate('name BEGINSWITH "Invalid username or password"'),
    );
    this.usernameFieldError = mobile.getByLabel('Please enter your username');
    this.passwordFieldError = mobile.getByLabel('Please enter your password');

    this.passwordToggle = this.pick(
      () => mobile.getByUiSelector(
        'new UiSelector().className("android.widget.EditText").instance(1).childSelector(new UiSelector().className("android.widget.Button"))',
      ),
      () => mobile.getByPredicate('type == "XCUIElementTypeButton" AND name == nil AND visible == 1'),
    );
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitVisible(this.title);
    // The AppBar title paints before the form fields land in the a11y tree on a
    // cold boot — anchor on the field every caller asserts next.
    await this.waitVisible(this.usernameField);
  }

  /** Read an EditText/TextField's current text cross-platform. */
  private async readField(loc: Locator): Promise<string> {
    return this.isAndroid ? loc.getText() : loc.getValue();
  }

  async verifyUsername(expected: string): Promise<void> {
    const text = await this.readField(this.usernameField);
    if (text !== expected) {
      throw new Error(`Username mismatch. Expected "${expected}", got "${text}"`);
    }
  }

  async verifyPasswordPlaintext(expected: string): Promise<void> {
    const text = await this.readField(this.passwordField);
    if (text !== expected) {
      throw new Error(`Password plaintext mismatch. Expected "${expected}", got "${text}"`);
    }
  }

  async verifyPasswordMasked(expectedCount: number): Promise<void> {
    const text = await this.readField(this.passwordField);
    const bulletsOnly = text.split('').every((c) => c === '•');
    if (text.length !== expectedCount || (expectedCount > 0 && !bulletsOnly)) {
      throw new Error(`Masking failed. Expected ${expectedCount} bullets, got "${text}"`);
    }
  }

  /** Dismiss the keyboard by tapping the (neutral) app title. */
  private async dismissKeyboard(): Promise<void> {
    await this.title.click();
    await this.settle(600);
  }

  /**
   * Type into a field cross-platform.
   *
   * Android: `fill()` is reliable — UiAutomator2 injects through the IME.
   * iOS: `fill()` sends the whole string via a single `elementSendKeys`, which
   * for Flutter TextFields can set the element's a11y `value` WITHOUT driving
   * EditableText's keyboard listener, so the TextEditingController stays empty
   * and `Form.validate()` reports the field blank. Mirror the reference repo's
   * `addValue` fix: focus, then type char-by-char via `pressSequentially`.
   * (Empty string ⇒ just clear; pressSequentially('') is a no-op.)
   */
  private async typeField(loc: Locator, text: string): Promise<void> {
    if (this.isAndroid) {
      await loc.fill(text);
      return;
    }
    await loc.clear();
    if (text.length > 0) {
      await loc.click();
      await loc.pressSequentially(text);
    }
  }

  async fillCredentials(username: string | null, password: string | null): Promise<void> {
    if (username !== null) {
      await this.typeField(this.usernameField, username);
    }
    if (password !== null) {
      await this.typeField(this.passwordField, password);
    }
    await this.dismissKeyboard();
  }

  /** Fill only the password, preserving the (pre-filled) username. */
  async fillPasswordOnly(password: string): Promise<void> {
    await this.typeField(this.passwordField, password);
    await this.dismissKeyboard();
  }

  async togglePasswordVisibility(): Promise<void> {
    await this.passwordToggle.click();
  }

  async revealDemoCredentials(): Promise<void> {
    if (!(await this.isVisible(this.demoCredentials))) {
      await this.demoCredentials.scrollIntoView();
    }
  }

  async submitLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async login(username: string | null, password: string | null): Promise<void> {
    await this.fillCredentials(username, password);
    await this.submitLogin();
  }

  /** Open the drawer and tap Logout. */
  async logout(): Promise<void> {
    await this.waitVisible(this.navMenuBtn, 20_000);
    await this.navMenuBtn.click();
    await this.settle(1000);
    // Logout sits at the bottom of the drawer — bring it into view.
    if (!(await this.isVisible(this.logoutBtn))) {
      await this.logoutBtn.scrollIntoView();
    }
    await this.logoutBtn.click();
    await this.waitVisible(this.usernameField);
  }

  /** Read an error message's text, or null if it never appears. */
  async getErrorMessage(type: 'main' | 'username' | 'password'): Promise<string | null> {
    const loc =
      type === 'main' ? this.mainError : type === 'username' ? this.usernameFieldError : this.passwordFieldError;
    try {
      await loc.waitFor({ state: 'visible', timeout: 8000 });
      const attr = this.isAndroid ? 'content-desc' : 'label';
      return await loc.getAttribute(attr);
    } catch {
      return null;
    }
  }
}
