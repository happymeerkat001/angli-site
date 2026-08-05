import { readFile, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { collectInsightSourceFiles } from "../src/lib/dashboard/insight-sources";
import { deriveTitleFromFilename, extractInsightsFromNote, splitNoteSections } from "../src/lib/dashboard/insights";

async function main() {
  const vault = process.argv[3] === "--vault" ? process.argv[4] : process.argv[2] === "--vault" ? process.argv[3] : process.argv[2];
  if (!vault) throw new Error("Usage: npm run generate:insights -- --vault <AI-Vault root>");
  const vaultRoot = resolve(vault);
  const files = await collectInsightSourceFiles(vaultRoot);
  const insights = [];
  for (const file of files) {
    const markdown = await readFile(file, "utf8");
    const { title } = splitNoteSections(markdown);
    const resolvedTitle = title || deriveTitleFromFilename(basename(file));
    if (!title) console.log(`Fallback title from filename: ${relative(vaultRoot, file)}`);
    const extracted = extractInsightsFromNote(markdown, resolvedTitle);
    if (!extracted.length) console.log(`0 insights found in ${relative(vaultRoot, file)}`);
    insights.push(...extracted);
  }
  for (const insight of insights) if (insight.kind === "text" && (/http/i.test(insight.insightText) || insight.insightText.length > 400)) console.warn(`Review insight: ${insight.id}`);
  await writeFile(resolve("src/lib/dashboard/insights.generated.json"), `${JSON.stringify(insights, null, 2)}\n`);
  const imageCount = insights.filter((insight) => insight.kind === "image").length;
  console.log(`${files.length} files scanned; ${insights.length} insights extracted (${insights.length - imageCount} text, ${imageCount} image)`);
}

void main();
