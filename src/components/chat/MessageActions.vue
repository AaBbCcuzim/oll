<script setup>
import { ref } from "vue";
import { Copy, Trash2, Share2, VolumeX, Volume2, Star, Repeat } from "lucide-vue-next";
import { toast } from "../../utils/toast";

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  isAssistant: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["copy", "delete", "regenerate"]);
const isReading = ref(false);
const speech = ref(null);

// 朗读消息
function toggleSpeech() {
  if (isReading.value) {
    window.speechSynthesis.cancel();
    isReading.value = false;
    speech.value = null;
    return;
  }

  const utterance = new SpeechSynthesisUtterance(props.message.content);
  utterance.lang = "zh-CN";
  utterance.onend = () => {
    isReading.value = false;
    speech.value = null;
  };

  speech.value = utterance;
  window.speechSynthesis.speak(utterance);
  isReading.value = true;
}

// 分享消息
async function shareMessage() {
  try {
    await navigator.share({
      title: "分享消息",
      text: props.message.content,
    });
    toast("分享成功", "success");
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("分享失败:", error);
      toast("分享失败", "error");
    }
  }
}
</script>

<template>
  <div class="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1">
    <button @click="toggleSpeech" class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" :title="isReading ? '停止朗读' : '朗读消息'">
      <VolumeX v-if="isReading" class="w-4 h-4" />
      <Volume2 v-else class="w-4 h-4" />
    </button>
    <button @click="$emit('copy')" class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="复制消息">
      <Copy class="w-4 h-4" />
    </button>
    <button v-if="isAssistant" @click="$emit('regenerate')" class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="重新生成">
      <Repeat class="w-4 h-4" />
    </button>
    <button @click="shareMessage" class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="分享消息">
      <Share2 class="w-4 h-4" />
    </button>
    <button @click="$emit('favorite')" class="p-1.5 rounded-lg hover:bg-muted" :class="message.favorite ? 'text-yellow-500' : 'text-muted-foreground'" title="收藏消息">
      <Star class="w-4 h-4" />
    </button>
    <button @click="$emit('delete')" class="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="删除消息">
      <Trash2 class="w-4 h-4" />
    </button>
  </div>
</template>
