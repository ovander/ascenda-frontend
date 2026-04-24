<template>
  <section id="features" class="bg-slate-50 py-28">
    <div class="max-w-7xl mx-auto px-6">

      <div class="text-center mb-16 reveal">
        <div class="inline-flex items-center gap-2 badge-pill text-xs font-medium px-4 py-1.5 rounded-full mb-4">
          Everything you need
        </div>
        <h2 class="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
          One platform, every dimension<br />of your financial model
        </h2>
        <p class="text-slate-600 text-lg max-w-2xl mx-auto">
          From first forecast to investor-ready financials — Ascenda covers the full lifecycle of your business plan.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-6">

        <!-- 1: 5-Year Forecasts -->
        <div class="bg-white rounded-2xl p-7 border border-slate-200 hover:border-indigo-300 transition-colors card-glow reveal group">
          <div class="icon-ring w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
            <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6.75v6.75" />
            </svg>
          </div>
          <h3 class="font-semibold text-slate-900 text-lg mb-2">5-Year Financial Forecasts</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            Build full P&L, balance sheet, and cash flow projections over 5 years. Model revenue from products, staff costs, capex, and operating expenses in one coherent plan.
          </p>
        </div>

        <!-- 2: Scenario Comparison -->
        <div class="bg-white rounded-2xl p-7 border border-slate-200 hover:border-indigo-300 transition-colors card-glow reveal group">
          <div class="icon-ring w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
            <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
          </div>
          <h3 class="font-semibold text-slate-900 text-lg mb-2">Scenario Comparison</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            Run multiple scenarios side-by-side — base, optimistic, stress — and compare KPIs, margins, and cash burn across all of them without losing any data.
          </p>
        </div>

        <!-- 3: Break-Even -->
        <div class="bg-white rounded-2xl p-7 border border-slate-200 hover:border-indigo-300 transition-colors card-glow reveal group">
          <div class="icon-ring w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
            <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          </div>
          <h3 class="font-semibold text-slate-900 text-lg mb-2">
            Break-Even Analysis
            <span class="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full ml-1">Pro</span>
          </h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            Compute your BEP revenue and unit volume instantly. Run margin sensitivity tables, map your PCG cost structure, and create cost-optimisation plans to model the fastest path to profitability — with a multi-year BEP report aligned to your 5-year forecast.
          </p>
        </div>

        <!-- 4: Cap Table -->
        <div class="bg-white rounded-2xl p-7 border border-slate-200 hover:border-indigo-300 transition-colors card-glow reveal group">
          <div class="icon-ring w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
            <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h3 class="font-semibold text-slate-900 text-lg mb-2">
            Cap Table Management
            <span class="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full ml-1">Pro</span>
          </h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            Track founders, investors, and ESOP pools in a live cap table with funding rounds, dilution waterfalls, and FastValo valuation scenarios. Planned capital increases in your Financial Plan automatically create a linked cap table round — keeping your financing plan and cap table in sync.
          </p>
        </div>

        <!-- 5: Snapshot -->
        <div class="bg-white rounded-2xl p-7 border border-slate-200 hover:border-indigo-300 transition-colors card-glow reveal group">
          <div class="icon-ring w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
            <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h3 class="font-semibold text-slate-900 text-lg mb-2">Snapshot &amp; Audit Trail</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            Freeze any version of your plan as a snapshot. Compare versions over time, share with your accountant or board, and always know what changed and when.
          </p>
        </div>

        <!-- 6: Country-Aware Tax -->
        <div class="bg-white rounded-2xl p-7 border border-slate-200 hover:border-indigo-300 transition-colors card-glow reveal group">
          <div class="icon-ring w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
            <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
          </div>
          <h3 class="font-semibold text-slate-900 text-lg mb-2">Country-Aware Tax Rates</h3>
          <p class="text-slate-600 text-sm leading-relaxed">
            Select your country and Ascenda pre-fills VAT, corporate tax, and employer rates. Supports Belgium, France, Germany, UK, US, and 9 more out of the box.
          </p>
        </div>

      </div>
    </div>
  </section>
</template>
