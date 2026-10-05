const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

// vrgc-form Firebase (real member data)
const formFirebaseConfig = {
  apiKey: "AIzaSyANu9lQsIX2JXGoViJ_Oag66Cltd0YzXI0",
  authDomain: "vrgc-form.firebaseapp.com",
  projectId: "vrgc-form",
  storageBucket: "vrgc-form.firebasestorage.app",
  messagingSenderId: "830392164988",
  appId: "1:830392164988:web:9613ae484e4ab64d281ff9",
  measurementId: "G-F24JMF4K6Q"
};

const formApp = initializeApp(formFirebaseConfig, "vrgc-form");
const formDb = getFirestore(formApp);

const assetsDir = "d:/ProjectsCS/vrgc-assets";

async function main() {
  // 1. Fetch all members from vrgc-form
  console.log("Fetching all members from vrgc-form Firestore...");
  const snapshot = await getDocs(collection(formDb, "members"));
  const members = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    const regNo = (data.registrationNumber || doc.id).trim().toUpperCase();
    members[regNo] = {
      id: regNo,
      name: data.name || "",
      position: data.position || data.role || "Member",
      team: data.team || "",
      email: data.email || "",
      bio: data.bio || data.description || ""
    };
  });
  
  console.log(`\nFound ${Object.keys(members).length} members in vrgc-form:\n`);
  Object.values(members).forEach(m => {
    console.log(`  ${m.id}: ${m.name} | ${m.position} | Team: ${m.team}`);
  });
  
  // 2. Scan all webp files in the assets repo (recursively)
  const getAllFiles = (dir) => {
    let files = [];
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        files = files.concat(getAllFiles(full));
      } else if (/\.(webp|jpg|png)$/i.test(f)) {
        files.push(full);
      }
    });
    return files;
  };
  
  const allFiles = getAllFiles(assetsDir).filter(f => !f.includes("/.git/"));
  console.log(`\nFound ${allFiles.length} image files in assets repo.`);
  
  // 3. Map each image file to its member data
  console.log("\n--- File to Member mapping ---");
  const matched = [];
  const unmatched = [];
  
  allFiles.forEach(filePath => {
    const filename = path.basename(filePath);
    const regNo = filename.replace(/\.(webp|jpg|png)$/i, "").toUpperCase();
    const member = members[regNo];
    
    if (member && member.name) {
      matched.push({ filePath, regNo, member });
      console.log(`  ✅ ${regNo}: "${member.name}" | ${member.position} | ${member.team}`);
    } else {
      unmatched.push({ filePath, regNo });
      console.log(`  ❓ ${regNo}: NOT in vrgc-form DB (current path: ${filePath.replace(assetsDir, '')})`);
    }
  });
  
  console.log(`\n✅ Matched: ${matched.length}`);
  console.log(`❓ Unmatched (no real data in vrgc-form): ${unmatched.length}`);
  
  // Save the member map to JSON for use in reorganize step
  const memberMap = {};
  Object.values(members).forEach(m => { memberMap[m.id] = m; });
  fs.writeFileSync(path.join(assetsDir, "member-data.json"), JSON.stringify(memberMap, null, 2));
  console.log("\nSaved member-data.json to assets dir.");
}

main().then(() => process.exit(0)).catch(console.error);
