import { createApp } from "vue";
import Alert from "../components/ui/Alert.vue";

const toasts = new Set();

export function toast(message, type = "info", duration = 3000) {
  const mountNode = document.createElement("div");
  document.body.appendChild(mountNode);

  // 调整新提示的位置
  const offset = toasts.size * 60;
  mountNode.style.transform = `translateY(${offset}px)`;

  const app = createApp(Alert, {
    message,
    type,
    duration,
    onDestroy: () => {
      document.body.removeChild(mountNode);
      toasts.delete(mountNode);
      // 重新调整其他提示的位置
      Array.from(toasts).forEach((node, index) => {
        node.style.transform = `translateY(${index * 60}px)`;
      });
    },
  });

  toasts.add(mountNode);
  app.mount(mountNode);
}
