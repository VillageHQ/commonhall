import "server-only";

import type { IntroducedCheck } from "@/modules/members/service-booking";

import { wereIntroduced } from "./message-policy";

// "Only people whose intro I accepted": the same test as "who can message me": the two were introduced here.
export const wereIntroducedForBooking: IntroducedCheck = (connection, viewerId, ownerId) => wereIntroduced(connection, viewerId, ownerId);
