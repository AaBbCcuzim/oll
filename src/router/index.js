import { createRouter, createWebHistory } from "vue-router";
import { useConnectionStore } from "../stores/connectionStore";
import ModelSearch from "../views/ModelSearch.vue";
import LocalModels from "../views/LocalModels.vue";
import Settings from "../views/Settings.vue";
import Chat from "../views/Chat.vue";
import Favorites from "../views/Favorites.vue";
import ConnectionCheck from "../views/ConnectionCheck.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: Chat,
    },
    {
      path: "/search",
      name: "search",
      component: ModelSearch,
    },
    {
      path: "/local",
      name: "local",
      component: LocalModels,
    },
    {
      path: "/settings",
      name: "settings",
      component: Settings,
    },
    {
      path: "/favorites",
      name: "favorites",
      component: Favorites,
    },
    {
      path: "/connection-check",
      name: "connection-check",
      component: ConnectionCheck,
    },
  ],
});

export default router;
