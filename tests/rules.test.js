const fs = require('fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

let testEnv;

async function runTests() {
  const projectId = `marcus-tec-${Date.now()}`;
  testEnv = await initializeTestEnvironment({
    projectId: projectId,
    firestore: {
      rules: fs.readFileSync('./firestore.rules', 'utf8'),
    },
  });

  const anonDb = testEnv.authenticatedContext('anon', {}).firestore();

  const adminDb = testEnv.authenticatedContext('admin', {
    email: 'marcus190373@gmail.com',
    email_verified: true,
  }).firestore();

  const fakeAdminDb = testEnv.authenticatedContext('fake', {
    email: 'hacker@gmail.com',
    email_verified: true,
  }).firestore();

  console.log('--- TEST: ANONYMOUS USER ---');
  // não lista os_list; não lista clients;
  await assertFails(anonDb.collection('os_list').get());
  await assertFails(anonDb.collection('clients').get());
  // não lê nenhum documento de clients;
  await assertFails(anonDb.collection('clients').doc('123').get());
  // lê uma OS por ID;
  await assertSucceeds(anonDb.collection('os_list').doc('os1').get());
  // não faz update nem delete em OS existente;
  await assertFails(anonDb.collection('os_list').doc('os1').update({ status: 'analise' }));
  await assertFails(anonDb.collection('os_list').doc('os1').delete());
  // não escreve em clients;
  await assertFails(anonDb.collection('clients').doc('123').set({ name: 'Hacker' }));

  // cria uma OS válida;
  const validOs = {
    protocol: 'OS-20231010-1234', client: 'John Doe', clientCpf: '12345678901',
    phone: '11999999999', device: 'PC', problem: 'Lento', status: 'aberto', createdAt: 123
  };
  await assertSucceeds(anonDb.collection('os_list').doc('OS-20231010-1234').set(validOs));

  // não cria com status diferente de aberto
  await assertFails(anonDb.collection('os_list').doc('OS-X').set({ ...validOs, protocol: 'OS-X', status: 'analise' }));
  // não cria com campo fora do hasOnly
  await assertFails(anonDb.collection('os_list').doc('OS-Y').set({ ...validOs, protocol: 'OS-Y', origin: 'web' }));
  // não cria com client vazio
  await assertFails(anonDb.collection('os_list').doc('OS-Z').set({ ...validOs, protocol: 'OS-Z', client: 'a' })); // < 2 chars
  // não cria com clientCpf fora de 11/14 dígitos
  await assertFails(anonDb.collection('os_list').doc('OS-W').set({ ...validOs, protocol: 'OS-W', clientCpf: '123' }));

  console.log('--- TEST: ADMIN USER ---');
  // admin com email_verified lê, lista e atualiza tudo
  await assertSucceeds(adminDb.collection('clients').get());
  await assertSucceeds(adminDb.collection('os_list').get());
  await assertSucceeds(adminDb.collection('os_list').doc('os1').set(validOs));
  await assertSucceeds(adminDb.collection('os_list').doc('os1').update({ status: 'finalizado' }));

  console.log('--- TEST: FAKE ADMIN USER ---');
  // e-mail fora da lista não lê clients
  await assertFails(fakeAdminDb.collection('clients').get());

  console.log('All tests finished successfully.');
  await testEnv.cleanup();
}

runTests().catch(console.error);
