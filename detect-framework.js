#!/usr/bin/env node
/**
 * Auto-detects the front-end framework used by a website
 * and saves results in an output directory.
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const site = process.argv[2] || "https://vinylvibes.hshub.net";
const outputDir = path.join(__dirname, "output");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

async function detectFramework(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();

    let framework = "Unknown";

    // Heuristic checks
    if (html.includes("wp-content") || html.includes("wp-json")) {
      framework = "WordPress";
    } else if (html.includes("React") || html.includes("react.development.js")) {
      framework = "React";
    } else if (html.includes("vue") || html.includes("Vue.config")) {
      framework = "Vue.js";
    } else if (html.includes("_next") || html.includes("Next.js")) {
      framework = "Next.js";
    } else if (html.includes("angular") || html.includes("ng-version")) {
      framework = "Angular";
    } else if (html.includes("svelte") || html.includes("SvelteComponent")) {
      framework = "Svelte";
    }

    const output = {
      url,
      framework,
      timestamp: new Date().toISOString(),
    };

    const outputPath = path.join(outputDir, "framework-detection.json");
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`✅ Framework detected: ${framework}`);
    console.log(`📁 Output saved to: ${outputPath}`);
  } catch (err) {
    console.error(`❌ Error fetching ${url}:`, err.message);
  }
}

detectFramework(site);
