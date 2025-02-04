<script setup>
import { computed } from "vue";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/nord.css";
import CodeBlock from "../chat/CodeBlock.vue";

const props = defineProps({
  content: {
    type: [String, Object],
    default: "",
  },
});

// 自定义渲染器
const renderer = new marked.Renderer();
renderer.code = (code, language) => {
  try {
    // 使用代码对象的属性
    let finalCode = "";
    if (typeof code === "object") {
      // 使用 text 属性获取纯代码内容
      finalCode = code.text || "";
      // 如果没有指定语言，使用代码对象的 lang 属性
      if (!language && code.lang) {
        language = code.lang;
      }
    } else {
      finalCode = String(code);
    }

    // 代码高亮
    let highlightedCode;
    if (language && hljs.getLanguage(language)) {
      try {
        // 使用指定的语言进行高亮
        highlightedCode = hljs.highlight(finalCode, {
          language,
          ignoreIllegals: true,
        }).value;
      } catch (e) {
        console.warn("指定语言高亮失败，使用自动检测:", e);
        highlightedCode = hljs.highlightAuto(finalCode).value;
      }
    } else {
      highlightedCode = hljs.highlightAuto(finalCode).value;
    }

    return `<code-block code="${encodeURIComponent(finalCode)}" language="${language || ""}">\n` + `<pre><code class="hljs ${language || ""}">${highlightedCode}</code></pre>\n` + `</code-block>`;
  } catch (error) {
    console.error("代码高亮失败:", error);
    // 错误处理时也尝试获取 raw 内容
    const fallbackCode = typeof code === "object" ? code.text || String(code) : String(code);
    return `<pre><code>${fallbackCode}</code></pre>`;
  }
};

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});

// 转换 Markdown 为 HTML
const html = computed(() => {
  try {
    // 处理不同类型的输入
    let content = "";
    // 检查内容是否包含代码块标记
    const hasCodeBlock = typeof props.content === "string" && props.content.includes("```");

    if (typeof props.content === "string") {
      // 如果是字符串且包含代码块，直接使用
      content = props.content;
    } else if (props.content && typeof props.content === "object") {
      // 如果是对象，尝试提取代码
      if (props.content.code) {
        // 如果有代码属性，格式化为代码块
        content = "```" + (props.content.language || "") + "\n" + props.content.code + "\n```";
      } else if (props.content.content) {
        // 如果有 content 属性
        content = props.content.content;
      } else {
        // 其他情况，格式化为 JSON
        content = "```json\n" + JSON.stringify(props.content, null, 2) + "\n```";
      }
    } else {
      content = String(props.content ?? "");
    }

    // 确保内容非空
    if (!content) return "";

    console.log("处理后的内容:", content);
    return marked(content);
  } catch (error) {
    console.error("Markdown 渲染失败:", error);
    return `<pre>${String(props.content)}</pre>`;
  }
});
</script>

<template>
  <div class="markdown-body prose prose-invert max-w-none" v-html="html"></div>
</template>

<style>
.markdown-body {
  @apply text-sm leading-normal text-zinc-800 break-words;
}

.markdown-body pre {
  @apply p-4 rounded-lg bg-[#2e3440] my-2 border border-zinc-700/50 overflow-x-auto;
}

.markdown-body code {
  @apply font-mono text-sm bg-[#2e3440] px-1.5 py-0.5 rounded text-zinc-200;
}

.markdown-body pre code {
  @apply bg-transparent p-0 text-zinc-100 whitespace-pre;
}

.markdown-body p {
  @apply my-2 text-zinc-800;
}

.markdown-body ul,
.markdown-body ol {
  @apply my-2 pl-6 text-zinc-800;
}

.markdown-body ul {
  @apply list-disc;
}

.markdown-body ol {
  @apply list-decimal;
}

.markdown-body a {
  @apply text-blue-400 hover:text-blue-300 underline transition-colors;
}

.markdown-body blockquote {
  @apply border-l-4 border-zinc-600 pl-4 my-2 bg-zinc-700/10 py-2 rounded-r text-zinc-700;
}
</style>
