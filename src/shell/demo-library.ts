import "server-only";

import { LIBRARY_VISIBILITIES, toCompanyKey, type LibraryJob, type LibraryKind, type LibraryVisibility } from "@/modules/library/contract";
import { libraryFile, libraryItem, libraryItemCompany, libraryReview, libraryVersion, libraryVote } from "@/modules/library/schema";
import type { Transaction } from "@/platform/database/client";

// The demo's library: made-up items by the demo people, with upvotes old and new (so "this month" and "all time"
// differ), reviews, one featured item, one for the fund team and one for two companies. Every file is a short note
// written for the demo, with no keys in it.

type Clock = (days: number, hours?: number) => Date;

type DemoLibraryItem = {
  key: string;
  author: string;
  title: string;
  pitch: string;
  kind: LibraryKind;
  job: LibraryJob;
  daysAgo: number;
  description: string;
  install: string;
  file?: { name: string; text: string };
  link?: string;
  visibility?: LibraryVisibility;
  companies?: readonly string[];
  featured?: boolean;
  // Voters, each with how many days ago they upvoted.
  votes: readonly (readonly [string, number])[];
  reviews?: readonly (readonly [string, string, number])[];
};

const ITEMS: readonly DemoLibraryItem[] = [
  {
    key: "cold-email",
    author: "priya.shah",
    title: "Cold email reviewer",
    pitch: "Scores a cold email out of 10 and rewrites the opening line.",
    kind: "prompt",
    job: "sales",
    daysAgo: 21,
    description: "Paste a draft and the buyer's role. It scores clarity, relevance and the ask, then offers two new opening lines. We run every outbound email through it before it goes.",
    install: "Copy the prompt into a new chat or a Claude project.\nPaste your draft under DRAFT and the buyer's role under BUYER.",
    file: { name: "cold-email-reviewer.md", text: "# Cold email reviewer\n\nYou review cold emails for a B2B startup.\n\nDRAFT:\n<paste the email>\n\nBUYER:\n<their role>\n\nScore clarity, relevance and the ask out of 10, then write two new opening lines.\n" },
    featured: true,
    votes: [["sam.lee", 3], ["ada.okafor", 5], ["marcus.webb", 9], ["elena.rossi", 1], ["tomas.novak", 2], ["hana.sato", 40], ["noah.berg", 45]],
    reviews: [["sam.lee", "Worked for us: reply rate went from 4% to 9% in a month.", 3], ["tomas.novak", "The second opening line is usually the keeper.", 2]],
  },
  {
    key: "support-triage",
    author: "sam.lee",
    title: "Support inbox triage agent",
    pitch: "Tags every new ticket by urgency and drafts a first reply for a person to check.",
    kind: "agent",
    job: "support_ops",
    daysAgo: 12,
    description: "Reads new tickets from the shared inbox, tags them urgent, normal or later, and drafts a reply in our tone. Nothing is sent without a person.",
    install: "Unzip into your agents folder.\nSet the inbox and the tags in config.yaml.\nRun it on a schedule, every ten minutes.",
    file: { name: "triage-agent.yaml", text: "name: support-triage\nschedule: every 10 minutes\ntags: [urgent, normal, later]\nreply_tone: warm, short, no jargon\nsend_without_review: false\n" },
    votes: [["priya.shah", 2], ["oliver.grant", 4], ["lena.fischer", 6], ["grace.kim", 35]],
    reviews: [["oliver.grant", "Cut our first-reply time from hours to minutes.", 4]],
  },
  {
    key: "crm-connection",
    author: "ada.okafor",
    title: "CRM tool connection for Claude",
    pitch: "Lets an AI assistant look up deals and contacts in your CRM, read-only.",
    kind: "tool_connection",
    job: "sales",
    daysAgo: 30,
    description: "A tool connection (MCP) setup that gives your assistant read-only access to deals and contacts. Good for 'what's the status with Acme?' questions.",
    install: "Add the server block from crm-connection.json to your assistant's tool settings.\nCreate a read-only key in your CRM and add it in your own settings, never in the file.",
    file: { name: "crm-connection.json", text: '{\n  "servers": {\n    "crm": {\n      "command": "npx",\n      "args": ["crm-mcp-server", "--read-only"],\n      "env": { "CRM_API_KEY": "${CRM_API_KEY}" }\n    }\n  }\n}\n' },
    votes: [["priya.shah", 32], ["sam.lee", 38], ["diego.alvarez", 7], ["zara.ahmed", 3]],
  },
  {
    key: "hiring-scorecard",
    author: "marcus.webb",
    title: "Interview scorecard writer",
    pitch: "Turns a job description into a scorecard with questions and what good looks like.",
    kind: "skill",
    job: "hiring",
    daysAgo: 18,
    description: "Give it the job description and three things the hire must do in their first 90 days. It writes the scorecard, five questions per interview and what a strong answer sounds like.",
    install: "Add the skill folder to your assistant's skills.\nAsk: 'Write a scorecard for this role' and paste the job description.",
    file: { name: "scorecard-skill.md", text: "# Interview scorecard writer\n\nWhen asked for a scorecard, ask for the job description and the first 90 days, then write: outcomes, competencies, five questions per interview, and what a strong answer sounds like.\n" },
    votes: [["sam.lee", 1], ["priya.shah", 4], ["amara.diallo", 8]],
    reviews: [["sam.lee", "Used it for our VP Sales search. Saved a week.", 1]],
  },
  {
    key: "investor-update",
    author: "elena.rossi",
    title: "Monthly investor update drafter",
    pitch: "Drafts the monthly update from your metrics sheet and three bullet points.",
    kind: "prompt",
    job: "fundraising",
    daysAgo: 9,
    description: "Paste last month's numbers and three things that happened. It writes the update in the usual shape: highlights, numbers, lowlights, asks.",
    install: "Copy the prompt. Paste your numbers under METRICS and your notes under NOTES.",
    file: { name: "investor-update.txt", text: "Write a monthly investor update.\nShape: highlights, numbers, lowlights, asks.\nMETRICS:\n<paste>\nNOTES:\n<three bullets>\nKeep it under 300 words.\n" },
    votes: [["ada.okafor", 2], ["noah.berg", 3], ["marcus.webb", 6]],
  },
  {
    key: "launch-playbook",
    author: "hana.sato",
    title: "Product launch playbook with AI",
    pitch: "Our two-week launch plan, with the prompts we used at each step.",
    kind: "playbook",
    job: "marketing",
    daysAgo: 44,
    description: "Day by day: positioning, the launch post, the email, the FAQ and the follow-ups, with the prompt for each and what we changed by hand.",
    install: "Read it top to bottom; copy the prompts you need.",
    link: "https://example.com/demo/launch-playbook",
    votes: [["lena.fischer", 41], ["tomas.novak", 42], ["elena.rossi", 50], ["diego.alvarez", 5]],
  },
  {
    key: "contract-review",
    author: "zara.ahmed",
    title: "First-pass contract review",
    pitch: "Flags the clauses a founder should ask a lawyer about in an NDA or MSA.",
    kind: "skill",
    job: "finance_legal",
    daysAgo: 6,
    description: "Not legal advice: a checklist an assistant runs on an NDA or MSA, listing the clauses worth a question (term, liability, IP, non-solicit) in plain words.",
    install: "Add the skill. Ask: 'Run a first-pass review on this contract' and attach it.",
    file: { name: "contract-first-pass.md", text: "# First-pass contract review\n\nList clauses about term, liability caps, IP ownership, non-solicit and auto-renewal. For each: what it says in plain words, and the question to ask a lawyer.\n" },
    votes: [["priya.shah", 1], ["grace.kim", 2]],
  },
  {
    key: "data-pipeline",
    author: "noah.berg",
    title: "Weekly metrics to Slack automation",
    pitch: "Pulls five numbers from the warehouse every Monday and posts a summary.",
    kind: "automation",
    job: "engineering",
    daysAgo: 3,
    description: "A small script that runs five saved queries, asks an assistant for a two-line summary, and posts it to a channel. The webhook lives in your own settings.",
    install: "pip install -r requirements.txt\nSet WAREHOUSE_URL and SLACK_WEBHOOK in your own environment.\nRun weekly.py from a scheduler every Monday at 8am.",
    file: { name: "weekly.py", text: 'import os\n\nWAREHOUSE_URL = os.environ["WAREHOUSE_URL"]\nWEBHOOK = os.environ["SLACK_WEBHOOK"]\n\n\ndef main():\n    print("Run the five queries, summarise, post.")\n\n\nif __name__ == "__main__":\n    main()\n' },
    votes: [["ada.okafor", 1]],
  },
  {
    key: "fund-diligence",
    author: "maya.ortiz",
    title: "Portfolio diligence notes template",
    pitch: "The prompt the fund team uses to summarise a founder call into our memo shape.",
    kind: "prompt",
    job: "founder",
    daysAgo: 5,
    description: "For the fund team: turns call notes into our memo shape (team, market, traction, risks, next step).",
    install: "Copy the prompt into the team project.",
    file: { name: "diligence-notes.md", text: "Summarise these call notes into: team, market, traction, risks, next step. Quote the founder where it matters.\n" },
    visibility: LIBRARY_VISIBILITIES.fundTeam,
    votes: [],
  },
  {
    key: "pricing-page",
    author: "tomas.novak",
    title: "Pricing page critic",
    pitch: "Reads a pricing page like a skeptical buyer and lists what would stop them.",
    kind: "agent",
    job: "product",
    daysAgo: 2,
    description: "Give it a pricing page link. It reads it as three buyers (founder, finance, IT) and lists their questions and doubts.",
    install: "Paste the instructions into a new assistant and give it the page link.",
    file: { name: "pricing-critic.md", text: "Read the pricing page as three buyers: a founder, a finance lead and an IT lead. For each, list what is unclear and what would stop them buying.\n" },
    visibility: LIBRARY_VISIBILITIES.companies,
    companies: ["Paperplane", "Ledgerline"],
    votes: [["priya.shah", 1]],
  },
];

export async function seedLibrary(transaction: Transaction, ids: ReadonlyMap<string, string>, ago: Clock) {
  const admin = ids.get("maya.ortiz") ?? null;
  for (const seed of ITEMS) {
    const authorId = ids.get(seed.author);
    if (!authorId) continue;
    const createdAt = ago(seed.daysAgo);
    const [created] = await transaction
      .insert(libraryItem)
      .values({
        authorId,
        title: seed.title,
        pitch: seed.pitch,
        kind: seed.kind,
        job: seed.job,
        description: seed.description,
        install: seed.install,
        link: seed.link ?? null,
        visibility: seed.visibility ?? LIBRARY_VISIBILITIES.portfolio,
        downloadCount: seed.votes.length * 3,
        createdAt,
        updatedAt: createdAt,
        ...(seed.featured ? { featuredAt: createdAt, featuredByUserId: admin } : {}),
      })
      .returning({ id: libraryItem.id });
    if (!created) continue;
    for (const company of seed.companies ?? []) {
      await transaction.insert(libraryItemCompany).values({ itemId: created.id, companyKey: toCompanyKey(company), company });
    }
    const [version] = await transaction.insert(libraryVersion).values({ itemId: created.id, number: 1, createdAt }).returning({ id: libraryVersion.id });
    if (version && seed.file) {
      const bytes = Buffer.from(seed.file.text, "utf8");
      await transaction.insert(libraryFile).values({ versionId: version.id, name: seed.file.name, bytes, size: bytes.byteLength, createdAt });
    }
    for (const [voter, daysAgo] of seed.votes) {
      const voterId = ids.get(voter);
      if (voterId && voterId !== authorId) await transaction.insert(libraryVote).values({ itemId: created.id, voterId, createdAt: ago(Math.min(daysAgo, seed.daysAgo)) });
    }
    for (const [reviewer, body, daysAgo] of seed.reviews ?? []) {
      const reviewerId = ids.get(reviewer);
      if (reviewerId) await transaction.insert(libraryReview).values({ itemId: created.id, authorId: reviewerId, body, createdAt: ago(daysAgo) });
    }
  }
  return ITEMS.length;
}
