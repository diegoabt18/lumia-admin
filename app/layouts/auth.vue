<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-lumia-canvas px-4 py-12">
    <div class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-lumia-beige/50 blur-3xl" aria-hidden="true" />
    <div class="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-lumia-gold/10 blur-3xl" aria-hidden="true" />
    <main class="relative w-full max-w-[420px]">
      <slot />
    </main>
  </div>
</template>
