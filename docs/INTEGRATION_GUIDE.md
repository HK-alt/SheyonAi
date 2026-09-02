# Sheyon Ai — Supabase + DeepSeek Integration Guide

A production-ready walkthrough of how this app connects an **Expo managed** React Native application (SDK 56, expo-router, TypeScript) to **Supabase** (auth, Postgres, realtime, Edge Functions) and the **DeepSeek API** (AI chat completions).

Everything described here is implemented in this repository — file paths are linked so you can read the real code as you follow along.

## Contents

1. [Architecture overview](#1-architecture-overview)
2. [Project setup & dependencies](#2-project-setup--dependencies)
3. [Environment variables](#3-environment-variables)
4. [Supabase backend setup](#4-supabase-backend-setup)
5. [Authentication (social OAuth)](#5-authentication-social-oauth)
6. [Database operations & realtime](#6-database-operations--realtime)
7. [DeepSeek via a secure Edge Function proxy](#7-deepseek-via-a-secure-edge-function-proxy)
8. [Streaming responses in React Native](#8-streaming-responses-in-react-native)
9. [Folder structure & architecture](#9-folder-structure--architecture)
10. [End-to-end workflow example](#10-end-to-end-workflow-example)
11. [Caching & offline support](#11-caching--offline-support)
12. [Security checklist](#12-security-checklist)
13. [Environments (dev / staging / prod)](#13-environments-dev--staging--prod)
14. [Testing & debugging tips](#14-testing--debugging-tips)
15. [Optional: file uploads with Supabase Storage](#15-optional-file-uploads-with-supabase-storage)

---

## 1. Architecture overview

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   Sheyon Ai (Expo app)       │        │   Supabase project           │
│                             │        │                              │
│  AuthProvider ──────────────┼──────► │  Auth (Google / Apple OAuth) │
│  ChatProvider ──────────────┼──────► │  Postgres (RLS protected)    │
│  useRealtimeMessages ◄──────┼─────── │  Realtime (messages INSERT)  │
│  useDeepSeekChat ───────────┼──SSE─► │  Edge Fn: deepseek-chat ─────┼──► DeepSeek API
└─────────────────────────────┘  JWT   └──────────────────────────────┘    (key stays here)
```

The single most important design decision: **the DeepSeek API key never ships in the app**. The client calls a Supabase Edge Function with the user's JWT; the function validates the token, calls DeepSeek server-side, streams tokens back, and persists the result.

## 2. Project setup & dependencies

This is an **Expo managed workflow** project. The integration needed only two new packages:

```bash
npm install @supabase/supabase-js react-native-url-polyfill
```

| Package | Why |
| --- | --- |
| `@supabase/supabase-js` | Auth, database, realtime, storage — one typed client |
| `react-native-url-polyfill` | Full WHATWG `URL` implementation that supabase-js relies on |
| `@react-native-async-storage/async-storage` | Already installed — session persistence + offline cache |
| `expo-web-browser`, `expo-linking` | Already installed — OAuth browser flow + deep-link redirect |

No `react-native-deepseek` style SDK is used (or needed): calling DeepSeek directly from the device would expose the API key. All DeepSeek traffic goes through the Edge Function (Section 7).

## 3. Environment variables

Expo natively inlines env vars prefixed with `EXPO_PUBLIC_` into the JS bundle — no babel plugin required. Copy [.env.example](../.env.example) to `.env`:

```text
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Rules to live by:

- `EXPO_PUBLIC_*` values are **public** — they end up in the app binary. Only the Supabase URL and anon/publishable key belong here. They are safe to expose *because* Row-Level Security protects the data (Section 4).
- The DeepSeek key is a **server secret**: `supabase secrets set DEEPSEEK_API_KEY=sk-...`
- The Hugging Face token (Dzongkha NLLB translation) is also **server-only**: `supabase secrets set HF_API_TOKEN=hf_...`
- `.env` is gitignored; `.env.example` documents the contract.
- Restart `npx expo start -c` after changing `.env` (values are inlined at bundle time).

The client is initialized in [src/lib/supabase.ts](../src/lib/supabase.ts):

```ts
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,        // session persists across app restarts
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,    // we handle the OAuth redirect manually
    flowType: 'pkce',             // authorization-code flow, right for mobile
  },
});
```

It also pauses token auto-refresh when the app is backgrounded (an `AppState` listener), and exports `isSupabaseConfigured` so the app renders a friendly "not configured" notice instead of crashing on a fresh clone.

## 4. Supabase backend setup

### 4.1 Create the project

1. Create a project at [database.new](https://database.new).
2. Copy the Project URL and anon/publishable key into `.env`.

### 4.2 Apply the schema

The full schema lives in [supabase/migrations/0001_schema.sql](../supabase/migrations/0001_schema.sql). Either paste it into the SQL editor in the dashboard, or use the CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

It creates three tables:

| Table | Purpose | Writes |
| --- | --- | --- |
| `conversations` | One row per chat (title, timestamps) | client |
| `messages` | User + assistant messages | client (user role only), Edge Function (assistant) |
| `usage_log` | DeepSeek token usage per request | Edge Function only |

Plus a trigger that bumps `conversations.updated_at` whenever a message is inserted (keeps the drawer sorted by recency).

### 4.3 Row-Level Security

RLS is enabled on every table. The interesting policy is the message insert:

```sql
create policy "Users can create user messages in own conversations"
  on public.messages for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'user'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
```

Three guarantees in one policy: users can only write to their own conversations, can't write rows attributed to other users, and **can't forge assistant messages** — only the Edge Function (service role, bypasses RLS) writes `role = 'assistant'`. The `usage_log` table has no insert policy at all, so only the service role can write usage rows.

### 4.4 Realtime

The migration adds `messages` to the realtime publication:

```sql
alter publication supabase_realtime add table public.messages;
```

RLS also applies to realtime: users only receive events for their own rows.

## 5. Authentication (social OAuth)

### 5.0 Test sign-in mode (development)

While OAuth providers are being set up, Sheyon Ai runs in **test sign-in mode** by default in development (`EXPO_PUBLIC_USE_TEST_AUTH=true` in `.env`, or automatic when `__DEV__` is true).

The Google and Apple buttons create/sign in with fixed test accounts via email + password — no Google Cloud or Apple Developer setup required:

| Button | Test account |
| --- | --- |
| Google | `test-google@sheyonai.app` |
| Apple | `test-apple@sheyonai.app` |

Password (dev only): `SheyonAi-Test-2026!` (see [src/lib/auth-config.ts](../src/lib/auth-config.ts)).

**Required Supabase settings for test mode:**

1. **Authentication → Providers → Email** — enable Email provider.
2. Turn **off** “Confirm email” (otherwise sign-in returns `email_not_confirmed`).
3. Optionally delete/recreate test users under **Authentication → Users** if you hit rate limits during setup.

When real OAuth is ready, set `EXPO_PUBLIC_USE_TEST_AUTH=false` in `.env` and configure Google/Apple below.

### 5.1 Production OAuth (Google & Apple)

Sheyon Ai uses **Google and Apple OAuth** with PKCE. The flow on native:

1. `supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } })` returns the provider URL.
2. `WebBrowser.openAuthSessionAsync(url, redirectTo)` opens the system auth browser.
3. The provider redirects to `sheyonai://auth/callback?code=...` (the app's scheme from [app.json](../app.json)).
4. `supabase.auth.exchangeCodeForSession(code)` completes the PKCE exchange.

See `signInWithProvider` in [src/context/auth-context.tsx](../src/context/auth-context.tsx). On web the same call performs a normal full-page redirect instead.

### 5.2 Dashboard configuration (required for real OAuth)

In the Supabase dashboard, under **Authentication → Providers**:

- **Google**: create OAuth credentials in Google Cloud Console (Web application type), set the authorized redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`, then paste the client ID/secret into Supabase.
- **Apple**: create a Services ID in the Apple Developer portal with the same Supabase callback URL, and configure the key/team IDs in Supabase.

Under **Authentication → URL Configuration**, add the app's redirect URLs to the allowlist:

```
sheyonai://auth/callback
exp://127.0.0.1:8081/--/auth/callback     (for local development in Expo Go)
```

### 5.3 Session state and protected routes

[src/context/auth-context.tsx](../src/context/auth-context.tsx) restores the persisted session on launch (`supabase.auth.getSession()`) and subscribes to `onAuthStateChange`. Screens access it through the [useSupabaseAuth](../src/hooks/use-supabase-auth.ts) hook.

Routing is guarded declaratively with expo-router protected routes in [src/app/_layout.tsx](../src/app/_layout.tsx):

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Protected guard={!!session}>
    <Stack.Screen name="index" />
    <Stack.Screen name="settings" />
  </Stack.Protected>
  <Stack.Protected guard={!session}>
    <Stack.Screen name="sign-in" />
  </Stack.Protected>
</Stack>
```

Signed-out users can only reach [sign-in.tsx](../src/app/sign-in.tsx); signing out from Settings automatically kicks the user back to it.

## 6. Database operations & realtime

CRUD is isolated in plain service modules — no React imports, easy to test:

- [src/services/conversations.ts](../src/services/conversations.ts) — list / create / rename / delete conversations
- [src/services/messages.ts](../src/services/messages.ts) — list messages, insert *user* messages

```ts
// Typical shape of a service function
export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  return data;
}
```

Note there is no `.eq('user_id', ...)` filter — RLS already scopes every query to the signed-in user. The client types come from [src/types/database.ts](../src/types/database.ts) (replace with `supabase gen types typescript --linked` output once linked).

Live updates use a `postgres_changes` subscription in [src/hooks/use-realtime-messages.ts](../src/hooks/use-realtime-messages.ts):

```ts
supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages',
      filter: `conversation_id=eq.${conversationId}` },
    (payload) => onInsert(payload.new as MessageRow))
  .subscribe();
```

This is how a message persisted by the Edge Function — or sent from another device — appears in the UI without polling.

## 7. DeepSeek via a secure Edge Function proxy

[supabase/functions/deepseek-chat/index.ts](../supabase/functions/deepseek-chat/index.ts) is the only code that talks to DeepSeek. Per request it:

1. **Authenticates** — validates the `Authorization: Bearer <JWT>` header with `auth.getUser()`; returns 401 otherwise.
2. **Authorizes** — verifies the requested conversation belongs to that user.
3. **Loads history** — last 30 messages, oldest-first, prefixed with a system prompt.
4. **Vision routing** — if any user message in history has image attachments (JPEG/PNG/GIF/WebP), signs those Storage URLs and switches to `DEEPSEEK_VISION_MODEL` (`deepseek-v4-flash-vision-exp` by default), sending OpenAI-style `image_url` content parts. Text-only turns keep using `DEEPSEEK_MODEL`.
5. **Calls DeepSeek** — `POST https://api.deepseek.com/chat/completions` with `stream: true` and `stream_options: { include_usage: true }`, with a 90s timeout and **one retry on 5xx/network errors** (4xx errors are never retried).
6. **Re-streams** — parses upstream SSE and emits a minimal protocol to the client:
   - `data: {"delta": "..."}` for each token
   - `data: {"done": true, "messageId": "...", "usage": {...}}` at the end
   - `data: {"error": {...}}` on mid-stream failure
7. **Persists** — inserts the assistant message and a `usage_log` row using the service-role client (bypasses RLS — this is the only place `role='assistant'` rows are created). The logged `model` is the upstream model actually used (text or vision).

### Deploy

```bash
npx supabase functions deploy deepseek-chat
npx supabase secrets set DEEPSEEK_API_KEY=sk-...
# optional: text model (deepseek-chat | deepseek-reasoner | deepseek-v4-flash | …)
npx supabase secrets set DEEPSEEK_MODEL=deepseek-chat
# optional: vision model used automatically when the user attaches photos
npx supabase secrets set DEEPSEEK_VISION_MODEL=deepseek-v4-flash-vision-exp
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected into the function automatically.

### Token usage tracking

Every completed request writes one `usage_log` row (`model`, `prompt_tokens`, `completion_tokens`). Useful queries:

```sql
-- Per-user tokens over the last 30 days
select user_id,
       sum(prompt_tokens) as prompt,
       sum(completion_tokens) as completion
from usage_log
where created_at > now() - interval '30 days'
group by user_id
order by completion desc;
```

This table is also the foundation for rate limiting: e.g. have the Edge Function count a user's rows in the last hour and return 429 above a threshold.

### Dzongkha library mode (NLLB-200 + DeepSeek)

When the user selects **Dzongkha** subject mode, [supabase/functions/rag-chat/index.ts](../supabase/functions/rag-chat/index.ts) runs a three-step pipeline instead of streaming DeepSeek directly:

1. **English draft** — DeepSeek generates a RAG-grounded tutor reply in English from curriculum excerpts.
2. **NLLB translation** — [supabase/functions/_shared/nllb-translate.ts](../supabase/functions/_shared/nllb-translate.ts) calls Hugging Face Inference API (`facebook/nllb-200-distilled-600M` by default) to translate `eng_Latn` → `dzo_Deva`.
3. **Polish** — DeepSeek converts the rough NLLB output to **Uchen script + romanization**, constrained by the same RAG excerpts (Bhutanese Dzongkha only).

The client shows typing stages: *Thinking* → *Translating to Dzongkha* → *Polishing Dzongkha*.

**Secrets (required for Dzongkha mode):**

```bash
npx supabase functions deploy rag-chat
npx supabase secrets set HF_API_TOKEN=hf_...
# optional model override:
npx supabase secrets set NLLB_MODEL=facebook/nllb-200-distilled-600M
```

Create a token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) with **Inference** permission. Never put `HF_API_TOKEN` in `.env` or `EXPO_PUBLIC_*` — it must stay in Edge Function secrets.

**Notes:**

- First request after idle may take 20–60s while Hugging Face loads the model (503 retries are handled server-side).
- Seed the curriculum once: `npm run seed:dzongkha`
- If the English draft is the missing-info fallback sentence, NLLB and polish are skipped and the English message is returned as-is.

## 8. Streaming responses in React Native

React Native's built-in `fetch` cannot consume response streams, but **`expo/fetch` can**. [src/hooks/use-deepseek-chat.ts](../src/hooks/use-deepseek-chat.ts) uses it to read the Edge Function's SSE stream:

```ts
import { fetch as expoFetch } from 'expo/fetch';

const response = await expoFetch(`${functionsUrl}/deepseek-chat`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ conversationId }),
  signal: abortController.signal,
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';            // keep incomplete line for the next chunk
  for (const line of lines) {
    if (!line.trim().startsWith('data:')) continue;
    const payload = JSON.parse(line.trim().slice(5));
    if (payload.delta) onDelta(/* accumulated text */);
  }
}
```

UI updates: the chat context appends an assistant message on the **first** token (which also hides the typing indicator) and then updates that message's content on each delta — the `MessageList`/`MessageBubble` components re-render incrementally, exactly like the old mock streaming did.

**Stop generation** is an `AbortController.abort()`. The partial text stays on screen locally; it is intentionally *not* persisted server-side.

**Why not `supabase.functions.invoke()`?** It buffers the whole response body, which defeats streaming. Direct `expoFetch` against `${SUPABASE_URL}/functions/v1/deepseek-chat` is the reliable path.

## 9. Folder structure & architecture

```
SheyonAi/
├── src/
│   ├── app/                    # expo-router screens
│   │   ├── _layout.tsx         #   providers + protected routes
│   │   ├── index.tsx           #   chat screen
│   │   ├── sign-in.tsx         #   OAuth sign-in
│   │   └── settings.tsx        #   account, theme, data
│   ├── components/chat/        # presentational chat UI (unchanged by backend)
│   ├── context/
│   │   ├── auth-context.tsx    # session state + OAuth actions
│   │   └── chat-context.tsx    # orchestrates services, hooks, optimistic UI
│   ├── hooks/
│   │   ├── use-supabase-auth.ts
│   │   ├── use-deepseek-chat.ts      # SSE streaming + abort + retry
│   │   └── use-realtime-messages.ts  # postgres_changes subscription
│   ├── lib/
│   │   └── supabase.ts         # the single Supabase client instance
│   ├── services/
│   │   ├── conversations.ts    # pure CRUD, no React
│   │   └── messages.ts
│   └── types/
│       ├── chat.ts             # UI-facing types
│       └── database.ts         # DB row types
├── supabase/
│   ├── migrations/0001_schema.sql
│   └── functions/deepseek-chat/index.ts
└── docs/INTEGRATION_GUIDE.md
```

Separation of concerns:

- **Components** know nothing about Supabase — they consume `useChat()`.
- **Services** are stateless async functions over the Supabase client.
- **Hooks** encapsulate one concern each (auth, streaming, realtime).
- **Contexts** wire it together and own optimistic-update logic.

## 10. End-to-end workflow example

What happens when a signed-in user sends "Explain quantum computing":

1. `ChatComposer` calls `sendMessage(text)` from [chat-context.tsx](../src/context/chat-context.tsx).
2. The user message is appended **optimistically** with a temp id; the typing indicator starts immediately.
3. If the conversation is a local draft, a `conversations` row is created first and the draft id is swapped for the DB id.
4. `insertUserMessage()` persists the user message (RLS verifies ownership); the temp id is reconciled with the DB id.
5. `streamReply()` opens the SSE stream to the `deepseek-chat` Edge Function with the user's JWT.
6. The function validates the JWT, loads history, calls DeepSeek, and streams tokens back; the UI renders them incrementally.
7. On completion the function inserts the assistant message + usage row; the final SSE event carries the new `messageId`, which replaces the streamed temp id in the UI.
8. On any other device, the realtime subscription receives the INSERT and appends the message live.

Errors at any step surface as an alert; the optimistic assistant bubble is removed so the UI never lies about what was saved.

## 11. Caching & offline support

- **Session**: persisted by supabase-js in AsyncStorage; users stay signed in across restarts.
- **Conversations**: the chat context keeps a per-user snapshot in AsyncStorage (`sheyonai.cache.v2.<userId>`), written with a 400 ms debounce. On launch the cache hydrates the UI instantly, then `fetchConversations()` revalidates from the server (stale-while-revalidate). Message lists are refetched lazily when a conversation is opened.
- **Offline**: cached conversations remain readable; sends fail with a clear alert. For a heavier-duty offline story, consider queueing unsent messages (e.g. in AsyncStorage) and flushing on reconnect, or `expo-sqlite/kv-store` for larger caches.

## 12. Security checklist

- [x] No secrets in the app bundle — only `EXPO_PUBLIC_` URL + anon key (designed to be public).
- [x] DeepSeek key stored via `supabase secrets`, used only inside the Edge Function.
- [x] RLS enabled on every table; every policy scoped to `auth.uid()`.
- [x] Clients cannot insert `role='assistant'` messages or any `usage_log` rows.
- [x] Edge Function re-validates the JWT and conversation ownership on every call.
- [x] Inputs validated at the boundary (function rejects missing/invalid `conversationId`; 4xx never retried).
- [x] PKCE OAuth flow (no tokens in URLs fragments handled by third parties).
- [x] Token usage logged per user — the hook for rate limiting and cost alerts.
- [ ] Recommended next step: per-user rate limit in the Edge Function (count `usage_log` rows per hour, return 429).

## 13. Environments (dev / staging / prod)

Use one Supabase project per environment and select it via env files:

```bash
# .env.development / .env.staging / .env.production
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

- **Local dev**: Expo CLI automatically loads `.env` (and `.env.development`). Use `npx expo start -c` after switching.
- **EAS builds**: define per-profile env vars in `eas.json`, or manage them with `eas env` so the right values are inlined per build profile:

```jsonc
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://prod-ref.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
      }
    }
  }
}
```

- **Edge Function secrets** are per-project, so staging and prod automatically use their own DeepSeek keys: `supabase secrets set DEEPSEEK_API_KEY=... --project-ref <ref>`.
- Apply migrations to each project with `supabase db push` after linking the corresponding ref.

## 14. Testing & debugging tips

- **Edge Function locally**: `npx supabase start`, then `npx supabase functions serve deepseek-chat --env-file supabase/.env.local` (put `DEEPSEEK_API_KEY` in that file). Smoke-test with curl:

  ```bash
  curl -N -X POST http://127.0.0.1:54321/functions/v1/deepseek-chat \
    -H "Authorization: Bearer <user-jwt>" \
    -H "Content-Type: application/json" \
    -d '{"conversationId":"<uuid>"}'
  ```

- **Function logs**: Dashboard → Edge Functions → deepseek-chat → Logs (the function `console.error`s upstream failures and DB errors).
- **RLS verification**: in the SQL editor, `set role authenticated; set request.jwt.claims = '{"sub":"<user-uuid>"}';` then run selects to confirm scoping. Or simply create two test users and verify neither can read the other's rows.
- **Realtime debugging**: `supabase.channel(...).subscribe((status) => console.log(status))` — `SUBSCRIBED` means the socket is healthy; `CHANNEL_ERROR` usually means realtime isn't enabled for the table.
- **OAuth on a device**: deep links don't work in some emulator setups; test `sheyonai://auth/callback` via `npx uri-scheme open "sheyonai://auth/callback" --android`.
- **Streaming**: if you see the whole reply arrive at once, confirm you're using `expo/fetch` (not global `fetch`) and that nothing in between buffers (some corporate proxies buffer SSE).
- **`.env` changes not picked up**: restart with `npx expo start -c` — env vars are inlined at bundle time.

## 15. Optional: file uploads with Supabase Storage

Not wired into the UI, but the pattern for attachments:

```ts
import * as FileSystem from 'expo-file-system';

const file = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
const path = `${user.id}/${Date.now()}.jpg`;

const { error } = await supabase.storage
  .from('attachments')
  .upload(path, decode(file), { contentType: 'image/jpeg' }); // decode: base64 -> ArrayBuffer
```

Create the `attachments` bucket as **private**, add storage policies mirroring the RLS approach (first path segment must equal `auth.uid()`), and serve files with `createSignedUrl()` rather than public URLs.
