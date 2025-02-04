<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- 背景遮罩 -->
      <div class="absolute inset-0 bg-black/50" @click="onCancel"></div>

      <!-- 对话框内容 -->
      <div class="relative bg-background rounded-lg shadow-lg w-full max-w-md p-6">
        <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
        <p class="text-muted-foreground mb-6">{{ message }}</p>

        <div class="flex justify-end space-x-2">
          <button @click="onCancel" class="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {{ cancelText }}
          </button>
          <button @click="onConfirm" class="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: "确认",
  },
  cancelText: {
    type: String,
    default: "取消",
  },
});

const show = ref(true);
const emit = defineEmits(["confirm", "cancel"]);

function onConfirm() {
  show.value = false;
  emit("confirm");
}

function onCancel() {
  show.value = false;
  emit("cancel");
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
