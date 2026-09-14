# Variações do mascote MA PRIME TEC

Ferramenta: image_gen integrada (sem CLI/API externa). Referência: ../ma-prime-tec-logo.png.

Nove PNGs originais preservados. Os arquivos `.svg` são as versões vetoriais com fundo transparente, usadas pelo site. Contêm paths reais, sem PNG embutido. Os PNGs continuam sendo os originais da geração; oito têm fundo branco opaco.

Aplicação no site: abertura e equipamento → equipamento.svg; problema → duvida.svg; detalhes → detalhes.svg; identificação → atento.svg; resumo → alegre.svg. Demais poses disponíveis na galeria para usos alternativos. A galeria possui alternância de tema para conferir a transparência.

## Vetorização

Conversão local com [VTracer 0.6.15](https://pypi.org/project/vtracer/0.6.15/), modo polygon, cores simplificadas e viewBox 420 × 420. Remove apenas branco quase neutro conectado à borda do canvas, preservando barba, cabelo e demais brancos internos. A conversão simplifica detalhes finos do raster para o uso na interface.

Script reproduzível: `scripts/vectorize_mascots.py`. Ambiente de ferramenta em `.tools/vectorize`, ignorado pelo Git. Execução: `.tools/vectorize/Scripts/python.exe scripts/vectorize_mascots.py`. Dependências: Pillow, NumPy, vtracer==0.6.15. Não há dependência de execução no navegador.

## Prompts das poses

Use case: identity-preserve. Asset type: isolated mascot illustration for MA PRIME TEC website triage. Input image is identity and pixel-art style reference ONLY, ignore the lettering. Preserve exactly this friendly older technician identity: swept silver gray hair, full white beard, rectangular black glasses, warm skin, royal blue short-sleeve polo, charcoal work trousers and dark shoes, same proportions and crisp detailed 16-bit pixel-art outlines and shading. Single full-body character centered, entire body and props visible, consistent scale occupying 85% of square canvas height. Background MUST be genuinely transparent alpha, not a drawn checkerboard, no white panel, no environment, no ground shadow. No lettering, no wordmark, no captions, no watermark. Pose: 

- equipamento: presenting an open laptop held at waist level with one hand, other hand open palm presenting it, friendly smile
- problema: thoughtful diagnostic pose, one hand at his beard/chin, other hand holding a small magnifying glass, curious reassuring expression
- detalhes: taking notes with a pen on a small clipboard held against his torso, attentive friendly expression
- nome: waving hello with one open hand, other hand resting comfortably at his side, warm welcoming smile
- resumo: giving a confident thumbs-up with one hand, holding a small clipboard with a single large green checkmark in the other hand, cheerful reassuring smile

Correção de fundo para equipamento, detalhes, nome e resumo: Replace ALL the gray and white checkerboard and any wrinkled texture with a perfectly uniform solid pure white #FFFFFF background, including between the legs and between arms and body. Preserve exactly the character, face, pixel-art style, pose, clothes, props, proportions, color and composition. No text, no new objects, no shadows.

## Prompts dos closes e ângulos

### duvida

Use case: identity-preserve. Create a new expression and camera view variant of the exact MA PRIME TEC mascot from reference. Reference is identity/style only; ignore its lettering. Same older friendly technician, swept silver gray hair, full white beard, rectangular black glasses, warm skin and royal blue polo. Preserve recognizable facial proportions, crisp detailed 16-bit pixel art, stepped dark outlines and pixel shading. Close-up head and shoulders, near frontal view tilted slightly, one eyebrow raised, lips gently pursed, curious puzzled expression, one hand touching chin. Friendly uncertainty, not sad or distressed. Single character only, centered on square canvas, generous 12% margin around silhouette, no cropped hair. Perfectly uniform solid pure white #FFFFFF background. NO checkerboard, NO transparency simulation, no texture, no lettering, no emojis, no question marks, no speech bubbles, no watermark, no gradient, no environment.

### alegre

Use case: identity-preserve. Create a new expression and camera view variant of the exact MA PRIME TEC mascot from reference. Reference is identity/style only; ignore its lettering. Same older friendly technician, swept silver gray hair, full white beard, rectangular black glasses, warm skin and royal blue polo. Preserve recognizable facial proportions, crisp detailed 16-bit pixel art, stepped dark outlines and pixel shading. Close-up head and shoulders, frontal view, genuinely joyful broad smile showing upper teeth, lifted cheeks and smiling eyes, enthusiastic welcoming expression. Single character only, centered on square canvas, generous 12% margin around silhouette, no cropped hair. Perfectly uniform solid pure white #FFFFFF background. NO checkerboard, NO transparency simulation, no texture, no lettering, no emojis, no question marks, no speech bubbles, no watermark, no gradient, no environment.

### atento

Use case: identity-preserve. Create a new expression and camera view variant of the exact MA PRIME TEC mascot from reference. Reference is identity/style only; ignore its lettering. Same older friendly technician, swept silver gray hair, full white beard, rectangular black glasses, warm skin and royal blue polo. Preserve recognizable facial proportions, crisp detailed 16-bit pixel art, stepped dark outlines and pixel shading. Close-up head and shoulders, three-quarter view turned slightly toward the viewer's left, attentive calm expression and subtle closed-mouth smile, eyebrows gently raised as if listening carefully. Single character only, centered on square canvas, generous 12% margin around silhouette, no cropped hair. Perfectly uniform solid pure white #FFFFFF background. NO checkerboard, NO transparency simulation, no texture, no lettering, no emojis, no question marks, no speech bubbles, no watermark, no gradient, no environment.

### perfil

Use case: identity-preserve. Create a new expression and camera view variant of the exact MA PRIME TEC mascot from reference. Reference is identity/style only; ignore its lettering. Same older friendly technician, swept silver gray hair, full white beard, rectangular black glasses, warm skin and royal blue polo. Preserve recognizable facial proportions, crisp detailed 16-bit pixel art, stepped dark outlines and pixel shading. Waist-up portrait in a distinct three-quarter side view facing toward viewer's right, looking down at an open laptop held at waist height, focused thoughtful expression, side angle clearly visible. Single character only, centered on square canvas, generous 12% margin around silhouette, no cropped hair. Perfectly uniform solid pure white #FFFFFF background. NO checkerboard, NO transparency simulation, no texture, no lettering, no emojis, no question marks, no speech bubbles, no watermark, no gradient, no environment.
