// Draft text for Workflows A, C and E. Deterministic templates: an admin always reviews and edits before approval,
// and nothing here is ever sent automatically. AI drafting is a paid API and stays off until approved.

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const SIGN = "\n\nBest,\nGravityy Studio\nhttps://www.gravityystudio.com";

export function replyDraft(name: string, source: string) {
  const what = source === "audit" ? "free website audit request" : "message";
  return {
    subject: source === "audit" ? "Your free website audit" : "Thanks for getting in touch",
    body: `Hi ${first(name)},\n\nThanks for your ${what}. We've read it and would like to understand a little more about what you need.\n\nWould a 20-minute call this week work? Reply with a couple of times that suit you.${SIGN}`,
  };
}

export function outreachDraft(name: string, company: string | null) {
  return {
    subject: company ? `An idea for ${company}` : "A quick idea for your website",
    body: `Hi ${first(name)},\n\nWe took a look at ${company ?? "your website"} and noticed a few quick wins on speed and conversion.\n\nHappy to share them in a short note or a 15-minute call, whichever you prefer.${SIGN}\n\nIf you'd rather not hear from us, reply "no thanks" and we won't contact you again.`,
  };
}

export function followupDraft(name: string, subject: string) {
  return {
    subject: subject.startsWith("Re: ") ? subject : `Re: ${subject}`.slice(0, 200),
    body: `Hi ${first(name)},\n\nJust following up on my earlier note in case it got buried. Happy to help whenever the timing is right.${SIGN}\n\nIf you'd rather not hear from us, reply "no thanks" and we won't contact you again.`,
  };
}
