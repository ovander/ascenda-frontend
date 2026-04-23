# ASCENDA FRONTEND — FULL UX AUDIT
**Date:** 2026-04-13  
**Scope:** 21 pages, all layers (operate / understand / admin)  
**Stack:** Vue 3 + TypeScript + PrimeVue 4 + Tailwind CSS  
**Auditor:** Senior Frontend Architect

---

## ARCHITECTURE PRIMER

Before the page-by-page analysis, three structural facts govern every finding below.

**Layer system:**
- `operate` — data entry. Most routes carry `mobileBlocked: true`, which fires a router guard redirecting phones to the scenario dashboard.
- `understand` — reporting. **No route in this layer carries `mobileBlocked: true`.** Every financial statement, chart view, AI narration, BEP, Cap-Table, Report and Audit page is reachable on mobile.

**Responsive toolkit:**
- `ShowOn.vue` — conditional DOM rendering by breakpoint (mobile / tablet / desktop). Used on AI pages and the scenario dashboard intelligence card. **Absent from all financial statement pages.**
- Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) — used sparingly; mostly limited to typography scaling and a handful of padding rules.
- `useUiStore` — provides `isMobile` (< 768 px), `isTablet` (768–1023 px), `isDesktop` (≥ 1024 px). Consumed by navigation and sidebar, not by financial content pages.

**Grid components:**
- `KYearGrid` — 5-year editable grid; full width with min-column constraints.
- `KMonthGrid` — 12-month + annual total editable grid; always 13 columns.
- `DataContainer` — overflow-x wrapper with a fixed `min-width` (varies; typically 700 px+).
- PrimeVue `DataTable` with `scrollable="true"` — handles overflow-x internally.

The critical observation: **the DataContainer and DataTable overflow wrappers allow mobile users to horizontally scroll dense financial tables, but provide no adaptation, simplification, or alternative representation.** Mobile users get the full desktop table, pinch-zoomed down, with horizontal scrolling.

---

=====================================
PAGE: PL (Profit & Loss Statement)
=====================================

## 1. PURPOSE
The user reviews the projected P&L over 5 fiscal years, including manual adjustment overrides (capitalized costs, impairment) and optional chart analysis. This is a **pure ANALYSE/UNDERSTAND page** — the data is computed from the OPERATE layer inputs.

## 2. CONTENT STRUCTURE

**Dense data zones:**
- PrimeVue DataTable (P&L tab): 1 frozen label column (min-w-[220px]) + 5 year columns (min-w-[110px] each) + 1 "% Y1 Sales" column (min-w-[80px]). Approximately 15–25 rows covering Revenue, COGS, Gross Margin, EBITDA, Net Profit, and all intermediary lines.
- KYearGrid (Manual Adjustments): 6 editable line items × 5 year columns.

**Narrative zones:** None. No AI block, no summary card.

**Interactive zones:** Download Audit button (header), tab switcher (P&L Report ↔ Graphs), Manual Adjustments form (KYearGrid is editable — no mobileBlocked guard).

**Chart block (Graphs tab):**
- Chart 1: Revenue / EBITDA / Net Profit combo (320 px)
- Chart 2: Cost structure by category stacked-bar (320 px)
- Chart 3: Margin % evolution line chart (280 px)

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
The page loads. The DataTable enters an overflow-x scroll container via PrimeVue's `scrollable` prop. The frozen label column (220 px) occupies ~60% of the viewport on a 375 px screen, leaving only ~155 px for the 6 data columns. The user must horizontally scroll 6 columns across a container that is at least 6 × 110 px + 80 px + 220 px = 960 px wide on a 375 px viewport — a 2.5× horizontal overflow ratio.

The KYearGrid manual adjustments section is fully accessible and editable on mobile despite being form inputs. No mobile protection.

The Graphs tab renders charts at fixed heights (320 px / 280 px) in single-column layout. Charts are responsive width and render correctly.

**Scroll behavior:** Dual-axis scrolling. Vertical for page content; horizontal inside the DataTable. This is disorienting on touch devices.

**Actionable?** Reading: barely, with effort. Editing (manual adjustments): technically yes, but impractical on a 375 px screen.

**TABLET (768–1024 px)**
At 768 px the table is marginally better — approximately 548 px for data columns after the frozen label. Still requires horizontal scroll for all 6 data columns. No layout adaptation. Charts render 2 per row? No — charts are in separate cards, stacked vertically (no grid on the Graphs tab). Usable with effort.

**DESKTOP (≥ 1024 px)**
Optimal. DataTable occupies full available width. The frozen label column stays left while years scroll right (if needed). At 1280 px the table fits without overflow. Charts fill the page width neatly. The Download Audit button is correctly positioned in the header.

## 4. UX QUALITY SCORE

- **Mobile: 3/10** — Table is technically reachable but practically unreadable. Dual-axis scrolling is poor UX. No summary, no progressive disclosure. Editable inputs unexpectedly available.
- **Tablet: 5/10** — Horizontal scroll is manageable. Single-column chart layout wastes vertical space. Usable but suboptimal.
- **Desktop: 8/10** — Layout is well-structured. Minor issue: charts and tables are in separate tabs requiring context switching.

## 5. CRITICAL ISSUES

1. No mobile adaptation for the DataTable — full 7-column table exposed on 375 px screens.
2. KYearGrid (Manual Adjustments) is editable on mobile — unintended data-entry risk.
3. No summary card or headline KPIs for mobile consumption.
4. Charts tab and Table tab are separate — users cannot see data and chart simultaneously.
5. Typography scaling (`text-lg sm:text-xl md:text-2xl`) is the only responsive CSS applied.

## 6. DEVICE FIT CLASSIFICATION
**DESKTOP ONLY** — Not meaningfully usable on mobile despite being technically accessible.

## 7. RECOMMENDED TRANSFORMATION
**C + B: Add mobile summary layer; keep desktop as-is.**

- On mobile: replace the DataTable with a KPI card row (Revenue Y1, EBITDA Y1, Net Margin %, breakeven year) and hide the full table behind a "View full P&L" disclosure button.
- Add `mobileBlocked: true` to the Manual Adjustments interaction (or at minimum, `readonly` on KYearGrid inputs when `isMobile`).
- On tablet: collapse to 3 years visible by default, allow horizontal scroll for Y4–Y5.
- Charts tab: use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for chart layout consistency.

## 8. V2 INTEGRATION OPPORTUNITY
**High relevance.** Placing a `ScenarioIntelligenceSection`-style card at the top of the P&L page (viability score + headline + top strengths/risks) would give mobile users an immediate value signal without needing to read the table. The full DataTable becomes a drill-down, not the primary surface.

---

=====================================
PAGE: PNL-CASH (Anglo-Saxon Functional P&L)
=====================================

## 1. PURPOSE
The user reviews the P&L restructured by business function (R&D, Sales & Marketing, G&A) rather than by cost nature. This is the format preferred by investors. Includes a custom waterfall chart for yearly comparison. **ANALYSE layer.**

## 2. CONTENT STRUCTURE

**Dense data zones:**
- DataTable (Functional P&L tab): 1 frozen label column (min-w-[250px]) + 5 year columns + 1 "% of Revenue" column. Wider frozen label than standard PL.
- Section groupings: Sales & Gross Margin, R&D/Production, Sales & Marketing, G&A, EBIT, Financial, Net Profit.

**Narrative zones:** None.

**Interactive zones:** Tab switcher (Functional P&L ↔ Graphs), Year selector on waterfall chart. Download button (DEV mode only).

**Chart block (4 charts):**
- Combo: Sales, Gross Margin, Net Profit (320 px)
- Stacked-bar: Cost by Function (320 px)
- Line: Margin % Evolution (320 px)
- Waterfall: Annual P&L Waterfall with year selector (380 px, custom Bar chart)

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
Frozen label column is 250 px — on a 375 px phone, the label alone consumes 67% of the viewport. Data columns require significant horizontal scrolling. The waterfall chart with its year selector Select component is technically usable but the chart legend (three colored blocks) is very small on mobile. No ShowOn, no mobile adaptation.

**TABLET (768–1024 px)**
Slightly better. The 250 px frozen label leaves ~500–700 px for data columns on typical tablets. The 4-chart layout stacks vertically (no grid). Waterfall chart with year selector is functional.

**DESKTOP (≥ 1024 px)**
Good layout. Waterfall chart is the differentiating feature and renders well. DataTable is well-structured with clear color coding (orange = input, green = computed).

## 4. UX QUALITY SCORE

- **Mobile: 2/10** — 250 px frozen column + 6 data columns on 375 px is effectively unusable. No adaptation.
- **Tablet: 5/10** — Marginally usable with horizontal scroll.
- **Desktop: 8/10** — Investor-format is clear, waterfall is a good differentiator.

## 5. CRITICAL ISSUES

1. Widest frozen column (250 px) of all pages — worst mobile experience.
2. No fallback representation for mobile.
3. Waterfall chart's year selector uses PrimeVue Select — tiny on mobile.
4. 4 charts stacked vertically on desktop wastes height; no grid layout used.
5. No analytical summary or KPI callout.

## 6. DEVICE FIT CLASSIFICATION
**DESKTOP ONLY**

## 7. RECOMMENDED TRANSFORMATION
**A + B: Keep desktop as-is; add a mobile KPI summary card.**

Add a top-level card on mobile: Revenue, EBIT %, Net Margin %, and the key functional cost breakdown as a simple percentage pie. Hide the DataTable behind progressive disclosure. The waterfall chart alone (without the DataTable) is excellent on tablet/mobile — surface it first.

## 8. V2 INTEGRATION OPPORTUNITY
**Medium relevance.** A v2 analysis header referencing EBIT margin vs. industry benchmarks would enhance the investor-format page. The Benchmark Commentary AI feature (accessible via the AI section) overlaps in intent — a direct card link to it here would improve navigation.

---

=====================================
PAGE: FIPLAN (Financing Plan)
=====================================

## 1. PURPOSE
The user reviews the capital requirements and funding sources (equity, debt, grants) over 5 years, and can structure capital raises linked to the Cap-Table. Unique in that it has **editable content (KYearGrid) but is classified as `layer: 'understand'` with no `mobileBlocked: true`.** This is an architectural inconsistency.

## 2. CONTENT STRUCTURE

**Dense data zones:**
- KYearGrid (FiPlan tab): Requirements + Resources rows, capital increase sub-rows with Cap-Table badge links, 5 year columns. DataContainer wraps it.
- Chart block: Balance Waterfall, Requirements vs Resources combo, Cumulative Cash evolution.

**Narrative zones:** None.

**Interactive zones:** "Structure this raise" button per capital increase row (opens Dialog to create Cap-Table round), DataContainer form inputs (editable year values), dialog for opening/closing balance.

**PrimeVue Dialogs:** Capital structure dialog, Opening Balance dialog.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
This page is accessible on mobile yet contains editable forms and complex dialogs. The DataContainer with min-width means mobile users encounter a horizontal scroll container with an editable financial grid. PrimeVue Dialog is fullscreen on mobile by default which is manageable, but the underlying KYearGrid is not designed for touch input at 375 px.

**TABLET (768–1024 px)**
Better. Dialog is a reasonable size. KYearGrid horizontal scroll is manageable. Capital increase badges with Cap-Table links are helpful for navigation context.

**DESKTOP (≥ 1024 px)**
Well-designed. The Cap-Table integration (badges per round) is a standout feature. Charts provide investment-case visual clarity.

## 4. UX QUALITY SCORE

- **Mobile: 2/10** — Editable grid exposed on mobile with no protection. This is a data integrity risk, not just a UX concern.
- **Tablet: 6/10** — Functional with effort.
- **Desktop: 9/10** — Best-in-class for the financing planning use case.

## 5. CRITICAL ISSUES

1. **CRITICAL: Editable KYearGrid (financial data entry) accessible on mobile without `mobileBlocked: true`.** This contradicts the application's stated mobile read-only contract.
2. Cap-Table integration badge links are very small on mobile — tap targets below 44 px.
3. "Structure this raise" dialog relies on multi-step form inputs — not mobile-friendly.
4. No mobile fallback for the financing summary.

## 6. DEVICE FIT CLASSIFICATION
**DESKTOP ONLY** (but currently mis-classified as UNDERSTAND/accessible — should be OPERATE or at minimum mobileBlocked).

## 7. RECOMMENDED TRANSFORMATION
**A + add `mobileBlocked: true` to the route.**

The page is data-entry in nature despite its UNDERSTAND classification. Add `mobileBlocked: true` immediately. For tablet: keep as-is with minor touch target improvements.

Alternatively, split: read-only summary view (chart + current-year KPIs) accessible everywhere; editable KYearGrid gated to desktop.

## 8. V2 INTEGRATION OPPORTUNITY
**Medium relevance.** A v2 insight block showing "funding gap coverage" as a risk flag (e.g., "Year 3 capital requirement exceeds confirmed raise by 40%") would be actionable. The Scenario Suggestion AI feature's bear/bull parameters could reference financing assumptions.

---

=====================================
PAGE: BSHEET (Balance Sheet)
=====================================

## 1. PURPOSE
The user reviews the projected balance sheet over 5 years plus an opening position. Multiple analytical views: Detailed, Condensed, Analysis (Sources & Uses), Capital Employed, Balance Check. **ANALYSE layer.**

## 2. CONTENT STRUCTURE

**Dense data zones:**
- 5 DataTable views (one per Tabs sub-view), each with 1 frozen label column + 6 data columns (Opening + Y1–Y5).
- Balance Check tab includes validation status rows.

**Narrative zones:** None.

**Interactive zones:** Tab switcher (5 tabs), chart/table toggle (view mode), Year selector on chart views.

**Chart block:** Asset structure bar chart, Liability composition chart (optional view mode).

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
Six data columns (Opening + 5 years) on a 375 px screen. Opening column is particularly important for investors but adds density. The Balance Check tab is the most useful on mobile (validation status) — it's a simple list of pass/fail checks. No mobile-optimized view.

**TABLET (768–1024 px)**
5 tabs require horizontal tab scrolling if labels are long. Six columns fit better on 768+ px. The chart/table toggle is useful here — charts at full tablet width are readable.

**DESKTOP (≥ 1024 px)**
Optimal. Five tabs provide a logical analytical journey through the balance sheet.

## 4. UX QUALITY SCORE

- **Mobile: 2/10** — 6 columns + frozen label is the widest data grid in the application. Balance Check is the only tab with any mobile value.
- **Tablet: 6/10** — Manageable with scroll. Chart view helps.
- **Desktop: 8/10** — Comprehensive. Minor issue: 5 tabs may overwhelm first-time users.

## 5. CRITICAL ISSUES

1. 6 data columns (widest table) — most severe overflow on mobile.
2. No progressive disclosure: all 5 views are equally accessible, creating navigation overhead.
3. No validation summary callout on mobile (Balance Check status should be surfaced prominently).
4. No AI commentary or diagnostic layer.

## 6. DEVICE FIT CLASSIFICATION
**DESKTOP ONLY**

## 7. RECOMMENDED TRANSFORMATION
**B + C: Add mobile summary; consider partial v2 replacement.**

On mobile: show only a balance summary card (Total Assets, Total Liabilities, Equity as of Year N). Surface the Balance Check status (pass/fail) as a prominent badge. Hide all 5 tabs behind a "View full balance sheet" button.

The Balance Check tab could be completely replaced by a v2-style health indicator card.

## 8. V2 INTEGRATION OPPORTUNITY
**High relevance.** Balance sheet health indicators (leverage ratio, equity ratio, solvency) map directly to v2 risk cards. The `ScenarioAnalysisCard` risk items could surface balance sheet warnings (e.g., "Negative equity in Year 3") as top-level risks.

---

=====================================
PAGE: RATIOS (Financial Ratios)
=====================================

## 1. PURPOSE
The user reviews a comprehensive set of financial ratios across 4 categories (Sales Metrics, Operational, Profitability, Equity & Debt) over 5 years. **Pure ANALYSE.**

## 2. CONTENT STRUCTURE

**Dense data zones:**
- 4 DataTables (one per Tabs tab), each with 5 year columns + label.
- Totals: ~37 individual KPIs across all tabs.
- Value formats: currency, percent, integer (×), days.

**Narrative zones:** None.

**Interactive zones:** Tab switcher only.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
Ratios are conceptually ideal for mobile — they are single values per year, often small numbers. But the DataTable still renders all 5 years at once with no adaptation. Individual ratio values are the most "readable" data in the application on a small screen, yet the presentation format forces the same overflow problem as the full P&L. A ratio like "EBITDA margin: 23.4%" needs no table — a single card per ratio would work perfectly.

**TABLET (768–1024 px)**
4 tabs + DataTables are manageable. The format variety (%, ×, days) is well-formatted.

**DESKTOP (≥ 1024 px)**
Good. Rich ratio set is valuable. Could benefit from conditional coloring (green/red vs. target or prior year).

## 4. UX QUALITY SCORE

- **Mobile: 3/10** — The content (single KPI values) is perfect for mobile, but the container (DataTable) is the wrong component. High potential, poor execution.
- **Tablet: 7/10** — Very usable.
- **Desktop: 7/10** — Data is complete but lacks visual hierarchy and contextual benchmarking.

## 5. CRITICAL ISSUES

1. DataTable is the wrong component for ratio display on mobile — a card/tile grid would be far superior.
2. No visual differentiation between good/bad ratio values.
3. No benchmark comparison or target lines.
4. 37 KPIs across 4 tabs is overwhelming without grouping or filtering.

## 6. DEVICE FIT CLASSIFICATION
**TABLET FRIENDLY** — the content is suitable for mobile but the implementation is not.

## 7. RECOMMENDED TRANSFORMATION
**C: Replace DataTable with ratio tiles/cards on mobile.**

Each ratio becomes a card: name, current value (Year 1 or latest projected), trend arrow (Y1→Y5), and a subtle benchmark band. On desktop: keep the DataTable for power users who need to compare across years. On mobile: a `grid-cols-2` of ratio cards, organized by category, is far more readable.

## 8. V2 INTEGRATION OPPORTUNITY
**Very high relevance.** Ratios are the raw material of a v2 analysis. The ScenarioAnalysisCard's drivers and risks directly reference ratio-level metrics. Adding a v2 insight header to the Ratios page ("These 3 ratios are outliers vs. industry benchmarks") would make this page actionable, not just informational. Direct integration with Benchmark Commentary AI feature.

---

=====================================
PAGE: WCR (Working Capital Requirement)
=====================================

## 1. PURPOSE
The user reviews the working capital components (customer receivables, inventory, supplier payables) and can edit adjustment entries (prepaid expenses, deferred revenue, etc.). 7-tab structure. **ANALYSE layer with editable Adjustments tab.**

## 2. CONTENT STRUCTURE

**Dense data zones:**
- 7 DataTables across 7 tabs, each with 5 year columns + optional % column.
- Customers, Inventory, Suppliers, Summary, Fiscal & Social, Adjustments, Adjusted WCR.

**Narrative zones:** None.

**Interactive zones:** Tab switcher, Adjustments tab with editable InputNumber cells per year (5 line items × 5 years = 25 editable cells). DataContainer wraps the editable grid.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
7 tabs is too many for a mobile tab bar — PrimeVue's TabList will either truncate or require horizontal tab scrolling. DataTables have 5-6 data columns. The Adjustments tab is editable on mobile — same architectural inconsistency as FiPlan. The Summary tab (4 WCR components + adjusted WCR) is the most mobile-worthy and could stand alone.

**TABLET (768–1024 px)**
7 tabs may wrap on narrow tablets. Content is manageable.

**DESKTOP (≥ 1024 px)**
The 7-tab journey through WCR components is thorough. DataContainer with min-width handles overflow well.

## 4. UX QUALITY SCORE

- **Mobile: 2/10** — Too many tabs, too many columns, editable cells on mobile.
- **Tablet: 5/10** — Functional but tab navigation is strained.
- **Desktop: 7/10** — Complete. Minor issue: tab count creates navigation fatigue.

## 5. CRITICAL ISSUES

1. 7 tabs is the maximum for PrimeVue's horizontal tab bar — overflow behavior is poor on narrow screens.
2. Editable Adjustments tab accessible on mobile — same data-integrity concern as FiPlan.
3. The WCR summary (a single aggregate number per year) is buried in tab 4.
4. No visual indication of WCR quality (is this WCR level normal for the sector?).

## 6. DEVICE FIT CLASSIFICATION
**DESKTOP ONLY**

## 7. RECOMMENDED TRANSFORMATION
**B + D: Simplify and split.**

On mobile: show only the Summary tab (adjusted WCR per year as a bar chart). Hide the 6 detail tabs. On tablet+: keep current structure. The Adjustments tab should be `mobileBlocked` or `readonly` on mobile.

Consider collapsing the 7 tabs into 3: Summary, Components (sub-tabs), Adjustments.

## 8. V2 INTEGRATION OPPORTUNITY
**Medium relevance.** WCR outliers (excessively long receivables days, high inventory turns) could be surfaced as v2 risk items. Not a direct v2 integration target, but a good source for Driver Advisor insights.

---

=====================================
PAGE: CASH (Cash Flow Statement)
=====================================

## 1. PURPOSE
The user reviews the cash flow statement: annual summary and monthly detail (Year 1/2/3 separately) including a liquidity issues diagnostic. **ANALYSE layer.** This page contains the widest grid in the application.

## 2. CONTENT STRUCTURE

**Dense data zones:**
- **KMonthGrid (Monthly tabs): 12 months + Annual Total = 13 columns.** This is the widest data view in the entire application.
- Annual Summary DataTable: 5 year columns + label (standard width).
- Liquidity Issues: Message components for negative-balance months.

**Narrative zones:** Liquidity Issues tab (Month names + balance values as Messages).

**Interactive zones:** Tab switcher, KMonthGrid editable rows (distribution rule overrides). No `mobileBlocked`.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
**This is the most broken page on mobile in the application.** The KMonthGrid with 13 columns renders a minimum of approximately 13 × 80 px = 1,040 px + label column width in a 375 px viewport — a 2.8× overflow ratio. The user would need to scroll horizontally across a 13-column grid where each column is barely readable. Each cell in a monthly grid typically shows a currency value formatted to 2 decimal places — this is completely unreadable at 80 px column width on mobile.

The Annual Summary tab is better (5 year columns) but still overflows.
The Liquidity Issues tab is potentially mobile-readable (it's a list of Messages).

Despite being the most desktop-oriented financial view, this page has **no `mobileBlocked: true`**, meaning phones are allowed to load the full 13-column KMonthGrid without any protection.

**TABLET (768–1024 px)**
13 columns at 768 px still overflows heavily (13 × 80 px = 1,040 px minimum). Horizontal scrolling is needed across most of the grid width. This is technically usable but unpleasant.

**DESKTOP (≥ 1024 px)**
Good. The monthly cash flow view is extremely valuable for financial planning. Liquidity Issues diagnostic is well-designed.

## 4. UX QUALITY SCORE

- **Mobile: 1/10** — CRITICAL FAILURE. 13-column grid, no protection, no alternative view.
- **Tablet: 4/10** — Requires significant horizontal scrolling across 13 columns.
- **Desktop: 9/10** — Best cash flow view in the application. Monthly granularity is genuinely useful.

## 5. CRITICAL ISSUES

1. **CRITICAL: No `mobileBlocked: true`** on a 13-column data grid. This is the single most urgent routing fix in the application.
2. KMonthGrid has editable rows accessible on mobile.
3. No alternative representation (a waterfall chart, a balance evolution line chart) for mobile.
4. Liquidity Issues tab — the most mobile-relevant content — is not surfaced first.
5. Tab labels ("Year 1 Monthly", "Year 2 Monthly", "Year 3 Monthly") waste header space on mobile.

## 6. DEVICE FIT CLASSIFICATION
**DESKTOP ONLY** — Urgently needs `mobileBlocked: true` route flag.

## 7. RECOMMENDED TRANSFORMATION
**A + add `mobileBlocked: true` immediately.**

Short-term: add `mobileBlocked: true` to the cash route. The 13-column grid is fundamentally incompatible with touch navigation.

Medium-term: provide a mobile summary view: Closing Cash Balance per year (bar chart) + Liquidity Issues list. Monthly detail remains desktop-only behind a "View monthly breakdown" link.

## 8. V2 INTEGRATION OPPORTUNITY
**High relevance.** Cash flow position (months with negative closing balance) is a top-tier v2 risk signal. A v2 card at the top of the Cash page flagging "2 months of negative liquidity in Year 1" would be immediately actionable.

---

=====================================
PAGE: BUDGET (Budget Planning)
=====================================

## 1. PURPOSE
The user views the monthly budget breakdown (Year 1) and quarterly summary, with the ability to export a PDF budget. Bridges OPERATE (the plan) and ANALYSE (the budget view). Contains **editable KMonthGrid** — same class of issue as Cash.

## 2. CONTENT STRUCTURE

**Dense data zones:**
- KMonthGrid (Monthly Budget tab): 12 months + Annual Total (13 columns). Revenue, COGS, External Expenses, Staff, Taxes, Depreciation, Financial items.
- KYearGrid (Quarterly Summary): Q1, Q2, Q3, Q4 columns (4 columns — much more mobile-friendly).
- PDF Export tab: export button only.

**Narrative zones:** None.

**Interactive zones:** Tab switcher, KMonthGrid editable cells (distribution overrides), PDF Export button.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
Same 13-column KMonthGrid problem as Cash. Editable cells on mobile. The Quarterly Summary tab with only 4 columns is the only mobile-usable view. No `mobileBlocked: true`.

The PDF Export tab is actually well-suited to mobile intent — a user might want to download the budget PDF on their phone — but reaches it through a KMonthGrid that's inaccessible.

**TABLET (768–1024 px)**
Monthly tab: same overflow issues. Quarterly: fits well.

**DESKTOP (≥ 1024 px)**
Good monthly budget view. Quarterly is a helpful condensed companion.

## 4. UX QUALITY SCORE

- **Mobile: 1/10** — Same critical issue as Cash. 13-column editable grid, no protection.
- **Tablet: 5/10** — Quarterly tab is usable; Monthly requires heavy scrolling.
- **Desktop: 8/10** — Comprehensive. PDF export is a good practical feature.

## 5. CRITICAL ISSUES

1. **CRITICAL: No `mobileBlocked: true`** — same issue as Cash page.
2. Editable KMonthGrid on mobile — data-entry risk.
3. PDF Export tab is accessible only through the Monthly tab — poor navigation hierarchy.
4. No summary row / annual total visible without scrolling to the right.

## 6. DEVICE FIT CLASSIFICATION
**DESKTOP ONLY** — needs `mobileBlocked: true`.

## 7. RECOMMENDED TRANSFORMATION
**A + `mobileBlocked: true` for Monthly tab content; expose Quarterly tab on tablet.**

Consider making the PDF Export available as a floating action button (FAB) at all breakpoints — this is genuinely mobile-useful. Split into: Monthly (desktop only) + Quarterly (tablet+) + PDF Export (all devices).

## 8. V2 INTEGRATION OPPORTUNITY
**Low relevance.** Budget is an execution-level view. A v2 card noting "Budget exceeds FiPlan equity drawdown" could be a useful cross-reference, but not a priority.

---

=====================================
PAGE: GRAPHS (Annual Graph Dashboard)
=====================================

## 1. PURPOSE
Visual summary of all major financial KPIs via charts. No data entry. **Pure ANALYSE.** This is the best-designed mobile candidate among the financial statement pages.

## 2. CONTENT STRUCTURE

**Dense data zones:** None — chart-only.

**Narrative zones:** An informational Message block at the bottom.

**Interactive zones:** Unit selector (€ / k€ / M€) in the global header. No per-chart interactions.

**Chart block (7 charts in 2-column grid):**
- Sales Analysis (stacked-bar)
- Cost Structure (stacked-bar)
- Revenue, Profit & Cash Flow (combo)
- Financial Requirements vs Cash Flow (combo)
- Balance Sheet Structure (stacked-bar)
- Headcount by Function (stacked-bar)
- P&L Cascade (combo)

**Responsive grid: `grid grid-cols-1 md:grid-cols-2 gap-6`**

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
**Best mobile experience among all financial pages.** Single-column layout (`grid-cols-1`) means charts stack vertically at full viewport width. Each chart is 320 px tall. Charts use Chart.js which scales responsively to container width. Total scroll height: ~7 × (320 px chart + padding) ≈ 2,500 px — long but vertical-only.

Minor issues: chart tooltips may be difficult to access on touch. Legend items may be small.

**TABLET (768–1024 px)**
Two-column grid (`md:grid-cols-2`) — excellent tablet layout. 7 charts in ~4 rows, visually balanced.

**DESKTOP (≥ 1024 px)**
Good 2-column layout. Could potentially use 3 columns at 1440 px+ for density.

## 4. UX QUALITY SCORE

- **Mobile: 7/10** — Genuinely usable. The grid adaptation is correct. Minor: chart interactivity on touch.
- **Tablet: 9/10** — Excellent. 2-column grid makes full use of screen width.
- **Desktop: 8/10** — Well-structured. No wasted space.

## 5. CRITICAL ISSUES

1. Tooltips on touch may not register correctly (Chart.js limitation).
2. 7th chart creates an orphaned single-column row at tablet (odd grid count) — minor visual asymmetry.
3. No drill-down from chart to the corresponding statement page.
4. Info message at bottom is generic; no contextual insight.

## 6. DEVICE FIT CLASSIFICATION
**MOBILE COMPATIBLE** — the best-performing financial page on mobile.

## 7. RECOMMENDED TRANSFORMATION
**A: Keep as-is.** Consider adding:
- A chart title → link to corresponding statement page for desktop users.
- Swipe gesture support for chart tabs on mobile (future enhancement).

## 8. V2 INTEGRATION OPPORTUNITY
**High relevance.** This page is the natural home for a v2 insight header — "Based on these charts, here are 3 strategic observations" — before the chart grid. A condensed ScenarioAnalysisCard summary (viability score + 2 key signals) would transform this page from passive visualization to active intelligence.

---

=====================================
PAGE: GRAPHS/MONTHLY (Monthly Graph View)
=====================================

## 1. PURPOSE
Monthly-granularity chart view for cash, operating cash flows, invoicing/EBITDA, and headcount. Companion to the monthly cash/budget tabs. **ANALYSE layer.**

## 2. CONTENT STRUCTURE

**Dense data zones:** None — chart-only.

**Narrative zones:** Info message at bottom.

**Chart block (4 charts):**
- Cash, Equity & Debt (line, monthly)
- Operating Cash Flows (bar, monthly)
- Invoicing & EBITDA (combo, monthly)
- Headcount Evolution (area, monthly)

**Responsive grid: `grid grid-cols-2 gap-6`**

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
**Significant regression vs. the annual Graphs page.** This grid uses `grid-cols-2` with NO mobile breakpoint — meaning 2 columns are rendered at all screen sizes. On a 375 px phone: each chart column is approximately (375 – 24 px gap – 2 × padding) / 2 ≈ 165 px wide. Chart.js charts at 165 px width render with tiny axis labels (possibly 1–2 px), compressed legends, and illegible data. This page is essentially non-functional on mobile.

**TABLET (768–1024 px)**
Works well at this size. 2 columns = 350–450 px per chart — readable.

**DESKTOP (≥ 1024 px)**
Good. 4 charts in a 2 × 2 grid.

## 4. UX QUALITY SCORE

- **Mobile: 1/10** — `grid-cols-2` without `grid-cols-1` mobile override is a direct implementation bug. Charts are not readable.
- **Tablet: 8/10** — Good layout.
- **Desktop: 8/10** — Good layout.

## 5. CRITICAL ISSUES

1. **BUG: `grid-cols-2` without mobile override.** Should be `grid-cols-1 md:grid-cols-2`. This is a one-line CSS fix.
2. No `<h1>` or page title (just `<h1 class="text-2xl">`).
3. Monthly chart tick labels are dense — at 12 data points per year, chart axes need responsive label rotation.
4. No navigation link to the Monthly Budget/Cash pages for data context.

## 6. DEVICE FIT CLASSIFICATION
**TABLET FRIENDLY** (after CSS fix) — currently broken on mobile.

## 7. RECOMMENDED TRANSFORMATION
**A + trivial CSS fix.** Change `grid grid-cols-2 gap-6` to `grid grid-cols-1 md:grid-cols-2 gap-6`. This single change upgrades the mobile experience from 1/10 to 7/10.

## 8. V2 INTEGRATION OPPORTUNITY
**Medium relevance.** Monthly cash flow patterns (cash burn rate, receivables spikes) are good v2 risk signal sources. A callout block "3 months with negative operating cash flow in Year 1" above the charts would add immediate analytical value.

---

=====================================
PAGE: REPORT (Full Financial Report)
=====================================

## 1. PURPOSE
A comprehensive, consolidated financial report containing all major statements in sequence: P&L, Functional P&L, Financing Plan, Balance Sheet, Cash Flow, Ratios, etc. Designed primarily for **DOCX export** (via `useDocxGenerator`). **ANALYSE layer.**

## 2. CONTENT STRUCTURE

**Dense data zones:**
- Multiple PrimeVue DataTables stacked vertically:
  - P&L Statement (French format): ~20 rows × 5 years
  - FiPlan Requirements + Resources: ~10 rows × 5 years
  - Cash Flow Waterfall: ~15 rows × 5 years
  - Functional P&L: ~18 rows × 5 years
  - Balance Sheet (multiple views): 30+ rows × 6 columns
  - Ratios: ~37 rows across 4 sections × 5 years
- Total: approximately 130+ rows of financial data.

**Narrative zones:** None (report is data-only).

**Interactive zones:** DOCX Export button (Pro-gated via tier gate), Fieldset toggles for each section.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
**This page is the longest, densest page in the application.** Loading all statements simultaneously is a performance risk on mobile networks. The page scrolls vertically through ~130 rows of DataTable content, each in separate overflow-x containers. The export button is the only call-to-action — downloading a DOCX on mobile is an unusual workflow but technically valid.

In practice, this page is not usable on mobile for reading financial data. It exists for print/export purposes.

**TABLET (768–1024 px)**
Marginally better. The consolidated view is useful as a print preview before export.

**DESKTOP (≥ 1024 px)**
Good for its intended purpose (export). Fieldset toggles allow collapsing sections. Loading all statements is a performance concern even on desktop.

## 4. UX QUALITY SCORE

- **Mobile: 1/10** — 130+ rows of dense financial tables. Not a reading medium.
- **Tablet: 4/10** — Export workflow is valid; content is unreadable.
- **Desktop: 7/10** — Export-focused, acceptable. Performance risks with large datasets.

## 5. CRITICAL ISSUES

1. **CRITICAL: No `mobileBlocked: true`** on what is essentially a full financial report with 130+ data rows.
2. No lazy loading or pagination — all tables render on mount.
3. No mobile-optimized view (a summary card per section would suffice).
4. Docx export on mobile is technically possible but unusual — no mobile explanation.
5. Performance risk: simultaneous rendering of all statements.

## 6. DEVICE FIT CLASSIFICATION
**DESKTOP ONLY** — should be `mobileBlocked: true`.

## 7. RECOMMENDED TRANSFORMATION
**A + `mobileBlocked: true`.**

On tablet: add a print-preview mode with simplified layout. On mobile: redirect to a "Report Export" micro-page with just the download button and a summary of what will be exported.

## 8. V2 INTEGRATION OPPORTUNITY
**High relevance.** A v2 executive summary section at the top of the report (before the tables) — rendered as formatted prose from the NarrationCard — would significantly upgrade the report quality for investor distribution.

---

=====================================
PAGE: AUDIT (Audit Trail)
=====================================

## 1. PURPOSE
Users (owners/admins) review the log of all data changes made to the plan: who changed what, when, and what the before/after values were. **ANALYSE layer.** No mobileBlocked.

## 2. CONTENT STRUCTURE

**Dense data zones:**
- Paginated PrimeVue DataTable: 50 rows/page.
- Columns: User (avatar + name), Entity type (icon + badge), Action (Tag with severity), Changes (JSON diff display), Timestamp.

**Narrative zones:** The Changes column displays before/after values — semi-narrative.

**Interactive zones:** Filter controls (Entity type Select, Action type Select, Global search InputText, Clear button), table pagination.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
The audit trail table has 5 columns. The Changes column contains JSON diff content which can be multi-line and wide. The User column includes an avatar + name. At 375 px, PrimeVue DataTable's scrollable mode will truncate columns or require horizontal scroll. The filter bar (3 inputs + button) will stack awkwardly.

That said, the audit trail is a legitimate mobile use case: an owner checking "who changed what" while away from desk. The pagination (50 rows) is acceptable. The primary need is: which user, which action, when. That's 3 of 5 columns — potentially feasible with a mobile-optimized row layout.

**TABLET (768–1024 px)**
5 columns fit reasonably at 768+ px. Filter bar is acceptable.

**DESKTOP (≥ 1024 px)**
Well-designed. The JSON diff in the Changes column is the right level of detail for desktop review.

## 4. UX QUALITY SCORE

- **Mobile: 4/10** — Legitimate mobile use case but wrong component (DataTable vs. feed/list). Changes column especially problematic.
- **Tablet: 7/10** — Good usability.
- **Desktop: 8/10** — Solid audit trail interface.

## 5. CRITICAL ISSUES

1. Changes column (JSON diff) is unreadable on mobile — variable width, multi-line content.
2. Filter bar has 3 controls + button — will overflow on 375 px without flex-wrap.
3. No mobile-optimized row layout (timeline/feed style).
4. Pagination controls (PrimeVue Paginator) are compact but workable on mobile.

## 6. DEVICE FIT CLASSIFICATION
**TABLET FRIENDLY** — with a mobile list layout, could reach MOBILE COMPATIBLE.

## 7. RECOMMENDED TRANSFORMATION
**B: Simplify for mobile.**

On mobile: replace DataTable with a feed/timeline layout. Each entry: entity icon, action badge (color), user name, time (relative: "2 hours ago"), and a "View changes" expand chevron. The Changes column becomes an expandable detail panel. This transforms an unreadable 5-column table into a functional activity feed.

## 8. V2 INTEGRATION OPPORTUNITY
**Low relevance.** Audit trail is operational, not analytical. Not a v2 target.

---

=====================================
PAGE: NARRATE (AI Narration — v2 + NarrationCard)
=====================================

## 1. PURPOSE
AI-powered plain-language narrative of the financial plan, combining ScenarioAnalysis v2 (viability score, highlights, risks, drivers, trends) with a free-text NarrationCard commentary. Standard tier (available to all paid users). **ANALYSE layer.** This is the flagship AI page.

## 2. CONTENT STRUCTURE

**Dense data zones:** None.

**Narrative zones:**
- ScenarioAnalysisCard (v2 primary): viability score gauge, headline, key strengths, top risks (sorted by urgency), key drivers, trend signals, AI commentary block.
- NarrationCard (supplementary): multi-paragraph plain text from the narrate endpoint.

**Interactive zones:** Refresh button (top right), tier upgrade gate for Freemium users.

**Layout:** `max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6` — centered, single column, bounded width.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
**The best mobile page in the application.** The layout is a single-column, max-width-constrained text flow. ScenarioAnalysisCard uses card components, tag badges, and text — no tables, no charts, no overflow. NarrationCard renders prose. The `px-4` horizontal padding gives comfortable reading margins.

The refresh button (icon-only, text) is appropriately sized. Loading state is a centered spinner with an animated label — clean on mobile.

**TABLET (768–1024 px)**
`px-4 md:px-6` widens padding. The max-w-3xl constraint means the content is well-centered. Excellent tablet reading experience.

**DESKTOP (≥ 1024 px)**
Good. The max-w-3xl constraint prevents excessive line length on wide screens. Some whitespace on either side on very wide displays, which is acceptable for a reading-focused page.

## 4. UX QUALITY SCORE

- **Mobile: 9/10** — Near-perfect. Only improvement: consider touch-friendly expand/collapse for the risk list.
- **Tablet: 9/10** — Excellent reading experience.
- **Desktop: 8/10** — Good. Centered layout feels slightly narrow on 1440 px+ displays.

## 5. CRITICAL ISSUES

1. The v2 badge ("v2") is 9 px font — extremely small on mobile. Consider raising to 11 px.
2. ScenarioAnalysisCard renders a generated_at timestamp — may show outdated analysis without user noticing.
3. For Freemium users, the full-page lock state (centered lock icon) is clean but wastes the opportunity to show a teaser.
4. Refresh is the only action — no "share" or "export" capability.

## 6. DEVICE FIT CLASSIFICATION
**MOBILE COMPATIBLE** — reference implementation for all other AI pages.

## 7. RECOMMENDED TRANSFORMATION
**A: Keep as-is.** This page is the design benchmark for mobile-first content in the application.

Small improvements: add an inline "Last updated X minutes ago" timestamp. Consider a share/copy button for the narrative text.

## 8. V2 INTEGRATION OPPORTUNITY
**This IS the v2 integration.** No further changes needed on this page specifically.

---

=====================================
PAGES: ASSUMPTION-REVIEW / BENCHMARK-COMMENTARY / PORTFOLIO-MIX / DRIVER-ADVISOR / SCENARIO-SUGGESTION / SENSITIVITY-NARRATIVE
(6 pages sharing AINarrationView — NarrationCard only, no v2)
=====================================

## 1. PURPOSE

These 6 pages all use the same `AINarrationView.vue` shell with `feature` route param variation. All are **Pro tier**. All render only the `NarrationCard` (prose output — no ScenarioAnalysisCard since `isV2Feature` is false for non-narrate keys).

| Feature | Key | Description |
|---------|-----|-------------|
| Assumption Review | assumption-review | Red-flag detection on plan inputs |
| Benchmark Commentary | benchmark-commentary | KPIs vs. industry benchmarks |
| Portfolio Mix | portfolio-mix | Multi-driver product portfolio commentary |
| Driver Advisor | driver-advisor | Recommends best driver structure |
| Scenario Suggestion | scenario-suggestion | Bear/bull/stress parameter diffs |
| Sensitivity Narrative | sensitivity-narrative | Key sensitivity levers for EBITDA |

## 2. CONTENT STRUCTURE (shared)
- Feature header: icon, title, tier badge (PRO), description text.
- NarrationCard: multi-section prose with sections, key takeaways, and optional tables within the AI response.
- Refresh button, loading spinner, access-blocked state.
- All rendered within `max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6`.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

Identical to Narrate (see above). Single-column, max-width-constrained layout. No tables, no overflow. All 6 pages are mobile-compatible by design.

The key differentiation: NarrationCard may contain structured content (key takeaways, tables within AI response text). If the AI generates HTML tables in the narration output, those will not be responsive. This is an AI output risk, not a template risk.

**MOBILE: 8/10** — Excellent by default.  
**TABLET: 9/10** — Natural reading width.  
**DESKTOP: 7/10** — Narrow for users expecting richer visual content.

## 4. CRITICAL ISSUES

1. **No v2 ScenarioAnalysisCard integration** — all 6 pages show plain prose only. The insight depth is lower than the Narrate page's v2 experience.
2. Benchmark Commentary in particular deserves a visual element (radar chart, bar comparison) — prose-only benchmarking is less effective.
3. Scenario Suggestion's parameter diffs (bear/bull values) are described in prose but would benefit from a structured diff view (before/after table or delta badges).
4. Pro gate shows an upgrade screen but doesn't preview content — "what would I see if I upgraded?" is not answered.

## 5. DEVICE FIT CLASSIFICATION
**MOBILE COMPATIBLE** — all 6 pages.

## 6. RECOMMENDED TRANSFORMATION

**Per-feature improvements, not structural:**
- **Assumption Review**: Add severity badges (critical/warning) inline with each red-flag item in the NarrationCard output.
- **Benchmark Commentary**: Add a radar chart or bar comparison widget showing current KPIs vs. benchmark bands. Currently prose-only.
- **Scenario Suggestion**: Add a structured "diff card" component showing bear/base/bull parameters in a side-by-side comparison, extracted from the AI response.
- **Sensitivity Narrative**: Add a horizontal bar ranking chart of top sensitivity levers — directly addressable with Chart.js.

## 7. V2 INTEGRATION OPPORTUNITY

**Very high relevance for all 6 pages.** The v2 `isV2Feature` flag currently only activates for `feature === 'narrate'`. Extending v2 to 2–3 additional features would be high-value:
- **Assumption Review + v2**: Risks and drivers from v2 analysis validate or contradict the assumption review.
- **Benchmark Commentary + v2**: Driver KPIs in v2 are the bridge to benchmark comparison.
- **Scenario Suggestion + v2**: v2 viability score could headline the scenario suggestion (e.g., "Base case scores 6.2/10 — here are 3 changes that could reach 7.5").

---

=====================================
PAGE: BEP (Break-Even Analysis) — Pro tier
=====================================

## 1. PURPOSE
The user builds a detailed break-even model (fixed costs, variable costs, EBE), creates snapshots, builds optimization plans, and reviews a multi-year BEP report. **Pro tier, ANALYSE layer.** No `mobileBlocked`.

## 2. CONTENT STRUCTURE

**Dense data zones:**
- DataTable (Detailed Analysis tab): fixed costs, variable costs, EBE breakdown.
- DataTable (Optimisation Plans tab): list of plans with status and parameters.
- DataTable (Multi-Year Report tab): annual BEP summary across 5 years.

**Narrative zones:** Analysis interpretation in the Overview tab. Chart tooltips.

**Interactive zones:** 4 tabs, multiple Dialogs (snapshot create, plan create, import from plan), DataTable actions (edit/delete), Charts.

**Chart block (3 charts):**
- Break-even chart (line): Revenue vs. Total Costs vs. EBE, with BEP reference line.
- Contribution margin evolution (line/bar).
- Variable costs analysis (stacked-bar).

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
4 tabs + DataTables + Dialogs on a 375 px phone. The break-even chart is the most mobile-friendly element — it's conceptually simple (2 lines crossing). The DataTables have fewer columns than the financial statements (variable-width). PrimeVue Dialogs on mobile require responsive width — may or may not be set.

Optimization Plans list could work as a card list on mobile. Multi-Year Report table (5 year columns) overflows as usual.

**TABLET (768–1024 px)**
4 tabs are manageable. DataTables scroll horizontally. Charts at full width are excellent on tablet.

**DESKTOP (≥ 1024 px)**
Excellent. The break-even chart with interactive reference line is a standout analytical feature.

## 4. UX QUALITY SCORE

- **Mobile: 3/10** — Too many interaction patterns (dialogs, actions, 4 tabs) with no mobile adaptation.
- **Tablet: 7/10** — Good experience. Charts shine on tablet.
- **Desktop: 9/10** — Pro-tier analysis feels well-designed.

## 5. CRITICAL ISSUES

1. No `mobileBlocked` despite being a complex, multi-dialog analysis tool.
2. Dialog forms (snapshot creation, plan creation) are not adapted for mobile.
3. DataTable action buttons (edit/delete) may be too small on mobile.
4. 4 tabs without mobile-specific collapse behavior.

## 6. DEVICE FIT CLASSIFICATION
**TABLET FRIENDLY** — chart-based overview is tablet-compatible; full analysis is desktop.

## 7. RECOMMENDED TRANSFORMATION
**B: Simplify for mobile — show Overview chart only; gate Detailed Analysis to tablet+.**

On mobile: show the BEP chart (Y/N crossing point) and the current year's BEP summary figure. Hide Detailed Analysis, Optimisation Plans, Multi-Year Report. On tablet+: full interface. This is a pragmatic split that preserves the key insight on mobile.

## 8. V2 INTEGRATION OPPORTUNITY
**High relevance.** Break-even analysis directly informs v2 viability scoring. A note in the v2 ScenarioAnalysisCard "Business reaches BEP in Month X of Year 2" could be a key driver item. The reverse also works: BEP page could show a v2 risk card "High variable cost ratio (72%) increases BEP sensitivity — see Sensitivity Narrative."

---

=====================================
PAGE: CAP-TABLE (Capitalization Table) — Pro tier
=====================================

## 1. PURPOSE
The user manages the shareholder structure and funding rounds of the company, linked to FiPlan capital increase rows. **Pro tier, ANALYSE layer (but primarily OPERATE — data entry for shareholders and rounds).** No `mobileBlocked`.

## 2. CONTENT STRUCTURE

**Dense data zones:**
- Shareholders DataTable: name, type (badge), shares, ownership %, invested amount, actions (5 columns).
- Rounds DataTable: label, amount, year, fiscal year index, cap table link status, actions (6 columns).

**Narrative zones:** Country Profile card (when available).

**Interactive zones:** Create Shareholder button, Rounds management (sync/unsync to FiPlan), Shareholder edit/delete dialog, Donut chart (ownership visualization).

**Chart block:** 1 ownership donut chart.

## 3. RESPONSIVE BEHAVIOR ANALYSIS

**MOBILE (≤ 768 px)**
The Shareholders table with 5–6 columns is tight on 375 px but more manageable than a 12-column financial grid. Ownership % and shares are the key columns — the others are secondary. The donut chart is visually clean on mobile. Dialogs for shareholder creation have text inputs — manageable on mobile but not optimized.

The Rounds table's sync/unsync buttons per row are small touch targets.

**TABLET (768–1024 px)**
Good usability. Both tables fit. Donut chart sits cleanly alongside the summary cards.

**DESKTOP (≥ 1024 px)**
Well-structured. The FiPlan integration (linked round status) is a key Pro feature that requires desktop to fully manage.

## 4. UX QUALITY SCORE

- **Mobile: 4/10** — Smaller tables than financial statements, but dialogs and action buttons are not mobile-optimized.
- **Tablet: 8/10** — Very usable. Best non-AI ANALYSE page on tablet.
- **Desktop: 8/10** — Strong feature set. FiPlan integration is well-conceived.

## 5. CRITICAL ISSUES

1. No `mobileBlocked` despite containing CRUD dialogs (create/edit shareholder) — data-entry risk.
2. Sync/unsync action buttons in Rounds table are small and lack confirmation flows on mobile.
3. Country Profile card adds length but is secondary on mobile.
4. Donut chart labels (shareholder names) may overflow on small charts.

## 6. DEVICE FIT CLASSIFICATION
**TABLET FRIENDLY** — viewing cap table on tablet is legitimate. CRUD operations should be desktop-only.

## 7. RECOMMENDED TRANSFORMATION
**B: Read-only on mobile; full CRUD on tablet+.**

On mobile: show ownership donut chart + shareholder names with % ownership. Hide the DataTable action columns (edit/delete). Hide Rounds table. This makes the cap table a "quick overview" on mobile while keeping full management on desktop/tablet.

## 8. V2 INTEGRATION OPPORTUNITY
**Medium relevance.** Cap table structure (total raised, equity dilution) informs the FiPlan and, by extension, the v2 viability score. A Cap-Table summary card ("€2.1M raised across 3 rounds, current dilution: 42%") would be a useful header.

---

---

# GLOBAL SYNTHESIS

---

## 1. PAGE CATEGORIZATION

### NOT MOBILE (must be blocked or completely redesigned)
These pages have no `mobileBlocked: true` but are fundamentally incompatible with mobile use:

| Page | Root Cause | Urgency |
|------|-----------|---------|
| **cash** | 13-column KMonthGrid, editable | CRITICAL |
| **budget** | 13-column KMonthGrid, editable | CRITICAL |
| **report** | 130+ rows of stacked DataTables | HIGH |
| **fiplan** | Editable KYearGrid (data-entry risk) | HIGH |
| **wcr** | 7 tabs + editable Adjustments | MEDIUM |

### WEAK MOBILE (needs redesign before it's usable)
Pages that render on mobile but provide no adapted experience:

| Page | Main Issue |
|------|-----------|
| **pnl** | 7-column DataTable, no summary card |
| **pnl-cash** | 250px frozen column = 67% of mobile viewport |
| **bsheet** | 6-column DataTable (widest), 5 undifferentiated tabs |
| **ratios** | DataTable wrong component for ratio values |
| **graphs/monthly** | `grid-cols-2` without mobile breakpoint (one-line bug) |
| **bep** | Complex multi-dialog tool, no mobile simplification |
| **cap-table** | CRUD dialogs, action buttons not mobile-optimized |
| **audit** | Changes column (JSON diff) unreadable on mobile |

### GOOD MOBILE (keep as-is or minor improvements only)
| Page | Why it works |
|------|-------------|
| **narrate** | Card-based, `max-w-3xl`, no tables, ShowOn for details |
| **assumption-review** | AINarrationView shell, prose-only |
| **benchmark-commentary** | AINarrationView shell, prose-only |
| **portfolio-mix** | AINarrationView shell, prose-only |
| **driver-advisor** | AINarrationView shell, prose-only |
| **scenario-suggestion** | AINarrationView shell, prose-only |
| **sensitivity-narrative** | AINarrationView shell, prose-only |
| **graphs** | `grid-cols-1 md:grid-cols-2`, chart-only |

---

## 2. SYSTEMIC PATTERNS

### Pattern 1: DataTable used universally for financial data — including read-only analytical output
PrimeVue DataTable is the right component for editable, sortable, paginated data. It is the wrong component for read-only multi-year financial summaries on mobile. The application applies DataTable to every financial output regardless of device or use case. This creates systematic horizontal overflow across 10+ pages.

**Affected pages:** pnl, pnl-cash, bsheet, ratios, wcr, cash (annual tab), budget (quarterly tab), report, bep, cap-table.

### Pattern 2: KMonthGrid/KYearGrid exposed on mobile without protection
Three pages have editable financial grids accessible on mobile: fiplan (KYearGrid), cash (KMonthGrid), budget (KMonthGrid). This contradicts the application's stated mobile read-only contract and creates data-entry risk.

**Affected pages:** fiplan, cash, budget.

### Pattern 3: The UNDERSTAND layer has no mobile access policy
The router's mobile gate (`mobileBlocked: true`) is only applied to OPERATE-layer routes. The UNDERSTAND layer — which contains financial statements with just as many columns — has no routing protection. The result is that the mobile read-only intent is architecturally inconsistent: some pages block phones (data entry), while equally complex pages do not (financial report output).

**Root fix:** Add `mobileBlocked: true` to cash, budget, report, fiplan, wcr, and review all UNDERSTAND-layer routes against a column-count threshold (see Design Rules below).

### Pattern 4: ShowOn is used only on AI/intelligence pages
`ShowOn.vue` is a sophisticated responsive conditional render component. It is used on `ScenarioIntelligenceSection.vue` and `AINarrationView.vue`. It is not used on any financial statement page. The component infrastructure for responsive adaptation exists — it just isn't being applied to the pages that need it most.

### Pattern 5: No summary layer before dense data
Every financial statement page drops the user directly into a DataTable with no summary, no headline KPI, and no contextual framing. The v2 analysis (`ScenarioAnalysisCard`) provides exactly this layer, but only on the Narrate page. The pattern of "summary card → expandable detail table" exists in the codebase but is not consistently applied.

---

## 3. DESIGN RULES

The following system-level rules should govern all future development and all refactoring of existing pages:

**RULE 1: No financial DataTable with more than 6 columns accessible on mobile without `mobileBlocked: true`.**
A 375 px viewport with a 220 px frozen label column leaves 155 px for data — insufficient for even 2 standard year columns (2 × 110 px = 220 px). Any table exceeding 6 total columns must block mobile access or offer a card/tile alternative.

**RULE 2: KMonthGrid (12 columns) is DESKTOP ONLY. Routes containing KMonthGrid must carry `mobileBlocked: true`.**
No exception. A 13-column grid on a touch device is unusable regardless of how good the overflow handling is.

**RULE 3: Every editable financial grid (KYearGrid, KMonthGrid with input cells) must carry `mobileBlocked: true` or render `readonly` when `isMobile === true`.**
The application's mobile read-only contract must be enforced at the component level, not just the router level.

**RULE 4: Every ANALYSE page with > 4 data columns must provide a mobile summary view before the DataTable.**
The summary view consists of: 3–5 headline KPI cards (current year), a trend indicator (Y1 → Y5 direction), and a link to the full table. Use `ShowOn` or `v-if="!isMobile"` to gate the full DataTable.

**RULE 5: Chart-only pages use `grid-cols-1 md:grid-cols-2` as the minimum grid definition.**
`grid-cols-2` without a mobile breakpoint is a rendering bug, not a design choice. All `grid-cols-2` in charts pages must become `grid-cols-1 md:grid-cols-2`.

**RULE 6: AI narration pages (AINarrationView) are the mobile design reference.**
`max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6` + `ShowOn` for detail sections is the correct mobile layout pattern. All future ANALYSE pages that introduce prose, cards, or insight blocks must follow this layout.

**RULE 7: Tabs must not exceed 5 items in mobile view.**
PrimeVue TabList overflows poorly beyond 5 tabs on mobile. Pages with 6+ tabs (WCR with 7 tabs) must collapse to a Select dropdown or an accordion on mobile (`ShowOn only="mobile"` → Select component with tab options).

**RULE 8: Every ANALYSE page must have a minimum of one headline KPI visible without horizontal scrolling on mobile.**
Even if the full DataTable is blocked on mobile, the page should display at minimum: the page's primary metric for the current projected year (e.g., "EBITDA Year 1: €450K"), rendered in a card above the fold.

**RULE 9: CRUD dialogs and action buttons in DataTables are DESKTOP ONLY.**
Pages with create/edit/delete actions (cap-table, bep, audit — filter edits) must render these actions conditionally via `v-if="!isMobile"` or set the route to `mobileBlocked: true`.

**RULE 10: v2 ScenarioAnalysisCard should appear as a summary header on all major financial statement pages when data is available.**
The viability score + headline + top 2 signals constitutes a 120 px header card that transforms any dense financial page into an intelligence-first experience. This is the v2 integration pattern — not replacing the table, but framing it.

---

## 4. PRIORITY MATRIX

### HIGH PRIORITY (fix immediately — blocking mobile quality promise)

| Priority | Page | Issue | Fix |
|----------|------|-------|-----|
| P0 | **cash** | 13-col KMonthGrid, no mobileBlocked, editable | Add `mobileBlocked: true` to route |
| P0 | **budget** | 13-col KMonthGrid, no mobileBlocked, editable | Add `mobileBlocked: true` to route |
| P0 | **fiplan** | Editable KYearGrid, no mobileBlocked | Add `mobileBlocked: true` or `readonly` on mobile |
| P0 | **report** | 130+ rows, no mobileBlocked | Add `mobileBlocked: true` to route |
| P1 | **graphs/monthly** | `grid-cols-2` without mobile breakpoint | One-line CSS fix: add `grid-cols-1 md:` prefix |
| P1 | **wcr** | Editable Adjustments tab, 7 tabs | Add `readonly` on mobile; collapse tabs to Select |

### MEDIUM PRIORITY (significantly impairs mobile experience)

| Priority | Page | Issue | Fix |
|----------|------|-------|-----|
| P2 | **pnl** | No mobile summary layer | Add KPI summary card + ShowOn gate on DataTable |
| P2 | **bsheet** | 6-column table (widest), 5 tabs | Add mobile summary card; surface Balance Check status |
| P2 | **ratios** | Wrong component (DataTable vs. tiles) | Replace with `grid-cols-2` KPI tiles on mobile |
| P2 | **cap-table** | CRUD dialogs accessible on mobile | Hide actions on mobile; read-only cap table view |
| P3 | **audit** | Changes column unreadable on mobile | Timeline/feed layout on mobile |
| P3 | **bep** | Multi-dialog tool, no mobile simplification | Show chart-only on mobile; gate Detailed Analysis |

### LOW PRIORITY (good or acceptable; minor improvements only)

| Priority | Page | Issue | Fix |
|----------|------|-------|-----|
| P4 | **pnl-cash** | 250px frozen column dominates mobile | Add mobile summary card (low effort) |
| P4 | **graphs** | Minor: orphaned 7th chart on tablet | Cosmetic only |
| P4 | **narrate** | v2 badge font too small (9px) | Raise to 11px |
| P4 | **assumption-review** | Prose-only (no v2) | Extend v2 isV2Feature to this key |
| P4 | **benchmark-commentary** | Prose-only (no visual benchmark) | Add radar chart for KPI vs. benchmark |
| P4 | **scenario-suggestion** | Prose-only (no structured diff) | Add bear/base/bull diff card component |
| P5 | All AI pages | No "share" / "copy" action on narration | Add clipboard copy button to NarrationCard |

---

*End of audit. 21 pages evaluated. 10 design rules defined. Immediate routing fixes (P0) are the highest-ROI changes — 4 route meta additions prevent mobile data-entry access to functionally broken pages with no frontend code changes.*
