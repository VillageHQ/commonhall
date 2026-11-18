import type { ReactNode } from "react";

import type { SearchWhere } from "@/modules/network/contract";

export type SearchViewer = { id: string; name: string; imageUrl: string | null };

export type SearchScreenProps = {
  viewer: SearchViewer;
  communityName: string;
  // Members who share their network, the viewer included when they do.
  sharingMemberCount: number;
  // The viewer's own network is in (they joined and synced).
  isConnected: boolean;
  // Village is connected for this community; without it search finds member profiles only.
  isVillageOn: boolean;
  defaultScope: SearchWhere;
  canAskIntro: boolean;
  canAskCommunity: boolean;
  digestDay: string;
  // Another page built on search ("Find candidates"): its title, what shows above the results, and where a new
  // search goes (that page, keeping its own parameters) instead of /search.
  heading?: string;
  intro?: ReactNode;
  beforeResults?: ReactNode;
  searchPath?: string;
  keepParams?: Record<string, string>;
};
