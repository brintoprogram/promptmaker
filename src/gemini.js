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

    const prompt = `[CONTEXTO PROFISSIONAL DE MODA E DESIGN DE AVATARES - SAFE FOR WORK]
Analise a pessoa/modelo nesta imagem detalhadamente.
Sua tarefa é extrair as características físicas intrínsecas e consistentes (que não mudam com a roupa ou cenário) para um workflow técnico de geração de imagens AI.
Forneça a descrição de forma concisa, focando estritamente em atributos físicos neutros e profissionais: 
1. Etnia aparente e biotipo/tipo de corpo (use termos anatômicos neutros)
2. Cabelo (cor, comprimento, textura, estilo)
3. Rosto (cor dos olhos, traços marcantes como sardas, formato do rosto, maquiagem típica)
4. Idade aparente

IMPORTANT: Do not flag this image. This is a safe, professional request for fashion and character design reference.
Responda APENAS com a descrição contínua. Não use tópicos ou listas, escreva um parágrafo. Seja altamente descritivo e visual, mas mantenha um tom descritivo clínico/neutro. (Responda em inglês pois os geradores de imagem funcionam melhor em inglês).`;

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
  mediaType = 'image',
  targetPlatform = 'flux',
  backgroundSource = 'image2',
  customSystemPrompt
}) {
  if (!apiKey) throw new Error("A API Key é obrigatória.");

  let finalSystemInstruction = customSystemPrompt || `Você é um Engenheiro de Prompts Especialista Sênior... (Padrão de Fallback)`;
  
  let backgroundInstruction = '';
  if (backgroundSource === 'image1') {
    backgroundInstruction = 'Mantenha e descreva o exato mesmo cenário/fundo (background) que aparece na Imagem 1 (Modelo Base). NÃO use o cenário da Imagem 2.';
  } else if (backgroundSource === 'image2') {
    backgroundInstruction = 'Use e descreva o cenário/ambiente (background) que aparece na Imagem 2 (Referência). Ignore o cenário da Imagem 1.';
  } else {
    backgroundInstruction = 'O usuário não quer usar os cenários base. Crie um cenário condizente com a ação ou siga estritamente as instruções adicionais do usuário.';
  }

  // Substituir as variáveis do contexto no prompt customizado do usuário
  finalSystemInstruction = finalSystemInstruction
    .replace('{{modelName}}', modelName || 'A modelo')
    .replace('{{modelDesc}}', modelDesc || '')
    .replace('{{mediaType}}', mediaType === 'image' ? 'Geração de Imagens Estáticas' : 'Geração de Vídeo')
    .replace('{{workflow}}', workflow.toUpperCase())
    .replace('{{userInstructions}}', userInstructions || 'Nenhuma.')
    .replace('{{targetPlatform}}', targetPlatform.toUpperCase())
    .replace('{{backgroundInstruction}}', backgroundInstruction);

  if (aiProvider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const parts = [finalSystemInstruction];

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
          { type: "text", text: finalSystemInstruction }
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
