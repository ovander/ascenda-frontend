<script setup lang="ts">
import { onMounted } from 'vue'
import LandingNav from '../components/LandingNav.vue'
import LandingHero from '../components/LandingHero.vue'
import LandingFeatures from '../components/LandingFeatures.vue'
import LandingDrivers from '../components/LandingDrivers.vue'
import LandingAI from '../components/LandingAI.vue'
import LandingPricing from '../components/LandingPricing.vue'
import LandingFAQ from '../components/LandingFAQ.vue'
import LandingSignup from '../components/LandingSignup.vue'
import LandingLogin from '../components/LandingLogin.vue'
import LandingFooter from '../components/LandingFooter.vue'

onMounted(() => {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible')
        observer.unobserve(e.target)
      }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  )
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
})
</script>

<template>
  <div class="bg-white text-slate-900 antialiased">
    <LandingNav />
    <LandingHero />
    <LandingFeatures />
    <LandingDrivers />
    <LandingAI />
    <LandingPricing />
    <LandingFAQ />
    <LandingSignup />
    <LandingLogin />
    <LandingFooter />
  </div>
</template>
