import { createApp } from "vue";
import Spinner from "../components/ui/Spinner.vue";

let spinnerInstance = null;

export function showLoading(message = "加载中...") {
  if (spinnerInstance) return;

  const mountNode = document.createElement("div");
  document.body.appendChild(mountNode);

  spinnerInstance = createApp(Spinner, {
    show: true,
    message,
  }).mount(mountNode);
}

export function hideLoading() {
  if (!spinnerInstance) return;

  const mountNode = spinnerInstance.$el.parentNode;
  spinnerInstance = null;
  document.body.removeChild(mountNode);
}

export async function withLoading(promise, message = "加载中...") {
  showLoading(message);
  try {
    return await promise;
  } finally {
    hideLoading();
  }
}
