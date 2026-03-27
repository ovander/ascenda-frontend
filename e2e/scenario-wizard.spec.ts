/**
 * E2E tests for ScenarioWizardView.vue
 *
 * ── Plan case: "Belgian SaaS Startup" ────────────────────────────────────────
 *
 * Free tier (5 steps):  Details → Planning → Key Rates → Revenue → Review
 * Pro  tier (7 steps):  + Opening Balance + Working Capital (steps 3 & 4)
 *
 * Selector strategy (PrimeVue 4 specifics)
 * ─────────────────────────────────────────
 * • InputText      → getByPlaceholder()
 * • Textarea       → getByPlaceholder()
 * • Dropdown/Select→ find via adjacent <label> or <h3>, then click .p-select sibling
 * • InputNumber    → .p-inputnumber-input — triple-click + fill
 * • Buttons        → exact PrimeVue labels: "Back" | "Continue" | "Create Scenario"
 * • Step headings  → page.locator('h2') to avoid matching step-bar labels
 * • Toast messages → .p-toast-message-content (strict-safe)
 *
 * Pro tier approach
 * ─────────────────
 * isPro reads tenantStore.tenant?.tier.  The tenant store is never auto-fetched,
 * so we:
 *   1. Boot the app at /  (auth injected via addInitScript)
 *   2. Patch Pinia tenant state reactively  (injectTenantTier)
 *   3. Navigate to the wizard via Vue Router push  (no reload → state preserved)
 */

import {
  test, expect,
  PLAN_ID, WIZARD_SCENARIO_ID,
  MOCK_PLAN, MOCK_USER, MOCK_SCENARIO,
  mockApiCalls, mockWizardRoutes,
  injectTenantTier, routerPush,
} from './fixtures'
import type { Page, Locator } from '@playwright/test'

// ─── Constants ────────────────────────────────────────────────────────────────

const WIZARD_URL = `/plans/${PLAN_ID}/scenarios/new/wizard`

const DETAILS = {
  name:        'Conservative 2026',
  description: 'Bootstrap year — lean team, no external marketing',
}

// ─── PrimeVue interaction helpers ─────────────────────────────────────────────

/**
 * Open a PrimeVue Select (Dropdown) whose adjacent <label> contains labelText,
 * then click the option with the given text.
 *
 * DOM structure rendered by the wizard:
 *   <div>
 *     <label ...>Salary Months / Year</label>
 *     <div class="p-select p-component ..." role="combobox">...</div>
 *   </div>
 *
 * We navigate: label → parent div → sibling .p-select
 */
async function selectByLabel(page: Page, labelText: string | RegExp, optionText: string) {
  const label  = page.locator('label').filter({ hasText: labelText }).first()
  const select = label.locator('xpath=..').locator('.p-select').first()
  await select.click()
  await page.getByRole('option', { name: optionText }).first().click()
}

/**
 * Same as above but anchored to an <h3> heading (used for WC step where
 * the field labels are rendered as headings, not <label> elements).
 */
async function selectByHeading(page: Page, headingText: string | RegExp, optionText: string) {
  const heading = page.locator('h3').filter({ hasText: headingText }).first()
  const select  = heading.locator('xpath=..').locator('.p-select').first()
  await select.click()
  await page.getByRole('option', { name: optionText }).first().click()
}

/**
 * Fill a PrimeVue InputNumber whose adjacent <label> contains labelText.
 * Triple-clicks to select the existing value, then types the new one.
 */
async function fillNumberByLabel(page: Page, labelText: string | RegExp, value: number) {
  const label = page.locator('label').filter({ hasText: labelText }).first()
  const input = label.locator('xpath=..').locator('.p-inputnumber-input').first()
  // PrimeVue InputNumber intercepts keyboard events to update its model.
  // Playwright's fill() sets the DOM value directly and bypasses those handlers,
  // so Vue's reactive state never updates.  pressSequentially() fires actual
  // keydown/keypress/keyup events, which PrimeVue processes correctly.
  // Triple-click = select all (cross-platform; Ctrl+A on Mac moves cursor to
  // line-start instead of selecting all, so we use the click approach).
  await input.click({ clickCount: 3 })
  await input.pressSequentially(String(value)) // fires real key events for PrimeVue
  await input.press('Tab') // commit / blur so the model update propagates
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const clickContinue     = (page: Page) => page.getByRole('button', { name: 'Continue' }).click()
const clickBack         = (page: Page) => page.getByRole('button', { name: 'Back' }).click()
const clickCreate       = (page: Page) => page.getByRole('button', { name: 'Create Scenario' }).click()

/** Assert the current step heading (scoped to <h2> to avoid step-bar duplicates). */
const expectStep = (page: Page, heading: string) =>
  expect(page.locator('h2').filter({ hasText: heading }).first()).toBeVisible()

// ─── Boot helpers ─────────────────────────────────────────────────────────────

/** Seeds auth + plan/scenario context via addInitScript, then navigates to /. */
async function bootApp(page: Page) {
  const authPayload = {
    accessToken: 'e2e-access-token', refreshToken: 'e2e-refresh-token', user: MOCK_USER,
  }
  await page.addInitScript((d: any) => { ;(window as any).__E2E_AUTH__ = d }, authPayload)

  const ctxPayload = { plan: MOCK_PLAN, scenario: MOCK_SCENARIO }
  await page.addInitScript((d: any) => { ;(window as any).__E2E_PLAN_CTX__ = d }, ctxPayload)
}

/** Go to the wizard as a free-tier user (direct goto is fine). */
async function gotoWizardFree(page: Page) {
  await page.goto(WIZARD_URL)
  await page.waitForLoadState('networkidle')
}

/**
 * Go to the wizard as a Pro user.
 * Strategy: boot at /, patch Pinia reactively, then router-push (no reload).
 */
async function gotoWizardPro(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await injectTenantTier(page, 'pro')   // patch Pinia tenant.tier
  await routerPush(page, WIZARD_URL)    // Vue Router push → Pinia state preserved
  await page.waitForLoadState('networkidle')
}

// ─── Free-tier wizard ─────────────────────────────────────────────────────────

test.describe('ScenarioWizard — Free tier (5 steps)', () => {

  test('full happy path: correct API payloads for Belgian SaaS startup', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)          // catch-all registered first (lower priority)
    const capture = await mockWizardRoutes(page) // specific routes second (wins)
    await gotoWizardFree(page)

    // ── Step 0: Details ──────────────────────────────────────────────────────
    await expectStep(page, 'Scenario Details')
    await page.getByPlaceholder('e.g. Base Case, Conservative, Optimistic').fill(DETAILS.name)
    await page.getByPlaceholder(/Summarise the key assumptions/i).fill(DETAILS.description)
    await clickContinue(page)

    // ── Step 1: Planning ─────────────────────────────────────────────────────
    await expectStep(page, 'Planning Configuration')
    // Country defaults to BE (first option); just change salary months to 13
    await selectByLabel(page, 'Salary Months', '13 months')
    await clickContinue(page)

    // ── Step 2: Key Rates ────────────────────────────────────────────────────
    await expectStep(page, 'Key Rates')
    // BE preset already filled; no changes
    await clickContinue(page)

    // ── Step 3: Revenue ──────────────────────────────────────────────────────
    await expectStep(page, 'Revenue Lines')
    // First product (placeholder: "e.g. Consulting services")
    await page.getByPlaceholder('e.g. Consulting services').fill('SaaS License')
    await selectByLabel(page, 'Type', 'SaaS')

    await page.getByText('Add another revenue line').click()
    await page.getByPlaceholder('e.g. Annual SaaS license').fill('Implementation')
    // Second product type stays 'Service' (default)
    await clickContinue(page)

    // ── Step 4: Review ────────────────────────────────────────────────────────
    await expectStep(page, 'Review & Create')
    await clickCreate(page)
    await page.waitForURL(`**/plans/${PLAN_ID}/scenarios/${WIZARD_SCENARIO_ID}`)

    // ── Assert: createScenario ───────────────────────────────────────────────
    expect(capture.createScenario).toMatchObject({
      name:        DETAILS.name,
      description: DETAILS.description,
    })

    // ── Assert: updateConfig (BE preset + 13-month salary) ───────────────────
    expect(capture.updateConfig).toMatchObject({
      country:               'BE',
      forecastStart:         expect.stringMatching(/^\d{4}-01-01$/),
      firstFiscalYearMonths: 12,
      currencySymbol:        '€',
      language:              'fr',
      salaryMonthsPerYear:   13,
      corporateTaxRate:      '0.25',
      vatRate:               '0.21',
      employerTaxRate:       '0.2767',
      discountRate:          '0.1',
      mltInterestRate:       '0.03',
    })

    // Pro-only calls must be null on free tier
    expect(capture.updateObBalance).toBeNull()
    expect(capture.updateWcConfig).toBeNull()

    // ── Assert: createProducts ───────────────────────────────────────────────
    expect(capture.createProducts).toHaveLength(2)
    expect(capture.createProducts[0]).toMatchObject({
      name: 'SaaS License', productType: 'saas', driverType: 'flat',
    })
    expect(capture.createProducts[1]).toMatchObject({
      name: 'Implementation', productType: 'service', driverType: 'flat',
    })
    for (const p of capture.createProducts) {
      expect(p).toMatchObject({
        directCostVariability: 'variable', staffVariability: 'fixed', depreciationVariability: 'fixed',
      })
    }
  })

  test('blocks Continue on step 0 when name is empty', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    await gotoWizardFree(page)

    await expectStep(page, 'Scenario Details')
    await clickContinue(page)  // no name entered

    // Still on step 0
    await expect(page.getByPlaceholder('e.g. Base Case, Conservative, Optimistic')).toBeVisible()
    // Toast warning appears
    await expect(page.locator('.p-toast-message-content').first()).toBeVisible()
  })

  test('blocks Continue on revenue step when no product has a name', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    await gotoWizardFree(page)

    await page.getByPlaceholder('e.g. Base Case, Conservative, Optimistic').fill('Test')
    await clickContinue(page) // → step 1
    await clickContinue(page) // → step 2
    await clickContinue(page) // → step 3 (Revenue)

    await expectStep(page, 'Revenue Lines')
    await clickContinue(page) // no product names

    // Still on Revenue step
    await expectStep(page, 'Revenue Lines')
    await expect(page.locator('.p-toast-message-content').first()).toBeVisible()
  })

  test('Back button returns to previous step', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    await gotoWizardFree(page)

    await page.getByPlaceholder('e.g. Base Case, Conservative, Optimistic').fill('Test')
    await clickContinue(page) // → Planning

    await expectStep(page, 'Planning Configuration')
    await clickBack(page)
    await expectStep(page, 'Scenario Details')
  })

  test('country preset auto-fills currency symbol when country is selected', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    await gotoWizardFree(page)

    await page.getByPlaceholder('e.g. Base Case, Conservative, Optimistic').fill('Test')
    await clickContinue(page) // → Planning

    // BE is the default country; currency € should be pre-filled
    await expect(page.getByPlaceholder('€')).toHaveValue('€')
  })

  test('step counter shows correct current step', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    await gotoWizardFree(page)

    await expect(page.getByText('Step 1 of 5')).toBeVisible()
    await page.getByPlaceholder('e.g. Base Case, Conservative, Optimistic').fill('Test')
    await clickContinue(page)
    await expect(page.getByText('Step 2 of 5')).toBeVisible()
  })

  test('step bar shows 5 items for free tier', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    await gotoWizardFree(page)

    await expect(page.locator('.p-steps-item')).toHaveCount(5)
  })
})

// ─── Pro-tier wizard ──────────────────────────────────────────────────────────

test.describe('ScenarioWizard — Pro tier (7 steps)', () => {

  test('step bar shows 7 items after Pro tier injection', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    await gotoWizardPro(page)

    await expect(page.locator('.p-steps-item')).toHaveCount(7)
  })

  test('step counter shows "of 7" for pro tier', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    await gotoWizardPro(page)

    await expect(page.getByText('Step 1 of 7')).toBeVisible()
  })

  test('full happy path: opening balance + WC config payloads', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    const capture = await mockWizardRoutes(page)
    await gotoWizardPro(page)

    // ── Step 0: Details ──────────────────────────────────────────────────────
    await expectStep(page, 'Scenario Details')
    await page.getByPlaceholder('e.g. Base Case, Conservative, Optimistic').fill(DETAILS.name)
    await page.getByPlaceholder(/Summarise the key assumptions/i).fill(DETAILS.description)
    await clickContinue(page)

    // ── Step 1: Planning ─────────────────────────────────────────────────────
    await expectStep(page, 'Planning Configuration')
    await selectByLabel(page, 'Salary Months', '13 months')
    await clickContinue(page)

    // ── Step 2: Key Rates ────────────────────────────────────────────────────
    await expectStep(page, 'Key Rates')
    await clickContinue(page)

    // ── Step 3 (Pro): Opening Balance ────────────────────────────────────────
    await expectStep(page, 'Opening Balance')
    await fillNumberByLabel(page, 'Cash & Securities', 50_000)
    await fillNumberByLabel(page, 'Share Capital', 100_000)
    await clickContinue(page)

    // ── Step 4 (Pro): Cash Flow Timing ───────────────────────────────────────
    await expectStep(page, 'Cash Flow Timing')
    // Customer stays at default 30 days; change Supplier to 60 days
    await selectByHeading(page, 'You pay suppliers', '60 days')
    await clickContinue(page)

    // ── Step 5 (Pro): Revenue ────────────────────────────────────────────────
    await expectStep(page, 'Revenue Lines')
    await page.getByPlaceholder('e.g. Consulting services').fill('SaaS License')
    await selectByLabel(page, 'Type', 'SaaS')
    await page.getByText('Add another revenue line').click()
    await page.getByPlaceholder('e.g. Annual SaaS license').fill('Implementation')
    await clickContinue(page)

    // ── Step 6: Review ────────────────────────────────────────────────────────
    await expectStep(page, 'Review & Create')
    await clickCreate(page)
    await page.waitForURL(`**/plans/${PLAN_ID}/scenarios/${WIZARD_SCENARIO_ID}`)

    // ── Assert: createScenario ───────────────────────────────────────────────
    expect(capture.createScenario).toMatchObject({
      name: DETAILS.name, description: DETAILS.description,
    })

    // ── Assert: updateConfig ─────────────────────────────────────────────────
    expect(capture.updateConfig).toMatchObject({
      country: 'BE', currencySymbol: '€', language: 'fr', salaryMonthsPerYear: 13,
      corporateTaxRate: '0.25', vatRate: '0.21', employerTaxRate: '0.2767',
      discountRate: '0.1', mltInterestRate: '0.03',
    })

    // ── Assert: opening balance ──────────────────────────────────────────────
    expect(capture.updateObBalance).toMatchObject({
      cashAndSecurities: '50000',
      shareCapital:      '100000',
      noncurrentAssets:  '0', inventories: '0', customerReceivables: '0',
      retainedEarnings:  '0', loansAndDebt: '0', supplierPayables: '0', socialAndTaxDebts: '0',
    })

    // ── Assert: WC config (customer 30d → pct30=1; supplier 60d → pct60=1) ──
    expect(capture.updateWcConfig).toMatchObject({
      customerPct0Days: '0', customerPct30Days: '1', customerPct60Days: '0', customerPct90Days: '0',
      supplierPct0Days: '0', supplierPct30Days: '0', supplierPct60Days: '1', supplierPct90Days: '0',
    })

    // ── Assert: products ─────────────────────────────────────────────────────
    expect(capture.createProducts).toHaveLength(2)
    expect(capture.createProducts[0]).toMatchObject({ name: 'SaaS License',   productType: 'saas',    driverType: 'flat' })
    expect(capture.createProducts[1]).toMatchObject({ name: 'Implementation', productType: 'service', driverType: 'flat' })
  })

  test('balance gap warning appears when assets ≠ liabilities', async ({ page }) => {
    await bootApp(page)
    await mockApiCalls(page)
    await gotoWizardPro(page)

    // Navigate to Opening Balance step (step 3)
    await page.getByPlaceholder('e.g. Base Case, Conservative, Optimistic').fill('Test')
    await clickContinue(page) // → Planning
    await clickContinue(page) // → Key Rates
    await clickContinue(page) // → Opening Balance

    await expectStep(page, 'Opening Balance')

    // Enter only an asset — no corresponding liability → gap appears
    await fillNumberByLabel(page, 'Cash & Securities', 100_000)

    await expect(page.getByText(/Assets exceed liabilities/i)).toBeVisible()
  })
})

// ─── WC fraction conversion (parametric) ─────────────────────────────────────

test.describe('ScenarioWizard — WC fraction conversion', () => {
  const cases = [
    {
      label:       'immediate/immediate (0d/0d)',
      custOption:  'Immediate (0 days)',
      suppOption:  'Immediate (0 days)',
      expected: {
        customerPct0Days: '1', customerPct30Days: '0', customerPct60Days: '0', customerPct90Days: '0',
        supplierPct0Days: '1', supplierPct30Days: '0', supplierPct60Days: '0', supplierPct90Days: '0',
      },
    },
    {
      label:       '90d customer / 30d supplier',
      custOption:  '90 days',
      suppOption:  '30 days',
      expected: {
        customerPct0Days: '0', customerPct30Days: '0', customerPct60Days: '0', customerPct90Days: '1',
        supplierPct0Days: '0', supplierPct30Days: '1', supplierPct60Days: '0', supplierPct90Days: '0',
      },
    },
  ]

  for (const tc of cases) {
    test(`fractions correct for ${tc.label}`, async ({ page }) => {
      await bootApp(page)
      await mockApiCalls(page)
      const capture = await mockWizardRoutes(page)
      await gotoWizardPro(page)

      // Step 0
      await page.getByPlaceholder('e.g. Base Case, Conservative, Optimistic').fill('WC test')
      await clickContinue(page)

      // Step 1: Planning
      await clickContinue(page)

      // Step 2: Key Rates
      await clickContinue(page)

      // Step 3: Opening Balance (all zeros, just continue)
      await expectStep(page, 'Opening Balance')
      await clickContinue(page)

      // Step 4: Cash Flow Timing — set payment terms
      await expectStep(page, 'Cash Flow Timing')
      await selectByHeading(page, 'Customers pay you', tc.custOption)
      await selectByHeading(page, 'You pay suppliers',  tc.suppOption)
      await clickContinue(page)

      // Step 5: Revenue — need at least one named product
      await expectStep(page, 'Revenue Lines')
      await page.getByPlaceholder('e.g. Consulting services').fill('Test Product')
      await clickContinue(page)

      // Step 6: Review
      await expectStep(page, 'Review & Create')
      await clickCreate(page)
      await page.waitForURL(`**/plans/${PLAN_ID}/scenarios/${WIZARD_SCENARIO_ID}`)

      expect(capture.updateWcConfig).toMatchObject(tc.expected)
    })
  }
})
