import fs from "fs/promises";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";

async function fetchModels() {
  try {
    const response = await fetch("https://ollama.ai/library");
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const models = Array.from(doc.querySelectorAll(".model-item")).map((item) => {
      const name = item.querySelector(".model-name").textContent.trim();
      const description = item.querySelector(".model-description").textContent.trim();
      const tags = Array.from(item.querySelectorAll(".model-tag")).map((tag) => tag.textContent.trim());
      const variants = Array.from(item.querySelectorAll(".model-variant")).map((variant) => variant.textContent.trim());
      const downloads = parseInt(item.querySelector(".model-downloads").textContent.replace(/[^0-9]/g, ""));
      const updated = item.querySelector(".model-updated").getAttribute("datetime");
      const size = item.querySelector(".model-size").textContent.trim();

      return {
        name,
        description,
        tags,
        variants,
        downloads,
        updated,
        size,
        selectedVariant: variants[0],
      };
    });

    await fs.writeFile("src/data/models.json", JSON.stringify(models, null, 2));
    console.log("Models data updated successfully");
  } catch (error) {
    console.error("Failed to fetch models:", error);
  }
}

fetchModels();
