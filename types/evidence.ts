export type EvidenceVerdict = "unmarked" | "credible" | "doubtful" | "forged";

export type EvidenceRelationKind = "supports" | "contradicts";

export interface EvidenceRelationSelection {
  supports: string[];
  contradicts: string[];
}

export type EvidenceRelations = Record<string, EvidenceRelationSelection>;

export interface Evidence {
  id: string;
  index: string;
  title: string;
  type: "document" | "photo" | "audio" | "record" | "object" | "message";
  description: string;
  acquiredAt: string;
  source: string;
  relatedPeople: string[];
  relatedLocations: string[];
  relatedTime: string;
  critical: boolean;
  unlockAfter?: "schedule" | "frequency" | "photo" | "deduction" | "hidden";
  relatedEvidence: string[];
}
