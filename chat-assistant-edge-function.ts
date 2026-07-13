// Supabase Edge Function: chat-assistant
// Purpose: lets the website chat widget talk to Claude / Anthropic API
// without exposing the API key in the browser.
//
// Deploy in Supabase Dashboard:
// Edge Functions -> Deploy new function -> Via Editor
// Function name: chat-assistant
// Add secret before deploy: ANTHROPIC_API_KEY

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `
أنت مساعد رقمي رسمي لمنصة "بلاغات الطريق - سكيكدة" / Smart Skikda.

المنصة تساعد مواطني ولاية سكيكدة، الجزائر، على الإبلاغ عن:
- حفرة في الطريق
- تسرب مياه
- إنارة عمومية معطلة
- انسداد مجرى
- مشكلة أخرى مرتبطة بالخدمات العمومية

معلومات مهمة عن المنصة:
- لا يحتاج المواطن إلى إنشاء حساب أو تسجيل دخول لإرسال بلاغ.
- نموذج البلاغ يحتوي على: نوع المشكلة، المنطقة / البلدية، وصف مختصر وواضح للمشكلة.
- بعد إرسال البلاغ يحصل المستخدم على رقم تتبع مثل: SKK-123456.
- يمكن تتبع البلاغ من خلال خانة البحث أعلى الموقع أو صفحة track.html.
- حالات البلاغ الممكنة: جديد، قيد المعالجة، تم الحل.
- معلومات التواصل موجودة في قسم "تواصل معنا" أسفل الموقع: البريد الإلكتروني، الهاتف، واتساب.

طريقة الرد:
- أجب بنفس لغة المستخدم: العربية أو الفرنسية أو الإنجليزية.
- كن مختصرًا، محترمًا، واضحًا ومباشرًا.
- إذا سأل المستخدم عن حالة بلاغ محدد، لا تخترع الحالة. أخبره أن يستخدم رقم التتبع في خانة البحث أو صفحة track.html.
- لا تطلب معلومات حساسة.
- لا تقدم نصائح طبية أو قانونية أو سياسية.
- إذا كان السؤال خارج نطاق المنصة، وجه المستخدم بلطف إلى أنك مخصص لمساعدة زوار منصة Smart Skikda.
`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function cleanHistory(history: unknown) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => {
      return (
        item &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
      );
    })
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 1500),
    }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { message, history } = body;

    if (typeof message !== "string") {
      return jsonResponse({ error: "Missing message field" }, 400);
    }

    const userMessage = message.trim();
    if (!userMessage) {
      return jsonResponse({ error: "Message is empty" }, 400);
    }

    if (userMessage.length > 2000) {
      return jsonResponse({ error: "Message is too long. Please send a shorter message." }, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "Server misconfigured: missing ANTHROPIC_API_KEY secret" }, 500);
    }

    const messages = cleanHistory(history);
    messages.push({ role: "user", content: userMessage });

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 500,
        temperature: 0.4,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      return jsonResponse({ error: "Assistant service unavailable. Please try again later." }, 502);
    }

    const data = await anthropicRes.json();
    const replyText = Array.isArray(data.content)
      ? data.content
          .filter((block: any) => block.type === "text")
          .map((block: any) => block.text)
          .join("\n")
          .trim()
      : "";

    return jsonResponse({ reply: replyText || "لم أتمكن من إنشاء رد حاليًا." }, 200);
  } catch (err) {
    console.error("Edge function error:", err);
    return jsonResponse({ error: "Unexpected server error. Check Edge Function logs in Supabase." }, 500);
  }
});
