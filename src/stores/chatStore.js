import { defineStore } from "pinia";
import { ref } from "vue";
import { Ollama } from "ollama";

const ollama = new Ollama();

export const useChatStore = defineStore("chat", () => {
  const sessions = ref([]);
  const currentSessionId = ref(null);

  // 创建新会话
  function createSession(modelName) {
    const session = {
      id: Date.now().toString(),
      modelName,
      name: `${modelName} - ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    sessions.value.push(session);
    currentSessionId.value = session.id;
    saveToLocalStorage();
    return session;
  }

  // 切换会话
  function switchSession(sessionId) {
    currentSessionId.value = sessionId;
    saveToLocalStorage();
  }

  // 删除会话
  function deleteSession(sessionId) {
    const index = sessions.value.findIndex((s) => s.id === sessionId);
    if (index > -1) {
      sessions.value.splice(index, 1);
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = sessions.value[0]?.id || null;
      }
      saveToLocalStorage();
    }
  }

  // 添加消息到当前会话
  function addMessage(message) {
    const session = getCurrentSession();
    if (session) {
      session.messages.push({
        ...message,
        timestamp: new Date().toISOString(),
      });
      saveToLocalStorage();
    }
  }

  // 获取当前会话
  function getCurrentSession() {
    return sessions.value.find((s) => s.id === currentSessionId.value);
  }

  // 保存到本地存储
  function saveToLocalStorage() {
    localStorage.setItem(
      "chat-sessions",
      JSON.stringify({
        sessions: sessions.value,
        currentSessionId: currentSessionId.value,
      })
    );
  }

  // 从本地存储加载
  function loadFromLocalStorage() {
    const data = localStorage.getItem("chat-sessions");
    if (data) {
      const { sessions: savedSessions, currentSessionId: savedId } = JSON.parse(data);
      sessions.value = savedSessions;
      currentSessionId.value = savedId;
    }
  }

  // 重命名会话
  function renameSession(sessionId, newName) {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (session) {
      session.name = newName;
      // 保存到本地存储
      localStorage.setItem(
        "chat-sessions",
        JSON.stringify({
          sessions: sessions.value,
          currentSessionId: currentSessionId.value,
        })
      );
    }
  }

  // 更新会话顺序
  function reorderSessions(newOrder) {
    sessions.value = newOrder;
    saveToLocalStorage();
  }

  // 导出会话
  function exportSessions() {
    return JSON.stringify({
      sessions: sessions.value,
      currentSessionId: currentSessionId.value,
      exportedAt: new Date().toISOString(),
    });
  }

  // 导入会话
  function importSessions(data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed.sessions)) {
        sessions.value = parsed.sessions;
        currentSessionId.value = parsed.currentSessionId;
        saveToLocalStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error("导入会话失败:", error);
      return false;
    }
  }

  // 更新会话的系统提示词
  function updateSystemPrompt(sessionId, prompt) {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (session) {
      session.systemPrompt = prompt;
      saveToLocalStorage();
    }
  }

  // 发送消息并获取回复
  async function* sendMessage(message, options = {}) {
    const session = getCurrentSession();
    if (!session) return;

    // 构建消息历史
    const messages = [...(session.systemPrompt ? [{ role: "system", content: session.systemPrompt }] : []), ...session.messages, { role: "user", content: message }];

    try {
      const response = await ollama.chat({
        model: session.modelName,
        messages: messages,
        stream: true,
        ...options,
      });

      // 处理流式响应
      let fullContent = "";
      for await (const chunk of response) {
        let content = "";

        // 处理 ollama 的响应格式
        if (chunk.message?.content) {
          content = chunk.message.content;
        } else if (chunk.response) {
          content = chunk.response;
        }

        if (content) {
          fullContent += content;
          yield fullContent;
        }
      }
    } catch (error) {
      console.error("发送消息失败:", error);
      throw error;
    }
  }

  // 重新生成回复
  async function* regenerateMessage(sessionId, fromIndex, options = {}) {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (!session) return;

    // 保留到指定索引的消息
    const messages = [...(session.systemPrompt ? [{ role: "system", content: session.systemPrompt }] : []), ...session.messages.slice(0, fromIndex)];

    try {
      const response = await ollama.chat({
        model: session.modelName,
        messages: messages,
        stream: true,
        ...options,
      });

      // 处理流式响应
      let fullContent = "";
      for await (const chunk of response) {
        let content = "";
        // 处理 ollama 的响应格式
        if (chunk.message?.content) {
          content = chunk.message.content;
        } else if (chunk.response) {
          content = chunk.response;
        }

        if (content) {
          fullContent += content;
          yield fullContent;
        }
      }
    } catch (error) {
      console.error("重新生成回复失败:", error);
      throw error;
    }
  }

  // 收藏消息
  function toggleFavorite(sessionId, messageIndex) {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (session && session.messages[messageIndex]) {
      const message = session.messages[messageIndex];
      message.favorite = !message.favorite;
      saveToLocalStorage();
    }
  }

  // 获取所有收藏的消息
  function getFavoriteMessages() {
    return sessions.value.flatMap((session) =>
      session.messages
        .map((msg, index) => ({
          ...msg,
          sessionId: session.id,
          messageIndex: index,
          modelName: session.modelName,
          timestamp: session.createdAt,
        }))
        .filter((msg) => msg.favorite)
    );
  }

  // 更新收藏消息的标签
  function updateFavoriteTags(sessionId, messageIndex, tags) {
    const session = sessions.value.find((s) => s.id === sessionId);
    if (session && session.messages[messageIndex]) {
      const message = session.messages[messageIndex];
      message.tags = tags;
      saveToLocalStorage();
    }
  }

  // 批量取消收藏
  function unfavoriteMessages(items) {
    items.forEach(({ sessionId, messageIndex }) => {
      const session = sessions.value.find((s) => s.id === sessionId);
      if (session && session.messages[messageIndex]) {
        session.messages[messageIndex].favorite = false;
      }
    });
    saveToLocalStorage();
  }

  // 获取所有标签
  function getAllTags() {
    const tags = new Set();
    sessions.value.forEach((session) => {
      session.messages.forEach((msg) => {
        if (msg.tags) {
          msg.tags.forEach((tag) => tags.add(tag));
        }
      });
    });
    return Array.from(tags);
  }

  // 导出收藏消息
  function exportFavorites() {
    const favorites = getFavoriteMessages();
    return JSON.stringify({
      favorites,
      exportedAt: new Date().toISOString(),
    });
  }

  // 导入收藏消息
  function importFavorites(data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed.favorites)) {
        parsed.favorites.forEach((favorite) => {
          const session = sessions.value.find((s) => s.id === favorite.sessionId);
          if (session && session.messages[favorite.messageIndex]) {
            session.messages[favorite.messageIndex].favorite = true;
            session.messages[favorite.messageIndex].tags = favorite.tags;
          }
        });
        saveToLocalStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error("导入收藏失败:", error);
      return false;
    }
  }

  // 批量更新标签
  function updateTagsForMessages(items, tags) {
    items.forEach(({ sessionId, messageIndex }) => {
      const session = sessions.value.find((s) => s.id === sessionId);
      if (session && session.messages[messageIndex]) {
        session.messages[messageIndex].tags = tags;
      }
    });
    saveToLocalStorage();
  }

  // 重命名标签
  function renameTag(oldTag, newTag) {
    sessions.value.forEach((session) => {
      session.messages.forEach((msg) => {
        if (msg.tags && msg.tags.includes(oldTag)) {
          msg.tags = msg.tags.map((tag) => (tag === oldTag ? newTag : tag));
        }
      });
    });
    saveToLocalStorage();
  }

  // 删除标签
  function deleteTag(tag) {
    sessions.value.forEach((session) => {
      session.messages.forEach((msg) => {
        if (msg.tags) {
          msg.tags = msg.tags.filter((t) => t !== tag);
        }
      });
    });
    saveToLocalStorage();
  }

  // 更新标签颜色
  function updateTagColor(tag, color) {
    sessions.value.forEach((session) => {
      session.messages.forEach((msg) => {
        if (msg.tagColors) {
          msg.tagColors[tag] = color;
        } else if (msg.tags && msg.tags.includes(tag)) {
          msg.tagColors = { [tag]: color };
        }
      });
    });
    saveToLocalStorage();
  }

  // 获取标签颜色
  function getTagColor(tag) {
    for (const session of sessions.value) {
      for (const msg of session.messages) {
        if (msg.tagColors && msg.tagColors[tag]) {
          return msg.tagColors[tag];
        }
      }
    }
    return null;
  }

  // 更新标签顺序
  function updateTagOrder(order) {
    localStorage.setItem("tag-order", JSON.stringify(order));
  }

  // 获取标签顺序
  function getTagOrder() {
    const order = localStorage.getItem("tag-order");
    return order ? JSON.parse(order) : [];
  }

  // 更新标签分类
  function updateTagCategory(tag, category) {
    const categories = getTagCategories();
    categories[tag] = category;
    localStorage.setItem("tag-categories", JSON.stringify(categories));
  }

  // 获取标签分类
  function getTagCategories() {
    const categories = localStorage.getItem("tag-categories");
    return categories ? JSON.parse(categories) : {};
  }

  // 导出标签配置
  function exportTagSettings() {
    return JSON.stringify({
      tags: getAllTags(),
      categories: getTagCategories(),
      colors: getAllTagColors(),
      order: getTagOrder(),
      exportedAt: new Date().toISOString(),
    });
  }

  // 导入标签配置
  function importTagSettings(data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed.tags)) {
        localStorage.setItem("tag-order", JSON.stringify(parsed.order || []));
        localStorage.setItem("tag-categories", JSON.stringify(parsed.categories || {}));
        // 更新所有标签的颜色
        Object.entries(parsed.colors || {}).forEach(([tag, color]) => {
          updateTagColor(tag, color);
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("导入标签配置失败:", error);
      return false;
    }
  }

  // 合并标签
  function mergeTags(sourceTags, targetTag) {
    sessions.value.forEach((session) => {
      session.messages.forEach((msg) => {
        if (msg.tags) {
          const hasSourceTag = sourceTags.some((tag) => msg.tags.includes(tag));
          if (hasSourceTag) {
            msg.tags = [...new Set([...msg.tags.filter((tag) => !sourceTags.includes(tag)), targetTag])];
          }
        }
      });
    });
    saveToLocalStorage();
  }

  // 获取所有标签颜色
  function getAllTagColors() {
    const colors = {};
    sessions.value.forEach((session) => {
      session.messages.forEach((msg) => {
        if (msg.tagColors) {
          Object.assign(colors, msg.tagColors);
        }
      });
    });
    return colors;
  }

  // 删除消息
  function deleteMessage(index) {
    const session = getCurrentSession();
    if (session) {
      session.messages.splice(index, 1);
      // 保存到本地存储
      localStorage.setItem(
        "chat-sessions",
        JSON.stringify({
          sessions: sessions.value,
          currentSessionId: currentSessionId.value,
        })
      );
    }
  }

  return {
    sessions,
    currentSessionId,
    createSession,
    switchSession,
    deleteSession,
    addMessage,
    getCurrentSession,
    loadFromLocalStorage,
    saveToLocalStorage,
    renameSession,
    reorderSessions,
    exportSessions,
    importSessions,
    updateSystemPrompt,
    sendMessage,
    regenerateMessage,
    toggleFavorite,
    getFavoriteMessages,
    updateFavoriteTags,
    unfavoriteMessages,
    getAllTags,
    exportFavorites,
    importFavorites,
    updateTagsForMessages,
    renameTag,
    deleteTag,
    updateTagColor,
    getTagColor,
    updateTagOrder,
    getTagOrder,
    updateTagCategory,
    getTagCategories,
    exportTagSettings,
    importTagSettings,
    mergeTags,
    getAllTagColors,
    deleteMessage,
  };
});
