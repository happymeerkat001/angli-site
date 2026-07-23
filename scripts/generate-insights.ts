import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { extractInsightsFromNote, splitNoteSections } from "../src/lib/dashboard/insights";

async function main() {
  const vault = process.argv[3] === "--vault" ? process.argv[4] : process.argv[2] === "--vault" ? process.argv[3] : process.argv[2];
  if (!vault) throw new Error("Usage: npm run generate:insights -- --vault <read.done path>");
  const files = (await readdir(resolve(vault))).filter((file) => file.endsWith(".md"));
  const insights = [];
  for (const file of files) {
    const markdown = await readFile(join(vault, file), "utf8");
    const { title } = splitNoteSections(markdown);
    if (!title) throw new Error(`Missing H1: ${file}`);
    const extracted = extractInsightsFromNote(markdown, title);
    if (!extracted.length) console.log(`0 insights found in ${file}`);
    insights.push(...extracted);
  }
  for (const insight of insights) if (/http/i.test(insight.insightText) || insight.insightText.length > 400) console.warn(`Review insight: ${insight.id}`);
  await writeFile(resolve("src/lib/dashboard/insights.generated.json"), `${JSON.stringify(insights, null, 2)}\n`);
  console.log(`${files.length} files scanned; ${insights.length} insights extracted`);
}

void main();
