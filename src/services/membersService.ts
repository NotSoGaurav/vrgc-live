import { collection, getDocs } from "firebase/firestore";
import { db } from "@/utils/firebase/client";


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

// Default Council data with local UUID webp photos (deterministic UUIDv5 from registration number + salt)
export const defaultCouncilMembers: CouncilMember[] = [
  {
    id: "23BCE11158",
    name: "Shivansh Sharma",
    role: "Co-President",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: "/members/23BCE11158.webp",
    bio: "Co-President spearheading varsity tournament operations, live broadcast production, and partner circuits.",
  },
  {
    id: "23BCG10015",
    name: "Lokesh Sharma",
    role: "Co-President",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: "/members/23BCG10015.webp",
    bio: "Co-President directing game development incubators, technical workshops, and competitive gaming divisions.",
  },
  {
    id: "24BCG10003",
    name: "Parardha Dhar",
    role: "Student Coordinator",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: "/members/24BCG10003.webp",
    bio: "Student Coordinator managing university symposiums, esports player registrations, and club logistics.",
  },
  {
    id: "24BCG10051",
    name: "Haardik Pahlajani",
    role: "Student Coordinator",
    tier: "EXECUTIVE COUNCIL",
    team: "Leadership",
    photoUrl: "/members/24BCG10051.webp",
    bio: "Student Coordinator coordinating varsity scrim schedules, event broadcasts, and member communications.",
  },
];

/** Races a promise-like against a timeout. Returns null if the timeout fires first. */
function withTimeout<T>(promise: PromiseLike<T>, ms = 5000): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function fetchClubData() {
  try {
    // Parallelise async data sources with a 5s timeout each
    const [membersResult] = await Promise.allSettled([
      withTimeout(getDocs(collection(db, "members")).catch((err) => { console.error("Firestore fetch error:", err); return null; }), 5000),
    ]);

    // null means timed out; treat the same as a failed promise
    const rawMembers: any[] =
      membersResult.status === "fulfilled" && membersResult.value
        ? (membersResult.value as any).docs?.map((d: any) => ({ id: d.id, ...d.data() })) ?? []
        : [];

    /**
     * Resolves member photo directly from public/members/ using deterministic UUIDv5
     * Generated format: registrationNumber_salt -> <uuid>.webp
     */
    const coreRegSet = new Set<string>(
      rawMembers.map((m) => (m.registrationNumber || m.id || "").trim())
    );

    // Helper that returns a deterministic URL only for core members
    const getCorePhotoUrl = (regNo?: string, role?: string, team?: string): string => {
      if (!regNo) return "";
      const cleaned = regNo.trim().toUpperCase();
      if (!coreRegSet.has(cleaned) && !coreRegSet.has(regNo.trim())) return ""; // not a core member
      
      const roleLower = (role || "").toLowerCase();
      const teamLower = (team || "").toLowerCase();
      
      let targetDir = "members/unknown";
      if (roleLower.includes("president")) {
        targetDir = "leadership/co-presidents";
      } else if (roleLower.includes("coordinator")) {
        targetDir = "leadership/coordinators";
      } else if (teamLower.includes("leadership")) {
        targetDir = "leadership/others";
      } else if (roleLower.includes("faculty")) {
        targetDir = "faculty";
      } else if (team) {
        const teamName = team.replace(/[^a-zA-Z0-9]/g, '_');
        targetDir = `members/teams/${teamName}`;
      }
      
      return `https://raw.githubusercontent.com/VRGC-vit/VRGCassets/main/${targetDir}/${cleaned}.webp`;
    };

    // 3. Extract Leadership members directly from id_cards table and Firestore (team = 'Leadership')
    const combinedLeads: CouncilMember[] = [];

    const addLeadCandidate = (c: any) => {
      if (!c) return;
      const cleanReg = (c.registrationNumber || c.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const existing = combinedLeads.find((item) => {
        const itemReg = (item.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanReg && itemReg && cleanReg === itemReg;
      });
      const photo = getCorePhotoUrl(c.registrationNumber || c.id, c.position || c.role, c.team);
      if (existing) {
        if (!existing.bio && (c.description || c.bio)) {
          existing.bio = c.description || c.bio;
        }
        // Always use the locally generated URL
        existing.photoUrl = photo;
        if (!existing.role && (c.position || c.role)) {
          existing.role = c.position || c.role;
        }
        return;
      }
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

      const photo = getCorePhotoUrl(m.registrationNumber || m.id, m.position || m.role, m.team);
      const teams = (m.team || "").split(/[,/\u0026]/).map((t: string) => t.trim());

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

    // 5. Fetch GitHub tree to get all images for DriftWall gallery
    let galleryMembers: any[] = [];
    try {
      const githubTreeRes = await fetch("https://api.github.com/repos/VRGC-vit/VRGCassets/git/trees/main?recursive=1", {
        headers: { "User-Agent": "VRGC-NextJS" }
      });
      if (githubTreeRes.ok) {
        const githubTreeData = await githubTreeRes.json();
        const githubFiles = (githubTreeData.tree || []).filter((f: any) => f.path.endsWith('.webp') || f.path.endsWith('.jpg') || f.path.endsWith('.png'));

        galleryMembers = githubFiles.map((file: any) => {
          const parts = file.path.split('/');
          const filename = parts[parts.length - 1];
          const regNo = filename.replace(/\.(webp|jpg|png)$/, '');
          
          const dbMember = rawMembers.find(m => (m.registrationNumber || m.id || "").toLowerCase() === regNo.toLowerCase());
          
          return {
            id: regNo,
            name: dbMember?.name || `Member ${regNo.toUpperCase()}`,
            role: dbMember?.position || dbMember?.role || "Member",
            team: dbMember?.team || "VRGC",
            photoUrl: `https://raw.githubusercontent.com/VRGC-vit/VRGCassets/main/${file.path}`,
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch Github tree for DriftWall", err);
    }

    return {
      council: finalCouncil,
      faculty: facultyMembers,
      wheelCategories: categoryMap,
      galleryMembers,
    };
  } catch (error) {
    console.error("Error fetching club data from Firestore/Supabase:", error);
    return {
      council: defaultCouncilMembers,
      faculty: facultyMembers,
      wheelCategories: {},
      galleryMembers: [],
    };
  }
}
