import { createApp } from "vue";
import Dialog from "../components/ui/Dialog.vue";

export function confirm({ title, message, confirmText = "确认", cancelText = "取消" }) {
  return new Promise((resolve) => {
    const mountNode = document.createElement("div");
    document.body.appendChild(mountNode);

    const app = createApp(Dialog, {
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        resolve(true);
        setTimeout(() => {
          document.body.removeChild(mountNode);
        }, 300);
      },
      onCancel: () => {
        resolve(false);
        setTimeout(() => {
          document.body.removeChild(mountNode);
        }, 300);
      },
    });

    app.mount(mountNode);
  });
}
