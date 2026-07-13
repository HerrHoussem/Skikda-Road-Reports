# Smart Skikda AI Assistant Update

This ZIP contains updated files for the Smart Skikda / بلاغات الطريق - سكيكدة website.

## Files included

- `index.html` — cleaned HTML, improved AI assistant UI, quick action buttons, fixed CDN/font URLs.
- `style.css` — professional dark portal styling + chatbot quick action button styles.
- `chat-assistant-edge-function.ts` — Supabase Edge Function backend for Claude / Anthropic API.

## Important deploy notes

1. Replace your current `index.html` with the included `index.html`.
2. Replace your current `style.css` with the included `style.css`.
3. In Supabase Dashboard, open Edge Functions and deploy/update function named `chat-assistant` using `chat-assistant-edge-function.ts`.
4. Add this Edge Function secret before deploying:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your real Anthropic API key from Anthropic Console.

Never paste your Anthropic API key into `index.html` or GitHub.
