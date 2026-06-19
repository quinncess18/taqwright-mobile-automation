# TEST_PLAN.md

Test coverage and verification strategy for the Taqelah mobile app, rebuilt on
**taqwright** (TypeScript). This plan **mirrors the reference repo's coverage map**
([`taqelah-mobile-automation`](https://github.com/quinncess18/taqelah-mobile-automation),
96 TCs across 17 sections) so the two cross-reference by test-case ID — and
extends it with surface that only exists in the **v1.1.0** app build.

**App under test:** `taqelah/demo-app` **v1.1.0** (bootcamp build) — the reference
repo is pinned to v1.0.0. v1.1.0 adds planted bugs, a login-bypass deep link, and
debuggable WebView DOM (see the 🆕 rows below and `README.md`).

**Platforms:** Android emulator (Pixel 8, API 35) run **locally** and **in CI**
(`ubuntu-22.04`, Pixel 6 / API 34); iOS Simulator (iPhone 15, iOS 17.5) run **in
CI only** (`macos-14` — needs macOS, unavailable on the Windows dev machine).
Both lanes run in parallel from one workflow
(`.github/workflows/mobile-automation.yml`), mirroring the reference repo. Specs
are shared cross-platform — one POM per screen, selectors branch via
`this.isAndroid` / `this.isIOS`.

> Status legend: ✅ Verified · ⚠️ In progress / CI pending · ⏳ Pending (planned) · ⏭ Skipped (platform-incompatible) · 🆕 New vs the v1.0.0 reference

## Build status

| Slice | Android (local + CI) | iOS (CI) |
|---|:---:|:---:|
| §1 Auth | ✅ 11/11 green local (reset:false); CI green (L07/N04 land next push) | ✅ 8 pass / 1 skipped green; ⚠️ L07/N04 CI-pending |
| §0 Smoke, §2–§16 | ⏳ Pending | ⏳ Pending |

Auth is the first slice (proves the stack end-to-end). Remaining slices follow
the reference's build order: Catalog → Product/Add → Cart → Checkout, then the
nav/dialog/form/etc. modules, with the v1.1.0 additions layered in.

## Selector & isolation contract

- **Selectors:** Flutter `Key('X')` propagates to Android `content-desc` but **not**
  iOS `accessibilityIdentifier`. Cross-platform selectors use `getByLabel` (maps to
  accessibility id on both); positional/predicate selectors branch explicitly
  (`getByUiSelector` on Android, `getByPredicate` / class-chain on iOS).
- **Typing:** `fill()` on Android (UiAutomator2 IME injection); `pressSequentially`
  (char-by-char) on iOS, so Flutter's `TextEditingController` updates and
  `Form.validate()` sees the text.
- **Isolation:** `resetBetweenTests: false` (shared session, mirrors the reference's
  `noReset`). Suites are order-dependent; stateful slices add per-spec reset helpers.

---

## 0. Smoke (foundation gate)

**Spec (planned):** `tests/specs/00_smoke/01_smoke.spec.ts`. Runs first; login + first-render + logout.

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-SM01** | Launch → Login renders → login → Catalog Landing renders → logout → Login again | ⏳ | ⏳ |

## 1. Authentication Module

**Specs:** `tests/specs/01_auth/01_functional.spec.ts` + `02_negative.spec.ts` + `03_deeplink.spec.ts`

**Scope:** login render + password-toggle stability (L01/L02); credential state
preserved on Home / cleared on Back (L03/L04); login + session-aware logout
(L05/L06); validation negatives (N01–N03). 🆕 deep-link login (L07/N04).

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-L01** | Login page elements visible | ✅ | ✅ |
| **TC-L02** | Toggle password visibility, layout stable | ✅ | ✅ |
| **TC-L03** | Preserve credential state when backgrounded (Home) | ✅ | ✅ |
| **TC-L04** | Clear unsaved credential state when exited (Back) — Android-only | ✅ | ⏭ |
| **TC-L05** | Successful login with valid demo credentials | ✅ | ✅ |
| **TC-L06** | Session persists across process kill, then logout | ✅ | ✅ |
| **TC-N01** | Validation errors when fields are empty | ✅ | ✅ |
| **TC-N02** | Error for invalid username format | ✅ | ✅ |
| **TC-N03** | Error for valid username with invalid password | ✅ | ✅ |
| **🆕 TC-L07** | Valid deep link (`demoapp://login?...`) bypasses form → `/home` | ✅ | ⚠️ |
| **🆕 TC-N04** | Invalid deep link → `/login` + "Invalid deeplink credentials" snackbar | ✅ | ⚠️ |

## 2. Catalog Module

**Specs (planned):** `02_catalog/01_landing.spec.ts` + `02_categories.spec.ts`

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-C01** | Homepage default state, scroll to last category, reset to top | ⏳ | ⏳ |
| **TC-C02** | Cart empty state from Homepage | ⏳ | ⏳ |
| **TC-C03** | "All Dresses" page default state | ⏳ | ⏳ |
| **TC-C04** | Full catalog data integrity (32-item scan vs `products` data) | ⏳ | ⏳ |
| **TC-C05** | All four sorting modes | ⏳ | ⏳ |
| **TC-C06** | Cart empty state from Grid | ⏳ | ⏳ |
| **TC-C07** | "View All" hyperlink routing | ⏳ | ⏳ |
| **TC-C08–C11** | Casual / Evening / Party / Boho data + sort + cart integrity | ⏳ | ⏳ |

## 3. Navigation & Gestures

**Specs (planned):** `03_nav/01_main_nav`, `02_gestures`, `03_webview`.

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-M01** | Nav menu default + Home routing | ⏳ | ⏳ |
| **TC-M02** | Cart routing from drawer + empty state | ⏳ | ⏳ |
| **TC-M03** | About routing + content + Dark Mode toggle (pixel-sampled) | ⏳ | ⏳ |
| **TC-M04** | Randomized swipe (favorite/delete) ×5 cards | ⏳ | ⏳ |
| **TC-M05** | Drag-and-drop reorder with state tracking | ⏳ | ⏳ |
| **TC-M06** | Long-press popup, all 3 options + toast | ⏳ | ⏳ |
| **TC-M07** | Double-tap zoom + pan, pixel-verify | ⏳ | ⏳ |
| **TC-M08** | Pinch zoom + reset | ⏳ | ⏳ |
| **TC-W01** | WebView opens Taqelah site | ⏳ | ⏳ |
| **TC-W02** | Navigate to example.com via Go button. 🆕 v1.1.0: assert real **DOM** in WEBVIEW context (not just rendered text) — Android debug only | ⏳ | ⏳ |
| **TC-W03** | WebView Back returns to app, state preserved | ⏳ | ⏳ |

## 4. Dialogs & Alerts

**Spec (planned):** `03_nav/04_dialogs.spec.ts`

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-D01** | Dialogs page default — 7 trigger buttons | ⏳ | ⏳ |
| **TC-D02** | Alert dialog Cancel / OK | ⏳ | ⏳ |
| **TC-D03** | Bottom sheet display + dismiss | ⏳ | ⏳ |
| **TC-D04** | Snackbar display + UNDO | ⏳ | ⏳ |
| **TC-D05 / D05-NEG** | Date picker multi-modal; empty-input "Invalid format." error | ⏳ | ⏳ |
| **TC-D06** | Time picker dial + text input | ⏳ | ⏳ |
| **TC-D07** | Simple dialog radio selection | ⏳ | ⏳ |
| **TC-D08** | Full-screen dialog + back nav + result card | ⏳ | ⏳ |

## 5. Form Validation

**Spec (planned):** `03_nav/05_form.spec.ts`

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-F01** | Form default state (all fields render) | ⏳ | ⏳ |
| **TC-F02** | Happy path submit (Bridal/Large/2-of-5/10:30 PM) | ⏳ | ⏳ |
| **TC-F03** | Terms gating — reject until ON, then succeed | ⏳ | ⏳ |
| **TC-F04** | Required-field errors on empty form | ⏳ | ⏳ |
| **TC-F05** | Format errors (email/phone/number/password) | ⏳ | ⏳ |
| **TC-F06** | State reset after Back + re-entry | ⏳ | ⏳ |

## 6. Permissions

**Spec (planned):** `03_nav/06_permissions.spec.ts` — ⏭ iOS (springboard dialogs).

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-P01** | Default — 3 entries "Not checked", no Open Settings | ⏳ | ⏭ |
| **TC-P02** | Mixed grant (Camera/Audio/Location/Storage) + persistence | ⏳ | ⏭ |
| **TC-P03** | Alternative grant path + persistence | ⏳ | ⏭ |
| **TC-P04** | Deny twice → permanent; Storage auto-grants | ⏳ | ⏭ |

## 7. Notifications

**Spec (planned):** `03_nav/07_notifications.spec.ts` (API 33+) — ⏭ iOS (APNS model differs).

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-NT01** | Accept dialog → granted card → exercise 5 triggers | ⏳ | ⏭ |
| **TC-NT02** | Deny → denied card → exercise 5 triggers | ⏳ | ⏭ |
| **TC-NT03** | Deny twice → permanent, card reverts → exercise 5 triggers | ⏳ | ⏭ |

## 8. Tabs & Navigation

**Spec (planned):** `03_nav/08_tabs.spec.ts`

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-T01** | Default — Back, title, 3 tabs, Feed selected, Page 1 of 3 | ⏳ | ⏳ |
| **TC-T02** | Feed pager swipe 1→2→3, no overshoot, back preserved | ⏳ | ⏳ |
| **TC-T03** | Search tab static body text | ⏳ | ⏳ |
| **TC-T04** | Profile nested bottom nav (Home/Favorites/Settings) | ⏳ | ⏳ |
| **TC-T05 / T06** | Cross-tab hop / Back+re-enter reset pager to Page 1 | ⏳ | ⏳ |

## 9. Camera

**Spec (planned):** `03_nav/09_camera.spec.ts` (API 30+) — ⏭ iOS (Simulator has no camera).

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-CM01–CM04** | Granted path — live preview, shutter + toast, back, flip | ⏳ | ⏭ |
| **TC-CM05–CM07** | Denied path — deny, permanent denial, Open Settings deep-link | ⏳ | ⏭ |

## 10. Location

**Spec (planned):** `03_nav/10_location.spec.ts`

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-LO01–LO05** | Granted path — dialog → grant → tracking + LIFO history → persistence | ⏳ | ⏳ |
| **TC-LO06–LO08** | Denied path — deny, Open Settings deep-link, permanent denial | ⏳ | ⏳ |

## 11. Dark Mode (cross-cutting)

**Spec (planned):** `03_nav/11_dark_mode.spec.ts`

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-DK01** | Light baseline → toggle ON → Home brightness drops ≥80 | ⏳ | ⏳ |
| **TC-DK02** | Cross-cutting walk — every page samples dark | ⏳ | ⏳ |
| **TC-DK03** | Toggle OFF → Home within ±30 of baseline | ⏳ | ⏳ |

## 12. Product Detail + Add to Cart

**Spec (planned):** `04_products/01_product_detail_add.spec.ts`

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-PD01** | Detail renders (image, title, price, 3 swatches, qty stepper, Add) | ⏳ | ⏳ |
| **TC-PD02** | Two color variants → 2 distinct cart lines, badge=2 | ⏳ | ⏳ |
| **TC-PD03 / PD05** | Badge persists across drawer nav between grids | ⏳ | ⏳ |
| **TC-PD04** | Add via Detail → snackbar → badge=3 | ⏳ | ⏳ |
| **TC-PD06** | Direct-add from grid card icon → badge=4 | ⏳ | ⏳ |
| **🆕 TC-PD07** | Qty stepper: + to qty>1, Add → cart line qty + line total = unitPrice × qty (gap: reference only asserts default "1") | ⏳ | ⏳ |

## 13. Search

**Spec (planned):** folded into `04_products/01_product_detail_add.spec.ts`.

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-SR01** | Party → "Cocktail" → 3 matches → add all → badge=7 | ⏳ | ⏳ |
| **TC-SR02** | Boho → "shorts" → empty grid, badge unchanged | ⏳ | ⏳ |
| **🆕 TC-SR03** | Search `*` → grid replaced by "App crashed on search result" error state (planted bug A) | ⏳ | ⏳ |
| **🆕 TC-SR04** | Search `red` → results contain only red-named products (catches `red`→`black` pollution, planted bug B) | ⏳ | ⏳ |

## 14. Shopping Cart

**Spec (planned):** `04_products/02_cart.spec.ts`

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-S01** | 7 lines well-formed; Total = Σ line totals; Proceed enabled | ⏳ | ⏳ |
| **TC-S02** | Plus qty 1→5; line total = unitPrice × qty; Σ = cart Total | ⏳ | ⏳ |
| **TC-S03** | Minus back to 1; Minus disabled at qty=1 | ⏳ | ⏳ |
| **TC-S04** | Delete line → count −1; Total −= deleted line total | ⏳ | ⏳ |
| **TC-S05** | Delete all → "Your cart is empty" + Continue Shopping | ⏳ | ⏳ |
| **🆕 TC-S06** | (Optional) Cart persistence across terminate + relaunch | ⏳ | ⏳ |

## 15. Checkout

**Spec (planned):** `04_products/03_checkout.spec.ts`. Data: `tests/data/checkout-scenarios.json`.

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-K01** | Empty submit → 6 required-field errors; stay on Shipping | ⏳ | ⏳ |
| **TC-K02** | Fill `valid[0]` → Review matches Cart → Place Order → Thank You | ⏳ | ⏳ |
| **TC-K03** | Continue Shopping → Catalog Landing + badge=0 | ⏳ | ⏳ |
| **TC-K04** | Back from Review preserves all 7 Shipping values | ⏳ | ⏳ |
| **🆕 TC-K10** | `valid[1]` "Alt happy path (no address2)" → order completes, Address 2 empty (orphaned fixture, never implemented in reference) | ⏳ | ⏳ |
| **🆕 TC-K05–K09** | Per-field empty negatives (emptyFullName/Address1/City/State/Zip/Country) — fill all but one, submit, assert that field's required error + submission blocked (`allEmpty` ≈ K01, deduped) | ⏳ | ⏳ |

## 16. End-to-End Regression

**Spec (planned):** `05_regression/01_e2e.spec.ts`. Runs after all module specs.

| Test ID | Description | Android | iOS |
| :--- | :--- | :---: | :---: |
| **TC-E01** | Full serial journey: cold launch → login → catalog → product → add → cart → checkout → place order → thank you → badge=0 | ⏳ | ⏳ |

---

## Coverage-audit candidates

Behaviours flagged while reading the reference suite (candidates to cover here,
not assumed to be bugs):

- **Product-detail quantity stepper** — reference asserts only the default "1"
  and has no stepper methods → **TC-PD07** above.
- **Per-field checkout validation** — `checkout-scenarios.json` defines 7 per-field
  empty scenarios unused by any spec; reference's TC-K01 only tests all-empty →
  **TC-K05–K09** above.
- **TC-K10 orphaned fixture** — `valid[1]` (no-address2) is tagged `usedBy:["TC-K10"]`
  but no such test exists in the reference → **TC-K10** above.
- **Cart persistence across restart** — unasserted in the reference → optional **TC-S06**.
