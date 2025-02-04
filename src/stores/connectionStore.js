import { defineStore } from "pinia";
import { ref } from "vue";
import { Ollama } from "ollama";

export const useConnectionStore = defineStore("connection", () => {
  const isConnected = ref(false);
  const isChecking = ref(false);
  const currentPort = ref("11434");

  async function checkConnection(port = "11434") {
    isChecking.value = true;
    currentPort.value = port;

    try {
      const ollama = new Ollama({
        host: `http://localhost:${port}`,
      });

      await ollama.list();
      isConnected.value = true;
      return true;
    } catch (err) {
      console.error("Ollama 连接检查失败:", err);
      isConnected.value = false;
      return false;
    } finally {
      isChecking.value = false;
    }
  }

  return {
    isConnected,
    isChecking,
    currentPort,
    checkConnection,
  };
});
