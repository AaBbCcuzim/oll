<template>
  <div v-if="error" class="p-6 text-center">
    <div class="mb-4 text-destructive">
      <h3 class="text-lg font-semibold mb-2">出错了</h3>
      <p class="text-sm">{{ error.message }}</p>
    </div>
    <button @click="handleReset" class="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">重试</button>
  </div>
  <slot v-else></slot>
</template>

<script setup>
import { ref, onErrorCaptured } from "vue";
import { toast } from "../utils/toast";

const error = ref(null);

onErrorCaptured((err) => {
  error.value = err;
  toast("应用发生错误，请重试", "error");
  return false;
});

function handleReset() {
  error.value = null;
}
</script>
