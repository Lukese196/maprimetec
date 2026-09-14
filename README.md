# MA PRIME TEC

Galeria de nove variações do mascote: `marca/variacoes/index.html`. Inclui poses de corpo inteiro, closes de dúvida e alegria, expressão atenta e vista lateral. As telas de triagem exibem uma variação correspondente a cada etapa. Origem e prompts em `marca/variacoes/README.md`.

Site estático de triagem, sem dependências de build. Execute `python -m http.server 4173 --bind 127.0.0.1` nesta pasta e abra http://127.0.0.1:4173.

## Estrutura

- `index.html`: estrutura e aplicação do tema antes da renderização.
- `styles.css`: layout responsivo, temas e identidade inspirada no Nova.
- `app.js`: navegação por etapas, validação, resumo e cópia.
- `config.js`: WhatsApp comercial. Preencher `whatsappNumber` com código do país, DDD e número, somente dígitos. Sem configuração, o site mostra a pendência e disponibiliza a cópia; não envia para número fictício.

O tema segue inicialmente o sistema e a escolha manual é salva localmente. As respostas ficam apenas na memória da página; recarregar apaga a triagem. Não há backend nem envio automático. O link abre uma mensagem preparada no WhatsApp, e o usuário confirma o envio. A fonte DM Sans é carregada pelo Google Fonts, com fontes de sistema como fallback.

As etapas têm transição de saída e entrada (120 ms + 220 ms), invertida ao voltar. A preferência de movimento reduzido desativa a animação. A navegação funciona com o histórico do navegador e as opções aceitam teclado.

## Validação realizada

- `node --check app.js` e `node --check config.js`: sem erros de sintaxe.
- Servidor local: resposta HTTP 200.
- Navegador: fluxo até o resumo, texto copiado, edição do equipamento com limpeza do problema anterior, opções específicas de impressora, detalhes opcionais e rejeição de nome composto só por espaços.
- Alternância de tema e persistência após recarregar verificadas.
- Inspeção visual desktop e mobile; larguras de 390 px e 320 px sem overflow horizontal nas telas verificadas.
- Console consultado durante o fluxo: sem avisos ou erros capturados.
- Envio real ao WhatsApp pendente do número comercial; não foi enviado atendimento de teste.

Os arquivos originais em `marca/` e `referencias/` foram preservados. A ilustração utiliza um enquadramento CSS da composição original em uma superfície clara, inclusive no tema escuro, pois a imagem tem fundo branco opaco.
