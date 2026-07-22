import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
import { COURSE_DB_SCHEMA_DESCRIPTION } from "./courseDbSchemaDescription.js";

export async function generateSqlForQuestion(question: string): Promise<string> {
  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    messages: [
      {
        role: "system",
        content: `Write a single read-only PostgreSQL SELECT query that answers the user question, using only this schema:
${COURSE_DB_SCHEMA_DESCRIPTION}
Only query the chunks table. Never write INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, or multiple statements. Include a LIMIT clause. Respond with only the SQL, nothing else.`,
      },
      { role: "user", content: question },
    ],
  });
  return response.choices[0].message.content?.trim() ?? "";
}
