// My profile's own short pages (round 6): each setting that used to be a sheet on My profile opens here instead. Local
// to the members module until the shared routes list (src/platform/http/routes.ts) takes them.
export const ME_PAGES = {
  privacy: "/me/privacy",
  booking: "/me/booking",
  password: "/me/password",
  jobs: "/me/jobs",
} as const;
