<script setup>
import { ref, computed, watchEffect, onMounted, onUnmounted } from "vue";
import { useChatStore } from "../stores/chatStore";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Bookmark, MessageSquare, ExternalLink, Search, Tag, Trash2, Plus, ArrowUpDown, Download, Upload, Edit2, Settings, Calendar, Share2, List, Grid } from "lucide-vue-next";
import { useRouter } from "vue-router";
import Markdown from "../components/ui/Markdown.vue";
import { toast } from "../utils/toast";
import draggable from "vuedraggable";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Checkbox } from "../components/ui/checkbox";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Collapsible, CollapsibleContent } from "../components/ui/collapsible";

defineOptions({
  name: "Favorites",
});

const chatStore = useChatStore();
const router = useRouter();
const searchQuery = ref("");
const selectedTag = ref("");
const selectedMessages = ref(new Set());
const showTagInput = ref(false);
const newTag = ref("");
const sortBy = ref("time");
const sortOrder = ref("desc");
const showTagManager = ref(false);
const editingTag = ref(null);
const newTagName = ref("");
const groupBy = ref("none");
const showColorPicker = ref(false);
const editingTagColor = ref(null);
const selectedColor = ref("");
const viewMode = ref("detail"); // detail, compact
const showExportDialog = ref(false);
const exportFormat = ref("json"); // json, markdown, text

// 搜索相关
const showAdvancedSearch = ref(false);
const searchHistory = ref([]);
const searchFilters = ref({
  content: "",
  model: "",
  tags: [],
  dateRange: {
    start: "",
    end: "",
  },
});

const colors = ["bg-red-500", "bg-yellow-500", "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-teal-500"];

// 所有可用标签
const availableTags = computed(() => chatStore.getAllTags());

// 过滤并排序的收藏消息
const filteredFavorites = computed(() => {
  return [...chatStore.getFavoriteMessages()]
    .filter((message) => {
      const matchesSearch = message.content.toLowerCase().includes(searchQuery.value.toLowerCase());
      const matchesTag = selectedTag.value === "all" || !selectedTag.value || (message.tags && message.tags.includes(selectedTag.value));
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
});

// 排序的收藏消息
const sortedFavorites = computed(() => {
  return [...filteredFavorites.value].sort((a, b) => {
    let result = 0;
    switch (sortBy.value) {
      case "time":
        result = new Date(b.timestamp) - new Date(a.timestamp);
        break;
      case "model":
        result = a.modelName.localeCompare(b.modelName);
        break;
      case "tags":
        const aTags = a.tags?.length || 0;
        const bTags = b.tags?.length || 0;
        result = bTags - aTags;
        break;
    }
    return sortOrder.value === "desc" ? result : -result;
  });
});

// 分组的收藏消息
const groupedFavorites = computed(() => {
  const messages = sortedFavorites.value;
  if (groupBy.value === "none") return { 所有消息: messages };

  const groups = {};
  messages.forEach((msg) => {
    let key = "";
    switch (groupBy.value) {
      case "date":
        const date = new Date(msg.timestamp);
        if (isToday(date)) key = "今天";
        else if (isYesterday(date)) key = "昨天";
        else if (isThisWeek(date)) key = "本周";
        else if (isThisMonth(date)) key = "本月";
        else key = format(date, "yyyy年M月", { locale: zhCN });
        break;
      case "model":
        key = msg.modelName;
        break;
      case "tag":
        if (!msg.tags?.length) {
          key = "未分类";
        } else {
          msg.tags.forEach((tag) => {
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(msg);
          });
          return;
        }
        break;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  });
  return groups;
});

// 格式化时间
function formatTime(date) {
  return format(new Date(date), "yyyy年M月d日 HH:mm", { locale: zhCN });
}

// 跳转到对话
function goToChat(sessionId) {
  router.push(`/chat?session=${sessionId}`);
}

// 切换消息选择
function toggleMessageSelection(message) {
  const key = `${message.sessionId}-${message.messageIndex}`;
  if (selectedMessages.value.has(key)) {
    selectedMessages.value.delete(key);
  } else {
    selectedMessages.value.add(key);
  }
}

// 批量取消收藏
function unfavoriteSelected() {
  const items = Array.from(selectedMessages.value).map((key) => {
    const [sessionId, messageIndex] = key.split("-");
    return { sessionId, messageIndex: parseInt(messageIndex) };
  });
  chatStore.unfavoriteMessages(items);
  selectedMessages.value.clear();
}

// 添加标签
function addTag(message) {
  if (!newTag.value.trim()) return;
  const tags = new Set(message.tags || []);
  tags.add(newTag.value.trim());
  chatStore.updateFavoriteTags(message.sessionId, message.messageIndex, Array.from(tags));
  newTag.value = "";
  showTagInput.value = false;
}

// 移除标签
function removeTag(message, tag) {
  const tags = new Set(message.tags || []);
  tags.delete(tag);
  chatStore.updateFavoriteTags(message.sessionId, message.messageIndex, Array.from(tags));
}

// 导出格式选项
const exportFormats = [
  { value: "json", label: "JSON", description: "完整数据，支持导入" },
  { value: "markdown", label: "Markdown", description: "富文本格式，适合分享" },
  { value: "text", label: "纯文本", description: "纯文本格式，通用性强" },
];

// 导出收藏
function exportFavorites() {
  const messages = chatStore.getFavoriteMessages();
  let data = "";
  let filename = `favorites-${format(new Date(), "yyyy-MM-dd-HH-mm")}`;

  switch (exportFormat.value) {
    case "json":
      data = chatStore.exportFavorites();
      filename += ".json";
      break;
    case "markdown":
      data = messages.map((msg) => `## ${msg.modelName}\n\n` + `> ${formatTime(msg.timestamp)}\n\n` + `${msg.content}\n\n` + (msg.tags?.length ? `标签: ${msg.tags.join(", ")}\n` : "") + "---\n").join("\n");
      filename += ".md";
      break;
    case "text":
      data = messages.map((msg) => `[${msg.modelName}] ${formatTime(msg.timestamp)}\n\n` + `${msg.content}\n` + (msg.tags?.length ? `标签: ${msg.tags.join(", ")}\n` : "") + "-------------------\n").join("\n");
      filename += ".txt";
      break;
  }

  const blob = new Blob([data], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showExportDialog.value = false;
}

// 导入收藏
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
      if (chatStore.importFavorites(text)) {
        toast("导入收藏成功", "success");
      } else {
        toast("导入收藏失败：无效的文件格式", "error");
      }
    } catch (error) {
      console.error("导入收藏失败:", error);
      toast("导入收藏失败", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

// 批量添加标签
function addTagsToSelected() {
  if (!newTag.value.trim()) return;
  const items = Array.from(selectedMessages.value).map((key) => {
    const [sessionId, messageIndex] = key.split("-");
    return { sessionId, messageIndex: parseInt(messageIndex) };
  });
  const tags = new Set([newTag.value.trim()]);
  chatStore.updateTagsForMessages(items, Array.from(tags));
  newTag.value = "";
  selectedMessages.value.clear();
}

// 重命名标签
function startRenameTag(tag) {
  editingTag.value = tag;
  newTagName.value = tag;
}

function saveRenameTag() {
  if (editingTag.value && newTagName.value.trim() && newTagName.value !== editingTag.value) {
    chatStore.renameTag(editingTag.value, newTagName.value.trim());
    editingTag.value = null;
  }
}

// 删除标签
function deleteTag(tag) {
  if (confirm(`确定要删除标签 "${tag}" 吗？`)) {
    chatStore.deleteTag(tag);
  }
}

// 更新标签颜色
function updateColor(tag, color) {
  chatStore.updateTagColor(tag, color);
  showColorPicker.value = false;
  editingTagColor.value = null;
}

// 获取标签颜色
function getTagColor(tag) {
  return chatStore.getTagColor(tag) || "bg-muted";
}

// 统计信息
const statistics = computed(() => {
  const allMessages = chatStore.getFavoriteMessages();
  const models = new Set(allMessages.map((msg) => msg.modelName));
  const tags = new Set(allMessages.flatMap((msg) => msg.tags || []));

  return {
    total: allMessages.length,
    models: models.size,
    tags: tags.size,
    withTags: allMessages.filter((msg) => msg.tags?.length).length,
    withoutTags: allMessages.filter((msg) => !msg.tags?.length).length,
  };
});

// 快速过滤标签
const tagFilters = computed(() => {
  const allMessages = chatStore.getFavoriteMessages();
  return Array.from(availableTags.value).map((tag) => ({
    tag,
    count: allMessages.filter((msg) => msg.tags?.includes(tag)).length,
  }));
});

// 分享消息
async function shareMessage(message) {
  try {
    await navigator.share({
      title: `来自 ${message.modelName} 的回复`,
      text: message.content,
    });
    toast("分享成功", "success");
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("分享失败:", error);
      toast("分享失败", "error");
    }
  }
}

// 标签排序
const tagOrder = ref([]); // 保存标签顺序

// 初始化标签顺序
watchEffect(() => {
  if (availableTags.value.length && !tagOrder.value.length) {
    tagOrder.value = availableTags.value;
  }
});

// 更新标签顺序
function onTagOrderChange() {
  // 可以在这里保存标签顺序到本地存储
  localStorage.setItem("tag-order", JSON.stringify(tagOrder.value));
}

// 批量标签管理
const showBatchTagDialog = ref(false);
const selectedTags = ref(new Set());

// 批量更新标签
function updateSelectedTags() {
  const items = Array.from(selectedMessages.value).map((key) => {
    const [sessionId, messageIndex] = key.split("-");
    return { sessionId, messageIndex: parseInt(messageIndex) };
  });
  chatStore.updateTagsForMessages(items, Array.from(selectedTags.value));
  showBatchTagDialog.value = false;
  selectedMessages.value.clear();
}

// 标签快捷键导航
const tagRefs = ref({});
const currentTagIndex = ref(-1);

// 快捷键处理
function handleKeydown(event) {
  // Alt + N: 新建标签
  if (event.altKey && event.key === "n") {
    showTagInput.value = true;
    event.preventDefault();
  }
  // Alt + T: 打开标签管理
  if (event.altKey && event.key === "t") {
    showTagManager.value = !showTagManager.value;
    event.preventDefault();
  }
  // Alt + E: 打开导出对话框
  if (event.altKey && event.key === "e") {
    showExportDialog.value = true;
    event.preventDefault();
  }

  // Alt + 方向键：导航标签
  if (event.altKey && showTagManager.value) {
    switch (event.key) {
      case "ArrowUp":
        navigateTag("prev");
        event.preventDefault();
        break;
      case "ArrowDown":
        navigateTag("next");
        event.preventDefault();
        break;
      case "Enter":
        if (currentTagIndex.value >= 0) {
          const tag = sortedTags.value[currentTagIndex.value];
          editingTagCategory.value = tag;
          newCategory.value = tagCategories.value[tag] || "uncategorized";
          showCategoryDialog.value = true;
        }
        event.preventDefault();
        break;
    }
  }
}

// 标签导航
function navigateTag(direction) {
  const tags = sortedTags.value;
  if (!tags.length) return;

  if (direction === "prev") {
    currentTagIndex.value = currentTagIndex.value <= 0 ? tags.length - 1 : currentTagIndex.value - 1;
  } else {
    currentTagIndex.value = currentTagIndex.value >= tags.length - 1 ? 0 : currentTagIndex.value + 1;
  }

  // 滚动到当前标签
  const tagEl = tagRefs.value[tags[currentTagIndex.value]];
  if (tagEl) {
    tagEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// 标签使用建议
const tagSuggestionsByFrequency = computed(() => {
  const suggestions = [];
  const allMessages = chatStore.getFavoriteMessages();
  const currentTags = new Set(allMessages.flatMap((msg) => msg.tags || []));

  // 分析标签共现关系
  const cooccurrence = {};
  allMessages.forEach((msg) => {
    if (msg.tags && msg.tags.length > 1) {
      msg.tags.forEach((tag1) => {
        msg.tags.forEach((tag2) => {
          if (tag1 !== tag2) {
            cooccurrence[tag1] = cooccurrence[tag1] || {};
            cooccurrence[tag1][tag2] = (cooccurrence[tag1][tag2] || 0) + 1;
          }
        });
      });
    }
  });

  // 根据共现频率推荐标签
  currentTags.forEach((tag) => {
    if (cooccurrence[tag]) {
      const related = Object.entries(cooccurrence[tag])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([relatedTag]) => relatedTag);
      suggestions.push({ tag, related });
    }
  });

  return suggestions;
});

// 标签建议
const tagSuggestions = computed(() => {
  if (!newTag.value.trim()) return [];
  const input = newTag.value.toLowerCase();
  return availableTags.value.filter((tag) => tag.toLowerCase().includes(input) && tag.toLowerCase() !== input).slice(0, 5);
});

// 搜索高亮
function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(regex, '<mark class="bg-yellow-500/20">$1</mark>');
}

// 标签使用频率
const tagFrequency = computed(() => {
  const frequency = {};
  const allMessages = chatStore.getFavoriteMessages();
  allMessages.forEach((msg) => {
    if (msg.tags) {
      msg.tags.forEach((tag) => {
        frequency[tag] = (frequency[tag] || 0) + 1;
      });
    }
  });
  return frequency;
});

// 按使用频率排序的标签
const sortedTags = computed(() => {
  return Array.from(availableTags.value).sort((a, b) => {
    return (tagFrequency.value[b] || 0) - (tagFrequency.value[a] || 0);
  });
});

// 标签分类
const tagCategories = ref({});
const showCategoryDialog = ref(false);
const editingTagCategory = ref(null);
const newCategory = ref("");

// 预定义的标签分类
const defaultCategories = [
  { id: "general", name: "通用" },
  { id: "topic", name: "主题" },
  { id: "status", name: "状态" },
  { id: "priority", name: "优先级" },
];

// 标签搜索
const tagSearchQuery = ref("");
const filteredTags = computed(() => {
  const query = tagSearchQuery.value.toLowerCase();
  return sortedTags.value.filter((tag) => tag.toLowerCase().includes(query) || tagCategories.value[tag]?.toLowerCase().includes(query));
});

// 按分类分组的标签
const groupedTags = computed(() => {
  const groups = {};
  defaultCategories.forEach((category) => {
    groups[category.id] = [];
  });
  groups.uncategorized = [];

  filteredTags.value.forEach((tag) => {
    const category = tagCategories.value[tag] || "uncategorized";
    if (groups[category]) {
      groups[category].push(tag);
    } else {
      groups.uncategorized.push(tag);
    }
  });

  return groups;
});

// 更新标签分类
function updateCategory() {
  if (editingTagCategory.value && newCategory.value) {
    chatStore.updateTagCategory(editingTagCategory.value, newCategory.value);
    tagCategories.value[editingTagCategory.value] = newCategory.value;
    showCategoryDialog.value = false;
    editingTagCategory.value = null;
    newCategory.value = "";
  }
}

// 标签合并
const showMergeDialog = ref(false);
const selectedSourceTags = ref([]);
const targetTag = ref("");

// 合并标签
function mergeTags() {
  if (selectedSourceTags.value.length && targetTag.value && targetTag.value !== "none") {
    chatStore.mergeTags(selectedSourceTags.value, targetTag.value);
    showMergeDialog.value = false;
    selectedSourceTags.value = [];
    targetTag.value = "";
  }
}

// 导出标签配置
function exportTagSettings() {
  const data = chatStore.exportTagSettings();
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tag-settings-${format(new Date(), "yyyy-MM-dd-HH-mm")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 导入标签配置
function importTagSettings(event) {
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
      if (chatStore.importTagSettings(text)) {
        toast("导入标签配置成功", "success");
      } else {
        toast("导入标签配置失败：无效的文件格式", "error");
      }
    } catch (error) {
      console.error("导入标签配置失败:", error);
      toast("导入标签配置失败", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

// 从本地存储加载搜索历史
onMounted(() => {
  // 加载保存的标签顺序
  const savedOrder = localStorage.getItem("tag-order");
  if (savedOrder) {
    tagOrder.value = JSON.parse(savedOrder);
  }
  // 添加快捷键监听
  window.addEventListener("keydown", handleKeydown);
  tagCategories.value = chatStore.getTagCategories();
  const savedHistory = localStorage.getItem("search-history");
  if (savedHistory) {
    searchHistory.value = JSON.parse(savedHistory);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

// 保存搜索历史
function saveSearchHistory(query) {
  if (!query.trim()) return;
  const history = new Set([query, ...searchHistory.value]);
  searchHistory.value = Array.from(history).slice(0, 10);
  localStorage.setItem("search-history", JSON.stringify(searchHistory.value));
}

// 清除搜索历史
function clearSearchHistory() {
  searchHistory.value = [];
  localStorage.removeItem("search-history");
}

// 高级搜索过滤
const advancedFilteredFavorites = computed(() => {
  return chatStore.getFavoriteMessages().filter((message) => {
    // 内容搜索
    if (searchFilters.value.content && !message.content.toLowerCase().includes(searchFilters.value.content.toLowerCase())) {
      return false;
    }
    // 模型过滤
    if (searchFilters.value.model && message.modelName !== searchFilters.value.model) {
      return false;
    }
    // 标签过滤
    if (searchFilters.value.tags.length && !searchFilters.value.tags.every((tag) => message.tags?.includes(tag))) {
      return false;
    }
    // 日期范围过滤
    if (searchFilters.value.dateRange.start || searchFilters.value.dateRange.end) {
      const messageDate = new Date(message.timestamp);
      if (searchFilters.value.dateRange.start && messageDate < new Date(searchFilters.value.dateRange.start)) {
        return false;
      }
      if (searchFilters.value.dateRange.end && messageDate > new Date(searchFilters.value.dateRange.end)) {
        return false;
      }
    }
    return true;
  });
});

// 搜索建议
const searchSuggestions = computed(() => {
  if (!searchQuery.value.trim()) return [];
  const query = searchQuery.value.toLowerCase();
  const suggestions = new Set();

  // 从标签中获取建议
  availableTags.value.forEach((tag) => {
    if (tag.toLowerCase().includes(query)) {
      suggestions.add(`标签: ${tag}`);
    }
  });

  // 从模型名称中获取建议
  const models = new Set(chatStore.getFavoriteMessages().map((msg) => msg.modelName));
  models.forEach((model) => {
    if (model.toLowerCase().includes(query)) {
      suggestions.add(`模型: ${model}`);
    }
  });

  // 从搜索历史中获取建议
  searchHistory.value.forEach((history) => {
    if (history.toLowerCase().includes(query)) {
      suggestions.add(history);
    }
  });

  return Array.from(suggestions).slice(0, 5);
});

// 应用搜索建议
function applySearchSuggestion(suggestion) {
  if (suggestion.startsWith("标签: ")) {
    selectedTag.value = suggestion.slice(4);
    searchQuery.value = "";
  } else if (suggestion.startsWith("模型: ")) {
    searchFilters.value.model = suggestion.slice(4);
    showAdvancedSearch.value = true;
  } else {
    searchQuery.value = suggestion;
  }
  saveSearchHistory(suggestion);
}

// 执行搜索
function performSearch() {
  saveSearchHistory(searchQuery.value);
  // 其他搜索逻辑保持不变
}

// 添加缺失的状态
const availableModels = computed(() => {
  return Array.from(new Set(chatStore.getFavoriteMessages().map((msg) => msg.modelName)));
});

// 添加缺失的方法
function toggleSearchTag(tag) {
  const index = searchFilters.value.tags.indexOf(tag);
  if (index === -1) {
    searchFilters.value.tags.push(tag);
  } else {
    searchFilters.value.tags.splice(index, 1);
  }
}
</script>

<template>
  <div class="container py-6 space-y-6">
    <!-- 头部区域 -->
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-semibold tracking-tight">收藏夹</h2>
        <p class="text-sm text-muted-foreground">共 {{ filteredFavorites.length }} 条收藏消息</p>
      </div>

      <!-- 搜索和工具栏 -->
      <div class="flex items-center gap-2">
        <div class="relative">
          <Search class="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="searchQuery" placeholder="搜索收藏..." class="pl-8 w-[200px]" />
        </div>

        <Select v-model="selectedTag">
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="选择标签" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部标签</SelectItem>
            <SelectItem v-for="tag in availableTags" :key="tag" :value="tag">
              {{ tag }}
            </SelectItem>
          </SelectContent>
        </Select>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" @click="showAdvancedSearch = !showAdvancedSearch">
                <Settings class="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>高级搜索</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    <!-- 高级搜索面板 -->
    <Collapsible v-model:open="showAdvancedSearch">
      <CollapsibleContent>
        <Card class="mt-4">
          <CardContent class="pt-6">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <Label>内容搜索</Label>
                <Input v-model="searchFilters.content" placeholder="搜索内容..." />
              </div>

              <div class="space-y-2">
                <Label>模型</Label>
                <Select v-model="searchFilters.model">
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部模型</SelectItem>
                    <SelectItem v-for="model in availableModels" :key="model" :value="model">
                      {{ model }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2 md:col-span-2">
                <Label>标签</Label>
                <div class="flex flex-wrap gap-2">
                  <Badge v-for="tag in availableTags" :key="tag" :variant="searchFilters.tags.includes(tag) ? 'default' : 'outline'" class="cursor-pointer" @click="toggleSearchTag(tag)">
                    {{ tag }}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>

    <!-- 工具栏 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Select v-model="sortBy">
          <SelectTrigger class="w-[140px]">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">按时间</SelectItem>
            <SelectItem value="model">按模型</SelectItem>
            <SelectItem value="tags">按标签数</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'">
          <ArrowUpDown class="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" class="h-6" />

        <Select v-model="viewMode">
          <SelectTrigger class="w-[140px]">
            <SelectValue placeholder="查看方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="detail">详细视图</SelectItem>
            <SelectItem value="compact">紧凑视图</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" @click="exportFavorites">
          <Download class="mr-2 h-4 w-4" />
          导出
        </Button>
        <Button variant="outline" @click="showTagManager = true">
          <Settings class="mr-2 h-4 w-4" />
          标签管理
        </Button>
      </div>
    </div>

    <!-- 标签管理器 -->
    <Dialog :open="showTagManager" @update:open="showTagManager = false">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>标签管理</DialogTitle>
        </DialogHeader>

        <ScrollArea class="h-[60vh]">
          <div class="space-y-4 pr-4">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <Button @click="showMergeDialog = true"> 合并标签 </Button>
                <Button variant="outline" size="icon" @click="exportTagSettings" title="导出标签配置">
                  <Download class="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <label title="导入标签配置">
                    <Upload class="w-4 h-4" />
                    <input type="file" accept=".json" class="hidden" @change="importTagSettings" />
                  </label>
                </Button>
              </div>
            </div>

            <!-- 标签列表 -->
            <div class="space-y-4">
              <div v-for="category in defaultCategories" :key="category.id" class="space-y-2">
                <Label class="text-muted-foreground">{{ category.name }}</Label>
                <draggable v-model="groupedTags[category.id]" :group="{ name: 'tags' }" item-key="tag" @end="onTagOrderChange" handle=".drag-handle" class="space-y-2">
                  <template #item="{ element: tag }">
                    <Card class="flex items-center justify-between p-2">
                      <div class="flex items-center gap-2">
                        <div
                          :class="[getTagColor(tag), 'w-4 h-4 rounded']"
                          @click="
                            editingTagColor = tag;
                            showColorPicker = true;
                          " />
                        <span>{{ tag }}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          @click="
                            editingTagCategory = tag;
                            newCategory = category.id;
                            showCategoryDialog = true;
                          "
                          title="更改分类">
                          <Settings class="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" @click="deleteTag(tag)" title="删除">
                          <Trash2 class="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </template>
                </draggable>
              </div>
            </div>
          </div>
        </ScrollArea>

        <!-- 标签使用建议 -->
        <div v-if="tagSuggestionsByFrequency.length" class="mt-6 border-t pt-4">
          <h4 class="font-medium mb-3">标签使用建议</h4>
          <div class="space-y-2">
            <div v-for="{ tag, related } in tagSuggestionsByFrequency" :key="tag" class="text-sm">
              <div class="flex items-center gap-2 mb-1">
                <div :class="[getTagColor(tag), 'w-3 h-3 rounded']"></div>
                <span class="font-medium">{{ tag }}</span>
              </div>
              <div class="ml-5 text-muted-foreground">
                经常与
                <span v-for="(relatedTag, index) in related" :key="relatedTag">
                  {{ index > 0 ? "、" : "" }}
                  <span class="text-foreground">{{ relatedTag }}</span>
                </span>
                一起使用
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷键提示 -->
        <div class="mt-4 text-sm text-muted-foreground">
          <p>快捷键：</p>
          <ul class="mt-1 space-y-1">
            <li>Alt + N：新建标签</li>
            <li>Alt + T：打开/关闭标签管理</li>
            <li>Alt + E：导出收藏</li>
            <li>Alt + ↑/↓：导航标签</li>
            <li>Alt + Enter：编辑标签分类</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 分类选择对话框 -->
    <Dialog :open="showCategoryDialog" @update:open="showCategoryDialog = false">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>选择分类</DialogTitle>
        </DialogHeader>
        <div class="space-y-2">
          <label v-for="category in defaultCategories" :key="category.id" class="flex items-center gap-2">
            <RadioGroup v-model="newCategory">
              <RadioGroupItem :value="category.id" />
            </RadioGroup>
            <span>{{ category.name }}</span>
          </label>
        </div>
        <DialogFooter class="mt-6">
          <Button variant="outline" @click="showCategoryDialog = false">取消</Button>
          <Button @click="updateCategory">确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 批量标签管理对话框 -->
    <Dialog :open="showBatchTagDialog" @update:open="showBatchTagDialog = false">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批量管理标签</DialogTitle>
        </DialogHeader>
        <div class="space-y-2 max-h-64 overflow-auto">
          <label v-for="tag in availableTags" :key="tag" class="flex items-center gap-2">
            <Checkbox :value="tag" v-model="selectedTags" />
            <span>{{ tag }}</span>
          </label>
        </div>
        <DialogFooter class="mt-6">
          <Button variant="outline" @click="showBatchTagDialog = false">取消</Button>
          <Button @click="updateSelectedTags">更新</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 批量操作栏 -->
    <div v-if="selectedMessages.size" class="flex items-center justify-between mb-4 p-2 bg-muted rounded-lg">
      <span class="text-sm">已选择 {{ selectedMessages.size }} 项</span>
      <div class="flex items-center gap-2">
        <Button @click="showBatchTagDialog = true">管理标签</Button>
        <Button variant="destructive" @click="unfavoriteSelected">取消收藏</Button>
      </div>
    </div>

    <!-- 导出对话框 -->
    <Dialog :open="showExportDialog" @update:open="showExportDialog = false">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>导出收藏</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div v-for="format in exportFormats" :key="format.value" class="flex items-start gap-2">
            <RadioGroup v-model="exportFormat">
              <RadioGroupItem :value="format.value" />
            </RadioGroup>
            <label :for="format.value" class="flex-1">
              <div class="font-medium">{{ format.label }}</div>
              <div class="text-sm text-muted-foreground">{{ format.description }}</div>
            </label>
          </div>
        </div>
        <DialogFooter class="mt-6">
          <Button variant="outline" @click="showExportDialog = false">取消</Button>
          <Button @click="exportFavorites">导出</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 标签合并对话框 -->
    <Dialog :open="showMergeDialog" @update:open="showMergeDialog = false">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>合并标签</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <Label>选择要合并的标签</Label>
          <div class="space-y-2 max-h-48 overflow-auto">
            <label v-for="tag in availableTags" :key="tag" class="flex items-center gap-2">
              <Checkbox :value="tag" v-model="selectedSourceTags" :disabled="tag === targetTag" />
              <span>{{ tag }}</span>
              <span class="text-xs text-muted-foreground">({{ tagFrequency[tag] || 0 }})</span>
            </label>
          </div>
          <div>
            <Label>合并到</Label>
            <Select v-model="targetTag" :disabled="!selectedSourceTags.length">
              <SelectTrigger>
                <SelectValue placeholder="选择目标标签" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">选择目标标签</SelectItem>
                <SelectItem v-for="tag in availableTags" :key="tag" :value="tag" :disabled="selectedSourceTags.includes(tag)">
                  {{ tag }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter class="mt-6">
          <Button variant="outline" @click="showMergeDialog = false">取消</Button>
          <Button @click="mergeTags" :disabled="!selectedSourceTags.length || !targetTag">合并</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 收藏列表 -->
    <div v-if="Object.keys(groupedFavorites).length" class="space-y-8">
      <div v-for="(messages, group) in groupedFavorites" :key="group">
        <div class="flex items-center gap-2 mb-4">
          <Calendar class="w-5 h-5" />
          <h3 class="text-lg font-semibold">{{ group }}</h3>
          <span class="text-sm text-muted-foreground">({{ messages.length }})</span>
        </div>
        <div class="space-y-4">
          <Card v-for="message in messages" :key="`${message.sessionId}-${message.messageIndex}`" class="group relative" :class="[{ 'ring-2 ring-primary': selectedMessages.has(`${message.sessionId}-${message.messageIndex}`) }, viewMode === 'compact' ? 'p-2' : 'p-4']">
            <CardContent>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <Checkbox :checked="selectedMessages.has(`${message.sessionId}-${message.messageIndex}`)" @change="toggleMessageSelection(message)" />
                  <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare class="w-4 h-4" />
                    <span>{{ message.modelName }}</span>
                    <span>·</span>
                    <span>{{ formatTime(message.timestamp) }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-1">
                    <Badge v-for="tag in message.tags" :key="tag" variant="secondary" class="flex items-center gap-1">
                      <Tag class="w-3 h-3" />
                      <span>{{ tag }}</span>
                      <Button variant="ghost" size="icon" class="h-4 w-4 p-0 hover:text-destructive" @click="removeTag(message, tag)">
                        <Trash2 class="w-3 h-3" />
                      </Button>
                    </Badge>
                    <Button v-if="!showTagInput" variant="ghost" size="icon" class="h-6 w-6" @click="showTagInput = true" title="添加标签">
                      <Plus class="w-4 h-4" />
                    </Button>
                    <div v-else class="flex items-center gap-1">
                      <div class="relative">
                        <Input v-model="newTag" placeholder="新标签..." class="w-24 h-6 text-xs" @keyup.enter="addTag(message)" @blur="showTagInput = false" />
                        <!-- 标签建议列表 -->
                        <Card v-if="tagSuggestions.length" class="absolute left-0 top-full mt-1 w-48 z-10">
                          <CardContent class="p-1">
                            <Button
                              v-for="tag in tagSuggestions"
                              :key="tag"
                              variant="ghost"
                              class="w-full justify-between text-sm h-8"
                              @mousedown.prevent="
                                newTag = tag;
                                addTag(message);
                              ">
                              <span>{{ tag }}</span>
                              <span class="text-xs text-muted-foreground">({{ tagFrequency[tag] || 0 }})</span>
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" @click="shareMessage(message)" title="分享消息">
                    <Share2 class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" @click="goToChat(message.sessionId)" title="查看完整对话">
                    <ExternalLink class="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div class="prose prose-invert max-w-none" :class="{ 'line-clamp-3': viewMode === 'compact' }">
                <div v-if="searchQuery" v-html="highlightText(message.content, searchQuery)"></div>
                <Markdown v-else :content="message.content" />
              </div>
              <Button v-if="viewMode === 'compact' && message.content.length > 300" variant="link" class="mt-2 h-auto p-0" @click="viewMode = 'detail'"> 显示更多 </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <Card v-else class="py-12">
      <CardContent class="flex flex-col items-center text-center text-muted-foreground">
        <Bookmark class="w-12 h-12 mb-4" />
        <p class="mb-2">{{ searchQuery || selectedTag ? "未找到匹配的收藏消息" : "还没有收藏的消息" }}</p>
        <p class="text-sm">{{ searchQuery || selectedTag ? "尝试其他搜索条件" : "在聊天时点击星标图标收藏消息" }}</p>
      </CardContent>
    </Card>
  </div>
</template>

<style>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

mark {
  @apply bg-yellow-500/20 px-0.5 rounded;
}

/* 拖拽动画 */
.sortable-ghost {
  @apply opacity-50 bg-background;
}

.sortable-drag {
  @apply bg-card shadow-lg;
}

.sortable-chosen {
  @apply bg-card;
}

/* 添加响应式布局 */
@media (max-width: 768px) {
  .container {
    @apply px-4;
  }

  .grid-cols-2 {
    @apply grid-cols-1;
  }
}
</style>
