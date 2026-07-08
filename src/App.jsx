import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  Shirt, 
  Map, 
  Palette, 
  Copy, 
  Check, 
  Settings, 
  History, 
  Trash2, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Video,
  Wand2,
  Image,
  Layers,
  Cpu,
  Wifi,
  RefreshCw
} from 'lucide-react';
import { generatePrompts, extractModelFeatures, testConnection } from './gemini';

const DEFAULT_SYSTEM_PROMPT = `Você é um Engenheiro de Prompts Especialista Sênior, focado em criar Modelos e Influenciadoras Virtuais de IA ultra realistas.
O usuário irá enviar duas imagens em anexo (Imagem 1 = Modelo Base, Imagem 2 = Referência de Ação/Roupa/Pose).

REGRA CRÍTICA:
NUNCA descreva excessivamente as características físicas do rosto e do corpo da modelo no prompt final, pois a Imagem 1 já fornece a aparência exata. Apenas cite detalhes mínimos se for estritamente necessário para reforçar.
O prompt DEVE EXPLICITAMENTE dizer à IA para usar as imagens anexadas. Exemplo: "A photorealistic image of the EXACT woman from attached image 1. She is wearing the exact outfit from attached image 2."

CENÁRIO (IMPORTANTE):
{{backgroundInstruction}}

PLATAFORMA ALVO: {{targetPlatform}}
Baseie a estrutura do seu prompt EXCLUSIVAMENTE nas melhores práticas da plataforma alvo acima. Crie prompts abertos e flexíveis (não restrinja muito o gerador de IA). Mantenha as coisas com foco em UGC. (Ex: Midjourney usa vírgulas e parâmetros, Flux usa linguagem natural narrativa, Stable Diffusion usa tags rigorosas, Nano Banana usa foco em transição).

A resposta DEVE SER UM JSON ESTRITO no seguinte formato:
{
  "prompt": "Seu prompt ultra detalhado otimizado para a plataforma alvo em ingles",
  "explicacao": "Breve explicacao/dica de uso em PT-BR"
}`;

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState('studio'); // 'studio' | 'settings'
  
  // Settings & API Keys
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [openAiApiKey, setOpenAiApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('ai_provider') || 'gemini'); // 'gemini' | 'openai'
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState({ gemini: null, openai: null });
  const [testError, setTestError] = useState({ gemini: null, openai: null });
  const [customSystemPrompt, setCustomSystemPrompt] = useState(() => localStorage.getItem('custom_system_prompt') || DEFAULT_SYSTEM_PROMPT);
  
  // Base Model
  const [modelName, setModelName] = useState(() => localStorage.getItem('model_name') || 'Sophia');
  const [modelDesc, setModelDesc] = useState(() => localStorage.getItem('model_desc') || '');
  const [modelImage, setModelImage] = useState(() => localStorage.getItem('model_image') || null);

  // Workflow and Options
  const [mediaType, setMediaType] = useState('image');
  const [workflow, setWorkflow] = useState('pose'); 
  const [targetPlatform, setTargetPlatform] = useState('nano_banana'); // 'flux' | 'midjourney' | 'stable_diffusion' | 'nano_banana'
  const [refImage, setRefImage] = useState(null);
  const [backgroundSource, setBackgroundSource] = useState('image2'); // 'image1' | 'image2' | 'none'
  const [userInstructions, setUserInstructions] = useState('');

  // Execution States
  const [loading, setLoading] = useState(false);
  const [extractingFeatures, setExtractingFeatures] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  // Right Panel Tabs
  const [rightTab, setRightTab] = useState('results');
  const [copiedField, setCopiedField] = useState(null);

  // History
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('prompt_studio_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist Local Storage
  useEffect(() => { localStorage.setItem('model_name', modelName); }, [modelName]);
  useEffect(() => { localStorage.setItem('model_desc', modelDesc); }, [modelDesc]);
  useEffect(() => { 
    if (modelImage) {
      try {
        localStorage.setItem('model_image', modelImage);
      } catch (e) {
        console.warn("A imagem é grande demais para ser salva no cache do navegador.");
      }
    } else {
      localStorage.removeItem('model_image');
    }
  }, [modelImage]);
  useEffect(() => { localStorage.setItem('gemini_api_key', geminiApiKey); }, [geminiApiKey]);
  useEffect(() => { localStorage.setItem('openai_api_key', openAiApiKey); }, [openAiApiKey]);
  useEffect(() => { localStorage.setItem('ai_provider', aiProvider); }, [aiProvider]);
  useEffect(() => { localStorage.setItem('custom_system_prompt', customSystemPrompt); }, [customSystemPrompt]);
  useEffect(() => { localStorage.setItem('prompt_studio_history', JSON.stringify(history)); }, [history]);

  useEffect(() => {
    if (mediaType === 'video' && (workflow === 'clothing')) setWorkflow('action'); 
  }, [mediaType]);

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("A imagem é muito grande. Escolha uma menor que 15MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const handleTestConnection = async (provider) => {
    const key = provider === 'gemini' ? geminiApiKey : openAiApiKey;
    if (!key) {
      setTestError({ ...testError, [provider]: "Insira a chave primeiro." });
      return;
    }
    setTestStatus({ ...testStatus, [provider]: 'loading' });
    setTestError({ ...testError, [provider]: null });
    
    try {
      await testConnection({ apiKey: key, aiProvider: provider });
      setTestStatus({ ...testStatus, [provider]: 'success' });
      setTimeout(() => setTestStatus((prev) => ({ ...prev, [provider]: null })), 3000);
    } catch (e) {
      setTestStatus({ ...testStatus, [provider]: 'error' });
      setTestError({ ...testError, [provider]: e.message });
    }
  };

  const handleExtractFeatures = async () => {
    if (!modelImage) {
      setError("Por favor, faça upload da foto da modelo primeiro.");
      return;
    }
    const activeKey = aiProvider === 'gemini' ? geminiApiKey : openAiApiKey;
    if (!activeKey) {
      setError(`Sua API Key da ${aiProvider.toUpperCase()} não está configurada! Vá em Configurações Globais.`);
      return;
    }

    setExtractingFeatures(true);
    setError(null);
    try {
      const extractedDesc = await extractModelFeatures({
        apiKey: activeKey,
        imageBase64: modelImage,
        aiProvider
      });
      setModelDesc(extractedDesc);
    } catch (err) {
      setError(err.message || "Erro ao extrair características.");
    } finally {
      setExtractingFeatures(false);
    }
  };

  const handleGenerate = async () => {
    const activeKey = aiProvider === 'gemini' ? geminiApiKey : openAiApiKey;
    if (!activeKey) {
      setError(`Sua API Key da ${aiProvider.toUpperCase()} não está configurada! Vá em Configurações Globais.`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setResults(null);
    setRightTab('results');

    try {
      const output = await generatePrompts({
        apiKey: activeKey,
        aiProvider,
        modelName,
        modelDesc,
        modelImage,
        workflow,
        refImage,
        userInstructions,
        mediaType,
        targetPlatform,
        backgroundSource,
        customSystemPrompt
      });

      setResults(output);

      const historyItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('pt-BR'),
        modelName,
        modelDesc,
        workflow,
        mediaType,
        targetPlatform,
        backgroundSource,
        userInstructions,
        results: output
      };

      setHistory([historyItem, ...history.slice(0, 19)]);
    } catch (err) {
      setError(err.message || "Ocorreu um erro desconhecido na geração.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loadHistoryItem = (item) => {
    setModelName(item.modelName);
    setModelDesc(item.modelDesc);
    setWorkflow(item.workflow);
    setMediaType(item.mediaType || 'image');
    setTargetPlatform(item.targetPlatform || 'nano_banana');
    setBackgroundSource(item.backgroundSource || 'image2');
    setUserInstructions(item.userInstructions || '');
    setResults(item.results);
    setRightTab('results');
    setError(null);
  };

  const clearHistory = () => {
    if (window.confirm("Deseja realmente limpar todo o histórico de gerações?")) setHistory([]);
  };

  const getWorkflowInfo = () => {
    if (mediaType === 'video') {
       switch (workflow) {
        case 'action': return { title: "Gerar Ação/Movimento", imageLabel: "Referência Inicial", descPlaceholder: "Descreva o movimento..." };
        case 'background': return { title: "Cenário e Câmera", imageLabel: "Referência de Cenário", descPlaceholder: "Descreva a movimentação da câmera e do ambiente..." };
        default: return { title: "Animação Geral", imageLabel: "Referência Inicial", descPlaceholder: "Descreva a cena..." };
       }
    } else {
      switch (workflow) {
        case 'pose': return { title: "Copiar Pose", imageLabel: "Foto de Referência da Pose", descPlaceholder: "Descreva a pose ou atitude dela..." };
        case 'clothing': return { title: "Trocar Roupa (Try-On)", imageLabel: "Foto de Referência da Roupa", descPlaceholder: "Descreva a roupa e detalhes do tecido..." };
        case 'background': return { title: "Mudar Cenário", imageLabel: "Foto de Referência do Cenário", descPlaceholder: "Descreva o novo cenário e iluminação..." };
        case 'style': return { title: "Copiar Estilo", imageLabel: "Foto de Referência de Estilo / Cores", descPlaceholder: "Descreva a atmosfera ou estilo desejado..." };
        default: return { title: "Assistente", imageLabel: "Imagem de Referência", descPlaceholder: "Descreva o que deseja fazer..." };
      }
    }
  };

  const workflowInfo = getWorkflowInfo();
  const providerLabel = aiProvider === 'gemini' ? 'Gemini 1.5' : 'GPT-4o';

  return (
    <div className="app-container">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <header className="app-header">
        <div className="logo-container">
          <svg className="logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <h1>AI Prompt Studio</h1>
        </div>
        
        <nav className="top-nav">
          <button className={`nav-btn ${currentTab === 'studio' ? 'active' : ''}`} onClick={() => setCurrentTab('studio')}>
            <Layers size={18} /> Studio Workspace
          </button>
          <button className={`nav-btn ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => setCurrentTab('settings')}>
            <Settings size={18} /> Configurações Globais
          </button>
        </nav>
      </header>

      {currentTab === 'settings' && (
        <div className="settings-page">
          <div className="glass settings-card">
            <div className="section-title">
              <Cpu size={20} />
              <h2>Configurações do Provedor de IA (LLM)</h2>
            </div>
            
            <p className="settings-desc">
              Escolha qual motor de Inteligência Artificial você deseja usar para ler as imagens de referência 
              e gerar seus prompts. (O modelo selecionado será usado no botão "Extrair com IA" e "Gerar Prompts").
            </p>

            <div className="provider-selector">
              <div 
                className={`provider-card ${aiProvider === 'gemini' ? 'active' : ''}`}
                onClick={() => setAiProvider('gemini')}
              >
                <h3>Google Gemini</h3>
                <p>Excelente para contexto longo. Gratuito com a API Key do Google AI Studio.</p>
              </div>
              <div 
                className={`provider-card ${aiProvider === 'openai' ? 'active' : ''}`}
                onClick={() => setAiProvider('openai')}
              >
                <h3>OpenAI (GPT-4o)</h3>
                <p>Melhor compreensão visual do mercado e aderência aos prompts gerados.</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Google Gemini API Key</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showApiKey ? "text" : "password"} 
                  className="form-input" 
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="AIzaSy..." 
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
                <button type="button" className="eye-btn" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="api-key-link">Obter chave do Gemini ↗</a>
                <button className="btn-extract" onClick={() => handleTestConnection('gemini')} disabled={testStatus.gemini === 'loading'}>
                  {testStatus.gemini === 'loading' ? <RefreshCw size={14} className="spin" /> : <Wifi size={14} />} Salvar e Testar
                </button>
              </div>
              {testStatus.gemini === 'success' && <p style={{color: '#10b981', fontSize: '0.8rem', marginTop: '0.5rem'}}>Conexão bem-sucedida!</p>}
              {testError.gemini && <p style={{color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem'}}>{testError.gemini}</p>}
            </div>

            <div className="form-group" style={{marginTop: '2rem'}}>
              <label className="form-label">OpenAI API Key (GPT-4o)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showApiKey ? "text" : "password"} 
                  className="form-input" 
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="sk-proj-..." 
                  value={openAiApiKey}
                  onChange={(e) => setOpenAiApiKey(e.target.value)}
                />
                <button type="button" className="eye-btn" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="api-key-link">Obter chave da OpenAI ↗</a>
                <button className="btn-extract" onClick={() => handleTestConnection('openai')} disabled={testStatus.openai === 'loading'}>
                  {testStatus.openai === 'loading' ? <RefreshCw size={14} className="spin" /> : <Wifi size={14} />} Salvar e Testar
                </button>
              </div>
              {testStatus.openai === 'success' && <p style={{color: '#10b981', fontSize: '0.8rem', marginTop: '0.5rem'}}>Conexão bem-sucedida!</p>}
              {testError.openai && <p style={{color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem'}}>{testError.openai}</p>}
            </div>

            <div className="form-group" style={{marginTop: '2rem'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Calibragem da Inteligência Artificial (System Prompt)</label>
                <button className="btn-extract" onClick={() => setCustomSystemPrompt(DEFAULT_SYSTEM_PROMPT)}>Restaurar Padrão</button>
              </div>
              <p style={{fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem', lineHeight: '1.4'}}>
                Modifique as instruções abaixo para alterar como a IA pensa e reage às suas imagens. 
                Isso dita as regras globais de formatação e o peso que a IA dá para as aparências.
              </p>
              <textarea 
                className="form-input form-textarea" 
                style={{ minHeight: '200px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                value={customSystemPrompt} 
                onChange={(e) => setCustomSystemPrompt(e.target.value)} 
              />
            </div>

          </div>
        </div>
      )}

      {currentTab === 'studio' && (
        <div className="main-content split-view">
          {/* PAINEL ESQUERDO: INPUTS */}
          <div className="left-panel">
            <div className="glass studio-card">
              
              <div className="section-title">
                <Sparkles size={20} />
                <h2>Passo 1: Sua Modelo Base</h2>
              </div>

              <div className="form-group">
                <label className="form-label">Nome da Modelo</label>
                <input type="text" className="form-input" placeholder="Ex: Sophia, Isabella" value={modelName} onChange={(e) => setModelName(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Foto Base da Sua Modelo</label>
                <div className={`upload-box ${modelImage ? 'has-image' : ''}`}>
                  {modelImage ? (
                    <div className="preview-container">
                      <img src={modelImage} alt="Modelo base" className="preview-img" />
                      <button className="remove-btn" onClick={() => setModelImage(null)}>×</button>
                    </div>
                  ) : (
                    <>
                      <Upload className="upload-icon" size={32} />
                      <p className="upload-text">Arraste ou <span>clique para subir</span></p>
                      <input type="file" accept="image/*" style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} onChange={(e) => handleImageUpload(e, setModelImage)} />
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Características Visuais (Prompt Base)</label>
                  <button className="btn-extract" disabled={extractingFeatures || !modelImage} onClick={handleExtractFeatures}>
                    {extractingFeatures ? <RefreshCw size={14} className="spin" /> : <Wand2 size={14} />}
                    Extrair ({providerLabel})
                  </button>
                </div>
                <textarea className="form-input form-textarea" placeholder="Descreva as características da modelo ou use a varredura com IA acima." value={modelDesc} onChange={(e) => setModelDesc(e.target.value)} />
              </div>

              <hr className="divider" />

              <div className="section-title">
                <Sparkles size={20} />
                <h2>Passo 2: Tipo e Ação</h2>
              </div>

              <div className="media-selector">
                <button className={`media-btn ${mediaType === 'image' ? 'active' : ''}`} onClick={() => { setMediaType('image'); setWorkflow('pose'); }}>
                  <Image size={18} /><span>Imagens</span>
                </button>
                <button className={`media-btn ${mediaType === 'video' ? 'active' : ''}`} onClick={() => { setMediaType('video'); setWorkflow('action'); }}>
                  <Video size={18} /><span>Vídeos AI</span>
                </button>
              </div>

              <div className="workflow-selector">
                {mediaType === 'image' ? (
                  <>
                    <div className={`workflow-card ${workflow === 'pose' ? 'active' : ''}`} onClick={() => setWorkflow('pose')}>
                      <ImageIcon className="workflow-icon" size={22} /><h3>Copiar Pose</h3>
                    </div>
                    <div className={`workflow-card ${workflow === 'clothing' ? 'active' : ''}`} onClick={() => setWorkflow('clothing')}>
                      <Shirt className="workflow-icon" size={22} /><h3>Trocar Roupa</h3>
                    </div>
                    <div className={`workflow-card ${workflow === 'background' ? 'active' : ''}`} onClick={() => setWorkflow('background')}>
                      <Map className="workflow-icon" size={22} /><h3>Mudar Cenário</h3>
                    </div>
                    <div className={`workflow-card ${workflow === 'style' ? 'active' : ''}`} onClick={() => setWorkflow('style')}>
                      <Palette className="workflow-icon" size={22} /><h3>Copiar Estilo</h3>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`workflow-card ${workflow === 'action' ? 'active' : ''}`} onClick={() => setWorkflow('action')}>
                      <ImageIcon className="workflow-icon" size={22} /><h3>Gerar Ação</h3>
                    </div>
                    <div className={`workflow-card ${workflow === 'background' ? 'active' : ''}`} onClick={() => setWorkflow('background')}>
                      <Map className="workflow-icon" size={22} /><h3>Mover Câmera</h3>
                    </div>
                  </>
                )}
              </div>

              {mediaType === 'image' && (
                <>
                  <div className="form-group" style={{marginTop: '1.5rem'}}>
                    <label className="form-label">Qual IA você vai usar para gerar a imagem?</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className={`tab-btn ${targetPlatform === 'nano_banana' ? 'active' : ''}`} onClick={() => setTargetPlatform('nano_banana')}>Nano Banana</button>
                      <button className={`tab-btn ${targetPlatform === 'flux' ? 'active' : ''}`} onClick={() => setTargetPlatform('flux')}>Flux</button>
                      <button className={`tab-btn ${targetPlatform === 'midjourney' ? 'active' : ''}`} onClick={() => setTargetPlatform('midjourney')}>Midjourney</button>
                      <button className={`tab-btn ${targetPlatform === 'stable_diffusion' ? 'active' : ''}`} onClick={() => setTargetPlatform('stable_diffusion')}>Stable Diffusion</button>
                    </div>
                  </div>
                </>
              )}

              <hr className="divider" />

              <div className="section-title">
                <Sparkles size={20} />
                <h2>Passo 3: Referências ({workflowInfo.title})</h2>
              </div>

              <div className="form-group">
                <label className="form-label">{workflowInfo.imageLabel}</label>
                <div className={`upload-box ${refImage ? 'has-image' : ''}`}>
                  {refImage ? (
                    <div className="preview-container">
                      <img src={refImage} alt="Referência" className="preview-img" />
                      <button className="remove-btn" onClick={() => setRefImage(null)}>×</button>
                    </div>
                  ) : (
                    <>
                      <Upload className="upload-icon" size={32} />
                      <p className="upload-text">Arraste ou <span>clique para subir</span> referência</p>
                      <input type="file" accept="image/*" style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} onChange={(e) => handleImageUpload(e, setRefImage)} />
                    </>
                  )}
                </div>
              </div>

              <div className="form-group" style={{marginTop: '1.5rem'}}>
                <label className="form-label">De onde a IA deve copiar o cenário?</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className={`tab-btn ${backgroundSource === 'image2' ? 'active' : ''}`} onClick={() => setBackgroundSource('image2')}>Da Imagem de Referência (Img 2)</button>
                  <button className={`tab-btn ${backgroundSource === 'image1' ? 'active' : ''}`} onClick={() => setBackgroundSource('image1')}>Da Imagem da Modelo (Img 1)</button>
                  <button className={`tab-btn ${backgroundSource === 'none' ? 'active' : ''}`} onClick={() => setBackgroundSource('none')}>Ignorar os cenários / Vou descrever</button>
                </div>
              </div>

              <div className="form-group" style={{marginTop: '1.5rem'}}>
                <label className="form-label">Instruções Adicionais</label>
                <textarea className="form-input form-textarea" placeholder={workflowInfo.descPlaceholder} value={userInstructions} onChange={(e) => setUserInstructions(e.target.value)} />
              </div>

              {error && (
                <div className="error-box">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <button className="btn-generate" disabled={loading || !modelDesc} onClick={handleGenerate}>
                {loading ? (
                  <>
                    <RefreshCw size={20} className="spin" />
                    <span>Analisando e gerando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Gerar Prompts Otimizados ({providerLabel})</span>
                  </>
                )}
              </button>

            </div>
          </div>

          {/* PAINEL DIREITO: OUTPUTS & HISTORY */}
          <div className="right-panel">
            <div className="glass outputs-card">
              <div className="right-panel-nav">
                <button className={`panel-tab ${rightTab === 'results' ? 'active' : ''}`} onClick={() => setRightTab('results')}>
                  <Sparkles size={16} /> Resultados Atuais
                </button>
                <button className={`panel-tab ${rightTab === 'history' ? 'active' : ''}`} onClick={() => setRightTab('history')}>
                  <History size={16} /> Histórico
                </button>
              </div>

              <div className="right-panel-content">
                {rightTab === 'results' && (
                  <>
                    {!results ? (
                      <div className="empty-state">
                        <Wand2 size={48} className="empty-icon" />
                        <h3>Nenhum prompt gerado ainda</h3>
                        <p>Preencha os passos ao lado e clique em Gerar Prompts.</p>
                      </div>
                    ) : (
                      <div className="results-container fade-in">
                        <div className="prompt-box-container">
                          <div className="prompt-text">
                            {results.prompt}
                          </div>
                          <button className={`copy-badge ${copiedField === 'prompt' ? 'copied' : ''}`} onClick={() => handleCopy(results.prompt, 'prompt')}>
                            {copiedField === 'prompt' ? <Check size={14} /> : <Copy size={14} />} <span>{copiedField === 'prompt' ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>

                        {results.explicacao && (
                          <div className="explanation-section">
                            <h4>Dicas de Uso:</h4>
                            <p>{results.explicacao}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {rightTab === 'history' && (
                  <div className="history-view fade-in">
                    <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem'}}>
                      {history.length > 0 && (
                        <button className="btn-text-danger" onClick={clearHistory}>
                          <Trash2 size={14} /> Limpar
                        </button>
                      )}
                    </div>
                    <div className="history-list">
                      {history.length === 0 ? (
                        <div className="empty-state">
                          <History size={48} className="empty-icon" />
                          <p>Nenhum prompt no histórico.</p>
                        </div>
                      ) : (
                        history.map((item) => (
                          <div key={item.id} className="history-item" onClick={() => loadHistoryItem(item)}>
                            <div className="history-item-header">
                              <span className="history-workflow-badge">{item.mediaType === 'video' ? 'VIDEO' : item.workflow}</span>
                              <span>{item.timestamp} - {item.date}</span>
                            </div>
                            <div className="history-item-title">{item.modelName}</div>
                            <div className="history-item-desc">
                              {item.userInstructions ? `"${item.userInstructions}"` : `Ação de ${item.workflow}`}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
