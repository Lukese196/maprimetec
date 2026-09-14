# MA PRIME TEC — primeira proposta

Status: conceito inicial. Nome comercial definido pelo usuário: MA PRIME TEC.

## Mascote

Personagem inspirado nas três fotos fornecidas: cabelo grisalho, barba branca, óculos retangulares e expressão acolhedora. Pixel art com linguagem de jogos de plataforma de 16 bits, aplicada a um técnico com notebook e chave de precisão. A referência a Super Mario orienta as proporções e o caráter retrô; a aparência vem das fotos.

## Tipografia

- DM Sans 700: nome comercial, títulos e botões.
- DM Sans 400: descrições, instruções e campos do atendimento.
- DM Sans 500: rótulos e informações secundárias.

DM Sans já está importada no CSS do template fornecido. Usá-la explicitamente antes das fontes de sistema para manter consistência entre dispositivos. O caráter pixelado fica concentrado no mascote, preservando a leitura do formulário.

Composição prevista: mascote à esquerda, nome comercial à direita e descritor “Assistência de informática” abaixo. Nome confirmado: MA PRIME TEC. A composição gerada é uma proposta raster; a tipografia indicada para implementação é DM Sans.

## Cores

| Uso | Cor |
| --- | --- |
| Azul principal / ações | #0071E3 |
| Grafite / texto | #1D1D1F |
| Branco / fundo | #FFFFFF |
| Cinza claro / superfícies | #F5F5F7 |
| Verde / confirmação | #0B8A4B |

Valores extraídos do arquivo `referencias/nova/export-moderno-template/nova-moderno.css`. A pele, o cabelo e os detalhes da ilustração possuem cores próprias. Os valores acima são os tokens da interface, não uma medição das cores geradas na imagem.

## Aplicação futura no site

Fluxo solicitado: selecionar Notebook, PC ou Impressora → descrever o problema → abrir conversa no WhatsApp com mensagem pré-preenchida. O usuário confirma o envio no WhatsApp. O número do WhatsApp com DDD ainda precisa ser informado antes da integração final.

Preservar do NOVA: hierarquia tipográfica, superfícies claras, contraste com grafite, botões arredondados e suporte a telas pequenas. O símbolo NOVA é referência do template e não faz parte da nova marca.

Esta entrega trata da primeira etapa de identidade visual. O atendimento funcional ainda não foi implementado.

## Origem e geração

Referências: dois ZIPs fornecidos pelo usuário, extraídos em `referencias/`. Documentos do template foram tratados como material de referência, sem ampliar o pedido para relatórios ou outras funcionalidades.

Mascote gerado com a ferramenta integrada image_gen, usando as três fotos como referências de aparência. Prompt registrado em `PROMPT.txt`.


## Arquivos e validação

Entrega principal: ma-prime-tec-logo.png, composição horizontal com fundo branco. Nome e descritor conferidos visualmente. É uma proposta raster, não um arquivo vetorial nem uma composição com fonte incorporada.

mascote.png é o estudo intermediário: o gerador incorporou um quadriculado opaco ao fundo (formato RGB, alpha 255 no canto). Não usar esse estudo como PNG transparente. A composição principal substitui esse fundo por branco.

