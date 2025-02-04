<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80" v-if="show">
    <div class="relative">
      <div class="h-16 w-16">
        <div class="absolute h-16 w-16 rounded-full border-4 border-solid border-primary opacity-20"></div>
        <div class="absolute h-16 w-16 rounded-full border-4 border-solid border-primary border-t-transparent animate-spin"></div>
      </div>
      <div class="mt-4 text-sm text-muted-foreground text-center">{{ message }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: "加载中...",
  },
});
</script>
