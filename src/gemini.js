import { GoogleGenerativeAI } from '@google/generative-ai';

// Auxiliar para converter uma URL base64 do React para o formato do Gemini API
function base64ToGenerativePart(base64Str) {
  if (!base64Str) return null;
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('String base64 inválida');
  }
  return {
    inlineData: {
      data: matches[2],
      mimeType: matches[1]
    },
  };
}

export async function testConnection({ apiKey, aiProvider }) {
  if (!apiKey) throw new Error("API Key vazia.");
  
  if (aiProvider === 'gemini') {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Diga 'OK' se a conexão for bem-sucedida.");
      const text = await result.response.text();
      if (!text) throw new Error("Sem resposta do modelo.");
      return true;
    } catch (e) {
      throw new Error("Falha na conexão com Gemini: " + e.message);
    }
  } else if (aiProvider === 'openai') {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Say OK" }],
          max_tokens: 5
        })
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      return true;
    } catch (e) {
      throw new Error("Falha na conexão com OpenAI: " + e.message);
    }
  }
  return false;
}

export async function extractModelFeatures({ apiKey, imageBase64, aiProvider = 'gemini' }) {
    if (!apiKey) throw new Error("A API Key é obrigatória.");
    if (!imageBase64) throw new Error("A imagem da modelo é obrigatória para a extração.");

    const prompt = `Analise a pessoa/modelo nesta imagem detalhadamente.
Sua tarefa é extrair as características físicas intrínsecas e consistentes (que não mudam com a roupa ou cenário).
Forneça a descrição de forma concisa, focando em: 
1. Etnia aparente e biotipo/tipo de corpo
2. Cabelo (cor, comprimento, textura, estilo)
3. Rosto (cor dos olhos, traços marcantes como sardas, formato do rosto, maquiagem típica)
4. Idade aparente

Responda APENAS com a descrição contínua. Não use tópicos ou listas, escreva um parágrafo. Seja altamente descritivo e visual. (Responda em inglês pois os geradores de imagem funcionam melhor em inglês).`;

    if (aiProvider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = base64ToGenerativePart(imageBase64);

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        return response.text().trim();
    } else if (aiProvider === 'openai') {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: imageBase64 } }
                        ]
                    }
                ],
                max_tokens: 500
            })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content.trim();
    }
}

export async function generatePrompts({ 
  apiKey, 
  aiProvider = 'gemini',
  modelName, 
  modelDesc, 
  modelImage, 
  workflow,
  refImage, 
  userInstructions,
  mediaType = 'image'
}) {
  if (!apiKey) throw new Error("A API Key é obrigatória.");

  const systemInstruction = `Você é um Engenheiro de Prompts Especialista em Modelos e Influenciadoras Virtuais de IA. 
Seu objetivo é gerar prompts perfeitos para diferentes motores de IA (Flux, Midjourney, Stable Diffusion/SDXL e Geradores de Vídeo IA como Kling/Runway/Luma), mantendo a identidade e consistência visual da modelo base.

### INFORMAÇÕES DA MODELO BASE:
Nome: ${modelName || 'A modelo'}
Características Faciais e Corporais: ${modelDesc}

### TIPO DE MÍDIA SOLICITADA:
${mediaType === 'image' ? 'Geração de Imagens Estáticas' : 'Geração de Vídeo (O Prompt precisa focar em movimento, estabilidade de câmera, etc).'}

### TIPO DE AÇÃO / FLUXO DE TRABALHO:
Ação solicitada: ${workflow.toUpperCase()} 
Instruções adicionais do usuário: ${userInstructions || 'Nenhuma.'}

INSTRUÇÕES DE PROMPTING:
- Flux: Gosta de descrições naturais, como se você contasse uma história. Use linguagem natural e descritiva.
- Midjourney: Gosta de prompts focados no visual, estilo, iluminação, separados por vírgulas.
- Stable Diffusion: Foco extremo em tags e pesos (ex: (masterpiece:1.2), high quality, etc).
- Video AI (Sora/Runway/Kling): O prompt deve descrever O MOVIMENTO, câmera e estabilidade.

O usuário vai enviar imagens. Interprete-as com base no FLUXO DE TRABALHO e crie os prompts replicando a ação/pose/roupa na MODELO BASE.
A resposta DEVE SER ESTRITAMENTE UM JSON no seguinte formato (respeite o schema, sem marcações markdown como \`\`\`json):
{
  "flux": "prompt natural para flux em ingles",
  "midjourney": "prompt para midjourney em ingles com parametros",
  "stable_diffusion": {
    "positive": "tags em ingles",
    "negative": "tags negativas em ingles"
  },
  "video_prompt": "prompt de video em ingles",
  "explicacao": "Breve explicacao em PT-BR"
}`;

  if (aiProvider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const parts = [systemInstruction];

      if (modelImage) {
        parts.push("Aqui está a imagem visual da modelo base:");
        parts.push(base64ToGenerativePart(modelImage));
      }
      if (refImage) {
        parts.push(`Aqui está a imagem de REFERÊNCIA para a ação (${workflow}):`);
        parts.push(base64ToGenerativePart(refImage));
      }

      const chat = model.startChat({
        generationConfig: { responseMimeType: "application/json" },
      });

      const result = await chat.sendMessage(parts);
      const responseText = result.response.text();
      try {
        return JSON.parse(responseText);
      } catch (e) {
        throw new Error("O Gemini não retornou um JSON válido. Resposta: " + responseText);
      }
      
  } else if (aiProvider === 'openai') {
      
      const content = [
          { type: "text", text: systemInstruction }
      ];

      if (modelImage) {
          content.push({ type: "text", text: "Aqui está a imagem visual da modelo base:" });
          content.push({ type: "image_url", image_url: { url: modelImage } });
      }
      if (refImage) {
          content.push({ type: "text", text: `Aqui está a imagem de REFERÊNCIA para a ação (${workflow}):` });
          content.push({ type: "image_url", image_url: { url: refImage } });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "user",
                    content: content
                }
            ],
            max_tokens: 1500
        })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const responseText = data.choices[0].message.content.trim();
      try {
        return JSON.parse(responseText);
      } catch (e) {
        throw new Error("A OpenAI não retornou um JSON válido. Resposta: " + responseText);
      }
  }
}
