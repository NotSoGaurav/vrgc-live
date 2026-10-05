const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } = require("firebase/firestore");
const https = require("https");

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

const getGithubFiles = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/VRGC-vit/VRGCassets/contents/',
      headers: { 'User-Agent': 'NodeJS' }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
};

const teams = ["Technical", "Esports", "Design", "Social Media", "PR"];

async function main() {
  console.log("Fetching files from github...");
  const files = await getGithubFiles();
  const regNos = files
    .map(f => f.name)
    .filter(name => name.endsWith('.webp'))
    .map(name => name.replace('.webp', ''));
    
  console.log(`Found ${regNos.length} members on GitHub.`);

  // Optional: clear existing members if needed, but since it's empty we just add
  let i = 0;
  for (const regNo of regNos) {
    const team = teams[i % teams.length];
    const memberData = {
      registrationNumber: regNo,
      name: `Member ${regNo}`,
      position: "Member",
      team: team,
      role: "Member",
      bio: `Drift Wall Member ${regNo}`,
      email: `${regNo.toLowerCase()}@vitbhopal.ac.in`
    };
    
    await setDoc(doc(db, "members", regNo), memberData);
    console.log(`Added ${regNo}`);
    i++;
  }
  
  console.log("Done adding members!");
}

main().then(() => process.exit(0)).catch(console.error);
