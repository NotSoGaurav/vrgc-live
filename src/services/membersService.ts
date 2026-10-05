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

// ── Base path for hosted assets (defaults to local /assets) ────────
export const ASSETS_BASE =
  process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "/assets";

// ── Fallback Council (shown while Firestore loads) ────────────────
export const defaultCouncilMembers: CouncilMember[] = [
  {
    id: "23BCE11158",
    name: "Shivansh Sharma",
    role: "Co-President",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: `${ASSETS_BASE}/leadership/co-presidents/23BCE11158.webp`,
    bio: "Co-President spearheading varsity tournament operations, live broadcast production, and partner circuits.",
  },
  {
    id: "23BCG10015",
    name: "Lokesh Sharma",
    role: "Co-President",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: `${ASSETS_BASE}/leadership/co-presidents/23BCG10015.webp`,
    bio: "Co-President directing game development incubators, technical workshops, and competitive gaming divisions.",
  },
  {
    id: "24BCG10003",
    name: "Parardha Dhar",
    role: "Student Coordinator",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: `${ASSETS_BASE}/leadership/coordinators/24BCG10003.webp`,
    bio: "Student Coordinator managing university symposiums, esports player registrations, and club logistics.",
  },
  {
    id: "24BCG10051",
    name: "Haardik Pahlajani",
    role: "Student Coordinator",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: `${ASSETS_BASE}/leadership/coordinators/24BCG10051.webp`,
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
  const t = team.trim().toLowerCase();
  if (t.includes("tech")) return "technical";
  return t
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/, "");
}

function cleanTeamName(team?: string): string {
  if (!team) return "VRGC";
  const trimmed = team.trim();
  if (/^technical(\s+team)?$/i.test(trimmed)) return "Technical";
  return trimmed;
}


/** Build the dynamically constructed photo URL. Returns fallback .webp path */
function buildPhotoUrl(regNo: string, position?: string, team?: string): string {
  if (!regNo) return "";
  const cleaned = regNo.trim().toUpperCase();
  const posLower = (position || "").toLowerCase();
  const teamStr = team || "";
  const teamLower = teamStr.toLowerCase();

  let targetDir = "";
  if (posLower.includes("president")) {
    targetDir = "leadership/co-presidents";
  } else if (posLower.includes("coordinator") && teamLower.includes("leadership")) {
    targetDir = "leadership/coordinators";
  } else if (teamLower.includes("leadership")) {
    targetDir = "leadership/others";
  } else if (teamStr) {
    let folderName = teamLower;
    if (folderName.includes("tech")) {
      folderName = "technical";
    } else {
      folderName = folderName.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    }
    targetDir = `members/teams/${folderName}`;
  } else {
    targetDir = "members/unknown";
  }

  return `${ASSETS_BASE}/${targetDir}/${cleaned}.webp`;
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

    // ── Drift Wall gallery: load registration numbers from local / hosted assets ──
    const assetFilePaths = new Set<string>();

    // 1. Read directly from local filesystem in server environments
    if (typeof window === "undefined") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const manifestPaths = [
          path.join(process.cwd(), "public", "assets", "manifest.json"),
          path.join(process.cwd(), "public", "manifest-assets.json"),
        ];
        for (const mp of manifestPaths) {
          if (fs.existsSync(mp)) {
            const parsed = JSON.parse(fs.readFileSync(mp, "utf-8"));
            (parsed.files || []).forEach((p: string) => assetFilePaths.add(p.trim()));
            if (assetFilePaths.size > 0) break;
          }
        }
      } catch (_) {}
    }

    // 2. Fetch from local asset manifest via HTTP/fetch
    if (assetFilePaths.size === 0) {
      try {
        const manifestUrl =
          process.env.NEXT_PUBLIC_GITHUB_MANIFEST_URL || `${ASSETS_BASE}/manifest.json`;
        const manifestRes = await withTimeout(fetch(manifestUrl), 2000);
        if (manifestRes && manifestRes.ok) {
          const manifestData = await manifestRes.json();
          (manifestData.files || []).forEach((p: string) => {
            if (/\.(webp|jpg|png)$/i.test(p)) {
              assetFilePaths.add(p.trim());
            }
          });
        }
      } catch (_) {}
    }

    // 3. Optional fallback to GitHub Trees API only if configured in environment
    if (assetFilePaths.size === 0 && process.env.NEXT_PUBLIC_GITHUB_API_URL) {
      try {
        const headers: Record<string, string> = { "User-Agent": "VRGC-NextJS" };
        if (process.env.GITHUB_TOKEN) {
          headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
        }
        const treeRes = await withTimeout(
          fetch(process.env.NEXT_PUBLIC_GITHUB_API_URL, { headers }),
          2500
        );
        if (treeRes && treeRes.ok) {
          const treeData = await treeRes.json();
          (treeData.tree || []).forEach((f: any) => {
            if (!f.path.endsWith("member-data.json") && /\.(webp|jpg|png)$/i.test(f.path)) {
              assetFilePaths.add(f.path.trim());
            }
          });
        }
      } catch (_) {}
    }

    // ── Pipeline Step 1: Load all regn no from Git ──
    const gitRegNoMap = new Map<string, string>(); // regNo -> filePath in Git
    assetFilePaths.forEach((filePath) => {
      const fileName = filePath.split("/").pop() || "";
      const regNo = fileName.replace(/\.(webp|jpg|png)$/i, "").trim().toUpperCase();
      if (regNo && !gitRegNoMap.has(regNo)) {
        gitRegNoMap.set(regNo, filePath);
      }
    });

    // ── Pipeline Step 2: Prepare tiles from those regn no ──
    // ── Pipeline Step 3: Get details from the regn no ──
    const galleryMembers = Array.from(gitRegNoMap.entries()).map(([regNo, filePath]) => {
      // Get member details from the regn no via memberByRegNo
      const member = memberByRegNo.get(regNo);

      return {
        id: regNo,
        name: member?.name || regNo,
        role: member?.position || member?.role || "Member",
        team: cleanTeamName(member?.team),
        bio: member?.bio || member?.description || "",
        photoUrl: `${ASSETS_BASE}/${filePath}`,
      };
    });

    return {
      council: council.length > 0 ? council : defaultCouncilMembers,
      faculty: facultyMembers,
      wheelCategories: categoryMap,
      galleryMembers,
    };
  } catch (error) {
    console.error("fetchClubData error:", error);
    // Fallback: If everything fails, return empty arrays and rely on UI skeleton states.
    return {
      council: defaultCouncilMembers,
      faculty: facultyMembers,
      wheelCategories: {},
      galleryMembers: [],
    };
  }
}
