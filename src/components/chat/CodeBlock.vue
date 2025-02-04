<script setup>
import { ref } from "vue";
import { Check, Copy } from "lucide-vue-next";
import { toast } from "../../utils/toast";

const props = defineProps({
  code: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    default: "",
  },
});

const isCopied = ref(false);

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code);
    isCopied.value = true;
    toast("代码已复制", "success");
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (error) {
    console.error("复制失败:", error);
    toast("复制失败", "error");
  }
}
</script>

<template>
  <div class="relative group">
    <div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button @click="copyCode" class="p-1.5 rounded bg-muted/50 hover:bg-muted text-muted-foreground" :title="isCopied ? '已复制' : '复制代码'">
        <Check v-if="isCopied" class="w-4 h-4" />
        <Copy v-else class="w-4 h-4" />
      </button>
    </div>
    <slot></slot>
  </div>
</template>
