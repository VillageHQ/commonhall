---
id: ai-library
status: idea
waits-on: []
size: M
touches: []
---
# Spec: Portfolio AI library: share skills, agents, prompts and MCP setups across the portfolio

**Added:** 2026-11-19 (round 5, wave 1)

## What & why
Portfolio founders each rebuild the same AI skills, agents and prompts. Funds spread AI know-how through one-off events, and none of it lands somewhere searchable. Public skill hubs are unsafe (a 2026 scan found a critical issue in 13.4% of public skills). A portfolio is the biggest group of companies that partly trust each other: no product shares between them today.

## Rough scope
Members publish an item (Claude skill, agent, prompt, MCP setup, automation, playbook) with files, versions and who can see it (whole portfolio by default; fund team only; chosen companies). Others install or fork it. "Used by 9 companies, kept by 7" signals, a warm path to the author, a feed post, the existing report queue for moderation, and a secret scan on upload.

## Open questions
- Where uploaded files live (today files sit in Postgres). Whether forks keep a link to the original.
