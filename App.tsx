
import React, { useState, useRef, useEffect } from 'react';
import { Send, Activity, MessageSquare, Stethoscope, Archive, Compass, GraduationCap, Shield, LogOut, ClipboardList, Loader2, Menu, X, Globe, User, LayoutGrid, Scale, Paperclip, Image as ImageIcon, ShieldAlert, Ban } from 'lucide-react';
import { Language, ChatMessage, ScoredSyndrome, UserAccount, TcmDiagnosisResult } from './types';
import { sendMessageToGeminiStream } from './services/geminiService';
import { analyzePatient } from './services/tcmLogic';
import { db } from './services/db';
import { getActiveUser, logout, updateSessionId, clearAdminMessage } from './services/authService';
import { supabase } from './services/supabase';
import DiagnosisCard from './components/DiagnosisCard';
import PatientFormModal from './components/PatientFormModal';
import WuXingVisualizerModal from './components/WuXingVisualizerModal';
import ScoringAndPointsHub from './components/ScoringAndPointsHub';
import WuXingMasterPanel from './components/WuXingMasterPanel';
import LoginScreen from './components/LoginScreen';
import UkomPracticePanel from './components/UkomPracticePanel';
import PatientArchivePanel from './components/PatientArchivePanel';
import SyndromeAtlasWindow from './components/SyndromeAtlasWindow';

import InvoiceGeneratorPanel from './components/InvoiceGeneratorPanel';
import BMIKomplitPanel from './components/BMIKomplitPanel';
import AdminConsolePanel from './components/AdminConsolePanel';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [isDuplicateSession, setIsDuplicateSession] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const user = await getActiveUser();
      if (user && user.uid) {
        await updateSessionId(user.uid, sessionId);
        setCurrentUser({...user, currentSessionId: sessionId});
      }
      setIsAuthReady(true);
    };
    initAuth();
  }, [sessionId]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const channel = supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${currentUser.uid}`
        },
        (payload) => {
          const newSessionId = payload.new.current_session_id;
          if (newSessionId && newSessionId !== sessionId) {
            setIsDuplicateSession(true);
          } else if (newSessionId === null) {
            // Force logout
            logout();
            setCurrentUser(null);
          }
          
          // Update currentUser with new isActive and adminMessage
          setCurrentUser(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              isActive: payload.new.is_active,
              adminMessage: payload.new.admin_message || undefined
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.uid, sessionId]);

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
  };

  const [activePanel, setActivePanel] = useState<'chat' | 'diagnosis' | 'wuxing' | 'ukom' | 'archive' | 'atlas' | 'invoice' | 'bmi' | 'admin'>('chat');
  const [appLanguage, setAppLanguage] = useState<Language>(Language.INDONESIAN);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: 'Sistem Siap. Masukkan keluhan pasien untuk analisis cepat atau gunakan Form Input Pasien.', timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{data: string, type: string, name: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [cdssResults, setCdssResults] = useState<ScoredSyndrome[]>([]);
  const [lastPatientForm, setLastPatientForm] = useState<any>(null);
  const [selectedAtlasId, setSelectedAtlasId] = useState<string | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textOverride?: string, analysis?: ScoredSyndrome[], patientData?: any) => {
    const textToSend = textOverride || inputText;
    if ((!textToSend.trim() && !selectedFile) || isLoading) return;

    setIsLoading(true);
    const fileToSend = selectedFile?.data;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date(), image: fileToSend || undefined };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedFile(null);

    const botMsgId = (Date.now() + 1).toString();
    const loadingText = appLanguage === Language.ENGLISH ? "Analyzing meridian patterns and syndromes..." : "Menganalisis pola meridian dan sindrom...";
    setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: loadingText, timestamp: new Date() }]);

    try {
      const response = await sendMessageToGeminiStream(textToSend, fileToSend || undefined, messages, appLanguage, false, analysis || cdssResults);
      
      setMessages(prev => prev.map(m => m.id === botMsgId ? { 
        ...m, 
        text: response.conversationalResponse || "Analysis Complete.", 
        tcmResult: response.diagnosis 
      } : m));

      // Save to database if this was triggered by a patient form submission
            if (patientData && response.diagnosis && currentUser) {
        await db.patients.add({
          id: Date.now().toString(),
          authorUid: currentUser.uid,
          patientName: patientData.patientName || 'Unknown',
          age: patientData.age || '',
          sex: patientData.sex || '',
          phone: patientData.phone || '',
          email: patientData.email || '',
          address: patientData.address || '',
          complaint: patientData.complaint || '',
          symptoms: patientData.symptoms || '',
          selectedSymptoms: patientData.selectedSymptoms || [],
          tongue: patientData.tongue || {},
          pulse: patientData.pulse || {},
          diagnosis: response.diagnosis,
          timestamp: Date.now(),
          medicalHistory: patientData.medicalHistory || '',
          biomedicalDiagnosis: patientData.biomedicalDiagnosis || '',
          icd10: patientData.icd10 || ''
        });
      }
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg = appLanguage === Language.ENGLISH ? "Failed to process data. Please check your API connection." : "Gagal memproses data. Mohon periksa koneksi API Anda.";
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: errorMsg, isError: true } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          data: reader.result as string,
          type: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (data: any) => {
    setLastPatientForm(data);
    const results = analyzePatient({ symptoms: data.symptoms, selectedSymptoms: data.selectedSymptoms, tongue: data.tongue, pulse: data.pulse });
    setCdssResults(results);
    setActivePanel('chat');
    const msg = `PATIENT: ${data.patientName}, AGE: ${data.age}, SEX: ${data.sex}, PHONE: ${data.phone || 'N/A'}, EMAIL: ${data.email || 'N/A'}, ADDRESS: ${data.address || 'N/A'}. COMPLAINT: ${data.complaint}. SYMPTOMS: ${data.symptoms} ${data.selectedSymptoms?.join(', ') || ''}. TONGUE: ${data.tongue.body_color}, Coat: ${data.tongue.coating_color} (${data.tongue.coating_quality}), Features: ${data.tongue.special_features?.join(', ') || 'None'}. PULSE: ${data.pulse.qualities?.join(', ') || 'None'}`;
    handleSendMessage(msg, results, data);
  };

  const toggleLanguage = () => {
    setAppLanguage(prev => prev === Language.INDONESIAN ? Language.ENGLISH : Language.INDONESIAN);
  };

  const handleAtlasSelect = (id: string) => {
    setSelectedAtlasId(id);
    setActivePanel('diagnosis');
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-tcm-primary animate-spin" />
      </div>
    );
  }

  if (!currentUser) return <LoginScreen onLoginSuccess={async (user) => {
    if (user.uid) {
      await updateSessionId(user.uid, sessionId);
      setCurrentUser({...user, currentSessionId: sessionId});
    } else {
      setCurrentUser(user);
    }
  }} />;

  if (isDuplicateSession) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-rose-100">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-2xl font-black text-purple-950 mb-4">Sesi Ganda Terdeteksi</h2>
          <p className="text-purple-600 mb-8 leading-relaxed">
            Akun Anda sedang dibuka di perangkat atau tab lain. Untuk keamanan, sesi di halaman ini telah dihentikan.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-md"
          >
            Gunakan di Perangkat Ini
          </button>
        </div>
      </div>
    );
  }

  if (currentUser.isActive === false) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-rose-100">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ban className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-2xl font-black text-purple-950 mb-4">Akun Dinonaktifkan</h2>
          <p className="text-purple-600 mb-8 leading-relaxed">
            Akun Anda saat ini dinonaktifkan sementara oleh Administrator. Silakan hubungi layanan dukungan untuk informasi lebih lanjut.
          </p>
          <button 
            onClick={async () => {
              await logout();
              setCurrentUser(null);
            }}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-md"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  const isFeatureAllowed = (featureId: keyof NonNullable<UserAccount['allowedFeatures']>) => {
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') return true;
    
    // Check subscription
    const isSubActive = currentUser.subscriptionEnd ? currentUser.subscriptionEnd > Date.now() : false;
    if (!isSubActive) return false;

    // Check specific feature toggle
    if (currentUser.allowedFeatures) {
      return currentUser.allowedFeatures[featureId] !== false;
    }
    return true; // Default to true if allowedFeatures is undefined
  };

  const SidebarTab = ({ id, label, icon: Icon, activeClass, featureKey }: { id: typeof activePanel, label: string, icon: any, activeClass: string, featureKey?: keyof NonNullable<UserAccount['allowedFeatures']> }) => {
    const isActive = activePanel === id;
    const isAllowed = featureKey ? isFeatureAllowed(featureKey) : true;

    return (
      <button 
        onClick={() => {
          if (isAllowed) {
            setActivePanel(id); 
            setIsSidebarOpen(false);
          }
        }} 
        disabled={!isAllowed}
        className={`w-full flex items-center justify-between p-4 rounded-2xl text-sm font-black transition-all duration-200 border-l-4 ${
          isActive 
          ? `${activeClass} border-purple-300 text-white shadow-md translate-x-1` 
          : isAllowed 
            ? 'bg-transparent border-l-transparent text-purple-600 hover:bg-purple-50 hover:text-purple-900'
            : 'bg-transparent border-l-transparent text-gray-400 cursor-not-allowed opacity-60'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 drop-shadow-sm' : ''}`} /> 
          {label}
        </div>
        {!isAllowed && <Shield className="w-4 h-4 text-gray-400" />}
      </button>
    );
  };

  return (
    <div className="flex h-[100dvh] bg-purple-50 text-purple-950 overflow-hidden font-sans">
      <PatientFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} />
      <WuXingVisualizerModal isOpen={isVisualizerOpen} onClose={() => setIsVisualizerOpen(false)} />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-purple-100 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col h-[100dvh] md:h-full shadow-2xl md:shadow-none`}>
        <div className="p-6 flex justify-between items-center border-b border-purple-100 shrink-0">
           <h1 className="text-2xl font-black text-tcm-primary flex items-center gap-2 tracking-tighter"><Activity className="w-8 h-8" /> TCM PRO</h1>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 bg-purple-50 rounded-lg text-purple-400 hover:text-purple-950"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
           <SidebarTab id="chat" label={appLanguage === Language.ENGLISH ? "Diagnostic Chat" : "Chat Diagnosa"} icon={MessageSquare} activeClass="bg-purple-600 shadow-purple-900/40" featureKey="chat" />
           <SidebarTab id="diagnosis" label="CDSS Auto-Rx" icon={Stethoscope} activeClass="bg-fuchsia-600 shadow-fuchsia-900/40" featureKey="cdss" />
           <SidebarTab id="atlas" label="Atlas Sindrom" icon={LayoutGrid} activeClass="bg-violet-600 shadow-violet-900/40" featureKey="atlas" />
           <SidebarTab id="wuxing" label="Wu Xing Master" icon={Compass} activeClass="bg-pink-600 shadow-pink-900/40" featureKey="wuxing" />
           <SidebarTab id="archive" label={appLanguage === Language.ENGLISH ? "Patient Archive" : "Arsip Pasien"} icon={Archive} activeClass="bg-purple-800 shadow-purple-950/40" featureKey="archive" />
           <SidebarTab id="invoice" label="Invoice Generator" icon={ClipboardList} activeClass="bg-indigo-600 shadow-indigo-900/40" featureKey="invoice" />
           <SidebarTab id="bmi" label="BMI Komplit" icon={Scale} activeClass="bg-teal-600 shadow-teal-900/40" featureKey="bmi" />
           
           {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
             <SidebarTab id="admin" label="Admin Console" icon={Shield} activeClass="bg-red-600 shadow-red-900/40" />
           )}
        </nav>
        <div className="p-4 border-t border-purple-100 shrink-0 bg-white">
           <button 
             onClick={() => setIsFormOpen(true)} 
             disabled={!isFeatureAllowed('chat') && !isFeatureAllowed('cdss')}
             className="w-full py-4 bg-gradient-to-br from-fuchsia-400 to-tcm-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-purple-900/30 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
           >
             <ClipboardList className="w-4 h-4" /> {appLanguage === Language.ENGLISH ? "New Patient Intake" : "Input Pasien Baru"}
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-purple-50 overflow-hidden">
        {/* Top Header with Language Toggle */}
        <header className="p-4 bg-white/50 border-b border-purple-100 flex justify-between items-center backdrop-blur-md">
           <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-purple-100 rounded-lg text-purple-900"><Menu className="w-5 h-5" /></button>
             <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-purple-100/50 rounded-full border border-purple-200">
                <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">System Online</span>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 rounded-xl border border-purple-200 transition-all active:scale-95 group shadow-sm"
              >
                <Globe className="w-4 h-4 text-tcm-primary group-hover:rotate-12 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-tighter text-purple-900">
                  {appLanguage === Language.ENGLISH ? "EN" : "ID"}
                </span>
              </button>
              <div className="flex items-center gap-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full border border-purple-300 shadow-inner px-3 py-1.5">
                 <User className="w-4 h-4 text-purple-600" />
                 <span className="text-xs font-bold text-purple-900">{currentUser.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.05),transparent)]">
          {activePanel === 'chat' && (
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className="max-w-[95%] md:max-w-[85%]">
                    <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white border border-purple-100 text-purple-900 rounded-tl-none'}`}>
                      {msg.image && (
                        <div className="mb-3">
                          {msg.image.startsWith('data:image/') ? (
                            <img src={msg.image} alt="Uploaded" className="max-w-xs rounded-xl border border-white/20 shadow-md" />
                          ) : (
                            <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl border border-white/20 w-fit">
                              <Paperclip className="w-5 h-5" />
                              <span className="text-sm font-medium">Document Attached</span>
                            </div>
                          )}
                        </div>
                      )}
                      {msg.text}
                    </div>
                    {msg.tcmResult && (
                      <DiagnosisCard 
                        diagnosis={msg.tcmResult} 
                        isPregnant={false} 
                        onShowVisualizer={() => setIsVisualizerOpen(true)} 
                        patientContext={lastPatientForm} 
                      />
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-white border border-purple-100 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-tcm-primary animate-spin" />
                    <span className="text-xs font-bold text-purple-500 uppercase tracking-widest">
                      {appLanguage === Language.ENGLISH ? "EXPERT IS ANALYZING..." : "PAKAR SEDANG MENGANALISIS..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          {activePanel === 'diagnosis' && (
            <ScoringAndPointsHub 
              analysis={cdssResults} 
              onAnalyzeRequest={() => setIsFormOpen(true)} 
              patientContext={lastPatientForm} 
              initialSyndromeId={selectedAtlasId}
            />
          )}
          {activePanel === 'atlas' && (
            <SyndromeAtlasWindow onSelectSyndrome={handleAtlasSelect} />
          )}
          {activePanel === 'wuxing' && <WuXingMasterPanel />}
          {activePanel === 'archive' && (
            <PatientArchivePanel 
              onLoadPatient={(p) => { 
                setLastPatientForm(p);
                setCdssResults([{syndrome: p.diagnosis as any, score: 100, points: [], warnings: [], rationale: [p.diagnosis.explanation]}]); 
                setActivePanel('chat'); 
              }} 
            />
          )}
          {activePanel === 'invoice' && <InvoiceGeneratorPanel />}
          {activePanel === 'bmi' && <BMIKomplitPanel />}
          {activePanel === 'admin' && (currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
            <AdminConsolePanel currentUser={currentUser} />
          )}
        </main>

        {activePanel === 'chat' && (
          <div className="p-4 md:p-6 bg-white/80 backdrop-blur-xl border-t border-purple-100">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {selectedFile && (
                <div className="relative flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200 shadow-sm w-fit pr-12">
                  {selectedFile.type.startsWith('image/') ? (
                    <img src={selectedFile.data} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-purple-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                      <Paperclip className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-purple-900 truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-xs text-purple-500 uppercase tracking-wider">{selectedFile.type.split('/')[1] || 'File'}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 bg-white text-purple-400 rounded-full p-1 hover:bg-purple-100 hover:text-purple-600 transition-colors shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-purple-100 text-purple-600 rounded-2xl hover:bg-purple-200 active:scale-95 transition-all shadow-sm"
                  title="Upload Image or PDF"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                  placeholder={appLanguage === Language.ENGLISH ? "Enter patient complaints or TCM questions..." : "Masukkan keluhan pasien atau pertanyaan TCM..."} 
                  className="flex-1 bg-purple-50/50 border border-purple-200 rounded-2xl px-6 py-4 outline-none focus:border-tcm-primary focus:bg-white transition-all text-sm text-purple-950 shadow-inner" 
                />
                <button 
                  onClick={() => handleSendMessage()} 
                  disabled={isLoading || (!inputText.trim() && !selectedFile)}
                  className="p-4 bg-tcm-primary text-white rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Admin Message Modal */}
      {currentUser.adminMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-purple-100 animate-fade-in text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-purple-950 mb-4 uppercase tracking-tighter">Pesan dari Admin</h2>
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 mb-8 text-left">
              <p className="text-purple-900 leading-relaxed font-medium">
                {currentUser.adminMessage}
              </p>
            </div>
            <button 
              onClick={async () => {
                if (currentUser.uid) {
                  await clearAdminMessage(currentUser.uid);
                  setCurrentUser({...currentUser, adminMessage: undefined});
                }
              }}
              className="w-full py-4 bg-tcm-primary hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
