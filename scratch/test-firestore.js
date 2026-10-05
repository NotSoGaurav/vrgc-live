const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

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

const collectionsToTry = ["members", "users", "Users", "Members", "registrations", "Registrations", "drift_wall", "driftwall", "DriftWall"];

async function main() {
  for (const col of collectionsToTry) {
    try {
      const qs = await getDocs(collection(db, col));
      console.log(`Collection '${col}': ${qs.size} documents`);
      if (qs.size > 0) {
        console.log(`Sample from '${col}':`, qs.docs[0].data());
      }
    } catch (err) {
      console.log(`Collection '${col}': Error ${err.message}`);
    }
  }
}

main().then(() => process.exit(0)).catch(console.error);
