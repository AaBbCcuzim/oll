<template>
  <aside class="w-64 border-r h-screen">
    <div class="flex flex-col h-full">
      <!-- 头部 Logo -->
      <div class="p-6 border-b">
        <h1 class="text-xl font-semibold">Oll</h1>
      </div>

      <!-- 导航菜单 -->
      <nav class="flex-1 p-4">
        <ScrollArea class="h-[calc(100vh-8rem)]">
          <!-- 主要导航 -->
          <div class="space-y-1">
            <Button v-for="item in mainNavItems" :key="item.to" :variant="currentRoute === item.to ? 'secondary' : 'ghost'" class="w-full justify-start" @click="router.push(item.to)">
              <component :is="item.icon" class="mr-2 h-4 w-4" />
              {{ item.name }}
            </Button>
          </div>

          <!-- 分隔线 -->
          <Separator class="my-4" />

          <!-- 次要导航 -->
          <div class="space-y-1">
            <Button v-for="item in secondaryNavItems" :key="item.to" :variant="currentRoute === item.to ? 'secondary' : 'ghost'" class="w-full justify-start" @click="router.push(item.to)">
              <component :is="item.icon" class="mr-2 h-4 w-4" />
              {{ item.name }}
            </Button>
          </div>
        </ScrollArea>
      </nav>

      <!-- 底部状态区域 -->
      <div class="p-4 border-t">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleDot class="h-3 w-3 text-green-500" />
          <span>已连接</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MessageSquare, Download, HardDrive, Settings, Bookmark, CircleDot } from "lucide-vue-next";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

const route = useRoute();
const router = useRouter();

// 主要导航项
const mainNavItems = [
  {
    name: "模型下载",
    icon: Download,
    to: "/search",
  },
  {
    name: "本地模型",
    icon: HardDrive,
    to: "/local",
  },
  {
    name: "聊天",
    icon: MessageSquare,
    to: "/",
  },
];

// 次要导航项
const secondaryNavItems = [
  {
    name: "收藏夹",
    icon: Bookmark,
    to: "/favorites",
  },
  {
    name: "设置",
    icon: Settings,
    to: "/settings",
  },
];

const currentRoute = computed(() => route.path);
</script>

<style scoped>
.router-link-active {
  @apply bg-muted;
}
</style>
