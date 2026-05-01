import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Plus, 
  Moon, 
  Sun, 
  X, 
  User, 
  Clock, 
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  Navigation,
  Check,
  AlertTriangle,
  Layers,
  ChevronRight,
  UserPlus,
  ArrowLeftRight,
  Settings,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Send,
  Loader2,
  Award,
  TrendingUp,
  LogOut,
  Store,
  BadgeCheck
} from 'lucide-react';


const apiKey = ""; 
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

const callGemini = async (prompt, systemInstruction = "") => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    return "מצטער, הייתה תקלה בחיבור ל-AI.";
  }
};

const SLOT_WIDTH = 140; 
const DAYS = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'מוצ"ש'];
const MIN_DURATION = 40 / 60; 

const INITIAL_CATEGORIES = [
  { id: 'sports', label: 'ספורט', icon: '⚽', color: '#f97316', bg: '#fff7ed' },
  { id: 'gaming', label: 'גיימינג', icon: '🎮', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'food', label: 'אוכל ובילוי', icon: '🍷', color: '#ef4444', bg: '#fef2f2' },
  { id: 'study', label: 'למידה', icon: '📚', color: '#22c55e', bg: '#f0fdf4' },
  { id: 'music', label: 'מוזיקה', icon: '🎸', color: '#ec4899', bg: '#fdf2f8' },
];

const formatTime = (dec) => {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const generateInitialEvents = (categories) => {
  const all = [];
  let id = 1;
  const bizNames = ['מסעדת השף', 'בר הפינה', 'מרכז הצעירים'];
  const userNames = ['יוסי', 'מיכל', 'רוני', 'איתי'];
  DAYS.forEach(day => {
    for (let i = 0; i < 20; i++) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const start = 8 + (Math.floor(Math.random() * 8) * 2); 
      const isBusiness = Math.random() > 0.7; 
      all.push({
        id: id++,
        title: isBusiness ? (cat.id === 'food' ? 'ערב יווני' : 'סדנא מיוחדת') : 'מפגש חברים',
        category: cat.id,
        start,
        duration: 1.5,
        day,
        user: isBusiness ? bizNames[Math.floor(Math.random() * bizNames.length)] : userNames[Math.floor(Math.random() * userNames.length)],
        participants: Math.floor(Math.random() * 20) + 5,
        invited: 40,
        isPersonal: false,
        isBusiness: isBusiness
      });
    }
  });
  all.push({ id: 99999, title: 'האימון שלי', category: 'sports', start: 9.5, duration: 1.5, day: 'א\'', user: 'אתה', isPersonal: true, participants: 1, invited: 1 });
  return all;
};

const InvitationProgress = ({ current, total, size = "md" }) => {
  const percentage = (current / total) * 100;
  const radius = size === "md" ? 12 : 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className={`relative ${size === "md" ? "w-8 h-8" : "w-10 h-10"} flex items-center justify-center shrink-0`}>
      <svg className="w-full h-full transform -rotate-90">
        <circle cx={size === "md" ? "16" : "20"} cy={size === "md" ? "16" : "20"} r={radius} stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-white/10" />
        <circle cx={size === "md" ? "16" : "20"} cy={size === "md" ? "16" : "20"} r={radius} stroke="currentColor" strokeWidth="2.5" fill="transparent" strokeDasharray={circumference} style={{ strokeDashoffset }} className="text-white transition-all duration-1000 ease-out" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black">{current}</div>
    </div>
  );
};

export default function App() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [events, setEvents] = useState(() => generateInitialEvents(INITIAL_CATEGORIES));
  const [currentDay, setCurrentDay] = useState('א\'');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [addingCategoryId, setAddingCategoryId] = useState(null);
  const [eventDraft, setEventDraft] = useState(null);
  const [sideDrawer, setSideDrawer] = useState(null);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiUserInput, setAiUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const scrollContainerRef = useRef(null);

  const getNowDecimal = () => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  };

  const startHour = useMemo(() => currentDay === 'א\'' ? Math.max(7, Math.min(Math.floor(getNowDecimal()), 23)) : 7, [currentDay]);
  const displayHours = useMemo(() => Array.from({length: (24.5 - startHour) * 2}, (_, i) => startHour + i * 0.5), [startHour]);
  const filteredEvents = useMemo(() => events.filter(e => e.day === currentDay && (currentDay === 'א\'' ? (e.start + e.duration >= getNowDecimal()) : true)), [events, currentDay]);

  const isTimeOccupied = (time, duration = 0.5) => filteredEvents.some(e => e.isPersonal && (time < e.start + e.duration) && (time + duration > e.start));
  const myActivitiesTodayCount = useMemo(() => filteredEvents.filter(e => e.isPersonal).length, [filteredEvents]);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const topEvents = filteredEvents.filter(e => !e.isPersonal).sort((a,b) => b.participants - a.participants).slice(0, 2);
        if (topEvents.length === 0) return;
        const res = await callGemini(`הנה אירועים מרכזיים היום: ${topEvents.map(e => e.title).join(', ')}. כתוב משפט המלצה אחד קצר.`, "אתה Loop AI, עוזר חברתי.");
        setAiInsight(res);
      } catch (e) {}
    };
    fetchInsight();
  }, [currentDay]);

  const handleAiChat = async () => {
    if (!aiUserInput.trim() || isAiLoading) return;
    setAiChatMessages(prev => [...prev, { role: 'user', text: aiUserInput }]);
    setAiUserInput('');
    setIsAiLoading(true);
    try {
      const response = await callGemini(aiUserInput, "אתה Loop AI. עזור למשתמש לתכנן את היום שלו באילת.");
      setAiChatMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (e) {} finally { setIsAiLoading(false); }
  };

  const toggleJoin = (event) => {
    if (event.user === 'אתה' && event.isPersonal) {
      setEvents(events.filter(e => e.id !== event.id));
    } else {
      if (!event.isPersonal && isTimeOccupied(event.start, event.duration)) return;
      setEvents(events.map(e => e.id === event.id ? { ...e, isPersonal: !e.isPersonal, participants: e.isPersonal ? e.participants - 1 : e.participants + 1 } : e));
    }
    setSideDrawer(null);
    setSelectedEvent(null);
  };

  return (
    <div className={`flex flex-col h-screen font-sans transition-all duration-500 overflow-hidden ${isDarkMode ? 'bg-[#030508] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`pt-3 pb-2 px-4 flex items-center justify-between z-50 ${isDarkMode ? 'bg-[#030508]' : 'bg-white border-b border-slate-100'}`}>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500 flex items-center justify-center text-indigo-600 shadow-sm overflow-hidden active:scale-90 transition-transform"><User size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-indigo-500 to-indigo-300 bg-clip-text text-transparent leading-none">LOOP</h1>
            {aiInsight && <span className="text-[7px] font-bold text-indigo-500 animate-pulse uppercase tracking-widest truncate max-w-[100px]">{aiInsight}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 shadow-sm active:scale-90 transition-all">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => setIsManagingCategories(true)} className="p-2 bg-slate-100 dark:bg-slate-800 text-indigo-600 rounded-xl shadow-sm active:scale-90 transition-all"><Settings size={18} /></button>
          <button onClick={() => setIsChatOpen(true)} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg relative active:scale-95 transition-transform">
            <MessageCircle size={18} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
          </button>
        </div>
      </header>
      <div className="py-2 px-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0 z-40 border-b dark:border-slate-800">
        {DAYS.map(day => (
          <button key={day} onClick={() => setCurrentDay(day)} className={`px-5 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all ${currentDay === day ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>{day}</button>
        ))}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div ref={scrollContainerRef} className="flex-1 overflow-auto no-scrollbar relative overscroll-contain">
          <div className="relative min-w-max min-h-full">
            <div className="sticky top-0 z-40">
              <div className={`h-8 flex items-center border-b ${isDarkMode ? 'bg-[#030508]/98 border-slate-800' : 'bg-white/98 border-slate-200'} backdrop-blur-md`}>
                <div className="w-32 shrink-0 border-r border-transparent" />
                <div className="flex">
                  {displayHours.filter(h => h % 1 === 0).map(h => (
                    <div key={h} className="h-full border-r border-slate-200/10 dark:border-slate-800/10 flex items-center px-4 text-[9px] font-mono font-black text-indigo-500/50 uppercase" style={{ width: SLOT_WIDTH }}>{h.toString().padStart(2, '0')}:00</div>
                  ))}
                </div>
              </div>
              <div className={`h-16 flex items-center border-b shadow-sm ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md`}>
                <div className={`w-32 shrink-0 px-4 text-center border-r dark:border-slate-800`}>
                    <span className="text-[10px] font-black text-indigo-500 uppercase">הלו"ז שלי</span>
                </div>
                <div className="relative flex-1 h-full flex items-center">
                  {displayHours.filter(h => h % 1 === 0).map(h => (<div key={h} className="h-full border-r border-slate-100/20 dark:border-slate-800/10" style={{ width: SLOT_WIDTH }} />))}
                  {filteredEvents.filter(e => e.isPersonal).map(event => {
                    const cat = categories.find(c => c.id === event.category) || categories[0];
                    return (
                      <div key={event.id} onClick={() => setSelectedEvent(event)} className="absolute h-10 rounded-[18px] flex items-center px-3 shadow-xl text-white font-black cursor-pointer z-10 border-2 border-white/20 overflow-hidden" style={{ left: (event.start - startHour) * SLOT_WIDTH + 8, width: event.duration * SLOT_WIDTH - 16, backgroundColor: cat.color }}>
                        <span className="shrink-0 mr-1 text-sm">{cat.icon}</span>
                        <span className="truncate text-[10px] font-black uppercase">{event.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="py-4 space-y-4">
              {categories.map((cat) => (
                <div key={cat.id} className="h-24 flex items-center group relative">
                  <div className={`w-32 shrink-0 px-4 flex flex-col items-center justify-center border-r h-full sticky left-0 z-30 transition-all ${isDarkMode ? 'bg-[#030508]/95 border-slate-800' : 'bg-slate-50/95 border-slate-100'} backdrop-blur-md`}>
                    <div className="relative">
                      <div className="w-14 h-14 rounded-[22px] flex items-center justify-center text-4xl shadow-xl transition-all duration-300" style={{ backgroundColor: cat.bg, background: `linear-gradient(145deg, ${cat.color}20, ${cat.color}10)` }}>
                        {cat.icon}
                      </div>
                      <button onClick={() => setAddingCategoryId(addingCategoryId === cat.id ? null : cat.id)} className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-slate-900 shadow-2xl transition-all ${addingCategoryId === cat.id ? 'bg-rose-500 rotate-45' : 'bg-indigo-600'}`}>
                        {addingCategoryId === cat.id ? <X size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                    <span className="text-[9px] font-black opacity-30 uppercase truncate w-full text-center tracking-widest mt-2">{cat.label}</span>
                  </div>
                  <div className="relative flex-1 h-full flex">
                    {displayHours.map(h => (
                      <div key={h} className="h-full border-r border-slate-200/5 dark:border-slate-800/5" style={{ width: SLOT_WIDTH / 2 }} onClick={() => addingCategoryId === cat.id && !isTimeOccupied(h) && setEventDraft({ category: cat, start: h, duration: 1 })} />
                    ))}
                    {(() => {
                      const catEvents = filteredEvents.filter(e => e.category === cat.id && !e.isPersonal);
                      const grouped = {};
                      catEvents.forEach(e => { if (!grouped[e.start]) grouped[e.start] = []; grouped[e.start].push(e); });
                      return Object.entries(grouped).map(([timeStr, group]) => {
                        const time = parseFloat(timeStr);
                        const isGroup = group.length > 1;
                        const mainEvent = group[0];
                        const isBusiness = group.some(e => e.isBusiness);
                        return (
                          <div
                            key={timeStr}
                            onClick={(e) => { e.stopPropagation(); if (isGroup) setSideDrawer({ events: group, category: cat, time }); else setSelectedEvent(mainEvent); }}
                            className={`absolute h-16 top-1/2 -translate-y-1/2 rounded-[28px] flex items-center justify-between pl-2 pr-5 shadow-2xl border transition-all active:scale-95 cursor-pointer z-20 ${isTimeOccupied(time, mainEvent.duration) ? 'opacity-20 grayscale pointer-events-none' : 'hover:scale-[1.04]'} ${isBusiness ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-white/20'}`}
                            style={{ left: (time - startHour) * SLOT_WIDTH + 8, width: mainEvent.duration * SLOT_WIDTH - 16, backgroundColor: cat.color, color: 'white', boxShadow: isGroup ? `0 8px 0 -4px ${cat.color}66` : '' }}
                          >
                            <div className="flex items-center gap-3 overflow-hidden text-right flex-1">
                               {isGroup ? (
                                 <div className="flex items-center gap-2">
                                    <Layers size={18} className="opacity-70" />
                                    <div className="flex flex-col"><span className="text-[12px] font-black uppercase leading-none">{group.length} הצעות</span><span className="text-[8px] opacity-70 font-bold uppercase tracking-widest mt-1">צפה בהכל</span></div>
                                 </div>
                               ) : (
                                 <div className="flex flex-col leading-none min-w-0">
                                   <div className="flex items-center gap-1.5">{isBusiness && <BadgeCheck size={14} className="text-amber-300 shrink-0" />}<span className="text-[12px] font-black truncate uppercase tracking-tight">{mainEvent.title}</span></div>
                                   <span className="text-[8px] opacity-80 font-bold uppercase tracking-widest mt-1">{formatTime(time)} - {formatTime(time + mainEvent.duration)}</span>
                                 </div>
                               )}
                            </div>
                            {!isGroup && <div className="relative w-8 h-8 flex items-center justify-center bg-white/20 rounded-full border border-white/10 shrink-0 text-[8px] font-black">{mainEvent.participants}</div>}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ))}
            </div>
            <div className="h-40" />
          </div>
        </div>
      </div>

      {isProfileOpen && (
        <div className="fixed inset-0 z-[1100] flex items-end">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md animate-in fade-in" onClick={() => setIsProfileOpen(false)} />
          <div className={`relative w-full rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-10 ${isDarkMode ? 'bg-[#0a0f1e] text-white border-t border-slate-800' : 'bg-white text-slate-900'}`}>
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8 opacity-40 shrink-0" />
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 p-1 mb-4 shadow-xl"><div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-4xl font-black italic text-indigo-600">א</div></div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic text-right">שלום, אתה</h2>
              <div className="flex items-center gap-2 mt-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full"><BadgeCheck size={14} className="text-indigo-600" /><span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest italic">אילתי מאומת</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border dark:border-slate-800 flex flex-col items-center">
                  <span className="text-[9px] font-black opacity-40 uppercase mb-1">פעילויות היום</span>
                  <div className="flex items-center gap-2"><Clock size={16} className="text-indigo-500" /><span className="text-2xl font-black">{myActivitiesTodayCount}</span></div>
               </div>
               <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border dark:border-slate-800 flex flex-col items-center">
                  <span className="text-[9px] font-black opacity-40 uppercase mb-1 text-center leading-none">דירוג חברתי</span>
                  <div className="flex items-center gap-2 mt-1"><TrendingUp size={16} className="text-indigo-500" /><span className="text-2xl font-black">94%</span></div>
               </div>
            </div>
            <div className="space-y-3"><button className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black text-sm uppercase flex items-center justify-center gap-3 active:scale-95 transition-all"><Settings size={18} /> הגדרות</button><button onClick={() => setIsProfileOpen(false)} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-sm uppercase flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-rose-500/20"><LogOut size={18} /> התנתקות</button></div>
          </div>
        </div>
      )}

      {eventDraft && (
        <div className="fixed inset-0 z-[1200] flex items-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setEventDraft(null)} />
          <div className={`relative w-full rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-10 ${isDarkMode ? 'bg-[#0a0f1e] text-white border-t border-slate-800' : 'bg-white text-slate-900'}`}>
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 opacity-40 shrink-0" />
            <div className="flex flex-col items-center mb-6 text-center">
               <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-4xl shadow-xl" style={{ backgroundColor: eventDraft.category.bg }}>{eventDraft.category.icon}</div>
               <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-right w-full">הצעה ל{eventDraft.category.label}</h2>
               <div className="w-full mt-6 flex items-center gap-2"><input type="text" placeholder="כותרת הפעילות..." className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 text-right" value={eventDraft.suggestedTitle || ''} onChange={(e) => setEventDraft({...eventDraft, suggestedTitle: e.target.value})} /><button onClick={async () => { setIsGeneratingIdea(true); const res = await callGemini(`כותרת קצרה ומזמינה ל${eventDraft.category.label}`); setEventDraft(prev => ({...prev, suggestedTitle: res.replace(/"/g, '')})); setIsGeneratingIdea(false); }} className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">{isGeneratingIdea ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}</button></div>
               <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-5 rounded-[28px] w-full mt-6 flex justify-between items-center shadow-inner"><div className="flex-1 text-center"><div className="text-[9px] font-black text-indigo-500 uppercase mb-1">התחלה</div><input type="time" className="bg-transparent text-2xl font-black text-indigo-600 outline-none w-full text-center" defaultValue={formatTime(eventDraft.start)} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); setEventDraft({...eventDraft, start: h + m/60}); }} /></div><ArrowLeftRight size={20} className="text-indigo-300 opacity-50" /><div className="flex-1 text-center"><div className="text-[9px] font-black text-indigo-500 uppercase mb-1">סיום</div><input type="time" className="bg-transparent text-2xl font-black text-indigo-600 outline-none w-full text-center" defaultValue={formatTime(eventDraft.start + eventDraft.duration)} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); setEventDraft({...eventDraft, duration: (h + m/60) - eventDraft.start}); }} /></div></div>
            </div>
            <div className="flex gap-3 w-full mt-4"><button onClick={() => setEventDraft(null)} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase bg-slate-100 dark:bg-slate-800 text-slate-400 active:scale-95 transition-all">ביטול</button><button onClick={() => { setEvents([...events, { id: Date.now(), title: eventDraft.suggestedTitle || `פעילות ${eventDraft.category.label}`, category: eventDraft.category.id, start: eventDraft.start, duration: eventDraft.duration, day: currentDay, user: 'אתה', isPersonal: true, participants: 1, invited: 10 }]); setEventDraft(null); setAddingCategoryId(null); }} className="flex-[2] py-4 rounded-2xl font-black text-xs uppercase bg-indigo-600 text-white shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"><Check size={20} strokeWidth={4} /> אישור ✨</button></div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-in-from-bottom { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slide-in-from-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-in { animation-duration: 350ms; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); animation-fill-mode: forwards; }
      `}} />
    </div>
  );
}
