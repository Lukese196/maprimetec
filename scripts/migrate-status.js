const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Necessário colocar chave privada

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Mapeamento antigo para novo
const statusMap = {
  'Aberto': 'aberto',
  'Em Análise': 'analise',
  'Orçamento Enviado': 'orcamento',
  'Em Reparo': 'reparo',
  'Finalizado': 'finalizado',
  'Cancelado': 'cancelado'
};

async function migrateStatus(dryRun = true) {
  console.log(`Iniciando migração de status... (Dry Run: ${dryRun})`);
  
  const osRef = db.collection('os_list');
  const snapshot = await osRef.get();
  
  if (snapshot.empty) {
    console.log('Nenhuma OS encontrada.');
    return;
  }

  let totalUpdated = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    let updates = {};

    // 1. Atualizar status principal
    if (statusMap[data.status]) {
      updates.status = statusMap[data.status];
      needsUpdate = true;
    } else if (data.status) {
      // Formata minúsculo e sem acento caso não bata exato no mapa
      const normalized = String(data.status).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ /g, "");
      if (normalized !== data.status) {
        updates.status = normalized;
        needsUpdate = true;
      }
    }

    // 2. Extrair history array para subcollection
    if (data.history && Array.isArray(data.history)) {
      if (!dryRun) {
        const batch = db.batch();
        for (const [index, histItem] of data.history.entries()) {
          const histRef = doc.ref.collection('history').doc(`${Date.now()}_${index}`);
          let newStatus = histItem.status;
          if (statusMap[newStatus]) newStatus = statusMap[newStatus];
          else if (newStatus) newStatus = String(newStatus).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ /g, "");
          
          batch.set(histRef, {
            status: newStatus || 'indefinido',
            note: histItem.note || '',
            date: histItem.date || new Date().toISOString()
          });
        }
        await batch.commit();
        
        // Remove history do documento principal
        updates.history = admin.firestore.FieldValue.delete();
        needsUpdate = true;
      } else {
        console.log(`[DRY RUN] Migraria ${data.history.length} itens de histórico da OS ${doc.id} para subcollection.`);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      console.log(`[${dryRun ? 'DRY RUN' : 'EXEC'}] Atualizando OS ${doc.id}: ${JSON.stringify(updates)}`);
      if (!dryRun) {
        await doc.ref.update(updates);
      }
      totalUpdated++;
    }
  }
  
  console.log(`Migração concluída. Total de documentos ${dryRun ? 'que seriam atualizados' : 'atualizados'}: ${totalUpdated}`);
}

const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');

migrateStatus(isDryRun).catch(console.error);
