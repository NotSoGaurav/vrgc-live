import { collection, getDocs } from "firebase/firestore";
import { db } from "@/utils/firebase/client";
import { createClient } from "@supabase/supabase-js";

export type CouncilMember = {
  id: string;
  name: string;
  role: string;
  tier: string;
  team: string;
  photoUrl: string;
  email?: string;
  bio: string;
};

export type FacultyMember = {
  name: string;
  role: string;
  department: string;
  bio: string;
  image?: string;
};

export type WheelMember = {
  id: string;
  name: string;
  role: string;
  tier: string;
  team: string;
  weapon: string;
  photoUrl: string;
  email?: string;
  stats: {
    s1: [string, number];
    s2: [string, number];
    s3: [string, number];
  };
  bio: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

// Guard: only create the client if the URL is present.
// When Supabase is blocked/unconfigured, fetchClubData returns empty data gracefully.
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Fallback faculty data
export const facultyMembers: FacultyMember[] = [
  {
    name: "Dr. Ramraj Dangi",
    role: "Faculty Coordinator",
    department: "School of Computing Science and Engineering",
    bio: "Guiding institutional research in virtual reality, academic esports tournaments, and mentoring VRGC student leads.",
    image: "/faculty/ramraj_dangi.png",
  },
  {
    name: "Dr. Sivabalan KR",
    role: "Faculty Co-Coordinator",
    department: "Gaming & Immersive Media Laboratory",
    bio: "Advising club initiatives, university symposiums, industry partnerships, and spatial computing projects.",
    image: "/faculty/siva_balan.png",
  },
];

// Default Council data (dynamically loaded from id_cards table where team = 'Leadership')
export const defaultCouncilMembers: CouncilMember[] = [];

/** Races a promise-like against a timeout. Returns null if the timeout fires first. */
function withTimeout<T>(promise: PromiseLike<T>, ms = 5000): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function fetchClubData() {
  try {
    // 1. Parallelise all three async data sources with a 5s timeout each
    // Note: Supabase builder is a PromiseLike, not a real Promise — call .then() to materialise
    // If supabase client is null (URL missing/blocked), pass pre-resolved null so we skip gracefully
    const [membersResult, storageResult, idCardsResult] = await Promise.allSettled([
      withTimeout(getDocs(collection(db, "members")).catch(() => null), 5000),
      supabase
        ? withTimeout(
            supabase.storage.from("id-cards").list("id-photos", { limit: 500 }).then((r) => r),
            5000
          )
        : Promise.resolve(null),
      supabase
        ? withTimeout(
            supabase
              .from("id_cards")
              .select("id, registrationNumber, name, email, team, position, role, photoUrl, description, bio")
              .then((r) => r),
            5000
          )
        : Promise.resolve(null),
    ]);

    // null means timed out; treat the same as a failed promise
    const rawMembers: any[] =
      membersResult.status === "fulfilled" && membersResult.value
        ? (membersResult.value as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) ?? []
        : [];

    const storageData: Array<{ name: string }> =
      storageResult.status === "fulfilled" && storageResult.value
        ? ((storageResult.value as any).data as Array<{ name: string }>) ?? []
        : [];

    const idCardsData: Array<Record<string, string>> =
      idCardsResult.status === "fulfilled" && idCardsResult.value
        ? ((idCardsResult.value as any).data as Array<Record<string, string>>) ?? []
        : [];

    const validFiles: Array<{ name: string }> = storageData
      .filter((f) => f.name && f.name !== ".emptyFolderPlaceholder")
      .sort((a, b) => {
        const timeA = Number((a.name.match(/_(\d+)\./) || [0, 0])[1]) || 0;
        const timeB = Number((b.name.match(/_(\d+)\./) || [0, 0])[1]) || 0;
        return timeB - timeA;
      });

    const idCards: Array<Record<string, string>> = idCardsData;


    const getPhotoUrl = (regNo?: string, name?: string, email?: string): string => {
      const cleanReg = (regNo || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanEmail = (email || "").toLowerCase().trim();
      const cleanName = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      // 1st Priority: Match verified live file in storage bucket
      let match = validFiles.find((f) => {
        const cleanF = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanReg && cleanF.includes(cleanReg);
      });

      if (!match && cleanEmail) {
        match = validFiles.find((f) => {
          const cleanF = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          return cleanF.includes(cleanEmail.replace(/[^a-z0-9]/g, ""));
        });
      }

      if (!match && cleanName) {
        match = validFiles.find((f) => {
          const cleanF = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          return cleanF.includes(cleanName);
        });
      }

      if (match) {
        return `${supabaseUrl}/storage/v1/object/public/id-cards/id-photos/${encodeURIComponent(match.name)}`;
      }

      // 2nd Priority: id_cards table
      const cardMatch = idCards.find((card) => {
        const cardReg = (card.registrationNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const cardEmail = (card.email || "").toLowerCase().trim();
        const cardName = (card.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

        if (cleanReg && cardReg && cleanReg === cardReg) return true;
        if (cleanEmail && cardEmail && cleanEmail === cardEmail) return true;
        if (cleanName && cardName && (cleanName.includes(cardName) || cardName.includes(cleanName))) return true;
        return false;
      });

      if (cardMatch && cardMatch.photoUrl) {
        return cardMatch.photoUrl;
      }

      return "/vrgc_logo.jpg";
    };

    // 3. Extract Leadership members directly from id_cards table and Firestore (team = 'Leadership')
    const combinedLeads: CouncilMember[] = [];

    const addLeadCandidate = (c: any) => {
      if (!c) return;
      const cleanReg = (c.registrationNumber || c.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanName = (c.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      const existing = combinedLeads.find((item) => {
        const itemReg = (item.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const itemName = (item.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return (cleanReg && itemReg && cleanReg === itemReg) || (cleanName && itemName && cleanName === itemName);
      });

      if (existing) {
        if (!existing.bio && (c.description || c.bio)) {
          existing.bio = c.description || c.bio;
        }
        const live = getPhotoUrl(c.registrationNumber || c.id, c.name, c.email);
        if (live && !live.includes("vrgc_logo")) {
          existing.photoUrl = live;
        } else if ((!existing.photoUrl || existing.photoUrl.includes("vrgc_logo")) && c.photoUrl) {
          existing.photoUrl = c.photoUrl;
        }
        if (!existing.role && (c.position || c.role)) {
          existing.role = c.position || c.role;
        }
        return;
      }

      const livePhoto = getPhotoUrl(c.registrationNumber || c.id, c.name, c.email);
      const photo = livePhoto && !livePhoto.includes("vrgc_logo") ? livePhoto : (c.photoUrl || "/vrgc_logo.jpg");
      combinedLeads.push({
        id: c.id || c.registrationNumber,
        name: c.name || "Council Member",
        role: c.position || c.role || "Executive Council",
        tier: "EXECUTIVE COUNCIL",
        team: c.team || "Leadership",
        photoUrl: photo,
        email: c.email || "",
        bio: c.description || c.bio || "",
      });
    };

    // Filter id_cards with Leadership team or role
    idCards
      .filter((c) => 
        (c.team || "").toLowerCase().includes("leadership") || 
        /(president|executive|leadership|coordinator)/i.test(c.position || c.role || "")
      )
      .forEach(addLeadCandidate);

    // Filter rawMembers with Leadership team or role
    rawMembers
      .filter((m) => 
        (m.team || "").toLowerCase().includes("leadership") || 
        /(president|executive|leadership|coordinator)/i.test(m.position || m.role || "")
      )
      .forEach(addLeadCandidate);

    // Sort leadership: Presidents first, then Student Coordinators / Leads, then others
    combinedLeads.sort((a, b) => {
      const getScore = (role: string) => {
        const r = (role || "").toLowerCase();
        if (r.includes("president")) return 10;
        if (r.includes("coordinator")) return 5;
        if (r.includes("lead")) return 3;
        return 1;
      };
      return getScore(b.role) - getScore(a.role);
    });

    const finalCouncil: CouncilMember[] = combinedLeads;

    // 4. Group remaining teams for the Tactical Weapon Wheel
    // Normalized categories: Education, Design, Social Media, Esports (PC), Esports (Mobile), PR, Technical
    const categoryMap: Record<string, WheelMember[]> = {
      esports_pc: [],
      esports_mobile: [],
      education: [],
      design: [],
      social_media: [],
      pr: [],
      technical: [],
    };

    const normalizeTeamKey = (teamName: string): string[] => {
      const lower = (teamName || "").toLowerCase();
      const keys: string[] = [];
      if (lower.includes("pc")) keys.push("esports_pc");
      if (lower.includes("mobile")) keys.push("esports_mobile");
      if (lower.includes("education")) keys.push("education");
      if (lower.includes("design")) keys.push("design");
      if (lower.includes("social")) keys.push("social_media");
      if (lower.includes("pr")) keys.push("pr");
      if (lower.includes("tech")) keys.push("technical");
      return keys.length > 0 ? keys : ["technical"];
    };

    rawMembers.forEach((m) => {
      const position = m.position || "Member";
      // Filter to team leads, coleads, and core members/members
      const isLead = /lead/i.test(position);
      const isMember = /member/i.test(position) || /coordinator/i.test(position);
      if (!isLead && !isMember) return;

      const photo = getPhotoUrl(m.registrationNumber || m.id, m.name, m.email);
      const teams = (m.team || "").split(/[,/&]/).map((t: string) => t.trim());

      teams.forEach((t: string) => {
        const targetKeys = normalizeTeamKey(t);
        targetKeys.forEach((key) => {
          if (categoryMap[key]) {
            // Avoid duplicate in same team
            if (!categoryMap[key].some((exist) => exist.id === m.id)) {
              categoryMap[key].push({
                id: m.id || m.registrationNumber,
                name: m.name || "Club Member",
                role: m.position || "Core Member",
                tier: isLead ? "TEAM LEADERSHIP" : "CORE SQUAD",
                team: t || key.toUpperCase(),
                weapon: `${(t || key).toUpperCase()} // ${position.toUpperCase()}`,
                photoUrl: photo,
                email: m.email || "",
                stats: {
                  s1: [isLead ? "LEADERSHIP" : "EXECUTION", isLead ? 96 : 90],
                  s2: ["TECHNICAL SKILL", 92],
                  s3: ["CONSISTENCY", 94],
                },
                bio: `Active ${position} in the ${t || key} team driving VRGC tournaments, workshops, and student community initiatives.`,
              });
            }
          }
        });
      });
    });

    // Sort each category: Leads first, then Co-Leads, then Members
    Object.keys(categoryMap).forEach((k) => {
      categoryMap[k].sort((a, b) => {
        const score = (pos: string) => (/lead$/i.test(pos) ? 3 : /co-lead/i.test(pos) ? 2 : 1);
        return score(b.role) - score(a.role);
      });
    });

    return {
      council: finalCouncil,
      faculty: facultyMembers,
      wheelCategories: categoryMap,
    };
  } catch (error) {
    console.error("Error fetching club data from Firestore/Supabase:", error);
    return {
      council: defaultCouncilMembers,
      faculty: facultyMembers,
      wheelCategories: {},
    };
  }
}
