import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/feedback
 *
 * Receives structured feedback fields from the client form and returns a
 * pre-populated mailto: URL that opens the user's local email client.
 *
 * The recipient email address is read from the server-only environment
 * variable FEEDBACK_EMAIL and is never included in the client-side JS bundle.
 */
export async function POST(request: NextRequest) {
  const email = process.env.FEEDBACK_EMAIL;

  if (!email) {
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

  const bodyText = [
    `Feedback Type : ${type}`,
    `Tool          : ${tool}`,
    `Language      : ${lang}`,
    ``,
    `--- Message ---`,
    message.trim(),
    ``,
    `--- Sent via File Tools Feedback Form ---`,
  ].join("\n");

  const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

  return NextResponse.json({ mailto });
}
