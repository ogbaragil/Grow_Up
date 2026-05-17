
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Grow UP <reminders@growupapp.app>";
const APP_URL = Deno.env.get("APP_URL") || "https://growupapp.app";

function welcomeHtml() {
  return `
  <div style="font-family:Inter,Arial,sans-serif;line-height:1.65;color:#101214;max-width:620px;margin:0 auto;padding:28px">
    <h1 style="font-size:28px;letter-spacing:-0.04em;margin:0 0 18px">Welcome to Grow UP</h1>

    <p>Hey,</p>

    <p>My name is Gil — I'm the founder and CEO of Grow UP.</p>

    <p>We started Grow UP because managing money shouldn’t feel overwhelming. Most people know they want to build wealth, pay off debt, or feel more in control financially — but they’ve never had a simple system that brings everything together in one place.</p>

    <p><strong>Here are 3 tips to get started.</strong></p>

    <ol>
      <li>Add your Assets and Debts Accounts</li>
      <li>Add Important Recurring Transactions</li>
      <li>Add at least one goal</li>
    </ol>

    <p><strong>P.S.:</strong> Why did you sign up? What brought you here?</p>

    <p>Hit “Reply” and let me know. I read and reply to every email.</p>

    <p>Cheers,<br/>Gil</p>

    <p style="margin-top:28px">
      <a href="${APP_URL}" style="display:inline-block;background:#15181D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:800">Open Grow UP</a>
    </p>
  </div>`;
}

serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const email = body.email;

  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: "Missing email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to Grow UP",
      html: welcomeHtml(),
    }),
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ ok: false, error: await res.text() }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (body.user_id) {
    await fetch(`${SUPABASE_URL}/rest/v1/growup_email_preferences?user_id=eq.${body.user_id}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        welcome_email_sent: true,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
