<template>
  <section class="hero-bg grid-pattern min-h-screen flex items-center pt-16">
    <div class="max-w-7xl mx-auto px-6 py-24 w-full">

      <div class="max-w-4xl mx-auto text-center">

        <!-- Badge -->
        <div class="inline-flex items-center gap-2 badge-pill text-xs font-medium px-4 py-1.5 rounded-full mb-8">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Now with AI-powered analysis &amp; investor-ready cap tables
        </div>

        <!-- Headline -->
        <h1 class="font-display text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
          Plan your growth.<br />
          <span class="gradient-text">With total clarity.</span>
        </h1>

        <!-- Subheadline -->
        <p class="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
          Ascenda gives founders and finance teams a single workspace to model 5-year forecasts,
          run break-even analysis, manage cap tables, and get AI-generated financial insights — all in one place.
        </p>

        <!-- CTA group -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <a
            href="#signup"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 accent-gradient text-white text-base font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
          >
            Start for free — no credit card
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <a
            href="#features"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-slate-700 hover:text-slate-900 text-base font-medium px-8 py-4 rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors"
          >
            See how it works
          </a>
        </div>

        <!-- Social proof -->
        <div class="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Free plan, forever
          </span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            GDPR-compliant
          </span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Set up in under 10 minutes
          </span>
        </div>
      </div>

      <!-- Dashboard preview (stylized mockup) -->
      <div class="mt-20 max-w-5xl mx-auto reveal">
        <div class="rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl shadow-indigo-950/50">
          <!-- Fake browser bar -->
          <div class="bg-slate-800 px-4 py-3 flex items-center gap-3 border-b border-slate-700">
            <div class="flex gap-1.5">
              <div class="w-3 h-3 rounded-full bg-slate-600"></div>
              <div class="w-3 h-3 rounded-full bg-slate-600"></div>
              <div class="w-3 h-3 rounded-full bg-slate-600"></div>
            </div>
            <div class="flex-1 max-w-sm mx-auto bg-slate-700 rounded-md h-6 flex items-center px-3">
              <span class="text-xs text-slate-400">app.ascenda.io/plans/base-scenario</span>
            </div>
          </div>
          <!-- Mock app shell -->
          <div class="bg-slate-900 flex h-80">
            <!-- Sidebar -->
            <div class="w-52 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-2 shrink-0">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-6 h-6 rounded-sm accent-gradient"></div>
                <span class="text-xs font-semibold text-slate-300">Ascenda</span>
              </div>
              <div class="text-xs text-indigo-400 font-medium bg-indigo-950/50 px-3 py-2 rounded-lg">📊 Overview</div>
              <div class="text-xs text-slate-500 px-3 py-2">📁 Products</div>
              <div class="text-xs text-slate-500 px-3 py-2">👥 Staff</div>
              <div class="text-xs text-slate-500 px-3 py-2">🏗️ Capex</div>
              <div class="text-xs text-slate-500 px-3 py-2">📋 Snapshots</div>
              <div class="mt-2 border-t border-slate-800 pt-2">
                <div class="text-xs text-slate-600 px-3 py-2">⭐ Break-Even <span class="text-indigo-500 text-xs">PRO</span></div>
                <div class="text-xs text-slate-600 px-3 py-2">📈 Cap Table <span class="text-indigo-500 text-xs">PRO</span></div>
                <div class="text-xs text-slate-600 px-3 py-2">✨ AI Insights <span class="text-indigo-500 text-xs">PRO</span></div>
              </div>
            </div>
            <!-- Main content -->
            <div class="flex-1 p-6 overflow-hidden">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <div class="text-sm font-semibold text-slate-200">Base Scenario — FY 2025–2030</div>
                  <div class="text-xs text-slate-500 mt-0.5">Last updated 2 hours ago</div>
                </div>
                <div class="flex gap-2">
                  <div class="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full">Published</div>
                </div>
              </div>
              <!-- KPI cards -->
              <div class="grid grid-cols-4 gap-3 mb-4">
                <div class="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                  <div class="text-xs text-slate-500 mb-1">Revenue Y1</div>
                  <div class="text-lg font-bold text-slate-100">€480K</div>
                  <div class="text-xs text-emerald-400 mt-0.5">↑ 24%</div>
                </div>
                <div class="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                  <div class="text-xs text-slate-500 mb-1">Gross Margin</div>
                  <div class="text-lg font-bold text-slate-100">68%</div>
                  <div class="text-xs text-emerald-400 mt-0.5">↑ 4pp</div>
                </div>
                <div class="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                  <div class="text-xs text-slate-500 mb-1">EBITDA Y3</div>
                  <div class="text-lg font-bold text-slate-100">€210K</div>
                  <div class="text-xs text-slate-400 mt-0.5">Breakeven Y2</div>
                </div>
                <div class="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                  <div class="text-xs text-slate-500 mb-1">Headcount Y1</div>
                  <div class="text-lg font-bold text-slate-100">12 FTE</div>
                  <div class="text-xs text-slate-400 mt-0.5">→ 28 by Y3</div>
                </div>
              </div>
              <!-- Mini chart placeholder -->
              <div class="bg-slate-800/40 rounded-xl border border-slate-700/40 p-3 h-24 flex items-end gap-1.5 px-4">
                <div class="w-full flex items-end gap-1.5">
                  <div class="flex-1 bg-indigo-800/60 rounded-xs" style="height:35%"></div>
                  <div class="flex-1 bg-indigo-700/70 rounded-xs" style="height:52%"></div>
                  <div class="flex-1 bg-indigo-600/80 rounded-xs" style="height:68%"></div>
                  <div class="flex-1 bg-indigo-500/80 rounded-xs" style="height:80%"></div>
                  <div class="flex-1 bg-indigo-400/90 rounded-xs" style="height:100%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>
