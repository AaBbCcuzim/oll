import { defineStore } from "pinia";
import { ref } from "vue";
import { Ollama } from "ollama";

const ollama = new Ollama();
const LIBRARY_URL = "https://ollama.com/library";
const PROXY_URL = "https://api.allorigins.win/raw?url=";
const CACHE_KEY = "ollama-library-html-cache";
const CACHE_EXPIRE = 1000 * 60 * 60; // 1小时过期

export const useModelStore = defineStore("model", () => {
  const localModels = ref([]);
  const availableModels = ref([]);
  const officialModels = ref([]);

  // 存储下载控制器
  const downloadControllers = new Map();

  // 从缓存加载HTML
  function loadHtmlFromCache() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    try {
      const { html, timestamp } = JSON.parse(cached);
      // 检查缓存是否过期
      if (Date.now() - timestamp > CACHE_EXPIRE) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return html;
    } catch (error) {
      console.error("解析缓存HTML失败:", error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }

  // 保存HTML到缓存
  function saveHtmlToCache(html) {
    try {
      const cache = {
        html,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error("保存缓存HTML失败:", error);
    }
  }

  // 解析HTML获取模型数据
  function parseModelsFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    return Array.from(doc.querySelectorAll("[x-test-model]")).map((item) => {
      // 获取基本信息
      const name = item.querySelector("h2 span").textContent.trim();
      const description = item.querySelector("p.max-w-lg").textContent.trim();

      // 获取大小变体
      const variants = Array.from(item.querySelectorAll("[x-test-size]")).map((variant) => variant.textContent.trim());

      // 获取下载量
      const pullCountText = item.querySelector("[x-test-pull-count]").textContent.trim();
      let downloads = pullCountText; // 直接使用原始格式，如 "6.6M"

      // 获取标签数量
      const tagCount = parseInt(item.querySelector("[x-test-tag-count]").textContent.trim());

      // 获取更新时间
      const updated = item.querySelector("[x-test-updated]").textContent.trim();

      // 获取标签（如果有的话）
      const tags = Array.from(item.querySelectorAll(".tag") || []).map((tag) => tag.textContent.trim());

      return {
        name,
        description,
        tags,
        variants,
        downloads,
        tagCount,
        updated,
        size: variants[0] || "Unknown",
        selectedVariant: variants[0],
      };
    });
  }

  async function fetchModelInfo() {
    try {
      let html;

      // 先尝试从缓存加载HTML
      const cachedHtml = loadHtmlFromCache();
      if (cachedHtml) {
        console.log("使用缓存HTML");
        html = cachedHtml;
      } else {
        // 缓存不存在或已过期，从网络获取
        console.log("从网络获取HTML");
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(LIBRARY_URL)}`);
        html = await response.text();
        // 保存HTML到缓存
        saveHtmlToCache(html);
      }

      // 每次都重新解析HTML
      const models = parseModelsFromHtml(html);
      availableModels.value = models;
      return models;
    } catch (error) {
      console.error("获取模型信息失败:", error);
      throw error;
    }
  }

  async function fetchLocalModels() {
    try {
      const response = await ollama.list();
      localModels.value = response.models;
    } catch (error) {
      console.error("获取本地模型失败:", error);
      throw error;
    }
  }

  async function deleteModel(name) {
    try {
      if (!name || typeof name !== "string") {
        throw new Error("模型名称不能为空");
      }

      // 移除前后空格和特殊字符，但保留冒号（用于带标签的模型）
      const modelName = name.trim().replace(/[^\w\d:.-]/g, "");

      if (!modelName) {
        throw new Error("模型名称不能为空");
      }

      // 检查模型是否存在
      const modelExists = localModels.value.some((model) => model.name === modelName);
      if (!modelExists) {
        throw new Error("模型不存在");
      }

      console.log("正在删除模型:", modelName);
      await ollama.delete({ model: modelName });

      // 更新本地列表
      localModels.value = localModels.value.filter((model) => model.name !== modelName);

      // 刷新本地模型列表
      await fetchLocalModels();
    } catch (error) {
      console.error("Failed to delete model:", error);
      if (error.message.includes("invalid")) {
        throw new Error("模型名称无效");
      } else if (error.message.includes("not found")) {
        throw new Error("模型不存在");
      }
      throw error;
    }
  }

  async function downloadModel(name, onProgress) {
    try {
      const modelName = name.toLowerCase().trim().replace(/\s+/g, "");

      // 创建 AbortController
      const controller = new AbortController();
      downloadControllers.set(modelName, controller);

      const stream = await ollama.pull({
        model: modelName,
        stream: true,
        signal: controller.signal, // 添加 signal
      });

      for await (const progress of stream) {
        console.log("下载进度:", progress);

        if (typeof progress.total === "number" && typeof progress.completed === "number") {
          const percent = ((progress.completed / progress.total) * 100).toFixed(1);
          onProgress?.({
            status: "downloading",
            percent: Number(percent),
            downloaded: formatSize(progress.completed),
            total: formatSize(progress.total),
            message: `下载中 ${percent}%`,
          });
        } else if (progress.status) {
          // 处理其他状态
          if (progress.status.includes("process")) {
            onProgress?.({
              status: "processing",
              percent: 100,
              message: progress.message || "处理中...",
            });
          } else if (progress.status.includes("verify")) {
            onProgress?.({
              status: "verifying",
              percent: 100,
              message: "验证中...",
            });
          } else {
            onProgress?.({
              status: "preparing",
              percent: 0,
              message: progress.message || progress.status,
            });
          }
        }
      }

      await fetchLocalModels();
      downloadControllers.delete(modelName);
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("下载已取消");
      }
      console.error("下载模型失败:", error);
      if (error.message.includes("invalid model name")) {
        throw new Error("模型名称无效，请检查模型名称格式");
      } else if (error.message.includes("not found")) {
        throw new Error("未找到指定的模型");
      } else {
        throw new Error(`下载失败: ${error.message}`);
      }
    }
  }

  // 取消下载
  function cancelDownload(name) {
    const modelName = name.toLowerCase().trim().replace(/\s+/g, "");
    const controller = downloadControllers.get(modelName);
    if (controller) {
      controller.abort();
      downloadControllers.delete(modelName);
    }
  }

  async function getModelDetails(name) {
    try {
      const modelName = name.toLowerCase().trim().replace(/\s+/g, "");

      // 尝试从本地模型列表中获取基本信息
      await fetchLocalModels();
      const localModel = localModels.value.find((m) => m.name === modelName);

      if (!localModel) {
        throw new Error("模型未安装");
      }

      // 获取详细信息
      const response = await ollama.show({ model: modelName });
      console.log("模型详情原始数据:", response);

      // 解析 modelfile 中的信息
      const modelfileLines = response.modelfile?.split("\n") || [];
      const fromLine = modelfileLines.find((line) => line.startsWith("FROM"))?.split(" ")[1];
      const parameterLine = modelfileLines.find((line) => line.includes("PARAMETER"));
      const licenseLine = modelfileLines.find((line) => line.includes("LICENSE"));
      const systemPromptLines = modelfileLines.filter((line) => line.startsWith("SYSTEM")).map((line) => line.replace("SYSTEM", "").trim());

      // 整合所有信息
      return {
        ...response,
        ...localModel,
        name: modelName,
        status: "installed",
        // 基础信息
        base_model: fromLine || response.details?.family || "未知",
        // 参数量
        parameter_size: response.details?.parameter_size || parameterLine?.match(/\d+[BbMmKk]/)?.[0] || response.parameters || "未知",
        // 量化等级
        quantization_level: response.details?.quantization_level || response.quantization || modelName.match(/q\d+k?/)?.[0]?.toUpperCase() || "未知",
        // 上下文长度
        context_length: response.details?.context_length || response.context_size || response.context_window || "未知",
        // 许可证
        license: response.license || licenseLine?.replace("LICENSE", "").trim() || "未知",
        // 系统提示词
        system_prompt: systemPromptLines.join("\n") || "未设置",
        // 其他信息
        format: response.format || response.details?.format || "未知",
        model_type: response.model_type || response.details?.model_type || "未知",
        architecture: response.architecture || response.details?.architecture || "未知",
        created_at: response.created_at || localModel.modified || "未知",
      };
    } catch (error) {
      console.error("获取模型详情失败:", error);
      throw new Error(`获取模型详情失败: ${error.message}`);
    }
  }

  return {
    localModels,
    availableModels,
    officialModels,
    fetchLocalModels,
    fetchModelInfo,
    downloadModel,
    deleteModel,
    getModelDetails,
    cancelDownload,
  };
});

function formatSize(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)}${units[unitIndex]}`;
}
