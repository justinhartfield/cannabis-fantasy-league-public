export type League = {
  id: number;
  name: string;
  leagueType: string; // relaxed from 'season' | 'challenge' | 'standard' to match DB return type
  commissionerId?: number; // Legacy
  commissionerUserId?: number; // DB field
  seasonStatus?: 'pre_draft' | 'drafting' | 'in_progress' | 'playoffs' | 'complete'; // Legacy
  status?: string; // DB field
  currentWeek: number;
  maxTeams?: number; // Legacy
  teamCount?: number; // DB field
  myTeam?: {
    id?: number;
    teamName?: string; // Legacy
    name?: string; // DB field
    rank?: number; // Derived?
    totalPoints?: number;
  };
  // Add other fields if necessary
  draftDate?: string | null;
  isPublic?: boolean;
};
