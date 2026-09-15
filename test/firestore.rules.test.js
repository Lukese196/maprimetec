const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'maprimetec-os-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("Firestore Security Rules", () => {
  let unauthedDb, authedDb, adminDb;

  const validOS = {
    protocol: "1234567890",
    client: {
      name: "Teste",
      cpf: "11122233344",
      phone: "11999999999"
    },
    device: "Smartphone",
    problem: "Tela quebrada",
    details: "Caiu no chao",
    status: 1,
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    unauthedDb = testEnv.unauthenticatedContext().firestore();
    authedDb = testEnv.authenticatedContext('user123', {}).firestore();
    adminDb = testEnv.authenticatedContext('admin123', { 
      email: 'lukese196@gmail.com', 
      email_verified: true 
    }).firestore();
  });

  describe("Coleção 'clients'", () => {
    it("deve negar leitura e escrita para usuário não logado", async () => {
      await assertFails(unauthedDb.collection("clients").doc("11122233344").get());
      await assertFails(unauthedDb.collection("clients").doc("11122233344").set({ name: "Teste" }));
    });

    it("deve negar leitura e escrita para usuário autenticado comum", async () => {
      await assertFails(authedDb.collection("clients").doc("11122233344").get());
      await assertFails(authedDb.collection("clients").doc("11122233344").set({ name: "Teste" }));
    });

    it("deve permitir leitura e escrita para admin verificado", async () => {
      await assertSucceeds(adminDb.collection("clients").doc("11122233344").set({ name: "Teste", phone: "11" }));
      await assertSucceeds(adminDb.collection("clients").doc("11122233344").get());
    });
  });

  describe("Coleção 'os_list'", () => {
    it("deve permitir consulta (get) para usuário não logado", async () => {
      await assertSucceeds(unauthedDb.collection("os_list").doc("OS123").get());
    });

    it("deve negar listagem para usuário não admin", async () => {
      await assertFails(unauthedDb.collection("os_list").get());
      await assertFails(authedDb.collection("os_list").where("status", "==", 1).get());
      await assertFails(authedDb.collection("os_list").get());
    });

    it("deve permitir criação para usuário anonimo se payload for válido e bater com o id", async () => {
      await assertSucceeds(authedDb.collection("os_list").doc("1234567890").set(validOS));
    });

    it("deve negar criação para usuário anonimo se id não for igual ao protocolo", async () => {
      await assertFails(authedDb.collection("os_list").doc("DIFERENTE").set(validOS));
    });

    it("deve negar criação se payload for inválido (faltando cpf)", async () => {
      const invalidOS = { ...validOS };
      delete invalidOS.client.cpf;
      await assertFails(authedDb.collection("os_list").doc("1234567890").set(invalidOS));
    });
    
    it("deve negar atualização/deleção para usuário não admin", async () => {
      await assertSucceeds(authedDb.collection("os_list").doc("1234567890").set(validOS)); // setup
      await assertFails(authedDb.collection("os_list").doc("1234567890").update({ status: 2 }));
      await assertFails(unauthedDb.collection("os_list").doc("1234567890").delete());
    });

    it("deve permitir listagem, leitura, criação, atualização para admin", async () => {
      await assertSucceeds(adminDb.collection("os_list").get());
      await assertSucceeds(adminDb.collection("os_list").doc("1234567890").set(validOS));
      await assertSucceeds(adminDb.collection("os_list").doc("1234567890").update({ status: 2 }));
    });
    
    it("deve negar deleção da OS mesmo para admin", async () => {
      // Setup the doc first
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("os_list").doc("1234567890").set(validOS);
      });
      await assertFails(adminDb.collection("os_list").doc("1234567890").delete());
    });
  });

  describe("Subcoleção 'history'", () => {
    it("deve permitir ler histórico", async () => {
      await assertSucceeds(unauthedDb.collection("os_list").doc("1234567890").collection("history").get());
    });
    
    it("deve negar inserir histórico para anonimo", async () => {
      await assertFails(authedDb.collection("os_list").doc("1234567890").collection("history").doc("1").set({ status: 1 }));
    });
    
    it("deve permitir inserir histórico para admin", async () => {
      await assertSucceeds(adminDb.collection("os_list").doc("1234567890").collection("history").doc("1").set({ status: 1, date: "2024-01-01" }));
    });
  });
});
