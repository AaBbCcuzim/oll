import { defineStore } from "pinia";

export const useSettingStore = defineStore("setting", {
  state: () => ({
    settings: {
      baseUrl: "http://localhost:11434",
      autoUpdate: false,
    },
  }),

  actions: {
    async loadSettings() {
      try {
        const savedSettings = localStorage.getItem("ollama-settings");
        if (savedSettings) {
          this.settings = JSON.parse(savedSettings);
        }
        return this.settings;
      } catch (error) {
        console.error("加载设置失败:", error);
        return this.settings;
      }
    },

    async saveSettings(newSettings) {
      try {
        this.settings = newSettings;
        localStorage.setItem("ollama-settings", JSON.stringify(newSettings));
      } catch (error) {
        console.error("保存设置失败:", error);
        throw error;
      }
    },

    getBaseUrl() {
      return this.settings.baseUrl;
    },
  },
});
