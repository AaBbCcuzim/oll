<template>
  <div class="p-6">
    <!-- 头部区域 -->
    <div class="flex items-center justify-between mb-6">
      <div class="space-y-1">
        <h2 class="text-2xl font-semibold tracking-tight">本地模型</h2>
        <p class="text-sm text-muted-foreground">已安装 {{ modelStore.localModels.length }} 个模型，总大小 {{ totalSize }}</p>
      </div>
      <div class="flex items-center gap-2">
        <Select v-model="sortBy" class="w-[150px]">
          <SelectTrigger>
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">按名称</SelectItem>
            <SelectItem value="size">按大小</SelectItem>
            <SelectItem value="modified">按修改时间</SelectItem>
          </SelectContent>
        </Select>
        <Button @click="refreshLocalModels" :disabled="isLoading">
          <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          刷新列表
        </Button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <Loading />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="py-8">
      <Card class="max-w-md mx-auto">
        <CardHeader>
          <CardTitle class="text-destructive flex items-center gap-2">
            <XCircle class="h-5 w-5" />
            加载失败
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">{{ error }}</p>
          <Button variant="outline" class="mt-4" @click="refreshLocalModels"> 重试 </Button>
        </CardContent>
      </Card>
    </div>

    <!-- 模型列表 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card v-for="model in sortedModels" :key="model.name" class="group">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span class="truncate">{{ model.name }}</span>
            <Badge>{{ formatSize(model.size) }}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-sm text-muted-foreground space-y-2">
            <div class="flex items-center gap-2">
              <Cpu class="h-3 w-3" />
              <span>{{ model.name.match(/\d+[BbMm]/) ? model.name.match(/\d+[BbMm]/)[0].toUpperCase() + " 参数" : "参数量未知" }}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div class="flex justify-end w-full gap-2">
            <Button variant="outline" size="sm" @click="showModelDetails(model)">
              <Info class="mr-2 h-4 w-4" />
              详情
            </Button>
            <Button variant="default" size="sm" @click="removeModel(model)" :disabled="isRemoving[model.name]">
              <Trash2 class="mr-2 h-4 w-4" />
              {{ isRemoving[model.name] ? "删除中..." : "删除" }}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>

    <!-- 空状态 -->
    <div v-if="!isLoading && !error && modelStore.localModels.length === 0" class="py-12">
      <Card class="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>暂无本地模型</CardTitle>
          <CardDescription> 您可以从模型库下载需要的模型 </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" @click="router.push('/search')">
            <Download class="mr-2 h-4 w-4" />
            去下载模型
          </Button>
        </CardFooter>
      </Card>
    </div>

    <!-- 模型详情对话框 -->
    <Dialog v-model:open="showDetails">
      <DialogContent class="sm:max-w-[600px] h-[80vh] p-0 overflow-hidden">
        <DialogHeader class="px-6 py-4 border-b">
          <DialogTitle class="text-xl flex items-center gap-2">
            <Settings class="h-5 w-5" />
            模型详情
          </DialogTitle>
          <DialogDescription class="flex items-center gap-2 mt-2">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" class="h-8 px-3">
                <span class="font-mono text-sm">{{ selectedModel?.name }}</span>
              </Badge>
              <Badge variant="outline" class="h-8 px-3 bg-muted">
                <HardDrive class="mr-2 h-4 w-4" />
                <span class="text-sm">{{ formatSize(selectedModel?.size) }}</span>
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 h-[calc(80vh-5rem)] px-6 overflow-hidden">
          <div v-if="selectedModel" class="space-y-8 py-6 pr-4">
            <!-- 基本信息 -->
            <div class="space-y-4">
              <h4 class="text-base font-semibold">基本信息</h4>
              <div class="grid grid-cols-2 gap-6 text-sm">
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Cpu class="h-4 w-4" />
                    <span>参数量</span>
                  </div>
                  <p>{{ selectedModel.parameter_size || "未知" }}</p>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Scale class="h-4 w-4" />
                    <span>量化方式</span>
                  </div>
                  <p>{{ selectedModel.quantization_level || "未知" }}</p>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <AlignStartHorizontal class="h-4 w-4" />
                    <span>上下文长度</span>
                  </div>
                  <p>{{ selectedModel.context_length || "未知" }}</p>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Calendar class="h-4 w-4" />
                    <span>修改时间</span>
                  </div>
                  <p>{{ formatTime(selectedModel.modified) }}</p>
                </div>
              </div>
            </div>

            <Separator />

            <!-- 系统提示词 -->
            <div class="space-y-4">
              <h4 class="text-base font-semibold">系统提示词</h4>
              <Card class="border-muted">
                <CardContent class="p-4 bg-muted/50">
                  <code class="text-sm whitespace-pre-wrap">{{ selectedModel.system_prompt || "未设置" }}</code>
                </CardContent>
              </Card>
            </div>

            <!-- 模型文件 -->
            <div class="space-y-4">
              <h4 class="text-base font-semibold">模型文件</h4>
              <Card class="border-muted">
                <CardContent class="p-4 bg-muted/50">
                  <code class="text-sm whitespace-pre-wrap">{{ selectedModel.modelfile || "未知" }}</code>
                </CardContent>
              </Card>
            </div>

            <!-- 其他信息 -->
            <div class="space-y-4">
              <h4 class="text-base font-semibold">其他信息</h4>
              <div class="space-y-4 text-sm">
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Box class="h-4 w-4" />
                    <span>基础模型</span>
                  </div>
                  <p>{{ selectedModel.base_model || "未知" }}</p>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <FileText class="h-4 w-4" />
                    <span>许可证</span>
                  </div>
                  <p>{{ selectedModel.license || "未知" }}</p>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Type class="h-4 w-4" />
                    <span>模型类型</span>
                  </div>
                  <p>{{ selectedModel.model_type || "未知" }}</p>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Layers class="h-4 w-4" />
                    <span>架构</span>
                  </div>
                  <p>{{ selectedModel.architecture || "未知" }}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useModelStore } from "../stores/modelStore";
import { useToast } from "../components/ui/toast";
import { confirm } from "../utils/dialog";
import { withLoading } from "../utils/loading";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import Loading from "../components/ui/Loading.vue";
import { RefreshCw, XCircle, Trash2, Download, CircleDot, Calendar, Info, Settings, Cpu, Scale, AlignStartHorizontal, Box, FileText, Type, Layers, X, HardDrive } from "lucide-vue-next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";

defineOptions({
  name: "LocalModels",
});

const router = useRouter();
const { toast } = useToast();
const modelStore = useModelStore();
const isRemoving = ref({});
const isLoading = ref(false);
const error = ref(null);

// 排序方式
const sortBy = ref("name");

// 计算总大小
const totalSize = computed(() => {
  const total = modelStore.localModels.reduce((acc, model) => acc + (parseInt(model.size) || 0), 0);
  return formatSize(total);
});

// 排序后的模型列表
const sortedModels = computed(() => {
  return [...modelStore.localModels].sort((a, b) => {
    switch (sortBy.value) {
      case "size":
        return (parseInt(b.size) || 0) - (parseInt(a.size) || 0);
      case "modified":
        return new Date(b.modified) - new Date(a.modified);
      default:
        return a.name.localeCompare(b.name);
    }
  });
});

// 获取状态颜色
function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case "ready":
      return "text-green-500";
    case "downloading":
      return "text-blue-500";
    case "processing":
      return "text-yellow-500";
    default:
      return "text-gray-500";
  }
}

// 获取状态文本
function getStatusText(status) {
  switch (status?.toLowerCase()) {
    case "ready":
      return "就绪";
    case "downloading":
      return "下载中";
    case "processing":
      return "处理中";
    default:
      return status || "未知";
  }
}

// 模型详情相关
const showDetails = ref(false);
const selectedModel = ref(null);

async function showModelDetails(model) {
  try {
    selectedModel.value = await modelStore.getModelDetails(model.name);
    showDetails.value = true;
  } catch (error) {
    toast({
      variant: "destructive",
      title: "获取详情失败",
      description: error.message,
    });
  }
}

// 格式化文件大小
function formatSize(bytes) {
  if (!bytes) return "未知";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = parseInt(bytes);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// 格式化时间
function formatTime(time) {
  if (!time) return "未知";
  try {
    const date = new Date(time);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return time;
  }
}

// 删除模型
async function removeModel(model) {
  if (!model?.name) {
    toast({
      variant: "destructive",
      title: "删除失败",
      description: "模型名称无效",
    });
    return;
  }

  if (isRemoving.value[model.name]) return;

  const confirmed = await confirm({
    title: "删除确认",
    message: `确定要删除模型 ${model.name} 吗？此操作不可恢复。`,
    confirmText: "删除",
    cancelText: "取消",
  });

  if (!confirmed) return;

  isRemoving.value[model.name] = true;

  try {
    await withLoading(modelStore.deleteModel(model.name), `正在删除模型 ${model.name}...`);
    toast({
      title: "删除成功",
      description: `模型 ${model.name} 已删除`,
    });
  } catch (error) {
    console.error("删除模型失败:", error);
    toast({
      variant: "destructive",
      title: "删除失败",
      description: error.message || "删除失败，请稍后重试",
    });
  } finally {
    isRemoving.value[model.name] = false;
  }
}

// 刷新模型列表
async function refreshLocalModels() {
  if (isLoading.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    await withLoading(modelStore.fetchLocalModels(), "正在获取本地模型列表...");
  } catch (err) {
    console.error("刷新本地模型列表失败:", err);
    error.value = "获取本地模型列表失败，请稍后重试";
    toast({
      variant: "destructive",
      title: "获取失败",
      description: "获取本地模型列表失败，请稍后重试",
    });
  } finally {
    isLoading.value = false;
  }
}

// 页面加载时获取本地模型列表
onMounted(async () => {
  await refreshLocalModels();
});
</script>
