<template>
  <div class="flex h-full">
    <!-- 会话列表 -->
    <div class="w-64 shrink-0 border-r">
      <SessionList :selected-model="selectedModel" @select="onModelSelect" />
    </div>

    <!-- 聊天区域 -->
    <div class="flex-1 flex flex-col max-w-full">
      <!-- 空状态提示 -->
      <div v-if="!chatStore.currentSessionId" class="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
        <MessageSquare class="h-16 w-16 mb-6" />
        <h3 class="text-xl font-semibold mb-2">开始新的对话</h3>
        <p class="mb-6 max-w-md">选择一个模型并点击左侧的"+"按钮创建新对话，或者从历史会话中选择一个继续聊天。</p>
      </div>

      <!-- 聊天界面 -->
      <template v-else>
        <!-- 头部工具栏 -->
        <header class="p-4 border-b space-y-4">
          <!-- 主要工具栏 -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <MessageSquare class="h-5 w-5" />
              <h2 class="text-xl font-semibold">聊天</h2>
            </div>

            <div class="flex items-center gap-2">
              <!-- 模型选择 -->
              <Select v-model="selectedModel" @update:modelValue="onModelSelect">
                <SelectTrigger class="w-[180px]">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="model in availableModels" :key="model.name" :value="model.name">
                    {{ model.name }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <!-- 保存会话 -->
              <Button v-if="messages.length" variant="ghost" size="icon" @click="saveSession" title="保存会话">
                <Save class="h-5 w-5" />
              </Button>

              <!-- 系统提示词 -->
              <Button variant="ghost" size="icon" @click="showSystemPrompt = !showSystemPrompt" :class="{ 'bg-muted': showSystemPrompt }" title="系统提示词">
                <Settings class="h-5 w-5" />
              </Button>

              <!-- 导出聊天记录 -->
              <Button v-if="messages.length" variant="ghost" size="icon" @click="exportChatHistory" title="导出聊天记录">
                <Download class="h-5 w-5" />
              </Button>

              <!-- 删除会话 -->
              <Button v-if="chatStore.currentSessionId" variant="ghost" size="icon" @click="deleteCurrentSession" title="删除会话">
                <Trash2 class="h-5 w-5" />
              </Button>
            </div>
          </div>

          <!-- 系统提示词设置 -->
          <div v-if="showSystemPrompt" class="flex gap-2">
            <Input v-model="systemPrompt" placeholder="输入系统提示词..." @keyup.enter="updateSystemPrompt" />
            <Button @click="updateSystemPrompt">保存</Button>
          </div>
        </header>

        <!-- 聊天记录 -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto">
          <div class="max-w-4xl mx-auto w-full p-4 space-y-4">
            <div v-for="(message, index) in messages" :key="index" class="group flex gap-4 px-4" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
              <div class="flex flex-col gap-2 max-w-[85%] min-w-0">
                <!-- 加载指示器 -->
                <div v-if="isGenerating && index === messages.length - 1 && message.role === 'assistant'" class="absolute -left-10 top-2">
                  <Loading />
                </div>

                <Card :class="message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'">
                  <CardContent class="p-3 break-words" :class="message.role === 'user' ? 'text-white' : 'text-zinc-800'">
                    <Markdown v-if="message.role === 'assistant'" :content="message.content" />
                    <div v-else>{{ message.content }}</div>
                  </CardContent>
                </Card>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                  <MessageActions :message="message" :is-assistant="message.role === 'assistant'" @copy="copyMessage(message.content)" @delete="deleteMessage(index)" @regenerate="regenerateMessage(index)" @favorite="toggleFavorite(index)" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入框 -->
        <footer class="p-4 max-w-4xl mx-auto w-full">
          <div class="flex gap-2">
            <Input v-model="input" placeholder="输入消息..." @keyup.enter="handleMessage" :disabled="!selectedModel || isGenerating" />
            <Button v-if="isGenerating" variant="destructive" @click="stopGeneration"> 停止 </Button>
            <Button v-else @click="handleMessage" :disabled="!input || !selectedModel"> 发送 </Button>
          </div>
        </footer>
      </template>
    </div>
  </div>

  <!-- 保存会话对话框 -->
  <Dialog :open="showSaveDialog" @update:open="showSaveDialog = false">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>保存会话</DialogTitle>
      </DialogHeader>
      <div class="py-4">
        <Input v-model="sessionName" placeholder="输入会话名称..." @keyup.enter="confirmSaveSession" />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showSaveDialog = false">取消</Button>
        <Button @click="confirmSaveSession">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useModelStore } from "../stores/modelStore";
import { useChatStore } from "../stores/chatStore";
import { toast } from "../utils/toast";
import Loading from "../components/ui/Loading.vue";
import Markdown from "../components/ui/Markdown.vue";
import SessionList from "../components/chat/SessionList.vue";
import { withLoading } from "../utils/loading";
import { MessageSquare, Trash2, MoreVertical, Download, Copy, Repeat, Settings, Save } from "lucide-vue-next";
import { format } from "date-fns";
import MessageActions from "../components/chat/MessageActions.vue";
import { useRoute } from "vue-router";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";

defineOptions({
  name: "Chat",
});

const modelStore = useModelStore();
const chatStore = useChatStore();
const selectedModel = ref("");
const input = ref("");
const isGenerating = ref(false);
const messagesContainer = ref(null);
const controller = ref(null);
const systemPrompt = ref("");
const showSystemPrompt = ref(false);
const showSaveDialog = ref(false);
const sessionName = ref("");
const route = useRoute();

// 过滤已安装的模型列表
const availableModels = computed(() => modelStore.localModels);

// 当前会话的消息
const messages = computed(() => chatStore.getCurrentSession()?.messages || []);

// 监听模型选择
async function onModelSelect(model) {
  selectedModel.value = model;
  try {
    if (model && (!chatStore.currentSessionId || chatStore.getCurrentSession()?.modelName !== model)) {
      const session = chatStore.createSession(model);
      chatStore.switchSession(session.id);
    }
  } catch (error) {
    console.error("选择模型失败:", error);
    toast("选择模型失败", "error");
  }
}

// 停止生成
function stopGeneration() {
  if (controller.value) {
    controller.value.abort();
    controller.value = null;
    isGenerating.value = false;
  }
}

// 删除当前会话
function deleteCurrentSession() {
  if (chatStore.currentSessionId) {
    chatStore.deleteSession(chatStore.currentSessionId);
    selectedModel.value = "";
  }
}

// 滚动到底部
async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    const container = messagesContainer.value;
    container.scrollTop = container.scrollHeight;
  }
}

// 更新系统提示词
function updateSystemPrompt() {
  if (chatStore.currentSessionId) {
    chatStore.updateSystemPrompt(chatStore.currentSessionId, systemPrompt.value);
    showSystemPrompt.value = false;
  }
}

const handleMessage = async () => {
  if (!input.value || !selectedModel.value || isGenerating.value) return;

  const userMessage = input.value;
  input.value = "";

  chatStore.addMessage({
    role: "user",
    content: userMessage,
  });

  await scrollToBottom();
  isGenerating.value = true;
  controller.value = new AbortController();

  try {
    const stream = await chatStore.sendMessage(userMessage, {
      signal: controller.value.signal,
    });

    let content = "";
    for await (const chunk of stream) {
      // chunk 现在直接是文本内容
      content = chunk;

      const lastMessage = chatStore.getCurrentSession().messages.at(-1);
      if (lastMessage?.role === "assistant") {
        lastMessage.content = content;
      } else {
        chatStore.addMessage({
          role: "assistant",
          content,
        });
      }
      await scrollToBottom();
    }
  } catch (error) {
    if (error.name === "AbortError") {
      toast("已停止生成", "info");
    } else {
      console.error("生成回复失败:", error);
      toast("生成回复失败，请重试", "error");
    }
  } finally {
    isGenerating.value = false;
    controller.value = null;
  }
};

// 重新生成消息
const regenerateMessage = async (index) => {
  if (!selectedModel.value || isGenerating.value) return;

  isGenerating.value = true;
  controller.value = new AbortController();

  try {
    const stream = await chatStore.regenerateMessage(chatStore.currentSessionId, index + 1, { signal: controller.value.signal });

    let content = "";
    for await (const chunk of stream) {
      // chunk 现在直接是文本内容
      content = chunk;

      const lastMessage = chatStore.getCurrentSession().messages.at(-1);
      if (lastMessage?.role === "assistant") {
        lastMessage.content = content;
      } else {
        chatStore.addMessage({
          role: "assistant",
          content,
        });
      }
      await scrollToBottom();
    }
  } catch (error) {
    if (error.name === "AbortError") {
      toast("已停止生成", "info");
    } else {
      console.error("生成回复失败:", error);
      toast("生成回复失败，请重试", "error");
    }
  } finally {
    isGenerating.value = false;
    controller.value = null;
  }
};

// 页面加载时初始化
onMounted(async () => {
  try {
    await withLoading(modelStore.fetchLocalModels(), "正在获取可用模型...");
    chatStore.loadFromLocalStorage();

    // 从 URL 参数加载指定会话
    const sessionId = route.query.session;
    if (sessionId && chatStore.sessions.some((s) => s.id === sessionId)) {
      chatStore.switchSession(sessionId);
      const session = chatStore.getCurrentSession();
      selectedModel.value = session.modelName;
    } else if (chatStore.currentSessionId) {
      const session = chatStore.getCurrentSession();
      selectedModel.value = session.modelName;
    }
  } catch (error) {
    console.error("初始化失败:", error);
    toast("初始化失败", "error");
  }
});

// 导出聊天记录
function exportChatHistory() {
  const session = chatStore.getCurrentSession();
  if (!session) return;

  const data = {
    modelName: session.modelName,
    messages: session.messages,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-history-${session.modelName}-${format(new Date(), "yyyy-MM-dd-HH-mm")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 复制消息
async function copyMessage(content) {
  try {
    await navigator.clipboard.writeText(content);
    toast("消息已复制", "success");
  } catch (error) {
    console.error("复制失败:", error);
    toast("复制失败", "error");
  }
}

// 删除消息
function deleteMessage(index) {
  const session = chatStore.getCurrentSession();
  if (session) {
    session.messages.splice(index, 1);
    chatStore.saveToLocalStorage();
  }
}

// 收藏消息
function toggleFavorite(index) {
  chatStore.toggleFavorite(chatStore.currentSessionId, index);
}

// 保存会话
async function saveSession() {
  const session = chatStore.getCurrentSession();
  if (!session) return;
  sessionName.value = `${session.modelName} - ${format(new Date(), "MM-dd HH:mm")}`;
  showSaveDialog.value = true;
}

// 确认保存会话
async function confirmSaveSession() {
  try {
    if (!sessionName.value.trim()) {
      toast("请输入会话名称", "error");
      return;
    }
    chatStore.renameSession(chatStore.currentSessionId, sessionName.value.trim());
    showSaveDialog.value = false;
    toast("会话已保存", "success");
  } catch (error) {
    console.error("保存会话失败:", error);
    toast("保存会话失败", "error");
  }
}
</script>

<style scoped>
.markdown-body {
  @apply text-sm leading-normal;
}

.markdown-body pre {
  @apply p-4 rounded-lg bg-zinc-900 my-2;
}

.markdown-body code {
  @apply font-mono text-sm;
}

.markdown-body p {
  @apply my-2;
}

.markdown-body ul,
.markdown-body ol {
  @apply my-2 pl-6;
}

.markdown-body ul {
  @apply list-disc;
}

.markdown-body ol {
  @apply list-decimal;
}

.markdown-body a {
  @apply text-primary underline;
}

.markdown-body blockquote {
  @apply border-l-4 border-muted pl-4 my-2;
}
</style>
