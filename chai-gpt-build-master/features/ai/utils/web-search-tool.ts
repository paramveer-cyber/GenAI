import { jsonSchema, tool } from "ai";

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
};

export type WebSearchOutput = {
  query: string;
  results: WebSearchResult[];
  error?: string;
};

async function fetchWebSearchResults(
  query: string,
): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY environment variable");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
  });

  if (!response.ok) {
    throw new Error(`Web search failed with status ${response.status}`);
  }

  const data: { results?: WebSearchResult[] } = await response.json();
  return (data.results ?? []).map((result) => ({
    title: result.title,
    url: result.url,
    content: result.content,
  }));
}

export const webSearchTool = tool({
  description:
    "Search the web for current, real-time, or recent information the model would not know from training data alone. Use for recent events, live facts, prices, or anything time-sensitive.",
  inputSchema: jsonSchema<{ query: string }>({
    type: "object",
    properties: {
      query: { type: "string", description: "The search query" },
    },
    required: ["query"],
  }),
  execute: async ({ query }): Promise<WebSearchOutput> => {
    try {
      const results = await fetchWebSearchResults(query);
      return { query, results };
    } catch (error) {
      return {
        query,
        results: [],
        error: error instanceof Error ? error.message : "Web search failed",
      };
    }
  },
});
