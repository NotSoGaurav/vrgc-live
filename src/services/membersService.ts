import { collection, getDocs } from "firebase/firestore";
import { formDb } from "@/utils/firebase/client";

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

// ── Static faculty data ────────────────────────────────────────────
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

// ── Fallback Council (shown while Firestore loads) ────────────────
export const defaultCouncilMembers: CouncilMember[] = [
  {
    id: "23BCE11158",
    name: "Shivansh Sharma",
    role: "Co-President",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: "https://raw.githubusercontent.com/VRGC-vit/VRGCassets/main/leadership/co-presidents/23BCE11158.webp",
    bio: "Co-President spearheading varsity tournament operations, live broadcast production, and partner circuits.",
  },
  {
    id: "23BCG10015",
    name: "Lokesh Sharma",
    role: "Co-President",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: "https://raw.githubusercontent.com/VRGC-vit/VRGCassets/main/leadership/co-presidents/23BCG10015.webp",
    bio: "Co-President directing game development incubators, technical workshops, and competitive gaming divisions.",
  },
  {
    id: "24BCG10003",
    name: "Parardha Dhar",
    role: "Student Coordinator",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: "https://raw.githubusercontent.com/VRGC-vit/VRGCassets/main/leadership/coordinators/24BCG10003.webp",
    bio: "Student Coordinator managing university symposiums, esports player registrations, and club logistics.",
  },
  {
    id: "24BCG10051",
    name: "Haardik Pahlajani",
    role: "Student Coordinator",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: "https://raw.githubusercontent.com/VRGC-vit/VRGCassets/main/leadership/coordinators/24BCG10051.webp",
    bio: "Student Coordinator coordinating varsity scrim schedules, event broadcasts, and member communications.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────

/** Race a promise against a timeout. Returns null on timeout. */
function withTimeout<T>(promise: PromiseLike<T>, ms = 6000): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Mirrors the normalizeTeam() logic from re-organize-assets.js:
 *   team.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
 */
function normalizeTeamFolder(team: string): string {
  return team
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/, "");
}

const ASSETS_BASE = "https://raw.githubusercontent.com/VRGC-vit/VRGCassets/main";

/** Build the exact GitHub raw URL matching the reorganized folder structure. */
function buildPhotoUrl(regNo: string, position: string, team: string): string {
  const cleaned = regNo.trim().toUpperCase();
  const pos = (position || "").toLowerCase();
  const teamLower = (team || "").toLowerCase();

  if (pos.includes("president")) {
    return `${ASSETS_BASE}/leadership/co-presidents/${cleaned}.webp`;
  }
  if (pos.includes("coordinator") && teamLower.includes("leadership")) {
    return `${ASSETS_BASE}/leadership/coordinators/${cleaned}.webp`;
  }
  if (teamLower.includes("leadership")) {
    return `${ASSETS_BASE}/leadership/others/${cleaned}.webp`;
  }
  if (team) {
    return `${ASSETS_BASE}/members/teams/${normalizeTeamFolder(team)}/${cleaned}.webp`;
  }
  return `${ASSETS_BASE}/members/unknown/${cleaned}.webp`;
}

/** Normalize an incoming team name to one of our wheel category keys. */
function normalizeTeamKey(teamName: string): string[] {
  const lower = (teamName || "").toLowerCase();
  const keys: string[] = [];
  if (lower.includes("esport") && (lower.includes("pc") || lower.includes(" pc") || lower === "esports pc")) keys.push("esports_pc");
  if (lower.includes("mobile")) keys.push("esports_mobile");
  // plain "esports" with no qualifier → both
  if (lower.includes("esport") && !lower.includes("pc") && !lower.includes("mobile")) {
    keys.push("esports_pc");
    keys.push("esports_mobile");
  }
  if (lower.includes("education")) keys.push("education");
  if (lower.includes("design")) keys.push("design");
  if (lower.includes("social")) keys.push("social_media");
  if (lower.includes("pr") && !lower.includes("president")) keys.push("pr");
  if (lower.includes("tech")) keys.push("technical");
  return keys.length > 0 ? keys : ["technical"];
}

// ── Main data-fetching function ────────────────────────────────────
export async function fetchClubData() {
  try {
    // Read from vrgc-form — the real member registration DB
    const membersResult = await withTimeout(
      getDocs(collection(formDb, "members")).catch((err) => {
        console.error("Firestore (vrgc-form) fetch error:", err);
        return null;
      }),
      6000
    );

    const rawMembers: any[] = membersResult
      ? (membersResult as any).docs?.map((d: any) => ({
          id: d.id,
          ...d.data(),
        })) ?? []
      : [];

    if (rawMembers.length === 0) {
      console.warn("fetchClubData: no members returned from vrgc-form, using fallback.");
    }

    // ── Build lookup by regNo ──────────────────────────────────────
    const memberByRegNo = new Map<string, any>();
    rawMembers.forEach((m) => {
      const regNo = (m.registrationNumber || m.id || "").trim().toUpperCase();
      if (regNo) memberByRegNo.set(regNo, m);
    });

    // ── Leadership / Council ───────────────────────────────────────
    const leadership = rawMembers.filter(
      (m) =>
        (m.team || "").toLowerCase().includes("leadership") ||
        /(president|coordinator)/i.test(m.position || m.role || "")
    );

    const council: CouncilMember[] = [];
    const seenIds = new Set<string>();

    leadership.forEach((m) => {
      const regNo = (m.registrationNumber || m.id || "").trim().toUpperCase();
      if (!regNo || seenIds.has(regNo)) return;
      seenIds.add(regNo);

      council.push({
        id: regNo,
        name: m.name || "Council Member",
        role: m.position || m.role || "Executive Council",
        tier: "EXECUTIVE COUNCIL",
        team: m.team || "Leadership",
        photoUrl: buildPhotoUrl(regNo, m.position || m.role || "", m.team || ""),
        email: m.email || "",
        bio: m.bio || m.description || "",
      });
    });

    // Sort: Presidents first, then Coordinators, then others
    council.sort((a, b) => {
      const score = (r: string) => {
        const lo = r.toLowerCase();
        if (lo.includes("president")) return 10;
        if (lo.includes("coordinator")) return 5;
        if (lo.includes("lead")) return 3;
        return 1;
      };
      return score(b.role) - score(a.role);
    });

    // ── Team Wheel categories ──────────────────────────────────────
    const categoryMap: Record<string, WheelMember[]> = {
      esports_pc: [],
      esports_mobile: [],
      education: [],
      design: [],
      social_media: [],
      pr: [],
      technical: [],
    };

    rawMembers.forEach((m) => {
      const position = m.position || m.role || "Member";
      const teamStr = m.team || "";

      // Skip pure leadership members
      if (teamStr.toLowerCase().includes("leadership")) return;

      const isLead = /lead/i.test(position);
      const isMember =
        /member/i.test(position) ||
        /coordinator/i.test(position) ||
        /admin/i.test(position) ||
        /co-lead/i.test(position);
      if (!isLead && !isMember) return;

      const regNo = (m.registrationNumber || m.id || "").trim().toUpperCase();
      const photoUrl = buildPhotoUrl(regNo, position, teamStr);

      // A member may belong to multiple comma/slash-separated teams
      const teamParts = teamStr.split(/[,/&]/).map((t: string) => t.trim());
      const addedToKeys = new Set<string>();

      teamParts.forEach((t: string) => {
        const keys = normalizeTeamKey(t);
        keys.forEach((key) => {
          if (!categoryMap[key]) return;
          if (addedToKeys.has(key)) return; // already added for this key
          addedToKeys.add(key);
          if (categoryMap[key].some((e) => e.id === regNo)) return; // dedupe
          categoryMap[key].push({
            id: regNo,
            name: m.name || "Club Member",
            role: position,
            tier: isLead ? "TEAM LEADERSHIP" : "CORE SQUAD",
            team: t || key.replace(/_/g, " ").toUpperCase(),
            weapon: `${(t || key).toUpperCase()} // ${position.toUpperCase()}`,
            photoUrl,
            email: m.email || "",
            stats: {
              s1: [isLead ? "LEADERSHIP" : "EXECUTION", isLead ? 96 : 90],
              s2: ["TECHNICAL SKILL", 92],
              s3: ["CONSISTENCY", 94],
            },
            bio:
              m.bio ||
              m.description ||
              `Active ${position} in the ${t || key} team driving VRGC tournaments, workshops, and student community initiatives.`,
          });
        });
      });
    });

    // Sort each category: Leads first
    Object.keys(categoryMap).forEach((k) => {
      categoryMap[k].sort((a, b) => {
        const score = (pos: string) =>
          /lead$/i.test(pos) ? 3 : /co-lead/i.test(pos) ? 2 : 1;
        return score(b.role) - score(a.role);
      });
    });

    // ── Drift Wall gallery: GitHub tree → member details from vrgc-form ──
    let galleryMembers: any[] = [];
    try {
      const treeRes = await fetch(
        "https://api.github.com/repos/VRGC-vit/VRGCassets/git/trees/main?recursive=1",
        { headers: { "User-Agent": "VRGC-NextJS" } }
      );
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        const imageFiles = (treeData.tree || []).filter(
          (f: any) =>
            !f.path.endsWith("member-data.json") &&
            (/\.(webp|jpg|png)$/i.test(f.path))
        );

        galleryMembers = imageFiles.map((file: any) => {
          const parts = (file.path as string).split("/");
          const filename = parts[parts.length - 1];
          const regNo = filename.replace(/\.(webp|jpg|png)$/i, "").toUpperCase();
          const member = memberByRegNo.get(regNo);

          return {
            id: regNo,
            name: member?.name || regNo,
            role: member?.position || member?.role || "Member",
            team: member?.team || "VRGC",
            bio: member?.bio || member?.description || "",
            photoUrl: `${ASSETS_BASE}/${file.path}`,
          };
        });
      }
    } catch (err) {
      console.error("DriftWall: failed to fetch GitHub tree:", err);
    }

    return {
      council: council.length > 0 ? council : defaultCouncilMembers,
      faculty: facultyMembers,
      wheelCategories: categoryMap,
      galleryMembers,
    };
  } catch (error) {
    console.error("fetchClubData error:", error);
    return {
      council: defaultCouncilMembers,
      faculty: facultyMembers,
      wheelCategories: {},
      galleryMembers: [],
    };
  }
}
