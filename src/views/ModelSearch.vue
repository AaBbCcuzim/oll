<template>
  <!-- 移除 h-screen，让内容自然流动 -->
  <div class="flex flex-col min-h-screen">
    <!-- 头部区域 -->
    <div class="p-6 pb-0">
      <!-- 搜索栏 -->
      <div class="flex gap-4 mb-4">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input v-model="searchQuery" placeholder="搜索模型..." class="pl-9" />
        </div>
        <Button variant="outline" @click="toggleAdvancedFilters">
          <Filter class="w-4 h-4 mr-2" />
          筛选
        </Button>
        <Button variant="outline" @click="refreshModels" :disabled="isLoading">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
        </Button>
        <Button variant="outline" @click="toggleLayout">
          <LayoutGrid v-if="!isGridView" class="w-4 h-4" />
          <List v-else class="w-4 h-4" />
        </Button>
      </div>

      <!-- 下载进度区域 -->
      <div v-if="hasDownloadingModels" class="border-b bg-muted/30 mb-6">
        <div class="p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium flex items-center gap-2">
              <Download class="w-4 h-4" />
              下载队列
            </h3>
            <span class="text-sm text-muted-foreground">{{ downloadingModels.length }} 个任务</span>
          </div>

          <div class="space-y-3">
            <div v-for="model in downloadingModels" :key="model.name" class="bg-background rounded-lg border shadow-sm">
              <div class="p-3">
                <div class="flex items-center justify-between mb-2">
                  <div class="space-y-1">
                    <div class="font-medium">{{ model.name }}</div>
                    <div class="text-xs text-muted-foreground">
                      {{ model.selectedVariant || "默认版本" }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <Badge :variant="getStatusVariant(model.progress?.status)">
                      {{ getStatusText(model.progress?.status) }}
                    </Badge>
                    <Button variant="ghost" size="icon" class="h-8 w-8" @click="cancelDownload(model)">
                      <X class="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div class="h-full bg-primary transition-all duration-200" :style="{ width: `${model.progress?.percent || 0}%` }"></div>
                  </div>
                  <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <div class="flex items-center gap-2">
                      <span v-if="model.progress?.status === 'downloading'"> {{ model.progress.downloaded }}/{{ model.progress.total }} </span>
                      <span v-else>{{ model.progress?.message || "准备中..." }}</span>
                    </div>
                    <span>{{ model.progress?.percent?.toFixed(1) || 0 }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 高级筛选面板 -->
      <Transition enter-active-class="transition-all duration-200 ease-out" leave-active-class="transition-all duration-200 ease-in" enter-from-class="opacity-0 -translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-4">
        <div v-show="showAdvancedFilters" class="mt-4">
          <Card>
            <CardContent class="grid gap-4 py-4">
              <!-- 模型大小筛选 -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium">最小大小</label>
                  <Input v-model="filters.minSize" type="number" placeholder="最小大小(GB)" />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">最大大小</label>
                  <Input v-model="filters.maxSize" type="number" placeholder="最大大小(GB)" />
                </div>
              </div>

              <!-- 下载量筛选 -->
              <div class="space-y-2">
                <label class="text-sm font-medium">最小下载量</label>
                <Input v-model="filters.minDownloads" type="number" placeholder="最小下载量" />
              </div>

              <!-- 模型系列筛选 -->
              <div class="space-y-2">
                <label class="text-sm font-medium">模型系列</label>
                <Select v-model="filters.family">
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型系列" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem v-for="family in modelFamilies" :key="family" :value="family">
                      {{ family }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </Transition>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 px-6 relative">
      <TransitionGroup
        name="list"
        tag="div"
        :class="{
          'grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3': isGridView,
          'flex flex-col gap-4': !isGridView,
        }">
        <!-- 加载状态 -->
        <div v-if="isLoading" key="loading" class="flex justify-center items-center py-12">
          <Loading class="w-8 h-8" />
        </div>

        <!-- 错误提示 -->
        <div v-else-if="error" key="error" class="flex items-center justify-center py-12">
          <Card class="max-w-md w-full">
            <CardHeader>
              <CardTitle class="text-destructive flex items-center gap-2">
                <XCircle class="w-5 h-5" />
                加载失败
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">{{ error }}</p>
            </CardContent>
          </Card>
        </div>

        <!-- 模型列表 -->
        <template v-else>
          <Card v-for="model in filteredModels" :key="model.name" class="group hover:shadow-md transition-all duration-200" :class="{ 'flex flex-col': !isGridView }">
            <!-- 列表视图的内容区域 -->
            <div class="p-6 flex flex-col h-full">
              <!-- 头部信息 -->
              <div class="mb-4">
                <h3 class="font-semibold truncate mb-2">{{ model.name }}</h3>
                <!-- 变体标签 -->
                <div class="flex flex-wrap gap-1.5">
                  <Badge v-for="variant in model.variants" :key="variant" variant="secondary" class="transition-colors">
                    {{ variant }}
                  </Badge>
                </div>
              </div>

              <!-- 描述和标签 -->
              <div class="space-y-4 flex-1">
                <p class="text-sm text-muted-foreground" :class="{ 'line-clamp-2': isGridView }">
                  {{ model.description }}
                </p>

                <div class="flex flex-wrap gap-1.5">
                  <Badge v-for="tag in model.tags" :key="tag" variant="outline" class="transition-colors hover:bg-secondary cursor-default">
                    {{ tag }}
                  </Badge>
                </div>
              </div>

              <!-- 底部信息和操作 -->
              <div class="mt-4 pt-4 border-t">
                <div class="flex items-center justify-between">
                  <!-- 基本信息 -->
                  <div class="flex items-center gap-4 text-sm text-muted-foreground">
                    <span class="flex items-center">
                      <Download class="w-4 h-4 mr-1" />
                      {{ formatDownloads(model.downloads) }} pulls
                    </span>
                    <span>更新于: {{ formatTime(model.updated) }}</span>
                  </div>

                  <!-- 下载区域 -->
                  <div class="flex items-center gap-2">
                    <Select v-model="model.selectedVariant" :disabled="model.variants.length <= 1" @click.stop>
                      <SelectTrigger class="h-9 min-w-[5rem]">
                        <SelectValue :placeholder="model.variants[0]" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="variant in model.variants" :key="variant" :value="variant">
                          {{ variant }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button @click.stop="downloadModel(model)" variant="default" class="h-9" :disabled="model.downloading">
                      <Download class="mr-2 h-4 w-4" />
                      {{ model.downloading ? "下载中" : "下载" }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </template>
      </TransitionGroup>
    </div>
  </div>
  <Toaster />
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useModelStore } from "../stores/modelStore";
import Loading from "../components/ui/Loading.vue";
import { Search, Filter, Download, History, Tag, ExternalLink, XCircle, RefreshCw, LayoutGrid, List, X } from "lucide-vue-next";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { useToast } from "../components/ui/toast";
import { TransitionGroup } from "vue";

const { toast } = useToast();
const modelStore = useModelStore();
const searchQuery = ref("");
const isDownloading = ref({});
const downloadProgress = ref({});
const isLoading = ref(false);
const error = ref(null);
const showAdvancedFilters = ref(false);
const isGridView = ref(true);

// 高级筛选选项
const filters = ref({
  minSize: "",
  maxSize: "",
  minDownloads: "",
  family: "all",
  quantization: "",
});

// 模型系列
const modelFamilies = ["Llama", "Mistral", "Qwen", "Yi", "Phi", "Neural", "Stable", "Code", "Other"];

// 量化版本
const quantizationTypes = ["Q2_K", "Q3_K_S", "Q3_K_M", "Q3_K_L", "Q4_K_M", "Q4_K_S", "Q5_K_M", "Q5_1_K", "Q6_K", "Q8_0", "F16", "F32"];

// 下载历史
const downloadHistory = ref([]);

// 从本地存储加载下载历史
onMounted(() => {
  const savedHistory = localStorage.getItem("download-history");
  if (savedHistory) {
    downloadHistory.value = JSON.parse(savedHistory);
  }
});

// 保存下载历史
function saveDownloadHistory(model) {
  const history = {
    name: model.name,
    timestamp: new Date().toISOString(),
    size: model.size,
  };
  downloadHistory.value = [history, ...downloadHistory.value].slice(0, 20);
  localStorage.setItem("download-history", JSON.stringify(downloadHistory.value));
}

// 格式化文件大小
function formatSize(size) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = parseInt(size);
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// 格式化下载量
function formatDownloads(downloads) {
  if (typeof downloads === "string") return downloads;
  if (downloads >= 1000000) {
    return `${(downloads / 1000000).toFixed(1)}M`;
  } else if (downloads >= 1000) {
    return `${(downloads / 1000).toFixed(1)}K`;
  }
  return downloads.toString();
}

// 格式化时间
function formatTime(timeStr) {
  // 处理 "x days ago" 格式
  if (timeStr.includes("days ago")) {
    const days = parseInt(timeStr);
    if (isNaN(days)) return timeStr;
    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 30) return `${days}天前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  }

  // 处理 "x months ago" 格式
  if (timeStr.includes("months ago")) {
    const months = parseInt(timeStr);
    if (isNaN(months)) return timeStr;
    if (months < 12) return `${months}个月前`;
    return `${Math.floor(months / 12)}年前`;
  }

  // 处理 "x years ago" 格式
  if (timeStr.includes("years ago")) {
    const years = parseInt(timeStr);
    if (isNaN(years)) return timeStr;
    return `${years}年前`;
  }

  // 处理其他时间格式
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;

    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 30) return `${days}天前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  } catch (error) {
    console.error("时间格式化错误:", error, "原始值:", timeStr);
    return timeStr; // 如果解析失败，直接返回原始字符串
  }
}

// 页面加载时获取模型列表
onMounted(async () => {
  try {
    await refreshModels();
  } catch (error) {
    console.error("初始化失败:", error);
  }
});

// 修改过滤后的模型列表计算属性
const filteredModels = ref([]);

// 监听搜索和筛选条件的变化
watch(
  [searchQuery, () => filters.value.minSize, () => filters.value.maxSize, () => filters.value.minDownloads, () => filters.value.family, showAdvancedFilters],
  () => {
    let result = [...modelStore.availableModels];

    // 搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((model) => {
        const searchFields = [model.name.toLowerCase(), model.description.toLowerCase(), ...model.tags.map((tag) => tag.toLowerCase())];
        return searchFields.some((field) => field.includes(query));
      });
    }

    // 高级筛选
    if (showAdvancedFilters.value) {
      // 大小过滤
      if (filters.value.minSize) {
        result = result.filter((model) => {
          const size = parseFloat(model.size);
          return !isNaN(size) && size >= parseFloat(filters.value.minSize);
        });
      }
      if (filters.value.maxSize) {
        result = result.filter((model) => {
          const size = parseFloat(model.size);
          return !isNaN(size) && size <= parseFloat(filters.value.maxSize);
        });
      }

      // 下载量过滤
      if (filters.value.minDownloads) {
        result = result.filter((model) => model.downloads >= parseInt(filters.value.minDownloads));
      }

      // 模型系列过滤
      if (filters.value.family && filters.value.family !== "all") {
        result = result.filter((model) => model.name.toLowerCase().includes(filters.value.family.toLowerCase()));
      }
    }

    filteredModels.value = result;
  },
  { immediate: true }
);

// 刷新模型列表
async function refreshModels() {
  if (isLoading.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    await modelStore.fetchModelInfo();
  } catch (err) {
    console.error("刷新模型列表失败:", err);
    error.value = "获取模型列表失败，请稍后重试";
    toast({
      variant: "destructive",
      title: "获取模型列表失败",
      description: "请稍后重试",
    });
  } finally {
    isLoading.value = false;
  }
}

// 下载模型
async function downloadModel(model) {
  if (isDownloading.value[model.name]) return;

  isDownloading.value[model.name] = true;

  // 创建下载状态
  const downloadingModel = {
    ...model,
    downloading: true,
    progress: {
      status: "preparing",
      percent: 0,
      message: "准备下载...",
    },
  };

  // 更新模型列表
  const modelIndex = filteredModels.value.findIndex((m) => m.name === model.name);
  if (modelIndex !== -1) {
    // 使用 Vue 的响应式方法更新数组
    filteredModels.value = [...filteredModels.value.slice(0, modelIndex), downloadingModel, ...filteredModels.value.slice(modelIndex + 1)];
  }

  try {
    const modelName = model.selectedVariant ? `${model.name.toLowerCase()}:${model.selectedVariant.toLowerCase()}` : model.name.toLowerCase();
    const cleanModelName = modelName.trim().replace(/\s+/g, "");

    console.log("开始下载模型:", cleanModelName);

    await modelStore.downloadModel(cleanModelName, (progress) => {
      console.log("进度更新:", progress);
      // 更新下载状态
      const currentIndex = filteredModels.value.findIndex((m) => m.name === model.name);
      if (currentIndex !== -1) {
        // 创建新的模型对象以触发响应式更新
        const updatedModel = {
          ...filteredModels.value[currentIndex],
          progress: { ...progress },
        };
        // 更新数组
        filteredModels.value = [...filteredModels.value.slice(0, currentIndex), updatedModel, ...filteredModels.value.slice(currentIndex + 1)];
      }
    });

    toast({
      title: "下载成功",
      description: `模型 ${cleanModelName} 下载完成`,
    });
    saveDownloadHistory(model);
  } catch (error) {
    console.error("下载模型失败:", error);
    toast({
      variant: "destructive",
      title: "下载失败",
      description: error.message,
    });
  } finally {
    isDownloading.value[model.name] = false;
    // 更新最终状态
    const finalIndex = filteredModels.value.findIndex((m) => m.name === model.name);
    if (finalIndex !== -1) {
      const finalModel = {
        ...model,
        downloading: false,
        progress: null,
      };
      filteredModels.value = [...filteredModels.value.slice(0, finalIndex), finalModel, ...filteredModels.value.slice(finalIndex + 1)];
    }
  }
}

// 取消下载
async function cancelDownload(model) {
  try {
    modelStore.cancelDownload(model.name);
    // 更新模型状态
    const modelIndex = filteredModels.value.findIndex((m) => m.name === model.name);
    if (modelIndex !== -1) {
      const finalModel = {
        ...model,
        downloading: false,
        progress: null,
      };
      filteredModels.value = [...filteredModels.value.slice(0, modelIndex), finalModel, ...filteredModels.value.slice(modelIndex + 1)];
    }
    isDownloading.value[model.name] = false;

    toast({
      title: "已取消下载",
      description: `已取消 ${model.name} 的下载`,
    });
  } catch (error) {
    console.error("取消下载失败:", error);
    toast({
      variant: "destructive",
      title: "取消失败",
      description: error.message,
    });
  }
}

// 动画状态
const isAnimating = ref(false);

// 切换高级筛选时的处理
function toggleAdvancedFilters() {
  if (isAnimating.value) return;
  isAnimating.value = true;
  showAdvancedFilters.value = !showAdvancedFilters.value;
  setTimeout(() => {
    isAnimating.value = false;
  }, 300);
}

// 切换布局
function toggleLayout() {
  isGridView.value = !isGridView.value;
}

// 计算正在下载的模型
const downloadingModels = computed(() => {
  return filteredModels.value.filter((model) => model.downloading);
});

// 是否有正在下载的模型
const hasDownloadingModels = computed(() => {
  return downloadingModels.value.length > 0;
});

// 获取状态对应的 Badge 样式
function getStatusVariant(status) {
  switch (status) {
    case "downloading":
      return "default";
    case "processing":
      return "secondary";
    case "verifying":
      return "warning";
    default:
      return "outline";
  }
}

// 获取状态对应的文本
function getStatusText(status) {
  switch (status) {
    case "downloading":
      return "下载中";
    case "processing":
      return "处理中";
    case "verifying":
      return "验证中";
    default:
      return "准备中";
  }
}

// 添加组件名称
defineOptions({
  name: "ModelSearch",
});
</script>

<style scoped>
/* 列表动画 */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
  position: absolute;
  width: 100%;
}

.list-leave-active {
  position: absolute;
  width: 100%;
  visibility: hidden;
}

/* 网格布局时的特殊处理 */
:deep(.grid) {
  position: relative;
  min-height: 200px; /* 根据实际内容调整 */
}

:deep(.grid .list-leave-active),
:deep(.grid .list-leave-to) {
  width: calc(100% - 1rem); /* 考虑 gap 的宽度 */
}
</style>
