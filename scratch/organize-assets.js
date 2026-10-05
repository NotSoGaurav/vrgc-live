const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, getDoc } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

const firebaseConfig = {
  apiKey: "AIzaSyBAJjBmiYGqS5yLDMbTwrs0Br6nZEArx18",
  authDomain: "vrgc-main.firebaseapp.com",
  projectId: "vrgc-main",
  storageBucket: "vrgc-main.firebasestorage.app",
  messagingSenderId: "751251886223",
  appId: "1:751251886223:web:1fcf7fc24cb1b67a9460fa",
  measurementId: "G-8GMKNN7PE1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const assetsDir = "d:/ProjectsCS/vrgc-assets";

async function main() {
  const files = fs.readdirSync(assetsDir);
  const webpFiles = files.filter(f => f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg'));
  
  for (const file of webpFiles) {
    const regNo = file.replace(/\.(webp|png|jpg)$/, '');
    const docRef = doc(db, "members", regNo);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const role = (data.position || data.role || "").toLowerCase();
      const team = (data.team || "").toLowerCase();
      
      let targetDir = "members/others";
      if (role.includes("president")) {
        targetDir = "leadership/co-presidents";
      } else if (role.includes("coordinator")) {
        targetDir = "leadership/coordinators";
      } else if (team.includes("leadership")) {
        targetDir = "leadership/others";
      } else if (role.includes("faculty")) {
        targetDir = "faculty";
      } else if (data.team) {
        // Sanitize team name for folder
        const teamName = data.team.replace(/[^a-zA-Z0-9]/g, '_');
        targetDir = `members/teams/${teamName}`;
      }
      
      const fullTargetDir = path.join(assetsDir, targetDir);
      fs.mkdirSync(fullTargetDir, { recursive: true });
      fs.renameSync(path.join(assetsDir, file), path.join(fullTargetDir, file));
      console.log(`Moved ${file} to ${targetDir}`);
    } else {
      console.log(`No member data found for ${regNo}, leaving in root.`);
      // let's just move them to unknown to keep root clean
      const fullTargetDir = path.join(assetsDir, 'members/unknown');
      fs.mkdirSync(fullTargetDir, { recursive: true });
      fs.renameSync(path.join(assetsDir, file), path.join(fullTargetDir, file));
      console.log(`Moved ${file} to members/unknown`);
    }
  }
}

main().then(() => process.exit(0)).catch(console.error);
