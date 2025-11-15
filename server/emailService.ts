import * as postmark from 'postmark';

/**
 * Email Service using Postmark
 * 
 * Handles all email sending functionality:
 * - League invitations
 * - Draft notifications
 * - Scoring updates
 * - Trade notifications
 * - Weekly recaps
 */

// Initialize Postmark
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY || '';
const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || 'noreply@cannabis-fantasy-league.com';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

let client: postmark.ServerClient | null = null;
if (POSTMARK_API_KEY) {
  client = new postmark.ServerClient(POSTMARK_API_KEY);
  console.log('[EmailService] Postmark initialized');
} else {
  console.warn('[EmailService] POSTMARK_API_KEY not set - emails will not be sent');
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a generic email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!client) {
    console.warn('[EmailService] Email not sent - API key not configured');
    return false;
  }

  try {
    const msg = {
      To: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      From: FROM_EMAIL,
      Subject: options.subject,
      HtmlBody: options.html,
      TextBody: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      MessageStream: 'outbound', // Required by Postmark for transactional emails
    };

    await client.sendEmail(msg);
    console.log(`[EmailService] Email sent to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    return true;
  } catch (error) {
    console.error('[EmailService] Error sending email:', error);
    return false;
  }
}

/**
 * Send league invitation email
 */
export async function sendLeagueInvitation(params: {
  toEmail: string;
  toName: string;
  leagueName: string;
  inviterName: string;
  invitationToken: string;
  leagueId: number;
}): Promise<boolean> {
  const acceptUrl = `${APP_URL}/invitation/accept?token=${params.invitationToken}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>League Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
    }
    .button:hover {
      background: #059669;
    }
    .details {
      background: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin: 30px 0;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .details-label {
      font-weight: 600;
      color: #6b7280;
    }
    .details-value {
      color: #1f2937;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .link {
      color: #10b981;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌿 Cannabis Fantasy League</div>
    </div>
    
    <div class="title">You're Invited!</div>
    
    <div class="message">
      <p>Hi ${params.toName},</p>
      <p><strong>${params.inviterName}</strong> has invited you to join their fantasy league!</p>
    </div>
    
    <div class="details">
      <div class="details-row">
        <span class="details-label">League Name:</span>
        <span class="details-value">${params.leagueName}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Invited By:</span>
        <span class="details-value">${params.inviterName}</span>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" class="button">Accept Invitation</a>
    </div>
    
    <div class="message">
      <p>Or copy and paste this link into your browser:</p>
      <p><a href="${acceptUrl}" class="link">${acceptUrl}</a></p>
    </div>
    
    <div class="footer">
      <p>This invitation was sent to ${params.toEmail}</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: params.toEmail,
    subject: `You're invited to join ${params.leagueName}!`,
    html,
  });
}

/**
 * Send draft starting notification
 */
export async function sendDraftStartingNotification(params: {
  toEmail: string;
  toName: string;
  leagueName: string;
  draftTime: Date;
  leagueId: number;
  leagueType?: 'season' | 'challenge';
}): Promise<boolean> {
  // Drafts are only for season leagues, but handle challenge case gracefully
  const draftUrl = params.leagueType === 'challenge'
    ? `${APP_URL}/challenge/${params.leagueId}`
    : `${APP_URL}/league/${params.leagueId}/draft`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Draft Starting Soon</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .alert {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌿 Cannabis Fantasy League</div>
    </div>
    
    <div class="title">⏰ Draft Starting Soon!</div>
    
    <div class="message">
      <p>Hi ${params.toName},</p>
      <p>The draft for <strong>${params.leagueName}</strong> is about to begin!</p>
    </div>
    
    <div class="alert">
      <strong>Draft Time:</strong> ${params.draftTime.toLocaleString()}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${draftUrl}" class="button">Join Draft Room</a>
    </div>
    
    <div class="footer">
      <p>Good luck in the draft!</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: params.toEmail,
    subject: `Draft starting for ${params.leagueName}!`,
    html,
  });
}

/**
 * Send weekly scoring notification
 */
export async function sendWeeklyScoringNotification(params: {
  toEmail: string;
  toName: string;
  leagueName: string;
  week: number;
  year: number;
  teamScore: number;
  opponentName: string;
  opponentScore: number;
  won: boolean;
  leagueId: number;
  leagueType?: 'season' | 'challenge';
}): Promise<boolean> {
  const leagueUrl = params.leagueType === 'challenge'
    ? `${APP_URL}/challenge/${params.leagueId}`
    : `${APP_URL}/league/${params.leagueId}`;
  const result = params.won ? '🎉 Victory!' : '😔 Defeat';
  const resultColor = params.won ? '#10b981' : '#ef4444';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Results</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: ${resultColor};
      margin-bottom: 20px;
      text-align: center;
    }
    .scoreboard {
      background: #f9fafb;
      border-radius: 8px;
      padding: 30px;
      margin: 30px 0;
      text-align: center;
    }
    .score {
      font-size: 48px;
      font-weight: bold;
      color: #1f2937;
      margin: 20px 0;
    }
    .vs {
      font-size: 24px;
      color: #6b7280;
      margin: 0 20px;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌿 Cannabis Fantasy League</div>
    </div>
    
    <div class="title">${result}</div>
    
    <div class="scoreboard">
      <div style="font-size: 18px; color: #6b7280; margin-bottom: 20px;">
        ${params.leagueName} - Week ${params.week}
      </div>
      <div style="display: flex; justify-content: center; align-items: center;">
        <div>
          <div style="font-size: 16px; color: #6b7280;">Your Team</div>
          <div class="score">${params.teamScore}</div>
        </div>
        <div class="vs">vs</div>
        <div>
          <div style="font-size: 16px; color: #6b7280;">${params.opponentName}</div>
          <div class="score">${params.opponentScore}</div>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${leagueUrl}" class="button">View Full Results</a>
    </div>
    
    <div class="footer">
      <p>${params.leagueName}</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: params.toEmail,
    subject: `Week ${params.week} Results: ${params.won ? 'You Won!' : 'Better luck next week'}`,
    html,
  });
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(params: {
  toEmail: string;
  toName: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Cannabis Fantasy League</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌿 Cannabis Fantasy League</div>
    </div>
    
    <div class="title">Welcome to the League!</div>
    
    <div class="message">
      <p>Hi ${params.toName},</p>
      <p>Welcome to Cannabis Fantasy League! We're excited to have you join our community.</p>
      <p>Get ready to draft your dream team of cannabis manufacturers, strains, products, and pharmacies!</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}" class="button">Get Started</a>
    </div>
    
    <div class="footer">
      <p>Good luck this season!</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: params.toEmail,
    subject: 'Welcome to Cannabis Fantasy League! 🌿',
    html,
  });
}

/**
 * Send daily challenge reminder email
 */
export async function sendDailyChallengeReminder(params: {
  toEmail: string;
  toName: string;
  leagueName: string;
  leagueId: number;
}): Promise<boolean> {
  const lineupUrl = `${APP_URL}/challenge/${params.leagueId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Challenge Reminder</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .alert {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌿 Cannabis Fantasy League</div>
    </div>
    
    <div class="title">⏰ Daily Challenge Reminder</div>
    
    <div class="message">
      <p>Hi ${params.toName},</p>
      <p>It's time to set your lineup for today's Daily Challenge!</p>
    </div>
    
    <div class="alert">
      <strong>Challenge:</strong> ${params.leagueName}<br>
      <strong>Reminder Time:</strong> 4:20 PM CET
    </div>
    
    <div class="message">
      <p>Select your 10 best-performing assets to compete for today's victory.</p>
      <p>Scores update hourly based on today's real-world stats, so every lineup tweak can swing the battle.</p>
      <p>Assets are sorted by the latest daily numbers to help you make the best choices.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${lineupUrl}" class="button">Set Your Lineup Now</a>
    </div>
    
    <div class="footer">
      <p>Good luck! 🏆</p>
      <p>${params.leagueName}</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: params.toEmail,
    subject: `⏰ Set Your Lineup - ${params.leagueName}`,
    html,
  });
}

export default {
  sendEmail,
  sendLeagueInvitation,
  sendDraftStartingNotification,
  sendWeeklyScoringNotification,
  sendWelcomeEmail,
  sendDailyChallengeReminder,
};
