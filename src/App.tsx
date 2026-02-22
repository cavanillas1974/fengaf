import React, { useState, useRef } from 'react';
import { 
  Hammer, 
  Image as ImageIcon, 
  FileText, 
  Upload, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Box, 
  Palette, 
  Ruler, 
  DollarSign,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  analyzeLogo, 
  generateFurnitureRender, 
  generateTechnicalDocumentation, 
  generateTechnicalImages,
  editFurnitureImage,
  chatWithDesigner,
  type FurnitureConfig, 
  type TechnicalDoc 
} from './services/geminiService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Markdown from 'react-markdown';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STEPS = [
  { id: 'concept', title: 'Concepto', icon: Box },
  { id: 'config', title: 'Configuración', icon: Palette },
  { id: 'brand', title: 'Marca y Presupuesto', icon: DollarSign },
  { id: 'review', title: 'Revisión de Diseño', icon: ImageIcon },
  { id: 'result', title: 'Centro de Control', icon: FileText },
];

const STYLES = ['Industrial', 'Minimalista', 'Premium', 'Escandinavo', 'Rústico', 'Moderno', 'Mid-Century'];
const MATERIALS = ['Madera Maciza', 'MDF Hidrófugo', 'Acero Inoxidable', 'Vidrio Templado', 'Mármol', 'Cuero', 'Textil'];
const COMPONENTS = ['Cajones', 'Puertas', 'Repisas', 'Iluminación LED', 'Vidrio', 'Cerraduras', 'Ruedas'];

export default function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chat & Edit state
  const [chatMessages, setChatMessages] = useState<{ role: string, parts: { text: string }[] }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [config, setConfig] = useState<FurnitureConfig>({
    type: '',
    style: STYLES[0],
    materials: [],
    dimensions: { width: 120, height: 75, depth: 60, unit: 'cm' },
    budget: 500,
    components: [],
    description: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoAnalysis, setLogoAnalysis] = useState<any>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [techDoc, setTechDoc] = useState<TechnicalDoc | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', parts: [{ text: userMsg }] }]);
    setIsChatting(true);
    try {
      const response = await chatWithDesigner(chatMessages, userMsg, config);
      setChatMessages(prev => [...prev, { role: 'model', parts: [{ text: response }] }]);
    } catch (err) {
      setError('Error en el chat.');
    } finally {
      setIsChatting(false);
    }
  };

  const handleEditImage = async () => {
    if (!editPrompt.trim() || isEditing || !renderUrl) return;
    setIsEditing(true);
    try {
      const newUrl = await editFurnitureImage(renderUrl, editPrompt);
      setRenderUrl(newUrl);
      setEditPrompt('');
    } catch (err) {
      setError('Error al editar la imagen.');
    } finally {
      setIsEditing(false);
    }
  };

  React.useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback for local development if window.aistudio is not present
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-3xl border border-black/5 shadow-2xl text-center space-y-6"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="text-amber-600 w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Configuración Requerida</h1>
            <p className="text-black/50 text-sm leading-relaxed">
              Para generar renders fotorrealistas de alta calidad, Fenga utiliza modelos Pro que requieren una API Key con facturación habilitada.
            </p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={handleSelectKey}
              className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-black/80 transition-all shadow-lg"
            >
              Configurar API Key para Renders Pro
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-xs text-black/40 hover:text-black underline transition-colors"
            >
              Más información sobre facturación y cuotas
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setConfig(prev => ({ ...prev, logoBase64: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = async () => {
    if (currentStep === 2) {
      await generateDesign();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const generateDesign = async () => {
    setLoading(true);
    setError(null);
    try {
      let analysis = null;
      if (config.logoBase64) {
        analysis = await analyzeLogo(config.logoBase64);
        setLogoAnalysis(analysis);
      }

      const imageUrl = await generateFurnitureRender(config, analysis);
      setRenderUrl(imageUrl);
      setCurrentStep(3); // Go to Design Review
    } catch (err: any) {
      console.error(err);
      setError('Error al generar el diseño. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDesign = async () => {
    if (!renderUrl) return;
    setLoading(true);
    setError(null);
    try {
      // Generate technical images and documentation
      const [techImages, doc] = await Promise.all([
        generateTechnicalImages(renderUrl, config),
        generateTechnicalDocumentation(config, renderUrl)
      ]);
      setTechDoc({ ...doc, technicalImages: techImages });
      setCurrentStep(4); // Go to Final Control Center
    } catch (err) {
      console.error(err);
      setError('Error al generar la documentación técnica.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!techDoc) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    doc.text('FENGA — Ficha Técnica de Mobiliario', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado el ${new Date().toLocaleDateString()}`, 14, 28);

    // Render
    if (techDoc.renderUrl) {
      doc.addImage(techDoc.renderUrl, 'PNG', 14, 35, 182, 102);
    }

    // Info
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text('Especificaciones Generales', 14, 145);
    
    doc.setFontSize(10);
    doc.text(`Tipo: ${config.type}`, 14, 155);
    doc.text(`Estilo: ${config.style}`, 14, 162);
    doc.text(`Dimensiones: ${config.dimensions.width}x${config.dimensions.height}x${config.dimensions.depth} ${config.dimensions.unit}`, 14, 169);
    doc.text(`Materiales: ${config.materials.join(', ')}`, 14, 176);

    // Cut List Table
    (doc as any).autoTable({
      startY: 185,
      head: [['Pieza', 'Material', 'Dimensiones', 'Cant.']],
      body: techDoc.cutList.map(item => [item.part, item.material, item.dimensions, item.quantity]),
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40] }
    });

    // New Page for Hardware and Assembly
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Herrajes y Componentes', 14, 20);
    (doc as any).autoTable({
      startY: 25,
      head: [['Item', 'Cantidad', 'Propósito']],
      body: techDoc.hardware.map(item => [item.item, item.quantity, item.purpose]),
      theme: 'grid'
    });

    doc.setFontSize(14);
    doc.text('Pasos de Ensamble', 14, (doc as any).lastAutoTable.finalY + 15);
    doc.setFontSize(10);
    techDoc.assemblySteps.forEach((step, i) => {
      doc.text(`${i + 1}. ${step}`, 14, (doc as any).lastAutoTable.finalY + 25 + (i * 7), { maxWidth: 180 });
    });

    // Quotation
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Cotización Estimada', 14, 20);
    (doc as any).autoTable({
      startY: 25,
      head: [['Concepto', 'Costo Estimado (USD)']],
      body: [
        ...techDoc.quotation.map(q => [q.item, `$${q.cost.toFixed(2)}`]),
        [{ content: 'TOTAL ESTIMADO', styles: { fontStyle: 'bold' } }, { content: `$${techDoc.totalEstimatedCost.toFixed(2)}`, styles: { fontStyle: 'bold' } }]
      ],
      theme: 'plain'
    });

    doc.save(`Fenga_${config.type.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Hammer className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">FENGA</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {STEPS.map((step, i) => (
              <div 
                key={step.id}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  currentStep >= i ? "text-black" : "text-black/30"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] border",
                  currentStep > i ? "bg-black border-black text-white" : 
                  currentStep === i ? "border-black text-black" : "border-black/10 text-black/30"
                )}>
                  {currentStep > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {step.title}
              </div>
            ))}
          </nav>

          <div className="text-xs font-mono text-black/40 uppercase tracking-widest">
            AI Design Factory
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-amber-400 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <h2 className="mt-8 text-2xl font-bold">Fabricando tu diseño...</h2>
              <p className="mt-2 text-black/50 max-w-md">
                Nuestra IA está analizando materiales, calculando cortes y generando un render fotorrealista de alta calidad.
              </p>
              <div className="mt-8 flex gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 bg-emerald-500 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center"
            >
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-red-900">{error}</h3>
              <button 
                onClick={() => setError(null)}
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Reintentar
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 0 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">¿Qué vamos a fabricar hoy?</h1>
                    <p className="text-black/50 text-lg">Describe el mueble que tienes en mente.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40">Tipo de Mueble</label>
                      <input 
                        type="text"
                        placeholder="Ej: Escritorio ejecutivo, Mostrador de recepción, Librero..."
                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-lg"
                        value={config.type}
                        onChange={e => setConfig(prev => ({ ...prev, type: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40">Descripción Detallada</label>
                      <textarea 
                        rows={4}
                        placeholder="Describe el uso, el ambiente donde estará y cualquier detalle específico que desees..."
                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                        value={config.description}
                        onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Configura el diseño</h1>
                    <p className="text-black/50 text-lg">Define el estilo, materiales y dimensiones.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-black/40">Estilo</label>
                        <div className="grid grid-cols-2 gap-2">
                          {STYLES.map(s => (
                            <button
                              key={s}
                              onClick={() => setConfig(prev => ({ ...prev, style: s }))}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                                config.style === s ? "bg-black border-black text-white shadow-lg" : "bg-white border-black/10 hover:border-black/30"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-black/40">Materiales Principales</label>
                        <div className="flex flex-wrap gap-2">
                          {MATERIALS.map(m => (
                            <button
                              key={m}
                              onClick={() => setConfig(prev => ({
                                ...prev,
                                materials: prev.materials.includes(m) 
                                  ? prev.materials.filter(x => x !== m)
                                  : [...prev.materials, m]
                              }))}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                config.materials.includes(m) ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-black/10 hover:border-black/30"
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 bg-white p-6 rounded-2xl border border-black/5">
                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-black/40 flex items-center gap-2">
                          <Ruler className="w-3 h-3" /> Dimensiones ({config.dimensions.unit})
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                          {['width', 'height', 'depth'].map(dim => (
                            <div key={dim} className="space-y-1">
                              <span className="text-[10px] uppercase text-black/30">{dim === 'width' ? 'Ancho' : dim === 'height' ? 'Alto' : 'Fondo'}</span>
                              <input 
                                type="number"
                                className="w-full bg-transparent border-b border-black/10 py-1 focus:border-emerald-500 outline-none text-center font-mono"
                                value={(config.dimensions as any)[dim]}
                                onChange={e => setConfig(prev => ({
                                  ...prev,
                                  dimensions: { ...prev.dimensions, [dim]: parseInt(e.target.value) || 0 }
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-black/40">Componentes</label>
                        <div className="grid grid-cols-2 gap-2">
                          {COMPONENTS.map(c => (
                            <label key={c} className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox"
                                className="w-4 h-4 rounded border-black/10 text-emerald-500 focus:ring-emerald-500"
                                checked={config.components.includes(c)}
                                onChange={() => setConfig(prev => ({
                                  ...prev,
                                  components: prev.components.includes(c)
                                    ? prev.components.filter(x => x !== c)
                                    : [...prev.components, c]
                                }))}
                              />
                              <span className="text-sm text-black/60 group-hover:text-black transition-colors">{c}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Marca y Presupuesto</h1>
                    <p className="text-black/50 text-lg">Personaliza con tu logo y define el límite de inversión.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-black/40">Logo del Cliente</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group",
                          logoPreview ? "border-emerald-500/50 bg-emerald-50/30" : "border-black/10 hover:border-black/20 bg-white"
                        )}
                      >
                        {logoPreview ? (
                          <>
                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-4" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs font-bold">Cambiar Logo</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-black/20 mb-2" />
                            <span className="text-sm font-medium text-black/40">Subir Logo (PNG/JPG)</span>
                          </>
                        )}
                        <input 
                          type="file"
                          ref={fileInputRef}
                          onChange={handleLogoUpload}
                          className="hidden"
                          accept="image/*"
                        />
                      </div>
                      <p className="text-[10px] text-black/30 italic">
                        La IA analizará automáticamente la marca para integrarla en el diseño.
                      </p>
                    </div>

                    <div className="space-y-6 bg-white p-6 rounded-2xl border border-black/5">
                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-black/40 flex items-center justify-between">
                          <span>Presupuesto Máximo</span>
                          <span className="text-emerald-600 font-mono text-lg">${config.budget} USD</span>
                        </label>
                        <input 
                          type="range"
                          min="100"
                          max="10000"
                          step="100"
                          className="w-full h-2 bg-black/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          value={config.budget}
                          onChange={e => setConfig(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                        />
                        <div className="flex justify-between text-[10px] text-black/30 font-mono">
                          <span>$100</span>
                          <span>$5,000</span>
                          <span>$10,000</span>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex gap-3">
                          <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                          <p className="text-xs text-amber-900 leading-relaxed">
                            Ajustaremos los materiales y la complejidad técnica para que el diseño sea factible dentro de este presupuesto.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && renderUrl && (
                <div className="space-y-12">
                  <div className="space-y-4 text-center">
                    <h1 className="text-4xl font-bold tracking-tight">Revisión de Diseño</h1>
                    <p className="text-black/50 text-lg">¿Qué te parece esta propuesta? Puedes solicitar cambios o aprobarla para generar la documentación técnica.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="aspect-video rounded-3xl overflow-hidden border border-black/5 shadow-2xl relative group bg-white">
                        {isEditing ? (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur flex flex-col items-center justify-center z-10">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-2" />
                            <span className="text-sm font-bold">Actualizando diseño...</span>
                          </div>
                        ) : null}
                        <img src={renderUrl} alt="Render de revisión" className="w-full h-full object-cover" />
                        <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-black/5">
                          Propuesta de Diseño AI
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-black/5 flex gap-2 shadow-sm">
                        <input 
                          type="text"
                          placeholder="Solicita cambios específicos (ej: 'hazlo más alto', 'cambia el color a negro')..."
                          className="flex-1 bg-transparent border-none outline-none text-sm px-2"
                          value={editPrompt}
                          onChange={e => setEditPrompt(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleEditImage()}
                        />
                        <button 
                          onClick={handleEditImage}
                          disabled={isEditing || !editPrompt.trim()}
                          className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-black/80 transition-all disabled:opacity-30"
                        >
                          {isEditing ? 'Editando...' : 'Aplicar Cambios'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
                        <div className="space-y-2">
                          <h3 className="font-bold text-lg">¿Listo para fabricar?</h3>
                          <p className="text-sm text-black/50">Al aprobar, generaremos 5 planos técnicos detallados, lista de cortes, herrajes y manual de ensamble.</p>
                        </div>
                        
                        <button 
                          onClick={handleApproveDesign}
                          disabled={loading}
                          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                          Aprobar y Generar Ficha
                        </button>

                        <button 
                          onClick={generateDesign}
                          disabled={loading}
                          className="w-full py-4 border border-black/10 rounded-2xl font-bold hover:bg-black/5 transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                          Generar otra propuesta
                        </button>
                      </div>

                      <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                        <Sparkles className="w-6 h-6 text-amber-500 shrink-0" />
                        <p className="text-xs text-amber-900 leading-relaxed">
                          <strong>Tip:</strong> Puedes ser muy específico con los cambios. La IA entiende texturas, materiales y proporciones.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && renderUrl && techDoc && (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h1 className="text-4xl font-bold tracking-tight">Centro de Control Técnico</h1>
                      <div className="flex gap-2">
                        <button 
                          onClick={downloadPDF}
                          className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full text-sm font-bold hover:bg-black/80 transition-all shadow-xl shadow-black/10"
                        >
                          <Download className="w-4 h-4" /> Exportar Documentación Completa
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-8">
                        {/* Technical Gallery */}
                        <section className="space-y-4">
                          <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-wider text-black/40 text-xs">
                            <ImageIcon className="w-4 h-4" /> Galería de Planos y Detalles (Mínimo 5 vistas)
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 aspect-video rounded-3xl overflow-hidden border border-black/5 shadow-lg bg-white">
                              <img src={renderUrl} alt="Render principal" className="w-full h-full object-cover" />
                            </div>
                            {techDoc.technicalImages?.map((img, i) => (
                              <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-black/5 shadow-md bg-white group relative">
                                <img src={img} alt={`Vista técnica ${i+1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ))}
                          </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <section className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                              <FileText className="w-5 h-5 text-emerald-500" /> Especificaciones de Planos
                            </h3>
                            <div className="space-y-3">
                              {techDoc.plans.map((plan, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-black/5 flex justify-between items-center">
                                  <div>
                                    <p className="text-sm font-bold">{plan.view}</p>
                                    <p className="text-xs text-black/40">{plan.description}</p>
                                  </div>
                                  <span className="text-xs font-mono bg-black/5 px-2 py-1 rounded">{plan.dimensions}</span>
                                </div>
                              ))}
                            </div>
                          </section>

                          <section className="space-y-4">
                            <h3 className="text-lg font-bold">Manual de Instructivo</h3>
                            <div className="space-y-4">
                              {techDoc.assemblySteps.map((step, i) => (
                                <div key={i} className="flex gap-4">
                                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                                    {i + 1}
                                  </span>
                                  <p className="text-sm text-black/70 leading-relaxed">{step}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        </div>
                      </div>

                      {/* Side Info & Chat */}
                      <div className="space-y-8">
                        <div className="bg-white rounded-3xl border border-black/5 flex flex-col h-[600px] shadow-sm overflow-hidden">
                          <div className="p-4 border-b border-black/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                              <span className="text-xs font-bold uppercase tracking-wider">Asistente de Taller</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatMessages.map((msg, i) => (
                              <div key={i} className={cn(
                                "max-w-[85%] rounded-2xl p-3 text-sm",
                                msg.role === 'user' ? "bg-black text-white ml-auto" : "bg-black/5 text-black"
                              )}>
                                <div className="prose prose-sm max-w-none">
                                  <Markdown>{msg.parts[0].text}</Markdown>
                                </div>
                              </div>
                            ))}
                            {isChatting && <div className="text-xs text-black/30 animate-pulse">Analizando detalles técnicos...</div>}
                            <div ref={chatEndRef} />
                          </div>

                          <div className="p-4 border-t border-black/5 flex gap-2">
                            <input 
                              type="text"
                              placeholder="Duda técnica..."
                              className="flex-1 bg-black/5 border-none rounded-xl px-4 py-2 text-sm outline-none"
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button onClick={handleSendMessage} className="p-2 bg-black text-white rounded-xl">
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <section className="bg-black text-white p-6 rounded-3xl space-y-6">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Resumen de Costos</h3>
                            <div className="space-y-3">
                              {techDoc.quotation.map((q, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-white/60">{q.item}</span>
                                  <span className="font-mono">${q.cost.toFixed(0)}</span>
                                </div>
                              ))}
                              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                <span className="font-bold">Total Est.</span>
                                <span className="text-xl font-bold text-emerald-400">${techDoc.totalEstimatedCost.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Herrajes Requeridos</h3>
                            <div className="space-y-2">
                              {techDoc.hardware.map((h, i) => (
                                <div key={i} className="text-[10px] flex justify-between border-b border-white/5 pb-2">
                                  <span>{h.item} (x{h.quantity})</span>
                                  <span className="text-white/40 italic">{h.purpose}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {!loading && currentStep < 3 && (
                <div className="mt-12 pt-8 border-t border-black/5 flex justify-between items-center">
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all",
                      currentStep === 0 ? "opacity-0 pointer-events-none" : "hover:bg-black/5"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" /> Atrás
                  </button>

                  <button
                    onClick={nextStep}
                    disabled={currentStep === 0 && !config.type}
                    className={cn(
                      "flex items-center gap-2 px-8 py-3 bg-black text-white rounded-full text-sm font-bold hover:bg-black/80 transition-all shadow-xl shadow-black/10 disabled:opacity-30 disabled:pointer-events-none",
                    )}
                  >
                    {currentStep === 2 ? 'Generar Diseño Moderno' : 'Siguiente'} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {currentStep >= 3 && !loading && (
                <div className="mt-12 pt-8 border-t border-black/5 flex justify-center">
                  <button
                    onClick={() => {
                      setCurrentStep(0);
                      setRenderUrl(null);
                      setTechDoc(null);
                      setChatMessages([]);
                    }}
                    className="px-8 py-3 border border-black/10 rounded-full text-sm font-bold hover:bg-black/5 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Comenzar Nuevo Proyecto
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-black/5 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 grayscale opacity-50">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <Hammer className="text-white w-3 h-3" />
            </div>
            <span className="font-bold text-sm tracking-tight">FENGA</span>
          </div>
          <p className="text-xs text-black/30">
            Desarrollado por <a href="https://iamanos.com" className="hover:text-black underline transition-colors">iamanos.com</a> &copy; 2026
          </p>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-black/30">
            <span>Imagen 4 Ultra</span>
            <span>Gemini 2.0 Flash</span>
            <span>Technical Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
