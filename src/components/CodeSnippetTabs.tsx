'use client'

import { useState } from 'react'

interface Props {
  slug: string
  inputSchema: Record<string, unknown> | null
}

type Lang = 'curl' | 'javascript' | 'python' | 'go'

export default function CodeSnippetTabs({ slug, inputSchema }: Props) {
  const [activeLang, setActiveLang] = useState<Lang>('curl')
  const [copied, setCopied] = useState(false)

  // Derive simple payload from inputSchema
  const payload: Record<string, unknown> = {}
  if (inputSchema && typeof inputSchema === 'object') {
    Object.entries(inputSchema).forEach(([key, val]) => {
      const v = val as { example?: unknown; default?: unknown; type?: string }
      payload[key] = v?.example ?? v?.default ?? (v?.type === 'number' ? 42 : '...')
    })
  } else {
    payload.text = 'Your input text here...'
  }

  const payloadStr = JSON.stringify(payload, null, 2)

  // Language snippets
  const snippets: Record<Lang, string> = {
    curl: `curl -X POST \\
  https://agentlab.dev/api/v1/agents/${slug}/run \\
  -H "Authorization: Bearer ahub_lv_<your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2).replace(/'/g, "'\\''")}'`,

    javascript: `// Node.js or Browser Fetch
const runAgent = async () => {
  const res = await fetch("https://agentlab.dev/api/v1/agents/${slug}/run", {
    method: "POST",
    headers: {
      "Authorization": "Bearer ahub_lv_<your_api_key>",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(${payloadStr.replace(/\n/g, '\n    ')})
  });

  const data = await res.json();
  if (data.success) {
    console.log("Agent output:", data.output);
  } else {
    console.error("Error:", data.error);
  }
};

runAgent();`,

    python: `import requests

url = "https://agentlab.dev/api/v1/agents/${slug}/run"
headers = {
    "Authorization": "Bearer ahub_lv_<your_api_key>",
    "Content-Type": "application/json"
}
payload = ${JSON.stringify(payload, null, 4).replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None').replace(/\n/g, '\n    ')}

response = requests.post(url, headers=headers, json=payload)
data = response.json()

if data.get("success"):
    print("Agent output:", data["output"])
else:
    print("Error:", data.get("error"))`,

    go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "https://agentlab.dev/api/v1/agents/${slug}/run"
	
	payload := map[string]interface{}{
		${Object.entries(payload).map(([k, v]) => `"${k}": ${typeof v === 'string' ? `"${v}"` : v},`).join('\n\t\t')}
	}

	jsonValue, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonValue))
	req.Header.Set("Authorization", "Bearer ahub_lv_<your_api_key>")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
  }

  function handleCopy() {
    navigator.clipboard.writeText(snippets[activeLang])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const langs: { id: Lang; label: string }[] = [
    { id: 'curl', label: 'cURL' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'python', label: 'Python' },
    { id: 'go', label: 'Go' },
  ]

  return (
    <div className="bg-p-black text-white border-2 border-p-black rounded-2xl overflow-hidden premium-static flex flex-col h-full min-h-[360px]">
      {/* Tabs Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {langs.map(l => (
            <button
              key={l.id}
              onClick={() => setActiveLang(l.id)}
              className={`font-sans text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                activeLang === l.id
                  ? 'bg-p-lime text-p-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="font-sans text-xs font-bold text-white/50 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-all"
        >
          {copied ? '✓ Copied' : 'Copy Code'}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-5 overflow-auto flex-1 font-mono text-xs text-p-lime whitespace-pre select-text scrollbar-thin">
        {snippets[activeLang]}
      </div>
    </div>
  )
}
