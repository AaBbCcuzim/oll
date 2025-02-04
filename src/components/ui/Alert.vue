<template>
  <div v-if="show" class="fixed top-4 right-4 p-4 rounded-lg shadow-lg max-w-md" :class="typeClasses[type]">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">{{ message }}</span>
      <button @click="close" class="ml-auto">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const props = defineProps({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: "info",
    validator: (value) => ["info", "success", "error"].includes(value),
  },
  duration: {
    type: Number,
    default: 3000,
  },
});

const show = ref(true);
const typeClasses = {
  info: "bg-blue-50 text-blue-800 border border-blue-200",
  success: "bg-green-50 text-green-800 border border-green-200",
  error: "bg-red-50 text-red-800 border border-red-200",
};

const emit = defineEmits(["destroy"]);

function close() {
  show.value = false;
  setTimeout(() => {
    emit("destroy");
  }, 300);
}

onMounted(() => {
  if (props.duration > 0) {
    setTimeout(close, props.duration);
  }
});
</script>

<style scoped>
.alert-enter-active,
.alert-leave-active {
  transition: all 0.3s ease;
}

.alert-enter-from,
.alert-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
