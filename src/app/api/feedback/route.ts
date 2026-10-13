import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * POST /api/feedback
 *
 * Receives structured feedback fields from the client form and sends an email
 * directly via Resend to the configured FEEDBACK_EMAIL address.
 *
 * Required environment variables:
 *   RESEND_API_KEY   — API key from resend.com
 *   FEEDBACK_EMAIL   — destination email address (your inbox)
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_EMAIL;

  if (!apiKey || !toEmail) {
    return NextResponse.json(
      { error: "Feedback is currently unavailable." },
      { status: 503 }
    );
  }

  let body: {
    type?: string;
    tool?: string;
    message?: string;
    lang?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { type = "General", tool = "—", message = "", lang = "en" } = body;

  if (!message.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const subject = `[File Tools Feedback] ${type}${tool !== "—" ? ` – ${tool}` : ""}`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
      <div style="background: linear-gradient(135deg, #2563EB, #7C3AED); padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; color: white; font-size: 18px;">📩 New Feedback — File Tools</h1>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600; color: #374151; width: 140px; border-radius: 4px;">Type</td>
            <td style="padding: 8px 12px; color: #111827;">${type}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #374151;">Tool</td>
            <td style="padding: 8px 12px; color: #111827;">${tool}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600; color: #374151; border-radius: 4px;">Language</td>
            <td style="padding: 8px 12px; color: #111827;">${lang}</td>
          </tr>
        </table>
        <div style="background: #f9fafb; border-left: 4px solid #7C3AED; padding: 16px; border-radius: 4px;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #374151;">Message</p>
          <p style="margin: 0; color: #111827; white-space: pre-wrap; line-height: 1.6;">${message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
        <p style="margin: 20px 0 0; font-size: 12px; color: #9ca3af;">Sent via File Tools Feedback Form</p>
      </div>
    </div>
  `;

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: "File Tools <onboarding@resend.dev>",
    to: toEmail,
    subject,
    html: htmlBody,
  });

  if (error) {
    console.error("[feedback] Resend error:", error);
    return NextResponse.json(
      { error: "Failed to send feedback. Please try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
