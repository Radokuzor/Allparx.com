import 'server-only'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { SITE_NAME } from '../site'

/**
 * One-way transactional email.
 *
 * Two drivers, chosen from the environment so the provider can change without
 * touching a caller:
 *
 *   smtp    — any mailbox you already own (SMTP_HOST/USER/PASS). Free, but the
 *             mailbox provider has to be allowed to send as EMAIL_FROM's domain
 *             or DMARC sends the mail to spam. A sign-in code in spam is a
 *             failed sign-up, so check the headers of a real delivery before
 *             trusting this in production.
 *   resend  — RESEND_API_KEY. Signs with DKIM for allparx.com once the DNS
 *             records are in place, which is what keeps codes in the inbox.
 *
 * With neither configured the message is logged instead of sent. That keeps
 * local development working with no credentials at all; in production it
 * throws, because silently dropping a sign-in code would look like the form is
 * broken for no visible reason.
 */

export type Email = {
  to: string
  subject: string
  text: string
  html: string
}

type Driver = 'smtp' | 'resend' | 'console'

function driver(): Driver {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp'
  if (process.env.RESEND_API_KEY) return 'resend'
  return 'console'
}

export function emailDriver(): Driver {
  return driver()
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || `${SITE_NAME} <no-reply@allparx.com>`
}

let transporter: Transporter | null = null

function smtpTransport(): Transporter {
  if (transporter) return transporter
  const port = Number(process.env.SMTP_PORT || 587)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS after connecting.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

async function sendViaResend(email: Email): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Resend rejected the message (${response.status}): ${detail.slice(0, 300)}`)
  }
}

export async function sendEmail(email: Email): Promise<void> {
  switch (driver()) {
    case 'smtp':
      await smtpTransport().sendMail({ from: fromAddress(), ...email })
      return
    case 'resend':
      await sendViaResend(email)
      return
    default:
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'No email driver configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY.',
        )
      }
      console.info(
        `\n[email] no driver configured — would have sent to ${email.to}\n` +
          `        subject: ${email.subject}\n` +
          email.text.split('\n').map((line) => `        ${line}`).join('\n') +
          '\n',
      )
  }
}

/** Minimal, high-contrast, and readable in a notification preview. */
export function signInCodeEmail(to: string, code: string, minutes: number): Email {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`
  return {
    to,
    subject: `${code} is your ${SITE_NAME} sign-in code`,
    text:
      `Your ${SITE_NAME} sign-in code is ${code}\n\n` +
      `Enter it in the window you opened. The code expires in ${minutes} minutes.\n\n` +
      `If you did not ask to sign in, ignore this email — nothing has been created.`,
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#ffffff;border-radius:16px;border:1px solid #e9ecea;padding:32px;">
          <tr><td style="font-size:15px;font-weight:700;color:#15803d;padding-bottom:24px;">${SITE_NAME}</td></tr>
          <tr><td style="font-size:20px;font-weight:700;color:#111827;padding-bottom:8px;">Your sign-in code</td></tr>
          <tr><td style="font-size:15px;line-height:22px;color:#6b7280;padding-bottom:24px;">Enter this code in the window you just opened.</td></tr>
          <tr><td align="center" style="padding-bottom:24px;">
            <div style="font-size:34px;letter-spacing:8px;font-weight:700;color:#111827;background:#f3f6f3;border-radius:12px;padding:18px 12px;">${spaced}</div>
          </td></tr>
          <tr><td style="font-size:13px;line-height:20px;color:#9ca3af;">The code expires in ${minutes} minutes. If you did not ask to sign in, ignore this email — nothing has been created.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  }
}
