<template>
  <section id="faq" class="bg-slate-50 py-28">
    <div class="max-w-3xl mx-auto px-6">

      <div class="text-center mb-14 reveal">
        <h2 class="font-display text-4xl font-bold tracking-tight mb-3 text-slate-900">Frequently asked</h2>
        <p class="text-slate-600">Quick answers to common questions.</p>
      </div>

      <div class="space-y-4 reveal">

        <details class="bg-white border border-slate-200 rounded-xl group shadow-sm">
          <summary class="flex items-center justify-between px-6 py-5 cursor-pointer list-none text-slate-800 font-medium">
            Do I need a credit card to sign up?
            <svg class="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </summary>
          <p class="px-6 pb-5 text-sm text-slate-600 leading-relaxed">No. The Free plan requires no payment information. You only need a credit card when upgrading to Pro.</p>
        </details>

        <details class="bg-white border border-slate-200 rounded-xl group shadow-sm">
          <summary class="flex items-center justify-between px-6 py-5 cursor-pointer list-none text-slate-800 font-medium">
            Can I import existing data?
            <svg class="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </summary>
          <p class="px-6 pb-5 text-sm text-slate-600 leading-relaxed">Yes. Ascenda's guided wizard lets you enter opening balances, historical headcounts, and product lines to populate your first plan in minutes. CSV import is on the roadmap.</p>
        </details>

        <details class="bg-white border border-slate-200 rounded-xl group shadow-sm">
          <summary class="flex items-center justify-between px-6 py-5 cursor-pointer list-none text-slate-800 font-medium">
            Is my data secure?
            <svg class="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </summary>
          <p class="px-6 pb-5 text-sm text-slate-600 leading-relaxed">All data is encrypted at rest and in transit. Each tenant's data is isolated at the database level with row-level security. Ascenda is GDPR-compliant and hosted in the EU.</p>
        </details>

        <details class="bg-white border border-slate-200 rounded-xl group shadow-sm">
          <summary class="flex items-center justify-between px-6 py-5 cursor-pointer list-none text-slate-800 font-medium">
            Can I collaborate with my team?
            <svg class="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </summary>
          <p class="px-6 pb-5 text-sm text-slate-600 leading-relaxed">Yes. You can invite team members with owner or editor roles. Enterprise plans include advanced role-based access control.</p>
        </details>

        <details class="bg-white border border-slate-200 rounded-xl group shadow-sm">
          <summary class="flex items-center justify-between px-6 py-5 cursor-pointer list-none text-slate-800 font-medium">
            How do the AI features work?
            <svg class="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </summary>
          <p class="px-6 pb-5 text-sm text-slate-600 leading-relaxed">AI features read your plan data directly — no copy-pasting into ChatGPT. Each module (narration, unit economics, assumption review…) sends only the relevant numbers to the model and returns structured, editable output. Your financial data never leaves our EU infrastructure for training purposes.</p>
        </details>

        <details class="bg-white border border-slate-200 rounded-xl group shadow-sm">
          <summary class="flex items-center justify-between px-6 py-5 cursor-pointer list-none text-slate-800 font-medium">
            Which business models are supported?
            <svg class="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </summary>
          <p class="px-6 pb-5 text-sm text-slate-600 leading-relaxed">Ascenda ships with drivers for SaaS (MRR/ARR/churn), consulting &amp; services (day-rate, utilisation), industry &amp; manufacturing (units, COGS), training (sessions, seats), marketplace (GMV, take rate), and retail. You can also build custom formulas for any other model.</p>
        </details>

      </div>
    </div>
  </section>
</template>
