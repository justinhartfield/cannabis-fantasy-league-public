import { ServerClient } from "postmark";
import { ENV } from "./env";

let client: ServerClient | null = null;

export function getEmailClient() {
  if (!client && ENV.postmarkApiKey) {
    client = new ServerClient(ENV.postmarkApiKey);
  }
  return client;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string; // Defaults to a standard sender if not provided
}

export async function sendEmail({
  to,
  subject,
  htmlBody,
  textBody,
  from = "Cannabis Fantasy League <notifications@cannabisfantasyleague.com>",
}: SendEmailOptions): Promise<boolean> {
  const client = getEmailClient();
  
  if (!client) {
    console.warn("[Email] Postmark API key not configured. Email not sent:", { to, subject });
    return false;
  }

  try {
    await client.sendEmail({
      "From": from,
      "To": to,
      "Subject": subject,
      "HtmlBody": htmlBody,
      "TextBody": textBody,
      "MessageStream": "outbound"
    });
    console.log(`[Email] Sent email to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}


