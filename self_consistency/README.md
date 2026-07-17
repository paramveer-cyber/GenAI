# Multi-Model Self-Consistency CLI

A CLI-based Generative AI application that implements the **Self-Consistency** prompting technique by querying multiple Large Language Models (LLMs), collecting their responses, and synthesizing a refined final answer using GPT.

---

## Features

- Query multiple AI models in parallel
  - OpenAI GPT-4o Mini
  - Google Gemini Flash Lite
  - OpenRouter
- Parallel API orchestration using `Promise.allSettled()`
- Fault-tolerant execution (continues even if one provider fails)
- GPT-based answer synthesis
- Interactive menu-driven CLI
- Clean and readable console output

---

## Self-Consistency Workflow

```
                User Prompt
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
 OpenAI GPT      Gemini        OpenRouter
      │              │              │
      └──────────────┼──────────────┘
                     │
          Collect all responses
                     │
                     ▼
      GPT compares and synthesizes
                     │
                     ▼
         Final Refined Response
```

Instead of returning the response from a single model, the application compares multiple independent responses and generates a more reliable, refined answer.

---

## Technologies Used

- TypeScript
- Node.js
- OpenAI SDK
- OpenAI API
- Google Gemini (OpenAI Compatible API)
- OpenRouter API
- dotenv

---

## Project Structure

```
.
├── aiClient.ts      # Initializes OpenAI-compatible clients
├── index.ts         # Main application logic
├── .env             # API Keys and Base URLs
├── package.json
└── README.md
```

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd <repository-name>
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
OPENAI_KEY=your_openai_api_key
OPENAI_URL=https://api.openai.com/v1

GEMINI_KEY=your_gemini_api_key
GEMINI_URL=https://generativelanguage.googleapis.com/v1beta/openai/

OPENROUTER_KEY=your_openrouter_api_key
OPENROUTER_URL=https://openrouter.ai/api/v1
```

---

## Running the Application

```bash
npm run dev
```

or

```bash
npx tsx index.ts
```

---

## Menu

```
===========================================
 Multi-Model Self-Consistency CLI
===========================================

1. Ask a Question
2. Show Available Models
3. Exit
```

Selecting **Ask a Question** will:

1. Send the user's prompt to all configured AI models.
2. Display each model's response.
3. Pass all responses to GPT.
4. Display a refined final answer.

---

## Models Used

- GPT-4o Mini (OpenAI)
- Gemini Flash Lite (Google Gemini)
- OpenRouter Free

The application can easily be extended to include additional OpenRouter-supported models such as:

- DeepSeek R1
- Qwen 3 Coder

---

## Error Handling

The application uses `Promise.allSettled()` to ensure robustness.

If one model fails to respond, the remaining successful responses are still used to generate the final synthesized answer.

---

## How Self-Consistency is Implemented

1. The user enters a prompt.
2. The prompt is sent simultaneously to multiple AI models.
3. Individual responses are collected.
4. A GPT model receives all responses.
5. GPT:
   - compares the answers,
   - identifies common facts,
   - removes contradictory or unsupported information,
   - synthesizes a single refined response.
6. The refined response is presented to the user.
