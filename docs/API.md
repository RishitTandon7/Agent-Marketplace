# AgentLab API

Base URL: `https://agentlab.rishit.site`

## Authentication
Create a key in the dashboard. Send it as `Authorization: Bearer ahub_lv_<key>`.
A key works for the one agent it was created for (or `global`). Only its SHA-256 hash is stored.

## Run an agent
`POST /api/v1/agents/{slug}/run` with a JSON body matching the agent's input schema.

```bash
curl -X POST https://agentlab.rishit.site/api/v1/agents/password-generator/run \
  -H "Authorization: Bearer ahub_lv_<key>" -H "Content-Type: application/json" \
  -d '{"count":"3","length":"16","include_numbers":"true","include_symbols":"true"}'
```

Response: `{ "success": true, "agent": "...", "duration_ms": 214, "output": { ... } }`

## Agent info
`GET /api/v1/agents/{slug}/run` returns the agent's description and input schema.

## Errors
| Status | Meaning |
|---|---|
| 400 | Body is not valid JSON, or a required field is missing |
| 401 | Missing, invalid or revoked API key |
| 403 | Key belongs to another agent, or premium agent without an active subscription |
| 404 | Agent not found or inactive |
| 502 | Agent execution failed |

## Agents
text-summarizer, code-explainer, sentiment-analyzer, keyword-extractor, json-formatter, password-generator (free);
email-drafter, grammar-checker, sms-sender (premium).
