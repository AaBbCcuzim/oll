<template>
  <div class="container py-6">
    <!-- 头部 -->
    <div class="mb-6">
      <h2 class="text-2xl font-semibold tracking-tight flex items-center gap-2">
        <Settings2 class="h-6 w-6" />
        设置
      </h2>
      <p class="text-sm text-muted-foreground mt-1">管理应用程序的设置和偏好</p>
    </div>

    <div class="max-w-2xl space-y-6">
      <!-- Ollama 服务器设置 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Server class="h-5 w-5" />
            Ollama 服务器
          </CardTitle>
          <CardDescription>配置 Ollama 服务器连接设置</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>服务器地址</Label>
            <div class="flex gap-2">
              <Input v-model="settings.baseUrl" placeholder="http://localhost:11434" />
              <Button variant="outline" @click="testConnection" :disabled="isTestingConnection">
                {{ isTestingConnection ? "测试中..." : "测试连接" }}
              </Button>
            </div>
            <p class="text-sm text-muted-foreground">默认地址为 http://localhost:11434，如果你修改了 Ollama 的端口，请在这里更新</p>
          </div>
        </CardContent>
      </Card>

      <!-- 下载设置 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Download class="h-5 w-5" />
            下载设置
          </CardTitle>
          <CardDescription>配置模型下载相关选项</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>自动检查更新</Label>
              <p class="text-sm text-muted-foreground">定期检查模型更新并提醒</p>
            </div>
            <Switch v-model="settings.autoUpdate" />
          </div>
        </CardContent>
      </Card>

      <!-- 保存按钮 -->
      <div class="flex justify-end">
        <Button @click="saveSettings" :disabled="isSaving">
          {{ isSaving ? "保存中..." : "保存设置" }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useSettingStore } from "../stores/settingStore";
import { toast } from "../components/ui/toast";
import { withLoading } from "../utils/loading";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Settings2, Server, Download } from "lucide-vue-next";

defineOptions({
  name: "Settings",
});

const settingStore = useSettingStore();
const settings = ref({
  baseUrl: "",
  autoUpdate: false,
});
const isTestingConnection = ref(false);
const isSaving = ref(false);

// 测试连接
async function testConnection() {
  if (isTestingConnection.value) return;
  isTestingConnection.value = true;

  try {
    const response = await withLoading(fetch(`${settings.value.baseUrl}/api/version`), "正在测试连接...");
    const data = await response.json();
    toast({
      title: "连接成功",
      description: `Ollama 版本: ${data.version}`,
    });
  } catch (error) {
    console.error("连接测试失败:", error);
    toast({
      variant: "destructive",
      title: "连接失败",
      description: "请检查服务器地址是否正确",
    });
  } finally {
    isTestingConnection.value = false;
  }
}

// 保存设置
async function saveSettings() {
  if (isSaving.value) return;
  isSaving.value = true;

  try {
    await settingStore.saveSettings(settings.value);
    toast({
      title: "保存成功",
      description: "设置已更新",
    });
  } catch (error) {
    console.error("保存设置失败:", error);
    toast({
      variant: "destructive",
      title: "保存失败",
      description: "设置保存失败",
    });
  } finally {
    isSaving.value = false;
  }
}

// 加载设置
onMounted(async () => {
  const savedSettings = await settingStore.loadSettings();
  settings.value = {
    ...settings.value,
    ...savedSettings,
  };
});
</script>
