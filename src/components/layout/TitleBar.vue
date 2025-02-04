<script setup>
import { onMounted, ref } from "vue";
import { Minus, Square, X, Terminal } from "lucide-vue-next";
import { Button } from "../ui/button";
import { appWindow } from "@tauri-apps/api/window";

const isClient = ref(false);

onMounted(async () => {
  try {
    // 检测是否在 Tauri 客户端环境
    if (window.__TAURI__) {
      isClient.value = true;
    }
  } catch (error) {
    console.error("非 Tauri 环境:", error);
    isClient.value = false;
  }
});

// 窗口控制按钮事件处理
async function minimize() {
  try {
    await appWindow.minimize();
  } catch (error) {
    console.error("最小化失败:", error);
  }
}

async function toggleMaximize() {
  try {
    await appWindow.toggleMaximize();
  } catch (error) {
    console.error("切换最大化失败:", error);
  }
}

async function close() {
  try {
    await appWindow.close();
  } catch (error) {
    console.error("关闭失败:", error);
  }
}
</script>

<template>
  <div v-if="isClient" data-tauri-drag-region class="h-8 flex items-center justify-between px-2 bg-background border-b">
    <!-- 应用图标和名称 -->
    <div class="flex items-center gap-2">
      <Terminal class="w-4 h-4" />
    </div>

    <!-- 窗口控制按钮 -->
    <div class="flex items-center">
      <Button variant="ghost" size="icon" class="h-6 w-6" @click="minimize">
        <Minus class="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" class="h-6 w-6" @click="toggleMaximize">
        <Square class="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground" @click="close">
        <X class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<style>
/* 禁用默认的窗口拖动区域 */
[data-tauri-drag-region] {
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: drag;
}

/* 窗口控制按钮不可拖动 */
[data-tauri-drag-region] button {
  -webkit-app-region: no-drag;
}
</style>
