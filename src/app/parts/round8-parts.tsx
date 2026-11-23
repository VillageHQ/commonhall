"use client";

import { Inbox, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip, ChipCount, ChipRow } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { ListRow, SectionLabel } from "@/components/ui/list-row";
import { SearchBox } from "@/components/ui/search-box";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

// Round 8's shared parts (ui-polish Part 1), each as the parts that build on it will use it. Made-up people only.
const CHIPS = [
  { label: "Everyone", count: 214 },
  { label: "Founders", count: 96 },
  { label: "Investors", count: 31 },
  { label: "Mentors and experts", count: 18 },
  { label: "Operators", count: 44 },
];

export function Round8Controls() {
  const [query, setQuery] = useState("fintech");
  const [chip, setChip] = useState("Everyone");
  return (
    <div className="grid gap-4" data-slot="round8-controls">
      <div className="flex items-center gap-2" data-slot="round8-field-row">
        <Input aria-label="Company" placeholder="A company" className="min-w-0 flex-1" />
        <Button type="button">Save</Button>
      </div>
      <div className="flex items-center gap-2" data-slot="round8-search-row">
        <SearchBox className="min-w-0 flex-1" aria-label="Search people" placeholder="Name, company or skill" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button type="button" variant="secondary">
          <SlidersHorizontal aria-hidden="true" />
          Filter
        </Button>
      </div>
      <p className="fh-small fh-muted" data-slot="round8-search-echo">
        Searching for: {query ? `“${query}”` : "everyone"}
      </p>
      <ChipRow>
        {CHIPS.map(({ label, count }) => (
          <Chip key={label} isPressed={chip === label} onClick={() => setChip(label)}>
            {label} <ChipCount>{count}</ChipCount>
          </Chip>
        ))}
      </ChipRow>
      <div className="flex flex-wrap items-center gap-2" data-slot="round8-buttons">
        <Button type="button">Post</Button>
        <Button type="button" variant="secondary">
          Message
        </Button>
        <Button type="button" size="sm">
          I can help
        </Button>
        <Button type="button" size="sm" variant="secondary">
          Answer
        </Button>
      </div>
      <Textarea aria-label="What do you need?" placeholder="What do you need? Who, what, by when." />
    </div>
  );
}

export function Round8Rows() {
  return (
    <div className="bg-leaf" data-slot="round8-rows">
      <SectionLabel>Waiting on you</SectionLabel>
      <ListRow
        face={<Avatar stableId="member-marcus" name="Marcus Webb" sizePx={48} />}
        title="Marcus Webb"
        href="#round8-rows"
        meta="2h"
        line="Asks you for an intro to Rachel Kim at Halcyon Health"
        lines={2}
        isUnread
        below={
          <Button type="button" size="sm" variant="secondary">
            Answer
          </Button>
        }
      />
      <SectionLabel>Messages</SectionLabel>
      <ListRow face={<Avatar stableId="member-priya" name="Priya Shah" sizePx={48} />} title="Priya Shah" href="#round8-rows" meta="Mon" line="Thanks, that intro worked. We meet on Thursday." isUnread count={3} />
      <ListRow face={<Avatar stableId="member-ada" name="Ada Okafor" sizePx={48} />} title="Ada Okafor" href="#round8-rows" meta="10 Nov" line="You: Happy to look at the deck this week." />
    </div>
  );
}

export function Round8Sheet() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet
      isOpen={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
      title="Filter people"
      trigger={
        <Button type="button" variant="secondary">
          <SlidersHorizontal aria-hidden="true" />
          Open the sample sheet
        </Button>
      }
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Clear all
          </Button>
          <Button type="button" onClick={() => setIsOpen(false)}>
            Show 12 people
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className="grid gap-1.5">
          <span className="type-label">Company</span>
          <Input placeholder="Any company" />
        </label>
        <label className="grid gap-1.5">
          <span className="type-label">City</span>
          <Input placeholder="Any city" />
        </label>
        {Array.from({ length: 14 }, (_, index) => (
          <p key={index} className="fh-small fh-muted">
            A line of the sheet&apos;s content, so it scrolls inside ({index + 1} of 14).
          </p>
        ))}
      </div>
    </Sheet>
  );
}

export function Round8Empty() {
  return (
    <EmptyState icon={Inbox} title="No messages yet" description="Message someone from their profile, or answer an intro, and it shows here.">
      <Button type="button" size="sm" variant="secondary">
        Find people
      </Button>
    </EmptyState>
  );
}
