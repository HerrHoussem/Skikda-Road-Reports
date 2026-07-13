// Supabase Edge Function: chat-assistant
// Purpose: Lets the website's chat widget talk to Claude (Anthropic API)
// without ever exposing the API key in the browser.
//
// HOW TO DEPLOY (no CLI needed):
// 1. Supabase Dashboard -> Edge Functions -> "Deploy a new function" -> "Via Editor"
// 2. Name it exactly: chat-assistant
// 3. Paste this entire file as the function code
// 4. Before deploying, add your secret key:
//    Edge Functions -> Manage secrets -> add a secret named ANTHROPIC_API_KEY
//    (get this key from https://console.anthropic.com -> API Keys)
// 5. Click Deploy

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This system prompt is what teaches the assistant about YOUR platform.
// Edit this text any time to change what the assistant knows / how it behaves.
const SYSTEM_PROMPT = `أنت مساعد رقمي على منصة "بلاغات الطريق - سكيكدة"، وهي منصة إلكترونية يستخدمها مواطنو ولاية سكيكدة (الجزائر) للإبلاغ عن مشاكل الطرقات والخدمات العمومية.

معلومات عن المنصة يجب أن تعرفها لمساعدة الزوار:

- أنواع البلاغات المتاحة في النموذج: حفرة في الطريق، تسرب مياه، إنارة عمومية معطلة، انسداد مجرى، مشكلة أخرى.
- حقول نموذج البلاغ: نوع المشكلة (قائمة اختيار)، المنطقة أو البلدية (نص حر، مثال: سكيكدة، عزابة، الحروش)، ووصف المشكلة (نص حر مختصر).
- عند إرسال البلاغ، يحصل المستخدم فورًا على رقم تتبع بصيغة SKK-XXXXXX (ستة أرقام).
- يمكن للمستخدم لاحقًا معرفة حالة بلاغه عبر إدخال رقم التتبع في خانة البحث الموجودة أعلى الموقع، أو عبر صفحة "track.html".
- حالات البلاغ الممكنة: جديد، قيد المعالجة، تم الحل.
- بيانات البلاغات تُخزَّن مباشرة في قاعدة بيانات، ولا حاجة لإنشاء حساب أو تسجيل دخول لإرسال بلاغ.
- طرق التواصل الأخرى المتاحة: البريد الإلكتروني، الهاتف، وواتساب (روابطها موجودة في قسم "تواصل" أسفل الصفحة).

تعليمات السلوك:
- أجب دائمًا بنفس لغة رسالة المستخدم (عربي أو فرنسي أو غير ذلك).
- كن مختصرًا وودودًا ومباشرًا، بدون مقدمات طويلة.
- ساعد الزائر على فهم كيفية تعبئة النموذج، اختيار نوع المشكلة المناسب، أو معرفة كيفية تتبع بلاغ سابق.
- لا تخترع معلومات عن حالة بلاغ معين؛ إن سأل عن حالة بلاغ محدد، وجّهه لاستخدام خانة البحث أو صفحة track.html بدلاً من تخمين الجواب.
- لا تقدم معلومات طبية أو قانونية أو غير متعلقة بالمنصة؛ أعد توجيه أي سؤال خارج هذا النطاق بلطف.`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'message' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured: missing ANTHROPIC_API_KEY secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // history: optional array of { role: 'user' | 'assistant', content: string }
    // sent by the frontend so the assistant remembers the conversation so far.
    const messages = Array.isArray(history) ? [...history] : [];
    messages.push({ role: "user", content: message });

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      return new Response(
        JSON.stringify({ error: "Upstream API error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await anthropicRes.json();
    const replyText = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return new Response(
      JSON.stringify({ reply: replyText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
