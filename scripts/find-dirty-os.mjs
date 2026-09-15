import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Need the config from config.js
// Wait, I can't easily import config.js from node unless it's a module
// but config.js is a module! Let's just import it if the package.json has "type": "module".
// Wait, package.json doesn't have "type": "module", so I'll just write it manually.
import fs from 'fs';

const configContent = fs.readFileSync('./config.js', 'utf-8');
const match = configContent.match(/const firebaseConfig = ({[\s\S]*?});/);
if (!match) {
  console.error("Config not found");
  process.exit(1);
}
const firebaseConfig = eval('(' + match[1] + ')');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findDirty() {
  const snap = await getDocs(collection(db, 'os_list'));
  console.log(`Encontradas ${snap.size} OS`);
  
  snap.forEach(doc => {
    const data = doc.data();
    if (doc.id !== 'OS-9221') {
      console.log(`Suspicious OS: ID=${doc.id}, Status=${data.status}, Client=${data.client}`);
    }
  });
  
  process.exit(0);
}

findDirty().catch(console.error);
