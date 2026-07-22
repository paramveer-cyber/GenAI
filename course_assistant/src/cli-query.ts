import "dotenv/config";
import { queryCourse } from "./query.js";

const [collectionName, userQuery] = process.argv.slice(2);

if (!collectionName || !userQuery) {
  console.error('usage: tsx src/cli-query.ts <collectionName> "<question>"');
  process.exit(1);
}

const answer = await queryCourse(userQuery, collectionName);
console.log(answer.answerMarkdown);
console.log();
console.log("Citations:");
for (const citation of answer.citations) {
  console.log(
    `- ${citation.videoTitle} (${citation.videoId}): ${citation.startMs}ms-${citation.endMs}ms`,
  );
}
