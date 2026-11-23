import nodemailer from 'nodemailer';

export interface EmailDispatchResult {
  mode: 'smtp' | 'console_preview';
  delivered: boolean;
  recipient: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailDispatchResult> {
  const from = process.env.SMTP_FROM?.trim() || 'RENORA <no-reply@renora.example>';

  if (isSmtpConfigured()) {
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        pass: process.env.SMTP_PASS!.trim(),
      },
    });

    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return {
      mode: 'smtp',
      delivered: true,
      recipient: params.to,
    };
  }

  // Safe local preview fallback when SMTP credentials are not yet configured
  console.log('\n--- [RENORA Configurable Email Service - Console Preview] ---');
  console.log(`To: ${params.to}`);
  console.log(`Subject: ${params.subject}`);
  console.log(params.text);
  console.log('-------------------------------------------------------------\n');

  return {
    mode: 'console_preview',
    delivered: true,
    recipient: params.to,
  };
}
