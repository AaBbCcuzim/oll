<template>
  <Dialog :open="show" @update:open="$emit('update:show', $event)">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>模型详情</DialogTitle>
        <DialogDescription>{{ model?.name }}</DialogDescription>
      </DialogHeader>

      <div v-if="details" class="space-y-4 py-4">
        <!-- 未安装提示 -->
        <Alert v-if="details.status === 'not_installed'" variant="warning">
          <AlertTitle>模型未安装</AlertTitle>
          <AlertDescription> 请先下载模型以查看详细信息 </AlertDescription>
        </Alert>

        <!-- 基本信息 -->
        <div class="space-y-2">
          <h4 class="font-medium">基本信息</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-muted-foreground">模型家族:</div>
            <div>{{ details.family || "未知" }}</div>
            <div class="text-muted-foreground">参数量:</div>
            <div>{{ details.parameter_size || "未知" }}</div>
            <div class="text-muted-foreground">量化方法:</div>
            <div>{{ details.quantization_level || "未知" }}</div>
            <div class="text-muted-foreground">上下文长度:</div>
            <div>{{ details.context_size || "未知" }}</div>
            <div class="text-muted-foreground">模型格式:</div>
            <div>{{ details.format || "未知" }}</div>
            <div class="text-muted-foreground">模型类型:</div>
            <div>{{ details.model_type || "未知" }}</div>
            <div class="text-muted-foreground">架构:</div>
            <div>{{ details.architecture || "未知" }}</div>
            <div class="text-muted-foreground">创建时间:</div>
            <div>{{ details.created_at ? new Date(details.created_at).toLocaleString() : "未知" }}</div>
          </div>
        </div>

        <!-- 系统提示词 -->
        <div class="space-y-2">
          <h4 class="font-medium">系统提示词</h4>
          <p class="text-sm text-muted-foreground whitespace-pre-wrap">{{ details.system_prompt || "无" }}</p>
        </div>

        <!-- 许可证 -->
        <div class="space-y-2">
          <h4 class="font-medium">许可证</h4>
          <p class="text-sm text-muted-foreground">{{ details.license || "未知" }}</p>
        </div>

        <!-- 下载选项 -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-medium">下载选项</h4>
            <div class="flex items-center gap-2">
              <Select v-model="selectedVariant" :disabled="!model?.variants?.length">
                <SelectTrigger class="w-[180px]">
                  <SelectValue :placeholder="model?.variants?.[0] || '默认'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="variant in model?.variants" :key="variant" :value="variant">
                    {{ variant }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button @click="handleDownload" :disabled="isDownloading" class="min-w-[100px]">
                <Download class="mr-2 h-4 w-4" />
                {{ isDownloading ? "下载中..." : "下载" }}
              </Button>
            </div>
          </div>

          <!-- 下载进度 -->
          <div v-if="isDownloading" class="space-y-2">
            <Progress :value="progress?.percent || 0" class="h-2" />
            <div class="flex justify-between text-xs text-muted-foreground">
              <span>{{ progress?.status === "downloading" ? "下载中" : "处理中" }}</span>
              <span v-if="progress?.status === 'downloading'"> {{ progress.downloaded }}/{{ progress.total }} </span>
              <span v-else>{{ progress?.message || "准备中..." }}</span>
            </div>
          </div>

          <!-- 下载说明 -->
          <div class="text-sm text-muted-foreground">
            <p>选择合适的模型变体进行下载。不同变体在模型大小和性能之间有所权衡。</p>
            <p v-if="details.parameter_size" class="mt-1">当前模型参数量: {{ details.parameter_size }}</p>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" @click="$emit('update:show', false)">关闭</Button>
        <Button v-if="details?.status === 'not_installed'" variant="default" @click="handleDownload" :disabled="isDownloading">
          <Download class="mr-2 h-4 w-4" />
          {{ isDownloading ? "下载中..." : "开始下载" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref, watch } from "vue";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { Download } from "lucide-vue-next";
import { useModelStore } from "../stores/modelStore";
import { useToast } from "../components/ui/toast";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";

const props = defineProps({
  show: Boolean,
  model: Object,
});

const emit = defineEmits(["update:show"]);
const modelStore = useModelStore();
const { toast } = useToast();

const details = ref(null);
const selectedVariant = ref("");
const isDownloading = ref(false);
const progress = ref(null);

// 监听模型变化，获取详情
watch(
  () => props.model,
  async (newModel) => {
    if (newModel) {
      try {
        details.value = await modelStore.getModelDetails(newModel.name);
        selectedVariant.value = newModel.variants?.[0] || "";
      } catch (error) {
        console.error("获取模型详情失败:", error);
        toast({
          variant: "destructive",
          title: "获取详情失败",
          description: error.message,
        });
      }
    } else {
      details.value = null;
    }
  },
  { immediate: true }
);

// 处理下载
async function handleDownload() {
  if (!props.model || isDownloading.value) return;

  isDownloading.value = true;
  progress.value = {
    status: "preparing",
    percent: 0,
    message: "准备下载...",
  };

  try {
    const modelName = selectedVariant.value ? `${props.model.name.toLowerCase()}:${selectedVariant.value.toLowerCase()}` : props.model.name.toLowerCase();

    await modelStore.downloadModel(modelName, (p) => {
      progress.value = {
        ...p,
        percent: parseFloat(p.percent) || 0,
      };
    });

    toast({
      title: "下载成功",
      description: `模型 ${modelName} 下载完成`,
    });
    emit("update:show", false);
  } catch (error) {
    console.error("下载失败:", error);
    toast({
      variant: "destructive",
      title: "下载失败",
      description: error.message,
    });
  } finally {
    isDownloading.value = false;
    progress.value = null;
  }
}
</script>
