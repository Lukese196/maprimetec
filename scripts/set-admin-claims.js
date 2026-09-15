const admin = require("firebase-admin");

// Note: You must provide a service account key to run this locally
// e.g. set GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
admin.initializeApp();

const allowedEmails = ['loliver242@gmail.com', 'marcus190373@gmail.com'];

async function setAdminClaims() {
  for (const email of allowedEmails) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      if (user) {
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        console.log(`Custom claim 'admin: true' set for ${email}`);
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.warn(`User ${email} not found in Firebase Auth yet.`);
      } else {
        console.error(`Error setting claim for ${email}:`, error);
      }
    }
  }
}

setAdminClaims().then(() => process.exit(0)).catch(() => process.exit(1));
