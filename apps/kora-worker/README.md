# kora-worker — живая KORA через Cloudflare Worker

`POST /ask` принимает `{ missionId, taskId, hintStage, question }` и отвечает `{ answer, source }`.
Ключи LLM живут только в секретах воркера; правильные ответы заданий в промпт не попадают —
воркер использует hint-safe копию контента (`src/kora-context.json`, генерируется из `content/`).

Игра полностью играбельна и без воркера: клиент показывает «Бортовая справка · KORA офлайн».

## Деплой (один раз, ~10 минут)

1. `npx wrangler login` — логин в Cloudflare (бесплатный tier достаточен).
2. `npx wrangler kv namespace create LIMITS` — вставить полученный `id` в `wrangler.toml`.
3. Секреты (внутри `apps/kora-worker`):
   ```bash
   npx wrangler secret put NIM_API_KEY     # ключ NVIDIA NIM
   npx wrangler secret put GROQ_API_KEY    # ключ Groq (фолбэк, можно пропустить)
   npx wrangler secret put CLIENT_KEY      # придумай строку; она же пойдёт в GitHub variables
   ```
4. В `wrangler.toml` заменить `REPLACE_GH_USER` на свой GitHub-логин (origin GitHub Pages).
5. `npm run build:context --workspace @orbitquest/kora-worker` — обновить hint-safe контекст.
6. `npx wrangler deploy` — получить URL вида `https://orbitquest-kora.<acc>.workers.dev`.
7. В GitHub-репозитории → Settings → Variables (не secrets): `KORA_URL` = URL воркера,
   `KORA_CLIENT_KEY` = значение CLIENT_KEY. Перезапустить workflow deploy.

## Проверка приёмки

```bash
# без секрета → 401
curl -s -o /dev/null -w "%{http_code}" -X POST https://<worker>/ask -d '{}'
# с секретом → живой ответ
curl -s -X POST https://<worker>/ask \
  -H "content-type: application/json" -H "x-oq-key: <CLIENT_KEY>" \
  -d '{"missionId":"code-01","taskId":"t1","hintStage":1,"question":"Почему машина не догадывается?"}'
```

Защита: секретный заголовок, CORS-allowlist, дневной бюджет (KV, по умолчанию 200/день),
per-IP лимит 40/день, circuit breaker на 10 минут после 5 ошибок подряд, тело ≤4KB, ответ ≤400 токенов.
Принятый остаточный риск: ключ в PWA извлекаем; худший случай — сожжённый дневной бюджет
бесплатных ключей, KORA уходит в фолбэк до сброса.
