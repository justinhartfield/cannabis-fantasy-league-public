import * as postmark from 'postmark';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const args = process.argv.slice(2);

const API_KEY = process.env.POSTMARK_API_KEY || 'd6692ffd-ec8f-43ad-931d-6bb05bdce7a6';
const TO_EMAIL = args[0] || 'test@example.com';
const FROM_EMAIL = args[1] || process.env.POSTMARK_FROM_EMAIL || 'noreply@cannabis-fantasy-league.com';

async function verifyPostmark() {
  console.log('--- Postmark Configuration Verification ---');
  console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
  console.log(`From Email: ${FROM_EMAIL}`);
  console.log(`To Email: ${TO_EMAIL}`);
  console.log('-------------------------------------------');

  const client = new postmark.ServerClient(API_KEY);

  try {
    console.log('Sending test email...');
    const response = await client.sendEmail({
      "From": FROM_EMAIL,
      "To": TO_EMAIL,
      "Subject": "Postmark Verification Test",
      "HtmlBody": "<strong>Hello</strong> from the verification script.",
      "TextBody": "Hello from the verification script.",
      "MessageStream": "outbound"
    });

    console.log('\n✅ Success! Email sent.');
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('\nCheck the Postmark Activity feed to confirm delivery.');
  } catch (error) {
    console.error('\n❌ Failed to send email.');
    console.error('Error:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
        const err = error as any;
        if (err.code === 400) {
            console.error('\n[Tip] Code 400 usually means the "From" address is not a verified Sender Signature in Postmark.');
        }
        if (err.code === 406) {
             console.error('\n[Tip] Code 406 usually means the recipient is inactive (bounced, complained, or suppressed).');
        }
    }
  }
}

if (args.includes('--help')) {
    console.log('Usage: npx tsx scripts/verify-postmark-config.ts [TO_EMAIL] [FROM_EMAIL]');
    process.exit(0);
}

verifyPostmark();
