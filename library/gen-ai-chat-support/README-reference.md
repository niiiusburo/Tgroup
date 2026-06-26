# Generative AI Chat Support — Reference Library

> Reference patterns for building the NK Patient Portal two-tier AI + human chat support system. Covers backend LLM/RAG services, mobile chat UI, human escalation, and the learning loop that turns resolved human conversations into retrievable knowledge.

## Scope

- **Mobile target:** React Native / Expo iOS app (`nk-patient-app`).
- **Backend target:** Node.js / Express (`api`).
- **Database:** PostgreSQL with `pgvector` extension.
- **LLM providers:** OpenAI (`gpt-4o-mini`) and Google Gemini (`gemini-2.5-flash`) as interchangeable backends.

## Repositories Referenced

| # | Folder | Repository | License | Why It Matters |
|---|---|---|---|---|
| 1 | `repos/vercel-ai-sdk` | [vercel/ai](https://github.com/vercel/ai) | Apache-2.0 | Provider-agnostic streaming, `streamText`, `useChat`, Expo quickstart. |
| 2 | `repos/openai-node` | [openai/openai-node](https://github.com/openai/openai-node) | Apache-2.0 | Official OpenAI SDK, streaming completions, embeddings. |
| 3 | `repos/google-genai-sdk` | [googleapis/js-genai](https://github.com/googleapis/js-genai) | Apache-2.0 | Official Google Gen AI SDK (`@google/genai`) for Gemini. |
| 4 | `repos/react-native-gifted-chat` | [FaridSafi/react-native-gifted-chat](https://github.com/FaridSafi/react-native-gifted-chat) | MIT | Mature chat UI bubbles/composer; reference only — NK uses custom UI. |

## Architecture

```text
Patient (iOS app)
  │
  ▼
POST /api/patient/chat/sessions/:id/messages
  │
  ▼
patientAuth middleware ──► chatService
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ragService.retrieve   escalationService    openai/gemini SDK
          │                   │                   │
          ▼                   ▼                   ▼
   support_kb_chunks    support_tickets     chat_messages
```

## Key Patterns

### 1. Provider-Agnostic AI Service
See `backend/ai-service.ts`. Wrap both OpenAI and Gemini behind a single `generateChatResponse({ messages, system })` interface so the active provider is an env-driven implementation detail.

### 2. RAG with pgvector
See `backend/rag-pipeline.ts`. Embed patient questions with the same embedding model used at ingest time, then `ORDER BY embedding <=> $1 LIMIT 5` from `support_kb_chunks`. Inject retrieved chunks into the system prompt with a "answer only from context" guardrail.

### 3. Escalation Detection
See `backend/escalation-service.ts`. Escalate when:
- Patient explicitly asks for staff (keyword / intent match).
- AI confidence is low (heuristic or model self-evaluation).
- Topic is medical/diagnosis/emergency.
- AI cannot find relevant KB context.

### 4. Learning Loop
When staff marks a support ticket `resolved`, chunk the conversation, embed it, and insert into `support_kb_chunks` with `source = 'resolved_chat'`. Gate learned content behind an `approved` flag or scheduled review job before it becomes retrievable.

### 5. Mobile State Pattern
See `mobile/useChat.ts`. Use React state (or Zustand) for the message list; call REST endpoints synchronously in the MVP. Replace the send function with an SSE consumer when streaming is added later.

## Files

| File | Purpose |
|------|---------|
| `backend/ai-service.ts` | LLM wrapper (OpenAI + Gemini) |
| `backend/rag-pipeline.ts` | Embed + retrieve using pgvector |
| `backend/escalation-service.ts` | Handoff logic |
| `backend/chat-routes.example.js` | Express route stubs |
| `mobile/ChatScreen.example.tsx` | Reference custom chat UI |
| `mobile/chat-api.ts` | Axios wrappers |
| `mobile/useChat.ts` | Chat state hook |
| `migrations/067_chat_support_ai.sql` | Schema DDL |

## License

All referenced repositories are Apache-2.0 or MIT and safe for study and pattern reuse. The code in this folder is project-specific reference code; adapt before merging into production paths.
