import * as mailgun from 'mailgun-js'
import { tryOrLogError } from 'shared/helpers/try-or-log-error'
import { log } from './utils'

const EMAIL_RECIPIENT_ALLOWLIST_DOMAINS = (
  process.env.EMAIL_RECIPIENT_ALLOWLIST_DOMAINS ?? '@startupshell.org'
)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

const MINIMAL_EMAIL_MODE =
  (process.env.MINIMAL_EMAIL_MODE ?? 'true').toLowerCase() !== 'false'
const ESSENTIAL_TEMPLATE_ALLOWLIST = new Set(
  (process.env.ESSENTIAL_EMAIL_TEMPLATES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
)
const ESSENTIAL_SUBJECT_KEYWORDS = (
  process.env.ESSENTIAL_EMAIL_SUBJECT_KEYWORDS ??
  'account,security,verification,password,sign-in,signin,login,otp,2fa'
)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export function shouldSendEmail(params: {
  subject: string
  templateId?: string
  to: string
}) {
  const { subject, templateId, to } = params
  if (!isAllowedEmailRecipient(to)) {
    log(
      `Skipped email to non-allowlisted recipient: to=${to}, allowlistedDomains=${EMAIL_RECIPIENT_ALLOWLIST_DOMAINS.join(
        ','
      )}`
    )
    return false
  }

  if (!MINIMAL_EMAIL_MODE) return true

  const normalizedSubject = subject.toLowerCase()
  const subjectAllowed = ESSENTIAL_SUBJECT_KEYWORDS.some((kw) =>
    normalizedSubject.includes(kw)
  )
  const templateAllowed = templateId
    ? ESSENTIAL_TEMPLATE_ALLOWLIST.has(templateId)
    : false

  const allowed = subjectAllowed || templateAllowed
  if (!allowed) {
    log(
      `Skipped non-essential email in minimal mode: to=${to}, subject="${subject}"${
        templateId ? `, template=${templateId}` : ''
      }`
    )
  }
  return allowed
}

export function isAllowedEmailRecipient(to: string) {
  const normalized = extractEmailAddress(to).toLowerCase()
  if (!normalized) return false
  return EMAIL_RECIPIENT_ALLOWLIST_DOMAINS.some((domainSuffix) =>
    normalized.endsWith(domainSuffix)
  )
}

function extractEmailAddress(input: string) {
  const fromAngleBrackets = input.match(/<([^>]+)>/)?.[1]?.trim()
  return fromAngleBrackets ?? input.trim()
}

const initMailgun = () => {
  const apiKey = process.env.MAILGUN_KEY as string
  const domain = process.env.MAILGUN_DOMAIN ?? 'mg.startupshell.org'
  return mailgun({ apiKey, domain })
}

export const sendTextEmail = async (
  to: string,
  subject: string,
  text: string,
  options?: Partial<mailgun.messages.SendData>
) => {
  if (!shouldSendEmail({ to, subject })) return null

  const data: mailgun.messages.SendData = {
    ...options,
    from: options?.from ?? 'StartupShell <info@startupshell.org>',
    to,
    subject,
    text,
    // Don't rewrite urls in plaintext emails
    'o:tracking-clicks': 'htmlonly',
  }
  const mg = initMailgun().messages()
  const result = await tryOrLogError(mg.send(data))
  if (result != null) {
    log(`Sent text email to ${to} with subject ${subject}`)
  }
  return result
}

export const sendTemplateEmail = async (
  to: string,
  subject: string,
  templateId: string,
  templateData: Record<string, string>,
  options?: Partial<mailgun.messages.SendTemplateData>
) => {
  if (!shouldSendEmail({ to, subject, templateId })) return null

  const data: mailgun.messages.SendTemplateData = {
    ...options,
    from: options?.from ?? 'StartupShell <info@startupshell.org>',
    to,
    subject,
    template: templateId,
    'h:X-Mailgun-Variables': JSON.stringify(templateData),
    'o:tag': templateId,
    'o:tracking': true,
  }
  log(`Sending template email ${templateId} to ${to} with subject ${subject}`)
  const mg = initMailgun().messages()
  const result = await tryOrLogError(mg.send(data))
  if (result != null) {
    log(`Sent template email ${templateId} to ${to} with subject ${subject}`)
  }
  return result
}
