const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, limit } = require("firebase/firestore");

// vrgc-form Firebase (where real member registrations are stored)
const firebaseConfig = {
  apiKey: "AIzaSyANu9lQsIX2JXGoViJ_Oag66Cltd0YzXI0",
  authDomain: "vrgc-form.firebaseapp.com",
  projectId: "vrgc-form",
  storageBucket: "vrgc-form.firebasestorage.app",
  messagingSenderId: "830392164988",
  appId: "1:830392164988:web:9613ae484e4ab64d281ff9",
  measurementId: "G-F24JMF4K6Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsToTry = [
  "members", "users", "Users", "Members", 
  "registrations", "Registrations", 
  "member_registrations", "club_members",
  "submissions", "forms", "responses"
];

async function main() {
  console.log("Probing vrgc-form Firebase...\n");
  for (const col of collectionsToTry) {
    try {
      const qs = await getDocs(query(collection(db, col), limit(2)));
      if (qs.size > 0) {
        console.log(`\n✅ Collection '${col}': ${qs.size} documents (showing up to 2)`);
        qs.docs.forEach(d => {
          console.log("  Document ID:", d.id);
          console.log("  Data:", JSON.stringify(d.data(), null, 4));
        });
      } else {
        console.log(`Collection '${col}': empty`);
      }
    } catch (err) {
      console.log(`Collection '${col}': ❌ ${err.message}`);
    }
  }
}

main().then(() => process.exit(0)).catch(console.error);
