# AI Prompt Studio

Um aplicativo web moderno construído com **React**, **Vite** e **CSS Premium (Glassmorphism + Dark Mode)** que ajuda criadores de modelos virtuais de IA a gerar prompts altamente consistentes e profissionais para **FLUX, Midjourney e Stable Diffusion**.

Com o AI Prompt Studio, você não precisa ficar quebrando a cabeça tentando descrever poses complexas, roupas ou cenários. O sistema analisa suas fotos de referência usando a inteligência multimodal do **Gemini** e gera prompts estruturados e otimizados prontos para copiar.

---

## Recursos Principais

*   **Identidade Consistente:** Defina o nome e as características físicas da sua modelo de IA e anexe uma foto base dela para que a IA sempre lembre dos traços faciais e físicos.
*   **Copiar Pose (Pose Transfer):** Suba uma foto de pose e descreva a ação. O Gemini gera prompts que preservam o rosto da sua modelo mas a colocam na pose exata.
*   **Trocar Roupa (Try-On):** Suba a foto de uma roupa que achou na internet e o sistema gera prompts detalhados descrevendo o estilo, tecido e caimento para aplicar à sua modelo.
*   **Mudar Cenário:** Mude o plano de fundo da sua modelo descrevendo um cenário ou adicionando uma referência visual.
*   **Copiar Estilo:** Capture a estética, cores e iluminação de uma imagem de referência.
*   **Formatos para múltiplos motores:** Prompts separados para **FLUX** (linguagem natural descritiva), **Midjourney** (incluindo parâmetros de consistência `--cref`, `--cw` e `--sref`) e **Stable Diffusion** (tags positivas + negativas).
*   **Histórico de Prompts:** Um histórico de criações local que salva suas gerações recentes no navegador para fácil consulta.
*   **Privacidade e Custo Zero de Servidor:** Toda a lógica roda localmente no seu computador e a chave de API do Gemini fica salva de forma segura apenas no seu navegador (`localStorage`).

---

## Como Rodar o Projeto

1.  Certifique-se de ter o **Node.js** instalado na sua máquina.
2.  Abra o terminal na pasta do projeto:
    ```bash
    cd C:\Users\whybr\.gemini\antigravity\scratch\ai-prompt-studio
    ```
3.  Instale as dependências (já feito pelo assistente):
    ```bash
    npm install
    ```
4.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
5.  O site abrirá automaticamente no seu navegador no endereço `http://localhost:3000`.

---

## Configuração da Chave de API

Para usar a geração automática, você precisará de uma **Gemini API Key**. 
Você pode obter uma chave de forma gratuita e rápida em menos de 1 minuto acessando:
[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

Insira a chave no campo **Configuração de API** localizado na barra lateral do painel. A chave será guardada apenas no seu navegador e não é enviada para nenhum servidor externo além do próprio endpoint oficial da Google.
