import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";

const DIR = "/Users/jacob/IN1010-web/src/data/exams";

async function main() {
  const files = (await readdir(DIR)).filter((name) => name.endsWith(".json") && name !== "index.json");

  if (files.length === 0) {
    throw new Error("No manifest files found.");
  }

  let totalQuestions = 0;

  for (const file of files) {
    const manifest = JSON.parse(await readFile(path.join(DIR, file), "utf8"));

    if (!manifest.id || !manifest.questions || !Array.isArray(manifest.questions)) {
      throw new Error(`Invalid schema in ${file}`);
    }

    for (const question of manifest.questions) {
      totalQuestions += 1;

      if (!question.promptPages?.length || !question.solutionPages?.length) {
        throw new Error(`${file} ${question.id} missing promptPages or solutionPages`);
      }

      for (const page of question.promptPages) {
        const fullPath = path.join("/Users/jacob/IN1010-web/public", page.replace(/^\//, ""));
        await access(fullPath).catch(() => {
          throw new Error(`Missing asset for prompt page: ${fullPath}`);
        });
      }

      for (const page of question.solutionPages) {
        const fullPath = path.join("/Users/jacob/IN1010-web/public", page.replace(/^\//, ""));
        await access(fullPath).catch(() => {
          throw new Error(`Missing asset for solution page: ${fullPath}`);
        });
      }
    }
  }

  if (totalQuestions !== 47) {
    throw new Error(`Expected 47 questions, found ${totalQuestions}`);
  }

  console.log(`Manifest validation succeeded (${files.length} files, ${totalQuestions} questions).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
