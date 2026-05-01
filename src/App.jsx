import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MessageCircle, Plus, Moon, Sun, X, User, Clock, Trash2,
  Calendar, Users, CheckCircle2, Navigation, Check, AlertTriangle,
  Layers, ChevronRight, UserPlus, ArrowLeftRight, Settings,
  ChevronUp, ChevronDown, Sparkles, Send, Loader2, Award,
  TrendingUp, LogOut, Store, BadgeCheck
} from 'lucide-react';

const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const callGemini = async (prompt, systemInstruction = "") => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;
    const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined };
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) { return "מצטער, הייתה תקלה."; }
};

const SLOT_WIDTH = 140;
const LABEL_WIDTH = 90;
const DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", 'מוצ"ש'];
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
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
};

const generateInitialEvents = (categories) => {
  const all = []; let id = 1;
  const bizNames = ['מסעדת השף', 'בר הפינה', 'מרכז הצעירים'];
  const userNames = ['יוסי', 'מיכל', 'רוני', 'איתי'];
  DAYS.forEach(day => {
    for (let i = 0; i < 20; i++) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const start = 8 + (Math.floor(Math.random() * 8) * 2);
      const isBusiness = Math.random() > 0.7;
      all.push({ id: id++, title: isBusiness ? (cat.id === 'food' ? 'ערב יווני' : 'סדנא מיוחדת') : 'מפגש חברים', category: cat.id, start, duration: 1.5, day, user: isBusiness ? bizNames[Math.floor(Math.random()*bizNames.length)] : userNames[Math.floor(Math.random()*userNames.length)], participants: Math.floor(Math.random()*20)+5, invited: 40, isPersonal: false, isBusiness });
    }
  });
  all.push({ id: 99999, title: "האימון שלי", category: 'sports', start: 9.5, duration: 1.5, day: "א'", user: 'אתה', isPersonal: true, participants: 1, invited: 1 });
  return all;
};

const InvitationProgress = ({ current, total, size = "md" }) => {
  const percentage = (current / total) * 100;
  const radius = size === "md" ? 12 : 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={radius*2+6} height={radius*2+6} className="-rotate-90">
      <circle cx={radius+3} cy={radius+3} r={radius} stroke="#e2e8f0" strokeWidth="3" fill="none" />
      <circle cx={radius+3} cy={radius+3} r={radius} stroke="white" strokeWidth="3" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
      <text x={radius+3} y={radius+3} textAnchor="middle" dominantBaseline="middle" className="rotate-90" fill="white" fontSize={size==="md"?"9":"11"} fontWeight="bold" transform={`rotate(90, ${radius+3}, ${radius+3})`}>{current}</text>
    </svg>
  );
};

export default function App() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [events, setEvents] = useState(() => generateInitialEvents(INITIAL_CATEGORIES));
  const [currentDay, setCurrentDay] = useState("\u05d0'");
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

  const getNowDecimal = () => { const now = new Date(); return now.getHours() + now.getMinutes() / 60; };
  const startHour = useMemo(() => currentDay === "\u05d0'" ? Math.max(7, Math.min(Math.floor(getNowDecimal()), 23)) : 7, [currentDay]);
  const displayHours = useMemo(() => Array.from({length: (24.5 - startHour) * 2}, (_, i) => startHour + i * 0.5), [startHour]);
  const filteredEvents = useMemo(() => events.filter(e => e.day === currentDay && (currentDay === "\u05d0'" ? (e.start + e.duration >= getNowDecimal()) : true)), [events, currentDay]);
  const isTimeOccupied = (time, duration = 0.5) => filteredEvents.some(e => e.isPersonal && (time < e.start + e.duration) && (time + duration > e.start));
  const myActivitiesTodayCount = useMemo(() => filteredEvents.filter(e => e.isPersonal).length, [filteredEvents]);

  const totalContentWidth = displayHours.filter(h => h % 1 === 0).length * SLOT_WIDTH;

  const toggleJoin = (event) => {
    if (event.user === '\u05d0\u05ea\u05d4' && event.isPersonal) {
      setEvents(events.filter(e => e.id !== event.id));
    } else {
      if (!event.isPersonal && isTimeOccupied(event.start, event.duration)) return;
      setEvents(events.map(e => e.id === event.id ? { ...e, isPersonal: !e.isPersonal, participants: e.isPersonal ? e.participants - 1 : e.participants + 1 } : e));
    }
    setSideDrawer(null);
    setSelectedEvent(null);
  };

  return (
    <div dir="rtl" className={`min-h-screen font-sans ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500 flex items-center justify-center text-indigo-600 shadow-sm overflow-hidden active:scale-90 transition-transform">
            <User size={18} />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-indigo-600">LOOP</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 shadow-sm active:scale-90">{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <button onClick={() => setIsManagingCategories(true)} className="p-2 bg-slate-100 dark:bg-slate-800 text-indigo-600 rounded-xl shadow-sm active:scale-90"><Settings size={18}/></button>
            <button onClick={() => setIsChatOpen(true)} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95"><MessageCircle size={18}/></button>
          </div>
        </div>
        {aiInsight && <p className="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl px-3 py-2 mb-2">{aiInsight}</p>}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {DAYS.map(day => (
            <button key={day} onClick={() => setCurrentDay(day)} className={`px-5 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all ${currentDay === day ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>{day}</button>
          ))}
        </div>
      </div>

      {/* Main Schedule Grid - Fixed layout with sticky labels */}
      <div className="flex flex-col overflow-hidden">

        {/* Time axis row - sticky top, scrolls with content horizontally */}
        <div className="flex" style={{position:'sticky', top: 0, zIndex: 40}}>
          {/* Corner spacer - same width as label column */}
          <div style={{minWidth: LABEL_WIDTH, width: LABEL_WIDTH}} className="bg-white dark:bg-slate-950 border-b border-r border-slate-200 dark:border-slate-800 shrink-0"></div>
          {/* Scrollable time headers */}
          <div ref={scrollContainerRef} className="overflow-x-auto flex-1 no-scrollbar" id="time-scroll">
            <div className="flex bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800" style={{width: totalContentWidth}}>
              {displayHours.filter(h => h % 1 === 0).map(h => (
                <div key={h} className="shrink-0 text-center text-[11px] font-bold text-slate-400 py-2 border-r border-slate-100 dark:border-slate-800" style={{width: SLOT_WIDTH}}>
                  {h.toString().padStart(2,'0')}:00
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* My Schedule row */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {/* Sticky label */}
          <div style={{minWidth: LABEL_WIDTH, width: LABEL_WIDTH}} className="sticky right-0 z-30 bg-indigo-50 dark:bg-indigo-900/20 flex flex-col items-center justify-center py-2 border-r border-slate-200 dark:border-slate-800 shrink-0">
            <span className="text-[10px] font-black text-indigo-600 text-center leading-tight">הלו"ז שלי</span>
          </div>
          {/* Scrollable row content - synced scroll */}
          <div className="overflow-x-auto flex-1 no-scrollbar" onScroll={e => {
            const all = document.querySelectorAll('.sync-scroll');
            all.forEach(el => { if (el !== e.currentTarget) el.scrollLeft = e.currentTarget.scrollLeft; });
          }} style={{scrollbarWidth:'none'}}>
            <div className="relative bg-indigo-50/30 dark:bg-indigo-900/10" style={{width: totalContentWidth, height: 56}}>
              {displayHours.filter(h => h % 1 === 0).map(h => (
                <div key={h} className="absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-800" style={{left: (h - startHour) * SLOT_WIDTH, width: SLOT_WIDTH}} />
              ))}
              {filteredEvents.filter(e => e.isPersonal).map(event => {
                const cat = categories.find(c => c.id === event.category) || categories[0];
                return (
                  <div key={event.id} onClick={() => setSelectedEvent(event)}
                    className="absolute h-10 top-1/2 -translate-y-1/2 rounded-[18px] flex items-center px-3 shadow-xl text-white font-black cursor-pointer z-10 border-2 border-white/20 overflow-hidden"
                    style={{ left: (event.start - startHour) * SLOT_WIDTH + 4, width: event.duration * SLOT_WIDTH - 8, backgroundColor: cat.color }}>
                    <span className="text-base mr-1">{cat.icon}</span>
                    <span className="text-xs truncate">{event.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category rows */}
        {categories.map((cat) => (
          <div key={cat.id} className="flex border-b border-slate-200 dark:border-slate-800">
            {/* Sticky category label - stays visible when scrolling horizontally */}
            <div style={{minWidth: LABEL_WIDTH, width: LABEL_WIDTH}} className="sticky right-0 z-30 bg-white dark:bg-slate-950 flex flex-col items-center justify-center py-3 border-r border-slate-200 dark:border-slate-800 shrink-0 gap-1">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-md" style={{backgroundColor: cat.bg}}>{cat.icon}</div>
                <button onClick={() => setAddingCategoryId(addingCategoryId === cat.id ? null : cat.id)}
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-slate-950 shadow-xl transition-all ${addingCategoryId === cat.id ? 'bg-rose-500 rotate-45' : 'bg-indigo-600'}`}>
                  <Plus size={10}/>
                </button>
              </div>
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">{cat.label}</span>
            </div>

            {/* Scrollable row */}
            <div className="overflow-x-auto flex-1 sync-scroll no-scrollbar" onScroll={e => {
              document.querySelectorAll('.sync-scroll').forEach(el => { if (el !== e.currentTarget) el.scrollLeft = e.currentTarget.scrollLeft; });
              const ts = document.getElementById('time-scroll');
              if (ts) ts.scrollLeft = e.currentTarget.scrollLeft;
            }} style={{scrollbarWidth:'none'}}>
              <div className="relative" style={{width: totalContentWidth, height: 80}}>
                {displayHours.filter(h => h % 1 === 0).map(h => (
                  <div key={h} className="absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-800"
                    style={{left: (h - startHour) * SLOT_WIDTH, width: SLOT_WIDTH}}
                    onClick={() => addingCategoryId === cat.id && !isTimeOccupied(h) && setEventDraft({ category: cat, start: h, duration: 1 })}
                  />
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
                      <div key={timeStr}
                        onClick={e => { e.stopPropagation(); if (isGroup) setSideDrawer({ events: group, category: cat, time }); else setSelectedEvent(mainEvent); }}
                        className={`absolute h-16 top-1/2 -translate-y-1/2 rounded-[28px] flex items-center justify-between pl-2 pr-5 shadow-2xl border transition-all active:scale-95 cursor-pointer z-20 ${isTimeOccupied(time, mainEvent.duration) ? 'opacity-20 grayscale pointer-events-none' : 'hover:scale-[1.04]'} ${isBusiness ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-white/20'}`}
                        style={{ left: (time - startHour) * SLOT_WIDTH + 4, width: mainEvent.duration * SLOT_WIDTH - 8, backgroundColor: cat.color, color: 'white', boxShadow: isGroup ? `0 8px 0 -4px ${cat.color}66` : '' }}>
                        {isGroup ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-black">{group.length} הצעות</span>
                            <span className="text-[10px] opacity-70">צפה בכל</span>
                          </div>
                        ) : (
                          <div className="flex flex-col flex-1 overflow-hidden">
                            {isBusiness && <BadgeCheck size={10} className="text-amber-300 mb-0.5"/>}
                            <span className="text-xs font-black truncate">{mainEvent.title}</span>
                            <span className="text-[10px] opacity-80">{formatTime(time)} - {formatTime(time + mainEvent.duration)}</span>
                          </div>
                        )}
                        {!isGroup && <InvitationProgress current={mainEvent.participants} total={mainEvent.invited} size="md" />}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Side drawer - group events */}
      {sideDrawer && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSideDrawer(null)}>
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="font-black text-lg mb-4">{sideDrawer.events.length} הצעות בשעה {formatTime(sideDrawer.time)}</h3>
            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
              {sideDrawer.events.map(ev => (
                <div key={ev.id} onClick={() => { setSelectedEvent(ev); setSideDrawer(null); }}
                  className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer active:scale-98"
                  style={{backgroundColor: sideDrawer.category.bg}}>
                  <InvitationProgress current={ev.participants} total={ev.invited} size="lg" />
                  <div>
                    <p className="font-black text-sm">{ev.title}</p>
                    <p className="text-xs text-slate-500">{ev.user} • {ev.participants} משתתפים</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setSelectedEvent(null)}>
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-100"><X size={18}/></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{backgroundColor: (categories.find(c=>c.id===selectedEvent.category)||categories[0]).bg}}>
                {(categories.find(c=>c.id===selectedEvent.category)||categories[0]).icon}
              </div>
              <div>
                <h2 className="text-xl font-black">{selectedEvent.title}</h2>
                <p className="text-sm text-slate-500">{formatTime(selectedEvent.start)} - {formatTime(selectedEvent.start + selectedEvent.duration)}</p>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                <Users size={14} className="text-indigo-500"/>
                <span className="text-xs font-bold">{selectedEvent.participants} / {selectedEvent.invited}</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                <User size={14} className="text-indigo-500"/>
                <span className="text-xs font-bold">{selectedEvent.user}</span>
              </div>
            </div>
            <button onClick={() => toggleJoin(selectedEvent)}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 active:scale-95 shadow-lg transition-all ${selectedEvent.isPersonal ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>
              {selectedEvent.isPersonal ? <><Trash2 size={16}/> הסר מהלו"ז</> : <><Check size={16}/> הצטרף!</>}
            </button>
          </div>
        </div>
      )}

      {/* Event draft modal */}
      {eventDraft && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setEventDraft(null)}>
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="font-black text-lg mb-4">הצעה ל{eventDraft.category.label}</h3>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="כותרת הפעילות..."
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 text-right"
                value={eventDraft.suggestedTitle || ''}
                onChange={e => setEventDraft({...eventDraft, suggestedTitle: e.target.value})} />
            </div>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-400 mb-1">התחלה</p>
                <input type="time" className="bg-transparent text-xl font-black text-indigo-600 outline-none w-full text-center"
                  defaultValue={formatTime(eventDraft.start)}
                  onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setEventDraft({...eventDraft, start: h+m/60}); }} />
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-400 mb-1">סיום</p>
                <input type="time" className="bg-transparent text-xl font-black text-indigo-600 outline-none w-full text-center"
                  defaultValue={formatTime(eventDraft.start + eventDraft.duration)}
                  onChange={e => { const [h,m] = e.target.value.split(':').map(Number); setEventDraft({...eventDraft, duration: (h+m/60) - eventDraft.start}); }} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEventDraft(null)} className="flex-1 py-4 rounded-2xl font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 active:scale-95">ביטול</button>
              <button onClick={() => {
                setEvents([...events, { id: Date.now(), title: eventDraft.suggestedTitle || `פעילות ${eventDraft.category.label}`, category: eventDraft.category.id, start: eventDraft.start, duration: eventDraft.duration, day: currentDay, user: 'אתה', isPersonal: true, participants: 1, invited: 10 }]);
                setEventDraft(null); setAddingCategoryId(null);
              }} className="flex-[2] py-4 rounded-2xl font-black text-xs bg-indigo-600 text-white shadow-xl flex items-center justify-center gap-2 active:scale-95">אשרור ✨</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setIsProfileOpen(false)}>
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <button onClick={() => setIsProfileOpen(false)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-100"><X size={18}/></button>
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-black text-indigo-600 mb-3">א</div>
              <h2 className="text-xl font-black">שלום, אתה</h2>
              <div className="flex items-center gap-1 mt-1"><BadgeCheck size={14} className="text-indigo-500"/><span className="text-xs text-indigo-500 font-bold">מאומת</span></div>
            </div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-indigo-600">{myActivitiesTodayCount}</p>
                <p className="text-xs text-slate-500">פעילויות היום</p>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-green-500">94%</p>
                <p className="text-xs text-slate-500">דירוג</p>
              </div>
            </div>
            <button onClick={() => setIsProfileOpen(false)} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95"><LogOut size={16}/> התנתקות</button>
          </div>
        </div>
      )}

      {/* AI Chat */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setIsChatOpen(false)} className="p-2 rounded-xl bg-slate-100"><X size={18}/></button>
            <h2 className="font-black text-lg">Loop AI</h2>
            <Sparkles size={20} className="text-indigo-500"/>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {aiChatMessages.length === 0 && <p className="text-center text-slate-400 text-sm mt-8">שאל אותי על היום שלך 😊</p>}
            {aiChatMessages.map((msg, i) => (
              <div key={i} className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${msg.role==='user' ? 'bg-indigo-600 text-white self-start' : 'bg-slate-100 dark:bg-slate-800 self-end'}`}>{msg.text}</div>
            ))}
            {isAiLoading && <div className="self-end bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl"><Loader2 size={16} className="animate-spin text-indigo-500"/></div>}
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <input value={aiUserInput} onChange={e => setAiUserInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleAiChat()}
              placeholder="שאל משהו..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm outline-none text-right" />
            <button onClick={handleAiChat} className="p-3 bg-indigo-600 text-white rounded-2xl"><Send size={18}/></button>
          </div>
        </div>
      )}
    </div>
  );
}
