<script setup>
import { onMounted } from "vue";
import Sidebar from "./components/layout/Sidebar.vue";
import TitleBar from "./components/layout/TitleBar.vue";
import ErrorBoundary from "./components/ErrorBoundary.vue";
import { useModelStore } from "./stores/modelStore";
import { toast } from "./utils/toast";
import { useConnectionStore } from "./stores/connectionStore";
import { RouterView } from "vue-router";
import { KeepAlive } from "vue";

const modelStore = useModelStore();
const connectionStore = useConnectionStore();

onMounted(async () => {
  // 只在连接成功时获取模型信息
  if (connectionStore.isConnected) {
    try {
      await modelStore.fetchModelInfo();
    } catch (error) {
      console.error("初始化模型信息失败:", error);
      toast("获取模型信息失败，使用默认数据", "warning");
    }
  }
});
</script>

<template>
  <ErrorBoundary>
    <div class="min-h-screen bg-background">
      <!-- 标题栏 -->
      <TitleBar />

      <!-- 侧边栏和主内容区域的容器 -->
      <div class="flex h-[calc(100vh-2rem)] overflow-hidden">
        <!-- 侧边栏 -->
        <Sidebar class="w-64 border-r bg-card flex-shrink-0" />

        <!-- 主内容区域 -->
        <main class="flex-1 overflow-y-auto">
          <KeepAlive :include="['ModelSearch', 'LocalModels', 'Chat', 'Settings', 'Favorites']">
            <RouterView v-slot="{ Component }">
              <component :is="Component" />
            </RouterView>
          </KeepAlive>
        </main>
      </div>
    </div>
  </ErrorBoundary>
</template>

<style>
/* 确保根元素和body不会出现滚动条 */
html,
body {
  @apply h-full overflow-hidden;
}

#app {
  @apply h-full;
}
</style>
