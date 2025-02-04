<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "../stores/connectionStore";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { Toaster } from "../components/ui/toast";
import Loading from "../components/ui/Loading.vue";

const router = useRouter();
const connectionStore = useConnectionStore();
const port = ref("11434");
const { toast } = useToast();

async function checkConnection() {
  const isConnected = await connectionStore.checkConnection(port.value);
  if (isConnected) {
    router.push("/models");
  } else {
    toast({
      variant: "destructive",
      title: "未检测到 Ollama 服务",
      description: "请在终端中运行：ollama serve",
    });
  }
}

onMounted(() => {
  // 初始检查一次
  checkConnection();
});
</script>

<template>
  <div class="fixed inset-0 bg-background flex items-center justify-center">
    <div class="max-w-md w-full p-8 space-y-8">
      <!-- Logo -->
      <div class="text-center space-y-4">
        <h1 class="text-4xl font-bold">Oll</h1>
        <p class="text-xl text-muted-foreground">本地大语言模型管理工具</p>
      </div>

      <!-- 连接检查 -->
      <div class="space-y-6">
        <div class="space-y-4">
          <Input v-model="port" type="text" placeholder="默认端口：11434" :disabled="connectionStore.isChecking" />
          <Button @click="checkConnection" :disabled="connectionStore.isChecking" class="w-full"> 启动 Ollama </Button>
          <p v-if="connectionStore.isChecking" class="text-sm text-muted-foreground">正在检查连接...</p>
        </div>
      </div>
    </div>
  </div>
  <Toaster />
</template>

<style scoped>
.fixed {
  @apply bg-opacity-80 backdrop-blur-sm;
}
</style>
