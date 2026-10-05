/**
 * re-organize-assets.js
 * 
 * Reads real member data from vrgc-form Firestore,
 * flattens all images back to root, then re-sorts
 * them into correct folders based on team/position.
 * 
 * Folder structure:
 *   leadership/co-presidents/
 *   leadership/coordinators/
 *   members/teams/<TeamName>/   (spaces→underscores, lower-cased)
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

const formFirebaseConfig = {
  apiKey: "AIzaSyANu9lQsIX2JXGoViJ_Oag66Cltd0YzXI0",
  authDomain: "vrgc-form.firebaseapp.com",
  projectId: "vrgc-form",
  storageBucket: "vrgc-form.firebasestorage.app",
  messagingSenderId: "830392164988",
  appId: "1:830392164988:web:9613ae484e4ab64d281ff9",
  measurementId: "G-F24JMF4K6Q"
};

const formApp = initializeApp(formFirebaseConfig, "vrgc-form-app");
const formDb = getFirestore(formApp);

const assetsDir = path.resolve("d:/ProjectsCS/vrgc-assets");

// Normalize team name to a consistent folder name
function normalizeTeam(team) {
  if (!team) return "unknown";
  const lower = team.trim().toLowerCase();
  if (lower.includes("tech")) return "technical";
  return lower
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// Clean display team name
function cleanTeamName(team) {
  if (!team) return "";
  const trimmed = team.trim();
  if (/^technical(\s+team)?$/i.test(trimmed)) return "Technical";
  return trimmed;
}

// Recursive file finder
function getAllImages(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(".")) continue;          // skip .git etc.
    if (f.endsWith(".json")) continue;         // skip json
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(getAllImages(full));
    } else if (/\.(webp|jpg|png)$/i.test(f)) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  // ── 1. Fetch real member data ──────────────────────────────────
  console.log("📡 Fetching member data from vrgc-form Firestore...");
  const snapshot = await getDocs(collection(formDb, "members"));
  const memberMap = {};
  snapshot.forEach(doc => {
    const d = doc.data();
    const regNo = (d.registrationNumber || doc.id).trim().toUpperCase();
    memberMap[regNo] = {
      id: regNo,
      name: d.name || "",
      position: (d.position || d.role || "Member").trim(),
      team: cleanTeamName(d.team),
    };
  });
  console.log(`✅ Loaded ${Object.keys(memberMap).length} members.\n`);

  // ── 2. Collect all current image files ────────────────────────
  const allFiles = getAllImages(assetsDir);
  console.log(`🗂  Found ${allFiles.length} image files to process.\n`);

  // ── 3. STEP 1: Move every file to a temp "staging" root folder ─
  //    (prevents name collisions during reorganization)
  const stagingDir = path.join(assetsDir, "_staging");
  fs.mkdirSync(stagingDir, { recursive: true });

  for (const filePath of allFiles) {
    const filename = path.basename(filePath);
    const dest = path.join(stagingDir, filename);
    if (filePath !== dest) {
      fs.renameSync(filePath, dest);
    }
  }
  console.log("📦 All files moved to staging.\n");

  // ── 4. Remove old sub-directories (excluding staging & .git) ──
  for (const entry of fs.readdirSync(assetsDir)) {
    if (["_staging", ".git", "member-data.json"].includes(entry)) continue;
    const full = path.join(assetsDir, entry);
    if (fs.statSync(full).isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
      console.log(`🗑  Removed old folder: ${entry}`);
    }
  }
  console.log();

  // ── 5. STEP 2: Re-sort from staging into correct folders ───────
  const stagedFiles = fs.readdirSync(stagingDir).filter(f => /\.(webp|jpg|png)$/i.test(f));

  const moves = [];
  const unknowns = [];

  for (const filename of stagedFiles) {
    const regNo = filename.replace(/\.(webp|jpg|png)$/i, "").toUpperCase();
    const member = memberMap[regNo];

    let targetDir;
    if (member) {
      const pos = member.position.toLowerCase();
      const team = member.team;

      if (pos.includes("president")) {
        targetDir = path.join(assetsDir, "leadership", "co-presidents");
      } else if (pos.includes("coordinator") && team.toLowerCase().includes("leadership")) {
        targetDir = path.join(assetsDir, "leadership", "coordinators");
      } else if (team.toLowerCase().includes("leadership")) {
        targetDir = path.join(assetsDir, "leadership", "others");
      } else if (team) {
        const folderName = normalizeTeam(team);
        targetDir = path.join(assetsDir, "members", "teams", folderName);
      } else {
        targetDir = path.join(assetsDir, "members", "unknown");
      }
      moves.push({ filename, regNo, name: member.name, position: member.position, team: member.team, targetDir });
    } else {
      targetDir = path.join(assetsDir, "members", "unknown");
      unknowns.push(regNo);
    }

    fs.mkdirSync(targetDir, { recursive: true });
    fs.renameSync(path.join(stagingDir, filename), path.join(targetDir, filename));
  }

  // ── 6. Remove staging dir ──────────────────────────────────────
  fs.rmSync(stagingDir, { recursive: true, force: true });

  // ── 7. Print summary ──────────────────────────────────────────
  console.log("📁 Reorganization complete:\n");
  moves.forEach(m => {
    const rel = m.targetDir.replace(assetsDir, "").replace(/\\/g, "/");
    console.log(`  ✅ ${m.regNo} → ${rel}/`);
    console.log(`     ${m.name} | ${m.position} | ${m.team}`);
  });

  if (unknowns.length > 0) {
    console.log("\n❓ No member data found for:");
    unknowns.forEach(r => console.log(`  ${r}`));
  }

  // ── 8. Persist member-data.json for DriftWall reference ────────
  fs.writeFileSync(
    path.join(assetsDir, "member-data.json"),
    JSON.stringify(memberMap, null, 2)
  );
  console.log("\n💾 Saved member-data.json");
  console.log("\n✅ Done! Commit and push vrgc-assets.");
}

main().then(() => process.exit(0)).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
