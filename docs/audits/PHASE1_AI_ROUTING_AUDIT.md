# Phase 1 AI Routing Audit

## Files Importing invokeLLM or AI Helpers

- `client/src/components/AIChatBox.tsx`
- `docs/audits/PHASE1_AI_ROUTING_AUDIT.md`
- `server/_core/llm.ts`
- `server/_core/salesChatRouter.ts`
- `server/routers.ts`
- `server/studentRouter.ts`


## AI Endpoints/Procedures

- `ai.chat` (subscribedProcedure) from `server/routers.ts:457`
- `weather.analyze` (subscribedProcedure) from `server/routers.ts:2593`
- `student.askTutor` (studentProcedure) from `server/studentRouter.ts:1259`
- `POST /sales-chat` from `server/_core/salesChatRouter.ts:212`


## Current Env/Runtime Config Keys

- `OPENAI_API_KEY` / siteSettings `openai_api_key`
- `OPENAI_MODEL` / siteSettings `ai_model`
- `OPENAI_BASE_URL` / siteSettings `openai_base_url`
- `HUGGINGFACE_API_KEY` / siteSettings `huggingface_api_key` configuration check remains
- `AI_TUTOR_MODEL` / siteSettings `ai_tutor_model`
- `AI_TUTOR_SMART_MODEL` / siteSettings `ai_tutor_smart_model`
- `WEATHER_API_KEY` appears in health reporting; Open-Meteo code does not need it


## OpenAI-Compatible Base URL Behavior

`server/_core/llm.ts` reads `OPENAI_BASE_URL` from env first, then runtime config, strips one trailing slash, and appends `/chat/completions`. If unset, it uses `https://api.openai.com/v1/chat/completions`.


## Model Selection Behavior

General AI uses `ai_model`/`OPENAI_MODEL`, default `gpt-4o-mini`. Student tutor uses `AI_TUTOR_MODEL` and `AI_TUTOR_SMART_MODEL`, also defaulting to `gpt-4o-mini`.


## Current Weather/Chat AI Behavior

`ai.chat`, `weather.analyze`, `student.askTutor`, and `/api/sales-chat` can call `invokeLLM`. The live Weather page mainly uses Open-Meteo-backed `weather.getCurrent`, `getForecast`, and `getHourly`.


## Prompt 3 GenX Replacement Points

- server/_core/llm.ts
- server/routers.ts (`ai.chat`, `weather.analyze`)
- server/studentRouter.ts (`askTutor`)
- server/_core/salesChatRouter.ts
- client/src/pages/Admin.tsx AI/OpenAI labels and runtime setting keys
- .env.example/docs future keys, marked FUTURE/PROMPT 3 only


## Risks if GenX Is Swapped Incorrectly

- Breaking the OpenAI-compatible response shape breaks all current LLM callers.
- Changing env names without backward compatibility disables production AI.
- Removing `OPENAI_BASE_URL` breaks compatible-provider/proxy deployments.
- Replacing Open-Meteo instead of LLM paths would regress working weather.
