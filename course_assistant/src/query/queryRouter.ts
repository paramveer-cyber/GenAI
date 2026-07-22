import { buildQueryLlmClient, getSecondaryModel } from "./queryLlmClient.js";
import { COURSE_DB_SCHEMA_DESCRIPTION } from "./courseDbSchemaDescription.js";
import type { QueryVariant, RoutedVariant, QuerySource } from "./types.js";

const sqlSignalPattern =
  /how many|number of|count of|list all|which video|longest|shortest|latest|newest|most recent|first video|last video|total (videos|modules|chunks)/i;

function routeByRules(variant: QueryVariant): QuerySource | null {
  return sqlSignalPattern.test(variant.text) ? "sql" : null;
}

interface RouterLlmResponse {
  routes: { index: number; source: QuerySource; rationale: string }[];
}

async function routeWithLlm(variants: QueryVariant[]): Promise<RoutedVariant[]> {
  if (variants.length === 0) return [];

  const client = buildQueryLlmClient();
  const response = await client.chat.completions.create({
    model: getSecondaryModel(),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Decide, for each numbered question, which data source answers it best.
Sources:
vector: course video subtitle content, for conceptual/explanatory questions (what is, how does, why, explain).
sql: structured course database, for lookups/aggregations over course structure.
${COURSE_DB_SCHEMA_DESCRIPTION}
both: question needs conceptual explanation plus a structural fact.
Respond with only JSON in the shape {"routes": [{"index": 0, "source": "vector", "rationale": "..."}]}.`,
      },
      {
        role: "user",
        content: variants.map((variant, index) => `${index}: ${variant.text}`).join("\n"),
      },
    ],
  });

  const parsed: RouterLlmResponse = JSON.parse(
    response.choices[0].message.content ?? '{"routes": []}'
  );
  const routes = Array.isArray(parsed.routes) ? parsed.routes : [];

  return variants.map((variant, index) => {
    const matchedRoute = routes.find((route) => route.index === index);
    const source =
      matchedRoute?.source === "sql" || matchedRoute?.source === "both"
        ? matchedRoute.source
        : "vector";
    return { variant, source, rationale: matchedRoute?.rationale ?? "defaulted to vector" };
  });
}

export async function routeQueryVariants(variants: QueryVariant[]): Promise<RoutedVariant[]> {
  const routedByRules: RoutedVariant[] = [];
  const needsLlmRouting: QueryVariant[] = [];

  variants.forEach((variant) => {
    const ruleSource = routeByRules(variant);
    if (ruleSource) {
      routedByRules.push({ variant, source: ruleSource, rationale: "matched sql keyword pattern" });
    } else {
      needsLlmRouting.push(variant);
    }
  });

  const routedByLlm = await routeWithLlm(needsLlmRouting);
  return [...routedByRules, ...routedByLlm];
}
