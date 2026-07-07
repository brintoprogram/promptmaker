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
  HelpCircle,
  Video,
  Wand2,
  Image,
  Layers,
  Cpu
} from 'lucide-react';
import { generatePrompts, extractModelFeatures } from './gemini';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState('studio'); // 'studio' | 'settings'
  
  // Settings & API Keys
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [openAiApiKey, setOpenAiApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('ai_provider') || 'gemini'); // 'gemini' | 'openai'
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Base Model
  const [modelName, setModelName] = useState(() => localStorage.getItem('model_name') || 'Sophia');
  const [modelDesc, setModelDesc] = useState(() => localStorage.getItem('model_desc') || '');
  const [modelImage, setModelImage] = useState(() => localStorage.getItem('model_image') || null);

  // Workflow and Options
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [workflow, setWorkflow] = useState('pose'); // 'pose' | 'clothing' | 'background' | 'style' | 'action'
  const [refImage, setRefImage] = useState(null);
  const [userInstructions, setUserInstructions] = useState('');

  // Execution States
  const [loading, setLoading] = useState(false);
  const [extractingFeatures, setExtractingFeatures] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  // Right Panel Tabs
  const [rightTab, setRightTab] = useState('results'); // 'results' | 'history'
  const [activeResultTab, setActiveResultTab] = useState('flux');
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
    if (modelImage) localStorage.setItem('model_image', modelImage); 
    else localStorage.removeItem('model_image');
  }, [modelImage]);
  useEffect(() => { localStorage.setItem('gemini_api_key', geminiApiKey); }, [geminiApiKey]);
  useEffect(() => { localStorage.setItem('openai_api_key', openAiApiKey); }, [openAiApiKey]);
  useEffect(() => { localStorage.setItem('ai_provider', aiProvider); }, [aiProvider]);
  useEffect(() => { localStorage.setItem('prompt_studio_history', JSON.stringify(history)); }, [history]);

  // Adjust default workflow when media type changes
  useEffect(() => {
    if (mediaType === 'video' && (workflow === 'clothing')) {
      setWorkflow('action'); // Fallback workflow for video
    }
  }, [mediaType]);

  // Handle Image Upload
  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("A imagem é muito grande. Escolha uma imagem menor que 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Feature Extraction
  const handleExtractFeatures = async () => {
    if (!modelImage) {
      setError("Por favor, faça upload da foto da modelo primeiro.");
      return;
    }
    
    const activeKey = aiProvider === 'gemini' ? geminiApiKey : openAiApiKey;
    if (!activeKey) {
      setError(`Por favor, configure sua chave da ${aiProvider.toUpperCase()} nas Configurações.`);
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

  // Prompt Generation
  const handleGenerate = async () => {
    const activeKey = aiProvider === 'gemini' ? geminiApiKey : openAiApiKey;
    if (!activeKey) {
      setError(`Por favor, configure sua chave da API (${aiProvider}) na aba de Configurações Globais.`);
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
        mediaType
      });

      setResults(output);
      setActiveResultTab(mediaType === 'video' ? 'video' : 'flux');

      const historyItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('pt-BR'),
        modelName,
        modelDesc,
        workflow,
        mediaType,
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
    setUserInstructions(item.userInstructions || '');
    setResults(item.results);
    setRightTab('results');
    setError(null);
    setActiveResultTab(item.mediaType === 'video' ? 'video' : 'flux');
  };

  const clearHistory = () => {
    if (window.confirm("Deseja realmente limpar todo o histórico de gerações?")) {
      setHistory([]);
    }
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
          <button 
            className={`nav-btn ${currentTab === 'studio' ? 'active' : ''}`}
            onClick={() => setCurrentTab('studio')}
          >
            <Layers size={18} /> Studio Workspace
          </button>
          <button 
            className={`nav-btn ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('settings')}
          >
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
              e gerar seus prompts. Modelos mais fortes compreendem referências com muito mais qualidade.
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
                <p>Melhor compreensão visual do mercado (Simulado).</p>
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
                <button 
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="api-key-link">Obter chave do Gemini ↗</a>
            </div>

            <div className="form-group">
              <label className="form-label">OpenAI API Key (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showApiKey ? "text" : "password"} 
                  className="form-input" 
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="sk-proj-..." 
                  value={openAiApiKey}
                  onChange={(e) => setOpenAiApiKey(e.target.value)}
                />
                <button 
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {currentTab === 'studio' && (
        <div className="main-content split-view">
          {/* PAINEL ESQUERDO: INPUTS */}
          <div className="left-panel">
            <div className="glass studio-card">
              
              {/* Modelo Base */}
              <div className="section-title">
                <Sparkles size={20} />
                <h2>Passo 1: Sua Modelo Base</h2>
              </div>

              <div className="form-group">
                <label className="form-label">Nome da Modelo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Sophia, Isabella" 
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Foto Base da Sua Modelo</label>
                <div className="upload-box">
                  {modelImage ? (
                    <div className="preview-container">
                      <img src={modelImage} alt="Modelo base" className="preview-img" />
                      <button className="remove-btn" onClick={() => setModelImage(null)}>×</button>
                    </div>
                  ) : (
                    <>
                      <Upload className="upload-icon" size={32} />
                      <p className="upload-text">Arraste ou <span>clique para subir</span></p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                        onChange={(e) => handleImageUpload(e, setModelImage)}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Características Visuais (Prompt Base)</label>
                  <button 
                    className="btn-extract"
                    disabled={extractingFeatures || !modelImage}
                    onClick={handleExtractFeatures}
                  >
                    {extractingFeatures ? <RefreshCw size={14} className="spin" /> : <Wand2 size={14} />}
                    Extrair com IA
                  </button>
                </div>
                <textarea 
                  className="form-input form-textarea" 
                  placeholder="Descreva as características da modelo ou use a varredura com IA acima."
                  value={modelDesc}
                  onChange={(e) => setModelDesc(e.target.value)}
                />
              </div>

              <hr className="divider" />

              {/* Tipo de Mídia e Ação */}
              <div className="section-title">
                <Sparkles size={20} />
                <h2>Passo 2: Tipo e Ação</h2>
              </div>

              <div className="media-selector">
                <button 
                  className={`media-btn ${mediaType === 'image' ? 'active' : ''}`}
                  onClick={() => { setMediaType('image'); setWorkflow('pose'); }}
                >
                  <Image size={18} />
                  <span>Imagens</span>
                </button>
                <button 
                  className={`media-btn ${mediaType === 'video' ? 'active' : ''}`}
                  onClick={() => { setMediaType('video'); setWorkflow('action'); }}
                >
                  <Video size={18} />
                  <span>Vídeos AI</span>
                </button>
              </div>

              <div className="workflow-selector">
                {mediaType === 'image' ? (
                  <>
                    <div className={`workflow-card ${workflow === 'pose' ? 'active' : ''}`} onClick={() => setWorkflow('pose')}>
                      <ImageIcon className="workflow-icon" size={22} />
                      <h3>Copiar Pose</h3>
                    </div>
                    <div className={`workflow-card ${workflow === 'clothing' ? 'active' : ''}`} onClick={() => setWorkflow('clothing')}>
                      <Shirt className="workflow-icon" size={22} />
                      <h3>Trocar Roupa</h3>
                    </div>
                    <div className={`workflow-card ${workflow === 'background' ? 'active' : ''}`} onClick={() => setWorkflow('background')}>
                      <Map className="workflow-icon" size={22} />
                      <h3>Mudar Cenário</h3>
                    </div>
                    <div className={`workflow-card ${workflow === 'style' ? 'active' : ''}`} onClick={() => setWorkflow('style')}>
                      <Palette className="workflow-icon" size={22} />
                      <h3>Copiar Estilo</h3>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`workflow-card ${workflow === 'action' ? 'active' : ''}`} onClick={() => setWorkflow('action')}>
                      <ImageIcon className="workflow-icon" size={22} />
                      <h3>Gerar Ação</h3>
                    </div>
                    <div className={`workflow-card ${workflow === 'background' ? 'active' : ''}`} onClick={() => setWorkflow('background')}>
                      <Map className="workflow-icon" size={22} />
                      <h3>Mover Câmera</h3>
                    </div>
                  </>
                )}
              </div>

              <hr className="divider" />

              {/* Referências */}
              <div className="section-title">
                <Sparkles size={20} />
                <h2>Passo 3: Referências ({workflowInfo.title})</h2>
              </div>

              <div className="form-group">
                <label className="form-label">{workflowInfo.imageLabel}</label>
                <div className="upload-box">
                  {refImage ? (
                    <div className="preview-container">
                      <img src={refImage} alt="Referência" className="preview-img" />
                      <button className="remove-btn" onClick={() => setRefImage(null)}>×</button>
                    </div>
                  ) : (
                    <>
                      <Upload className="upload-icon" size={32} />
                      <p className="upload-text">Arraste ou <span>clique para subir</span> referência</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                        onChange={(e) => handleImageUpload(e, setRefImage)}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Instruções Adicionais</label>
                <textarea 
                  className="form-input form-textarea" 
                  placeholder={workflowInfo.descPlaceholder}
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                />
              </div>

              {error && (
                <div className="error-box">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <button 
                className="btn-generate"
                disabled={loading || !modelDesc}
                onClick={handleGenerate}
              >
                {loading ? (
                  <>
                    <RefreshCw size={20} className="spin" />
                    <span>Analisando e gerando prompts...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Gerar Prompts Otimizados</span>
                  </>
                )}
              </button>

            </div>
          </div>

          {/* PAINEL DIREITO: OUTPUTS & HISTORY */}
          <div className="right-panel">
            <div className="glass outputs-card">
              <div className="right-panel-nav">
                <button 
                  className={`panel-tab ${rightTab === 'results' ? 'active' : ''}`}
                  onClick={() => setRightTab('results')}
                >
                  <Sparkles size={16} /> Resultados Atuais
                </button>
                <button 
                  className={`panel-tab ${rightTab === 'history' ? 'active' : ''}`}
                  onClick={() => setRightTab('history')}
                >
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
                        <div className="tabs-header">
                          {mediaType === 'image' ? (
                            <>
                              <button className={`tab-btn ${activeResultTab === 'flux' ? 'active' : ''}`} onClick={() => setActiveResultTab('flux')}>FLUX</button>
                              <button className={`tab-btn ${activeResultTab === 'midjourney' ? 'active' : ''}`} onClick={() => setActiveResultTab('midjourney')}>Midjourney</button>
                              <button className={`tab-btn ${activeResultTab === 'stable_diffusion' ? 'active' : ''}`} onClick={() => setActiveResultTab('stable_diffusion')}>Stable Diffusion</button>
                            </>
                          ) : (
                             <button className={`tab-btn ${activeResultTab === 'video' ? 'active' : ''}`} onClick={() => setActiveResultTab('video')}>Prompt de Vídeo AI</button>
                          )}
                        </div>

                        {activeResultTab === 'flux' && results.flux && (
                          <div className="prompt-box-container">
                            <div className="prompt-text">{results.flux}</div>
                            <button className={`copy-badge ${copiedField === 'flux' ? 'copied' : ''}`} onClick={() => handleCopy(results.flux, 'flux')}>
                              {copiedField === 'flux' ? <Check size={14} /> : <Copy size={14} />} <span>{copiedField === 'flux' ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                          </div>
                        )}

                        {activeResultTab === 'midjourney' && results.midjourney && (
                          <div className="prompt-box-container">
                            <div className="prompt-text">{results.midjourney}</div>
                            <button className={`copy-badge ${copiedField === 'midjourney' ? 'copied' : ''}`} onClick={() => handleCopy(results.midjourney, 'midjourney')}>
                              {copiedField === 'midjourney' ? <Check size={14} /> : <Copy size={14} />} <span>{copiedField === 'midjourney' ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                          </div>
                        )}

                        {activeResultTab === 'stable_diffusion' && results.stable_diffusion && (
                          <div>
                            <label className="form-label" style={{marginTop: '1rem'}}>Prompt Positivo (Tags)</label>
                            <div className="prompt-box-container" style={{ minHeight: '80px', marginBottom: '1rem' }}>
                              <div className="prompt-text">{results.stable_diffusion.positive}</div>
                              <button className={`copy-badge ${copiedField === 'sd_pos' ? 'copied' : ''}`} onClick={() => handleCopy(results.stable_diffusion.positive, 'sd_pos')}>
                                {copiedField === 'sd_pos' ? <Check size={14} /> : <Copy size={14} />} <span>{copiedField === 'sd_pos' ? 'Copiado!' : 'Copiar'}</span>
                              </button>
                            </div>
                            <label className="form-label">Prompt Negativo Padrão</label>
                            <div className="prompt-box-container" style={{ minHeight: '60px' }}>
                              <div className="prompt-text">{results.stable_diffusion.negative}</div>
                              <button className={`copy-badge ${copiedField === 'sd_neg' ? 'copied' : ''}`} onClick={() => handleCopy(results.stable_diffusion.negative, 'sd_neg')}>
                                {copiedField === 'sd_neg' ? <Check size={14} /> : <Copy size={14} />} <span>{copiedField === 'sd_neg' ? 'Copiado!' : 'Copiar'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {activeResultTab === 'video' && results.video_prompt && (
                           <div className="prompt-box-container">
                             <div className="prompt-text">{results.video_prompt}</div>
                             <button className={`copy-badge ${copiedField === 'video' ? 'copied' : ''}`} onClick={() => handleCopy(results.video_prompt, 'video')}>
                               {copiedField === 'video' ? <Check size={14} /> : <Copy size={14} />} <span>{copiedField === 'video' ? 'Copiado!' : 'Copiar'}</span>
                             </button>
                           </div>
                        )}

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
