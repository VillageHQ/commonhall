export type ResponseShape = string | readonly ResponseShape[] | { readonly [field: string]: ResponseShape };

// Recorded from live Village answers, except where a shape says "From Village's OpenAPI": those follow
// https://api.village.ai/v2/docs/openapi.json (read 2026-11-22, SDK 0.2.0) and haven't been seen live yet.

const ERROR_FIELDS = { type: "string", title: "string", status: "number", detail: "string", trace_id: "string" };
const ERROR_METADATA = { request_id: "string", timestamp: "string" };
const SUCCESS_METADATA = { request_id: "string" };

const PROFILE = {
  first_name: "string",
  last_name: "string",
  linkedin_url: "string",
  headline: "string",
  avatar: "string",
  title: "string",
  company: "string",
};
const SCORE_META = [{ title: "string", description: "string" }];
const SUMMARY = { score: "number", score_label: "string", description: "string" };

export const VILLAGE_ERROR_SHAPE = { error: ERROR_FIELDS, metadata: ERROR_METADATA };
export const VILLAGE_VALIDATION_ERROR_SHAPE = {
  error: { ...ERROR_FIELDS, errors: [{ field: "string", message: "string", code: "string" }] },
  metadata: ERROR_METADATA,
};

export const VILLAGE_CREDITS_ERROR_SHAPE = {
  error: "string",
  message: "string",
  topup_url: "string",
  credits_left: "number",
};
export const VILLAGE_RATE_LIMIT_ERROR_SHAPE = {
  error: "string",
  message: "string",
  details: { limit: "number", remaining: "number", reset: "number" },
};

export const VILLAGE_TOKEN_SHAPE = {
  data: { token: "string", expires_in: "number", expires_at: "number", token_type: "string" },
  metadata: SUCCESS_METADATA,
};

// From Village's OpenAPI: `capabilities`, `payer`, `mode`, `trusted`, `team_id` and `has_users` are new in SDK 0.2.
export const VILLAGE_APP_SHAPE = {
  data: {
    title: "string",
    description: "string|null",
    domain_name: "string|null",
    logo: "string|null",
    public_key: "string|null",
    is_active: "boolean",
    capabilities: { is_live: "boolean", has_server_access: "boolean", needs_card: "boolean" },
    payer: "string",
    mode: "string",
    trusted: "boolean",
    team_id: "number|null",
    has_users: "boolean",
  },
  metadata: SUCCESS_METADATA,
};

// From Village's OpenAPI.
export const VILLAGE_USER_CANCEL_SHAPE = {
  data: { message: "string", external_user_id: "string" },
  metadata: SUCCESS_METADATA,
};

export const VILLAGE_USER_STATUS_SHAPE = {
  data: {
    status: "string",
    email: "string|null",
    integrations: [{ id: "number", type: "string", status: "string", account: "string|null", last_synced_at: "string|null" }],
    network_updated_at: "string|null",
  },
  metadata: SUCCESS_METADATA,
};

export const VILLAGE_GROUPS_SHAPE = {
  data: { groups: [{ id: "string", name: "string", logo: "string|null", invite_link: "string", is_admin: "boolean" }] },
  metadata: SUCCESS_METADATA,
};

export const VILLAGE_CREATED_GROUP_SHAPE = {
  data: { id: "string", name: "string", logo: "string|null", invite_link: "string" },
  metadata: SUCCESS_METADATA,
};

export const VILLAGE_GROUP_CHANGE_SHAPE = {
  data: { success: "boolean", message: "string" },
  metadata: SUCCESS_METADATA,
};

export const VILLAGE_SEARCH_SHAPE = {
  data: [
    {
      id: "number",
      first_name: "string",
      last_name: "string",
      full_name: "string",
      linkedin_url: "string",
      headline: "string",
      about_me: "string|null",
      location: "object",
      work_relevant: "object",
      education_relevant: "object|null",
      image_url: "string",
      relationship_cached: "object",
      last_enrichment_at: "string",
    },
  ],
  metadata: {
    request_id: "string",
    mode: "string",
    source: "string",
    network_stage_complete: "boolean",
    generated_sql: "string",
    search_engine: "string",
    screening_criteria: "object",
    counts_token: "string",
    search_execution_token: "string",
  },
  pagination: { cursor: "string", has_next_page: "boolean", count: "number" },
};

export const VILLAGE_PATHS_SHAPE = {
  data: {
    person: {
      first_name: "string",
      last_name: "string",
      full_name: "string",
      linkedin_url: "string",
      avatar: "string",
      village_url: "string",
    },
    summary: SUMMARY,
    count: "number",
    paths: [
      {
        degree: "number",
        summary: SUMMARY,
        starters: [
          {
            profile: PROFILE,
            score: "number",
            score_label: "string",
            score_description: "string",
            score_meta: SCORE_META,
            is_current_user: "boolean",
          },
        ],
        introducer: { profile: PROFILE, score: "number", score_label: "string", score_meta: SCORE_META },
        score_meta: SCORE_META,
      },
    ],
  },
  metadata: { request_id: "string", counts: { total: { value: "number" } } },
};

// From Village's OpenAPI: one entry per person Village answered for, each with the paths of a single paths answer.
export const VILLAGE_BULK_PATHS_SHAPE = {
  data: [
    {
      target: {
        first_name: "string",
        last_name: "string",
        full_name: "string",
        id: "string",
        identity_id: "string",
        linkedin_identifier: "string",
        linkedin_url: "string",
        avatar: "string",
      },
      summary: SUMMARY,
      count: "number",
      paths: VILLAGE_PATHS_SHAPE.data.paths,
    },
  ],
  metadata: VILLAGE_PATHS_SHAPE.metadata,
};
