import "dotenv/config";
import { ingestCourseFromZip } from "./index.js";

const [zipFilePath, collectionName] = process.argv.slice(2);

if (!zipFilePath || !collectionName) {
  console.error("usage: tsx src/cli-ingest.ts <zipFilePath> <collectionName>");
  process.exit(1);
}

const chunks = await ingestCourseFromZip(zipFilePath, collectionName);
console.log(`indexed ${chunks.length} chunks into collection "${collectionName}"`);
