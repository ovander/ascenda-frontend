<template>
  <section class="bg-white border-t border-slate-100 py-16">
    <div class="max-w-7xl mx-auto px-6">

      <div class="text-center mb-10 reveal">
        <p class="text-sm font-medium text-slate-500 uppercase tracking-widest mb-3">Built for every business model</p>
        <h2 class="font-display text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
          Revenue drivers that match how you earn
        </h2>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 reveal">

        <!-- SaaS -->
        <div class="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center icon-ring group-hover:bg-indigo-100 transition-colors">
            <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>
          <div class="text-center">
            <div class="text-sm font-semibold text-slate-800">SaaS</div>
            <div class="text-xs text-slate-500 mt-0.5">MRR · ARR · Churn</div>
          </div>
        </div>

        <!-- Consulting -->
        <div class="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center icon-ring group-hover:bg-indigo-100 transition-colors">
            <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div class="text-center">
            <div class="text-sm font-semibold text-slate-800">Consulting</div>
            <div class="text-xs text-slate-500 mt-0.5">Day-rate · Utilisation</div>
          </div>
        </div>

        <!-- Industry -->
        <div class="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center icon-ring group-hover:bg-indigo-100 transition-colors">
            <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <div class="text-center">
            <div class="text-sm font-semibold text-slate-800">Industry</div>
            <div class="text-xs text-slate-500 mt-0.5">Units · COGS · Margins</div>
          </div>
        </div>

        <!-- Training -->
        <div class="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center icon-ring group-hover:bg-indigo-100 transition-colors">
            <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <div class="text-center">
            <div class="text-sm font-semibold text-slate-800">Training</div>
            <div class="text-xs text-slate-500 mt-0.5">Sessions · Seats · Fill rate</div>
          </div>
        </div>

        <!-- Marketplace -->
        <div class="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center icon-ring group-hover:bg-indigo-100 transition-colors">
            <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
          </div>
          <div class="text-center">
            <div class="text-sm font-semibold text-slate-800">Marketplace</div>
            <div class="text-xs text-slate-500 mt-0.5">GMV · Take rate · Supply</div>
          </div>
        </div>

        <!-- Retail -->
        <div class="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center icon-ring group-hover:bg-indigo-100 transition-colors">
            <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <div class="text-center">
            <div class="text-sm font-semibold text-slate-800">Retail</div>
            <div class="text-xs text-slate-500 mt-0.5">Orders · AOV · Returns</div>
          </div>
        </div>

      </div>

      <p class="text-center text-xs text-slate-400 mt-6">
        Each driver type pre-populates the right assumptions and KPIs — or use custom formulas for any other model.
      </p>

    </div>
  </section>
</template>
