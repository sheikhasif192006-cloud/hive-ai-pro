import React, { useState } from 'react';
import axios from 'axios';
import { 
  Upload, Box, Settings, Activity, Tool, Layers, CheckCircle, Info, Image, 
  Zap, Globe, Printer, Maximize, ChevronDown, Share2, Users, ShoppingBag, 
  Gift, LogIn, User, X, Mail, Lock, Move, RotateCw, Scaling, Scissors, 
  Eye, Save, Play, Download
} from 'lucide-react';
import ThreeDViewer from './components/ThreeDViewer';
import AuthModal from './components/AuthModal';

const translations = {
  en: { name: "English", prepare: "Prepare", slicer: "Slicer", labs: "HIVE LABS", import: "IMPORT", stats: "Statistics", tools: "PREMIUM", coins: "HIVE COINS", pro_msg: "Better than Chitubox Pro.", get_pro: "GET PRO", status: "Status", weight: "Weight", volume: "Volume", cost: "Print Cost", share: "Share", community: "Community", earn: "Refer" },
  hi: { name: "हिन्दी", prepare: "तैयारी", slicer: "स्लाइसर", labs: "हाइव लैब्स", import: "मॉडल लाएं", stats: "आंकड़े", tools: "प्रीमियम सुइट", coins: "हाइव सिक्के", pro_msg: "Chitubox Pro se बेहतर।", get_pro: "अभी प्रो लें", status: "स्थिति", weight: "वजन", volume: "आयतन", cost: "मुद्रण लागत", share: "लिंक शेयर करें", community: "कम्युनिटी", earn: "रेफर और कमाएं" }
};

function App() {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('prepare');
  const [printer, setPrinter] = useState('Elegoo Mars 4');
  const [fileUrl, setFileUrl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [status, setStatus] = useState('Idle');
  const [credits, setCredits] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const t = translations[lang] || translations['en'];

  // Auth Logic
  React.useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('hive_token');
      if (token) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
          setCredits(res.data.credits);
        } catch (err) {
          localStorage.removeItem('hive_token');
        }
      }
    };
    checkAuth();
  }, []);

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('hive_token')}` }
  });

  const handlePayment = async (plan) => {
    if (!user) return setIsAuthOpen(true);

    try {
      const { data: order } = await axios.post(`${import.meta.env.VITE_API_URL}/api/payments/order`, {
        amount: plan.price,
      }, getHeaders());

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "HIVE.AI",
        description: `Purchase ${plan.coins} HIVE COINS`,
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/payments/verify`, {
              ...response,
              creditsToAdd: plan.coins,
              amount: plan.price * 100
            }, getHeaders());
            setCredits(verifyRes.data.credits);
            setIsPaymentOpen(false);
            alert("🔥 Payment Successful! HIVE COINS Added.");
          } catch (err) {
            alert("Verification failed: " + (err.response?.data?.error || "Error"));
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: { color: "#00ff88" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment failed", error);
      alert("Failed to initiate payment");
    }
  };

  const performTask = async (taskName, cost) => {
    if (!user) return setIsAuthOpen(true);
    if (credits < cost) {
      setIsPaymentOpen(true);
      return;
    }

    setStatus(`Processing ${taskName}...`);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/task`, {
        taskName,
        cost,
        imageUrl: 'https://raw.githubusercontent.com/meshyai/meshy-python/main/docs/assets/demo_image.png' // Default for now
      }, getHeaders());
      
      setCredits(data.remainingCredits);
      
      if (data.status === 'processing') {
        // Start Polling
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await axios.get(`${import.meta.env.VITE_API_URL}/task/status/${data.taskId}`, getHeaders());
            if (statusRes.data.status === 'succeeded') {
              clearInterval(pollInterval);
              setStatus('Ready');
              if (statusRes.data.resultUrl) {
                setFileUrl(statusRes.data.resultUrl); // Auto-load the result
              }
              alert(`✅ ${taskName} Completed!`);
            } else if (statusRes.data.status === 'failed') {
              clearInterval(pollInterval);
              setStatus('Task Failed');
              alert(`❌ ${taskName} Failed.`);
            }
          } catch (err) {
            clearInterval(pollInterval);
          }
        }, 5000);
      } else {
        setStatus('Ready');
        alert(`✅ ${taskName} Completed!`);
      }

    } catch (err) {
      setStatus('Task Failed');
      alert(err.response?.data?.error || "Task processing failed");
    }
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFileUrl(URL.createObjectURL(uploadedFile));
    setStatus('Analyzing...');
    const formData = new FormData();
    formData.append('file', uploadedFile);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/upload`, formData);
      setMetadata(response.data);
      setStatus('Ready');
    } catch (error) { setStatus('Upload Failed'); }
  };

  return (
    <div className="flex flex-col h-screen text-[#00ff88] select-none overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      
      {/* 1. TOP TOOLBAR (System Bar) */}
      <header className="h-14 border-b border-[#00ff88]/20 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Box size={22} className="text-[#00ff88] animate-pulse" />
            <span className="text-sm font-black tracking-widest text-white uppercase italic">HIVE.AI <span className="text-[#00ff88]/60 not-italic font-medium text-xs">v2.4</span></span>
          </div>
          <nav className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ff88]/60">
            <button className="hover:text-white transition-all hover:scale-105">File</button>
            <button className="hover:text-white transition-all hover:scale-105">Edit</button>
            <button className="hover:text-white transition-all hover:scale-105">Account</button>
            <button className="hover:text-white transition-all hover:scale-105">Help</button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-black/60 px-4 py-2 rounded-full border border-[#00ff88]/30 cyber-glow">
            <Activity size={14} className="text-[#00ff88]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">{status}</span>
          </div>
          <button 
            onClick={() => {
              if (user) {
                if (window.confirm("Terminate Neural Link (Logout)?")) {
                  localStorage.removeItem('hive_token');
                  setUser(null);
                  setCredits(0);
                }
              } else {
                setIsAuthOpen(true);
              }
            }} 
            className="flex items-center gap-2 bg-transparent border border-[#00ff88] px-6 py-2 rounded-full text-[#00ff88] hover:bg-[#00ff88] hover:text-black transition-all text-[10px] font-black uppercase italic tracking-widest cyber-glow"
          >
             <User size={14} /> {user ? user.name : 'Login'}
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT TOOLBAR (Manipulation Tools) */}
        <aside className="w-16 bg-black/40 border-r border-[#00ff88]/20 backdrop-blur-md flex flex-col items-center py-6 gap-6 shadow-2xl">
           <button title="Move (M)" className="p-3 bg-[#00ff88]/20 text-[#00ff88] rounded-2xl border border-[#00ff88]/40 cyber-glow"><Move size={24} /></button>
           <button title="Rotate (R)" className="p-3 hover:bg-[#00ff88]/10 text-[#00ff88]/40 hover:text-[#00ff88] rounded-2xl transition-all"><RotateCw size={24} /></button>
           <button title="Scale (S)" className="p-3 hover:bg-[#00ff88]/10 text-[#00ff88]/40 hover:text-[#00ff88] rounded-2xl transition-all"><Scaling size={24} /></button>
           <div className="w-10 h-px bg-[#00ff88]/20 my-2"></div>
           <button onClick={() => performTask('Hollow Model', 5)} title="Hollow" className="p-3 hover:bg-[#00ff88]/10 text-[#00ff88]/40 hover:text-[#00ff88] rounded-2xl transition-all"><Box size={24} /></button>
           <button onClick={() => performTask('AI Supports', 20)} title="Supports" className="p-3 hover:bg-[#00ff88]/10 text-[#00ff88]/40 hover:text-[#00ff88] rounded-2xl transition-all"><Layers size={24} /></button>
        </aside>

        {/* 3D VIEWPORT AREA */}
        <main className="flex-1 relative bg-transparent group overflow-hidden">
          <ThreeDViewer fileUrl={fileUrl} />

          {/* VIEWPORT CONTROLS (Floating) */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-2xl border border-[#00ff88]/20 p-2 rounded-2xl shadow-2xl">
            <button className="p-3 bg-[#00ff88]/10 text-white rounded-xl hover:bg-[#00ff88]/20 transition-all"><Eye size={18} /></button>
            <button className="p-3 hover:bg-white/5 text-gray-400 rounded-xl transition-all"><Maximize size={18} /></button>
            <div className="w-px h-8 bg-[#00ff88]/20 mx-2"></div>
            <label className="flex items-center gap-3 bg-[#00ff88] hover:bg-[#00ff88]/80 px-6 py-3 rounded-xl cursor-pointer transition-all font-black text-[10px] text-black uppercase italic tracking-widest cyber-glow">
              <Upload size={16} strokeWidth={3} />
              <span>Import STL</span>
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".stl" />
            </label>
          </div>

          {/* SLICE BUTTON (Floating Bottom Right) */}
          <button onClick={() => performTask('Slicing', 10)} className="absolute bottom-10 right-10 flex items-center gap-4 bg-[#00ff88] px-12 py-6 rounded-2xl shadow-2xl cyber-glow hover:scale-105 active:scale-95 transition-all group">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-black/60 uppercase tracking-widest leading-none mb-1">Compute Path</span>
              <span className="text-2xl font-black text-black uppercase italic tracking-tighter leading-none">SLICE</span>
            </div>
            <Play size={28} className="text-black fill-black" />
          </button>
        </main>

        {/* RIGHT PANEL (Settings & AI) */}
        <aside className="w-80 bg-black/40 border-l border-[#00ff88]/20 backdrop-blur-md flex flex-col shadow-2xl overflow-y-auto custom-scrollbar">
          
          {/* PRINTER SELECTOR */}
          <div className="p-6 border-b border-[#00ff88]/10">
             <p className="text-[10px] font-black text-[#00ff88]/60 mb-4 uppercase tracking-[0.3em] flex items-center gap-2">
               <Printer size={12} className="text-[#00ff88]" /> Active Machine
             </p>
             <div className="bg-black/60 border border-[#00ff88]/20 rounded-2xl p-4 flex items-center justify-between hover:border-[#00ff88] transition-all cursor-pointer group">
               <div className="flex flex-col">
                 <span className="text-xs font-black text-white uppercase tracking-tighter">{printer}</span>
                 <span className="text-[10px] text-[#00ff88]/40 uppercase font-bold mt-1">Resin (LCD/MSLA)</span>
               </div>
               <ChevronDown size={16} className="text-[#00ff88]/40 group-hover:text-[#00ff88]" />
             </div>
          </div>

          {/* TELEMETRY */}
          <div className="p-6 border-b border-[#00ff88]/10">
             <p className="text-[10px] font-black text-[#00ff88]/60 mb-4 uppercase tracking-[0.3em] flex items-center gap-2">
               <Activity size={12} className="text-[#00ff88]" /> Geometry Data
             </p>
             {metadata ? (
               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 p-4 rounded-2xl border border-[#00ff88]/10 cyber-card">
                    <p className="text-[10px] text-[#00ff88]/40 font-bold uppercase mb-2">Volume</p>
                    <p className="text-lg font-black text-white italic">{parseInt(metadata.volumeMM3)}<span className="text-[10px] not-italic ml-1 text-[#00ff88]/40">mm³</span></p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-2xl border border-[#00ff88]/10 cyber-card">
                    <p className="text-[10px] text-[#00ff88]/40 font-bold uppercase mb-2">Weight</p>
                    <p className="text-lg font-black text-white italic">{(parseFloat(metadata.volumeMM3) * 0.0011).toFixed(1)}<span className="text-[10px] not-italic ml-1 text-[#00ff88]/40">g</span></p>
                  </div>
               </div>
             ) : (
               <div className="py-12 text-center border-2 border-dashed border-[#00ff88]/10 rounded-2xl">
                 <p className="text-[10px] text-[#00ff88]/40 font-black uppercase italic tracking-widest">No Model Detected</p>
               </div>
             )}
          </div>

          {/* AI SUITE */}
          <div className="p-6">
             <p className="text-[10px] font-black text-[#00ff88]/60 mb-5 uppercase tracking-[0.3em] flex items-center gap-2">
               <Zap size={12} className="text-[#00ff88] animate-pulse" /> HIVE LABS (AI)
             </p>
             <div className="space-y-3">
               <button onClick={() => performTask('Vision-to-Mesh', 100)} className="w-full flex items-center justify-between p-5 bg-black/40 hover:bg-[#00ff88]/10 rounded-2xl transition-all border border-[#00ff88]/10 group cyber-card">
                 <div className="flex items-center gap-4 text-left leading-none">
                   <Zap size={20} className="text-[#00ff88]" />
                   <div>
                     <div className="text-[10px] font-black text-white uppercase italic tracking-tighter">Vision-to-Mesh</div>
                     <div className="text-[8px] text-[#00ff88]/40 font-bold uppercase mt-1">Image to 3D Model</div>
                   </div>
                 </div>
                 <span className="text-[10px] font-black text-black bg-[#00ff88] px-3 py-1 rounded-full uppercase tracking-tighter">100 HC</span>
               </button>

               <button onClick={() => performTask('AI Supports', 20)} className="w-full flex items-center justify-between p-5 bg-black/40 hover:bg-blue-500/10 rounded-2xl transition-all border border-blue-500/20 group cyber-card">
                 <div className="flex items-center gap-4 text-left leading-none">
                   <Layers size={20} className="text-blue-400" />
                   <div>
                     <div className="text-[10px] font-black text-white uppercase italic tracking-tighter">AI Supports</div>
                     <div className="text-[8px] text-blue-400/40 font-bold uppercase mt-1">Smart Auto-Support</div>
                   </div>
                 </div>
                 <span className="text-[10px] font-black text-black bg-blue-400 px-3 py-1 rounded-full uppercase tracking-tighter">20 HC</span>
               </button>
             </div>
          </div>

          <div className="mt-auto p-6 border-t border-[#00ff88]/10 bg-black/60">
             <div className="flex items-center justify-between mb-6">
               <div className="flex flex-col">
                 <span className="text-[8px] font-black text-[#00ff88]/40 uppercase tracking-[0.3em]">HIVE Balance</span>
                 <span className="text-2xl font-black text-white tracking-tighter italic">{credits} <span className="text-[#00ff88] text-xs not-italic">HC</span></span>
               </div>
               <button onClick={() => setIsPaymentOpen(true)} className="p-4 bg-[#00ff88]/10 text-[#00ff88] rounded-2xl border border-[#00ff88]/20 hover:bg-[#00ff88] hover:text-black transition-all cyber-glow"><ShoppingBag size={22} /></button>
             </div>
             <button className="w-full py-4 bg-transparent border border-[#00ff88]/20 text-[#00ff88]/40 rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:text-white hover:border-white transition-all">
                Access Archives
             </button>
          </div>
        </aside>
      </div>

      {/* 4. STATUS BAR */}
      <footer className="h-10 border-t border-[#00ff88]/10 bg-black/60 backdrop-blur-md flex items-center justify-between px-6 text-[10px] font-bold text-[#00ff88]/40">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-[#00ff88]">
            <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse shadow-[0_0_8px_#00ff88]"></div>
            <span className="uppercase tracking-widest">Global Link Active</span>
          </div>
          <span className="hover:text-white cursor-pointer uppercase tracking-widest transition-colors">System Log</span>
        </div>
        <div className="flex items-center gap-8 uppercase tracking-[0.2em]">
          <span className="text-white">{printer}</span>
          <span>Resin v4.0</span>
          <span>0.050mm</span>
        </div>
      </footer>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        setUser={setUser} 
        setCredits={setCredits} 
      />

      {/* PAYMENT MODAL */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-black/60 border border-[#00ff88]/30 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,255,136,0.2)] transition-all cyber-card">
            <div className="p-8 border-b border-[#00ff88]/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#00ff88] italic uppercase tracking-tighter">Power Up</h2>
                <p className="text-[10px] text-[#00ff88]/40 font-bold uppercase tracking-[0.3em] mt-2">Acquire Hive Coins</p>
              </div>
              <button onClick={() => setIsPaymentOpen(false)} className="p-3 hover:bg-[#00ff88]/10 rounded-full text-[#00ff88]/40 hover:text-[#00ff88] transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-4">
              {[
                { coins: 100, price: 99, label: 'Starter Pack', icon: <Zap size={20} className="text-[#00ff88]" /> },
                { coins: 500, price: 449, label: 'Pro Bundle', icon: <Layers size={20} className="text-blue-400" />, popular: true },
                { coins: 1000, price: 849, label: 'Creator Mega', icon: <Box size={20} className="text-purple-400" /> }
              ].map((plan) => (
                <button 
                  key={plan.coins}
                  onClick={() => handlePayment(plan)}
                  className={`w-full flex items-center justify-between p-6 rounded-3xl border transition-all group cyber-card ${plan.popular ? 'border-[#00ff88] bg-[#00ff88]/5' : 'border-[#00ff88]/10 bg-black/20 hover:border-[#00ff88]/40'}`}
                >
                  <div className="flex items-center gap-5 text-left">
                    <div className={`p-4 rounded-2xl ${plan.popular ? 'bg-[#00ff88] text-black shadow-[0_0_20px_#00ff88]' : 'bg-[#00ff88]/10 text-[#00ff88]'}`}>
                      {plan.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#00ff88]/40 uppercase tracking-widest">{plan.label}</p>
                      <p className="text-xl font-black text-white tracking-tighter italic mt-1">{plan.coins} HC</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {plan.popular && <span className="text-[10px] font-black bg-[#00ff88] text-black px-3 py-1 rounded-full uppercase mb-2 inline-block shadow-[0_0_15px_#00ff88]">Popular</span>}
                    <p className="text-2xl font-black text-white tracking-tighter">₹{plan.price}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="p-8 bg-black/40 text-center border-t border-[#00ff88]/10">
              <p className="text-[10px] text-[#00ff88]/40 font-black uppercase tracking-[0.2em]">Verification Protocol: Razorpay Secure</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
