const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Note: You must provide a service account key to run this locally
// e.g. set GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
initializeApp({ projectId: 'maprimetec-os' });
const db = getFirestore();

const isDryRun = process.argv.includes('--dry-run');

async function migrateData() {
  console.log(`Starting migration... DRY-RUN: ${isDryRun}`);
  const clientsSnap = await db.collection("clients").get();
  const osSnap = await db.collection("os_list").get();

  const clientsByPhone = new Map();
  const operations = []; // array of descriptions for dry-run
  const batchArray = []; // to execute if not dry run (we'll do writes one by one for simplicity in this script though)

  // 1. Normalize clients
  console.log(`\n--- Normalizing ${clientsSnap.size} clients ---`);
  for (const doc of clientsSnap.docs) {
    const data = doc.data();
    const currentId = doc.id;
    let normalizedCpf = null;

    if (data.cpf) {
      normalizedCpf = String(data.cpf).replace(/\D/g, '');
    }
    
    // If we have a phone, we map it to resolve orphans later
    if (data.phone) {
      const p = String(data.phone).replace(/\D/g, '');
      if (normalizedCpf) {
        clientsByPhone.set(p, normalizedCpf);
      }
    }

    if (normalizedCpf && currentId !== normalizedCpf) {
      operations.push(`CLIENT: Migrate client doc ${currentId} -> ${normalizedCpf}`);
      if (!isDryRun) {
        // Copy to new ID
        await db.collection("clients").doc(normalizedCpf).set({
          ...data,
          cpf: normalizedCpf
        }, { merge: true });
        // Delete old doc
        await db.collection("clients").doc(currentId).delete();
      }
    } else if (normalizedCpf && currentId === normalizedCpf) {
      if (data.cpf !== normalizedCpf) {
        operations.push(`CLIENT: Update cpf field on client doc ${currentId} to ${normalizedCpf}`);
        if (!isDryRun) {
          await db.collection("clients").doc(currentId).update({ cpf: normalizedCpf });
        }
      }
    } else {
       operations.push(`CLIENT: Warning - Client ${currentId} has no valid CPF. Kept as is.`);
       if (data.phone) {
         clientsByPhone.set(String(data.phone).replace(/\D/g, ''), currentId);
       }
    }
  }

  // 2. Normalize OS and move history
  console.log(`\n--- Normalizing ${osSnap.size} OS documents ---`);
  for (const doc of osSnap.docs) {
    const data = doc.data();
    const osId = doc.id;
    const updates = {};
    let shouldUpdateOS = false;

    // Resolve clientCpf
    if (!data.clientCpf && data.phone) {
      const p = String(data.phone).replace(/\D/g, '');
      const matchedCpf = clientsByPhone.get(p);
      if (matchedCpf) {
        updates.clientCpf = matchedCpf;
        shouldUpdateOS = true;
        operations.push(`OS: Add clientCpf=${matchedCpf} to OS ${osId} (matched by phone)`);
      } else {
        operations.push(`OS: Warning - OS ${osId} has phone ${p} but no matching client CPF found.`);
      }
    } else if (data.clientCpf && data.clientCpf.match(/\D/)) {
        // Clean existing clientCpf with dots/dashes
        const cleanCpf = data.clientCpf.replace(/\D/g, '');
        updates.clientCpf = cleanCpf;
        shouldUpdateOS = true;
        operations.push(`OS: Clean clientCpf to ${cleanCpf} on OS ${osId}`);
    }

    // Move history to subcollection
    if (data.history && Array.isArray(data.history)) {
      operations.push(`OS: Move history array (${data.history.length} items) to subcollection and remove from OS ${osId}`);
      updates.history = require("firebase-admin/firestore").FieldValue.delete();
      shouldUpdateOS = true;
      if (!isDryRun) {
        for (const item of data.history) {
           await db.collection("os_list").doc(osId).collection("history").add(item);
        }
      }
    }
    
    if (shouldUpdateOS && !isDryRun) {
      await db.collection("os_list").doc(osId).update(updates);
    }
  }

  console.log("\n--- Operations Summary ---");
  if (operations.length === 0) {
    console.log("No operations needed.");
  } else {
    for (const op of operations) {
      console.log(op);
    }
  }

  console.log(`\nMigration finished. (DRY-RUN: ${isDryRun})`);
}

migrateData().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
