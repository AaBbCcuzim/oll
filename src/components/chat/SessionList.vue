<script setup>
import { ref, computed, nextTick } from "vue";
import { useChatStore } from "../../stores/chatStore";
import { MessageSquare, Trash2, Search, Plus, MoreVertical, Download, Upload, Edit2 } from "lucide-vue-next";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "../../utils/toast";
import draggable from "vuedraggable";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";

const props = defineProps({
  selectedModel: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["select"]);
const chatStore = useChatStore();
const searchQuery = ref("");

// 过滤并按时间分组的会话列表
const groupedSessions = computed(() => {
  const filtered = chatStore.sessions.filter((session) => {
    const modelMatch = session.modelName.toLowerCase().includes(searchQuery.value.toLowerCase());
    const messageMatch = session.messages.some((msg) => msg.content.toLowerCase().includes(searchQuery.value.toLowerCase()));
    const nameMatch = session.name?.toLowerCase().includes(searchQuery.value.toLowerCase());
    return modelMatch || messageMatch || nameMatch;
  });

  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };

  filtered.forEach((session) => {
    const date = new Date(session.createdAt);
    if (isToday(date)) {
      groups.today.push(session);
    } else if (isYesterday(date)) {
      groups.yesterday.push(session);
    } else if (isThisWeek(date)) {
      groups.thisWeek.push(session);
    } else if (isThisMonth(date)) {
      groups.thisMonth.push(session);
    } else {
      groups.older.push(session);
    }
  });

  // 每个组内按时间倒序排序
  Object.values(groups).forEach((group) => {
    group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  return groups;
});

// 格式化时间
function formatTime(date) {
  const dateObj = new Date(date);
  if (isToday(dateObj)) {
    return format(dateObj, "HH:mm", { locale: zhCN });
  }
  if (isYesterday(dateObj)) {
    return "昨天 " + format(dateObj, "HH:mm", { locale: zhCN });
  }
  if (isThisWeek(dateObj)) {
    return format(dateObj, "EEEE HH:mm", { locale: zhCN });
  }
  return format(dateObj, "yyyy年M月d日", { locale: zhCN });
}

// 选择会话
async function selectSession(session) {
  try {
    chatStore.switchSession(session.id);
    await nextTick();
    emit("select", session.modelName);
  } catch (error) {
    console.error("切换会话失败:", error);
    toast("切换会话失败", "error");
  }
}

// 删除会话
function deleteSession(sessionId) {
  chatStore.deleteSession(sessionId);
  if (sessionId === chatStore.currentSessionId) {
    emit("select", "");
  }
}

// 重命名会话
const editingSession = ref(null);
const newName = ref("");

function startRename(session) {
  editingSession.value = session;
  newName.value = session.name || session.modelName;
}

function saveRename() {
  if (editingSession.value && newName.value.trim()) {
    chatStore.renameSession(editingSession.value.id, newName.value.trim());
    editingSession.value = null;
  }
}

// 导出会话
function exportAllSessions() {
  const data = chatStore.exportSessions();
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-sessions-${format(new Date(), "yyyy-MM-dd-HH-mm")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 导入会话
function onFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type !== "application/json") {
    toast("请选择 JSON 文件", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      if (chatStore.importSessions(text)) {
        toast("导入会话成功", "success");
      } else {
        toast("导入会话失败：无效的文件格式", "error");
      }
    } catch (error) {
      console.error("导入会话失败:", error);
      toast("导入会话失败", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = ""; // 重置文件输入，允许重复选择相同文件
}

// 新建会话
async function createNewSession() {
  if (!props.selectedModel) {
    toast("请先选择一个模型", "error");
    return;
  }
  try {
    // 创建新会话
    const session = chatStore.createSession(props.selectedModel);
    // 切换到新会话
    chatStore.switchSession(session.id);
    // 通知父组件模型选择
    emit("select", props.selectedModel);
  } catch (error) {
    console.error("创建会话失败:", error);
    toast("创建会话失败", "error");
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 头部搜索区域 -->
    <div class="p-4 border-b">
      <div class="flex gap-2">
        <Input v-model="searchQuery" placeholder="搜索会话..." class="flex-1">
          <template #prefix>
            <Search class="h-4 w-4 text-muted-foreground" />
          </template>
        </Input>
        <Button variant="outline" size="icon" @click.stop="createNewSession" title="新建会话">
          <Plus class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- 会话列表 -->
    <ScrollArea class="flex-1">
      <div class="p-2">
        <div v-if="chatStore.sessions.length > 0">
          <draggable :list="chatStore.sessions" :item-key="'id'" @end="chatStore.reorderSessions(chatStore.sessions)" handle=".drag-handle" class="space-y-1">
            <template #item="{ element: session }">
              <Card class="group transition-colors cursor-pointer" :class="{ 'bg-muted': session.id === chatStore.currentSessionId }" @click="selectSession(session)">
                <CardContent class="p-3 flex items-center gap-3">
                  <MessageSquare class="h-5 w-5 shrink-0 drag-handle cursor-move" />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <div class="font-medium truncate">
                        {{ session.name || `${session.modelName} 的对话` }}
                      </div>
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" @click.stop="() => startRename(session)" title="重命名">
                          <Edit2 class="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" @click.stop="() => deleteSession(session.id)" title="删除">
                          <Trash2 class="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div class="text-sm text-muted-foreground truncate">
                      {{ session.messages[session.messages.length - 1]?.content || "新会话" }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ formatTime(session.createdAt) }}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </template>
          </draggable>
        </div>

        <!-- 空状态 -->
        <div v-else class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <MessageSquare class="h-12 w-12 mb-4" />
          <p class="mb-2">没有聊天记录</p>
          <p class="text-sm">选择一个模型开始聊天</p>
        </div>
      </div>
    </ScrollArea>

    <!-- 重命名对话框 -->
    <Dialog :open="!!editingSession" @update:open="editingSession = null">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名会话</DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <Input v-model="newName" placeholder="输入新名称..." />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="editingSession = null">取消</Button>
          <Button @click="saveRename">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.drag-handle {
  cursor: move;
  touch-action: none;
}

.sortable-ghost {
  opacity: 0.5;
  background: hsl(var(--background));
}

.sortable-drag {
  background: hsl(var(--card));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.sortable-chosen {
  background: hsl(var(--card));
}
</style>
