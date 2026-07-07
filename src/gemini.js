import { GoogleGenerativeAI } from '@google/generative-ai';

// Auxiliar para converter uma URL base64 do React (FileReader) para o formato do Gemini API
function base64ToGenerativePart(base64Str) {
  if (!base64Str) return null;
  
  // Extrair o tipo MIME e os dados base64 brutos
  // Formato típico: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (matches.length !== 3) {
    throw new Error('String base64 inválida');
  }

  return {
    inlineData: {
      data: matches[2],
      mimeType: matches[1]
    },
  };
}

export async function extractModelFeatures({ apiKey, imageBase64, aiProvider = 'gemini' }) {
    if (!apiKey) throw new Error("A API Key é obrigatória.");
    if (!imageBase64) throw new Error("A imagem da modelo é obrigatória para a extração.");

    if (aiProvider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Usar um modelo pro com capacidade multimodal
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePart = base64ToGenerativePart(imageBase64);

        const prompt = `Analise a pessoa/modelo nesta imagem detalhadamente.
Sua tarefa é extrair as características físicas intrínsecas e consistentes (que não mudam com a roupa ou cenário).
Forneça a descrição de forma concisa, focando em: 
1. Etnia aparente e biotipo/tipo de corpo
2. Cabelo (cor, comprimento, textura, estilo)
3. Rosto (cor dos olhos, traços marcantes como sardas, formato do rosto, maquiagem típica)
4. Idade aparente

Responda APENAS com a descrição contínua. Não use tópicos ou listas, escreva um parágrafo. Seja altamente descritivo e visual. (Responda em inglês pois os geradores de imagem funcionam melhor em inglês).`;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        return response.text().trim();
    } else if (aiProvider === 'openai') {
        // Implementação futura ou mock
        throw new Error("Suporte para OpenAI será implementado em breve. Por favor, use Gemini por enquanto.");
    }
}

export async function generatePrompts({ 
  apiKey, 
  aiProvider = 'gemini',
  modelName, 
  modelDesc, 
  modelImage, 
  workflow, // 'pose' | 'clothing' | 'background' | 'style'
  refImage, 
  userInstructions,
  mediaType = 'image' // 'image' | 'video'
}) {
  if (!apiKey) throw new Error("A API Key é obrigatória.");

  if (aiProvider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const parts = [];
      
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
- Flux: Gosta de descrições naturais, como se você contasse uma história. Use linguagem natural e desccriptive. Adicione detalhes técnicos de fotografia se for imagem.
- Midjourney: Gosta de prompts focados no visual, estilo, iluminação, separados por vírgulas. Termine com parâmetros como --ar 9:16 --v 6.0 se for o caso.
- Stable Diffusion: Foco extremo em tags e pesos (ex: (masterpiece:1.2), high quality, etc).
- Video AI (Sora/Runway/Kling): O prompt deve descrever claramente O MOVIMENTO, o estado inicial e final, a direção da câmera e estabilidade, mantendo o ambiente estático se for o caso.

O usuário vai enviar imagens. Interprete-as com base no FLUXO DE TRABALHO e crie os prompts para replicar isso, MAS aplicando na MODELO BASE.
A resposta DEVE SER ESTRITAMENTE UM JSON no seguinte formato (respeite o schema):
{
  "flux": "prompt natural para flux em ingles",
  "midjourney": "prompt para midjourney em ingles com parametros",
  "stable_diffusion": {
    "positive": "tags em ingles",
    "negative": "tags negativas em ingles"
  },
  "video_prompt": "prompt de video para kling/runway em ingles",
  "explicacao": "Uma breve explicação em PT-BR de como usar os prompts e o que foi considerado."
}`;

      parts.push(systemInstruction);

      if (modelImage) {
        parts.push("Aqui está a imagem visual da modelo base (para você entender exatamente o rosto e estilo):");
        parts.push(base64ToGenerativePart(modelImage));
      }

      if (refImage) {
        parts.push(`Aqui está a imagem de REFERÊNCIA para a ação (${workflow}):`);
        parts.push(base64ToGenerativePart(refImage));
      }

      const chat = model.startChat({
        generationConfig: {
            responseMimeType: "application/json",
        },
      });

      const result = await chat.sendMessage(parts);
      const responseText = result.response.text();
      
      try {
        return JSON.parse(responseText);
      } catch (e) {
        throw new Error("O Gemini não retornou um JSON válido. Resposta: " + responseText);
      }
  } else {
      throw new Error("Suporte para OpenAI será implementado em breve. Por favor, use Gemini por enquanto.");
  }
}
