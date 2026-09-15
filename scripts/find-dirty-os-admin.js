const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore();

async function findDirty() {
  try {
    const snap = await db.collection('os_list').get();
    console.log(`Encontradas ${snap.size} OS`);
    
    snap.forEach(doc => {
      const data = doc.data();
      if (doc.id !== 'OS-9221') {
        console.log(`Suspicious OS: ID=${doc.id}, Status=${data.status}, Client=${data.client}`);
      }
    });
    
  } catch (err) {
    console.error(err);
  }
}

findDirty();
