"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();
  
  const [showSplash, setShowSplash] = useState(true);
  const [profile, setProfile] = useState<{name: string, avatar: string, coins: number} | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempAvatar, setTempAvatar] = useState("🧔🏻‍♂️");
  const [currentScreen, setCurrentScreen] = useState<'home' | 'friends' | 'create' | 'join' | 'bots'>('home');
  const [joinCode, setJoinCode] = useState("");
  const [betAmount, setBetAmount] = useState(50);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isCreating, setIsCreating] = useState(false);
  
  // ⭐️ NEW: Advanced Audio States
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  
  const AVATARS = ['🧔🏻‍♂️', '👱🏼‍♀️', '👨🏾‍🦱', '👩🏻‍🦰', '👦🏻', '👧🏽', '👽', '🤖'];

  useEffect(() => {
    setBgmMuted(localStorage.getItem('uno_bgm_muted') === 'true');
    setSfxMuted(localStorage.getItem('uno_sfx_muted') === 'true');
    
    const savedProfile = localStorage.getItem('uno_profile');
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfile(parsed); setTempName(parsed.name); setTempAvatar(parsed.avatar);
    }
  }, []);

  const handleSplashClick = () => {
    try { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); ctx.resume(); } catch(e){}
    setShowSplash(false);
  };

  const toggleBGM = () => { const newVal = !bgmMuted; setBgmMuted(newVal); localStorage.setItem('uno_bgm_muted', String(newVal)); };
  const toggleSFX = () => { const newVal = !sfxMuted; setSfxMuted(newVal); localStorage.setItem('uno_sfx_muted', String(newVal)); };
  
  const saveProfile = () => {
    if (!tempName.trim()) return;
    const coinsToSave = profile?.coins || 1000;
    const newProfile = { name: tempName, avatar: tempAvatar, coins: coinsToSave };
    localStorage.setItem('uno_profile', JSON.stringify(newProfile));
    setProfile(newProfile);
  };

  const createRoom = async (withBots: boolean = false) => {
    if (!profile) return;
    setIsCreating(true);
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const initialPlayers = [{ name: profile.name, hand: [], avatar: profile.avatar, isBot: false }];
    if (withBots) {
      for(let i=1; i < maxPlayers; i++) initialPlayers.push({ name: `Bot ${i}`, hand: [], avatar: '🤖', isBot: true });
    }
    const { error } = await supabase.from('rooms').insert([{ 
      id: newRoomId, status: 'waiting', players: initialPlayers, entry_bet: betAmount, pot: 0, max_players: maxPlayers
    }]);
    if (!error) router.push(`/room/${newRoomId}`);
  };

  const MenuButton = ({ title, emoji, onClick, subtext = "" }: any) => (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={onClick} className="relative w-full max-w-sm mx-auto group">
      <div className="absolute inset-0 bg-purple-900 rounded-3xl translate-y-2"></div>
      <div className="relative bg-gradient-to-b from-purple-500 to-purple-700 border-4 border-purple-400 rounded-3xl p-4 flex items-center justify-between shadow-xl">
        <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-5xl drop-shadow-md z-10 absolute -left-4 -top-4">{emoji}</motion.div>
        <div className="flex-1 text-center pl-8">
          <div className="bg-yellow-400 text-red-600 font-black text-sm px-4 py-1 rounded-full inline-block mb-1 border-2 border-yellow-200 shadow-sm uppercase">{title.split(' ')[0]}</div>
          <h2 className="text-3xl font-black text-yellow-300 drop-shadow-md tracking-tighter uppercase">{title.substring(title.indexOf(' ') + 1)}</h2>
          {subtext && <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mt-1">{subtext}</p>}
        </div>
      </div>
    </motion.button>
  );

  if (showSplash) {
    return (
      <main onClick={handleSplashClick} className="min-h-screen bg-gradient-to-b from-[#e52521] via-[#c61b17] to-[#8b0f0b] flex flex-col items-center justify-center cursor-pointer select-none">
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 1.5 }} className="text-center flex flex-col items-center">
          <motion.img initial={{ y: -20 }} animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} src="/logo.png" alt="DUO Logo" className="w-48 h-48 sm:w-64 sm:h-64 mb-8 drop-shadow-[0_15px_25px_rgba(0,0,0,0.5)] object-contain" />
          <h1 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-lg">Made by Hridoy</h1>
          <p className="text-[#FFDE00] font-bold tracking-[0.3em] uppercase mt-2">For Friends</p>
        </motion.div>
        <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-20 text-white/50 uppercase tracking-widest text-sm font-bold">Tap anywhere to continue</motion.p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-red-600 to-red-900 flex flex-col items-center justify-center p-6 text-white">
         <div className="bg-white p-8 rounded-[2rem] text-center w-full max-w-md shadow-2xl border-b-8 border-red-900/30">
            <h2 className="text-3xl font-black text-red-600 uppercase mb-4">Set Profile</h2>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {AVATARS.map(av => (
                <button key={av} onClick={() => setTempAvatar(av)} className={`text-4xl p-2 rounded-2xl transition-all ${tempAvatar === av ? 'bg-yellow-400 scale-110 shadow-lg' : 'bg-zinc-100 opacity-50'}`}>{av}</button>
              ))}
            </div>
            <input type="text" placeholder="YOUR NAME" value={tempName} onChange={(e) => setTempName(e.target.value)} className="bg-zinc-100 border-4 border-zinc-200 text-red-600 px-6 py-4 rounded-2xl w-full text-center font-black text-2xl uppercase mb-6" maxLength={10} />
            <button onClick={saveProfile} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-4 rounded-2xl text-2xl uppercase">Save</button>
         </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-500 via-red-600 to-red-800 flex flex-col items-center p-6 text-white font-sans overflow-hidden select-none relative">
      <div className="w-full max-w-md flex justify-between items-start mb-8 z-20 mt-4 px-2">
        <div className="flex flex-col gap-2 items-start">
           {currentScreen !== 'home' && ( <button onClick={() => setCurrentScreen('home')} className="w-12 h-12 bg-yellow-400 rounded-xl border-b-4 border-yellow-600 flex items-center justify-center font-black text-yellow-900 text-2xl mb-2 shadow-lg">{'<'}</button> )}
           <button onClick={() => setProfile(null)} className="bg-yellow-400 text-yellow-900 font-black px-3 py-2 rounded-full border-b-4 border-yellow-600 shadow-lg flex items-center gap-2 uppercase tracking-widest text-xs active:scale-95 transition-transform">
             <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-sm shadow-inner">{profile.avatar}</div> {profile.name} ✏️
           </button>
        </div>
        
        <div className="flex flex-col items-end gap-3 relative">
           <div className="bg-yellow-400 text-yellow-900 font-black px-4 py-2 rounded-full border-b-4 border-yellow-600 shadow-lg flex items-center gap-1 text-lg">
              <span className="bg-yellow-200 rounded-full w-5 h-5 flex items-center justify-center text-xs border border-yellow-500">$</span> {profile.coins}
           </div>
           
           {/* ⭐️ NEW: AUDIO SETTINGS MENU */}
           <button onClick={() => setShowAudioSettings(!showAudioSettings)} className="w-10 h-10 bg-white/20 rounded-full border-2 border-white/30 flex items-center justify-center text-xl shadow-lg backdrop-blur-md">
              {bgmMuted && sfxMuted ? '🔇' : '🔊'}
           </button>

           <AnimatePresence>
             {showAudioSettings && (
               <motion.div initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute top-24 right-0 bg-white rounded-2xl shadow-2xl p-4 w-48 border-4 border-red-900/20 z-50">
                  <h4 className="text-red-600 font-black uppercase text-sm mb-3 border-b-2 border-red-100 pb-2">Audio Setup</h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-zinc-600 font-bold text-xs uppercase">Music</span>
                    <button onClick={toggleBGM} className={`w-12 h-6 rounded-full transition-colors relative ${bgmMuted ? 'bg-zinc-300' : 'bg-green-500'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${bgmMuted ? 'left-0.5' : 'left-6'}`}></div>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 font-bold text-xs uppercase">SFX</span>
                    <button onClick={toggleSFX} className={`w-12 h-6 rounded-full transition-colors relative ${sfxMuted ? 'bg-zinc-300' : 'bg-green-500'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${sfxMuted ? 'left-0.5' : 'left-6'}`}></div>
                    </button>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {currentScreen === 'home' && (
        <div className="w-full flex-1 flex flex-col justify-center gap-8 z-10">
          <MenuButton title="Play Offline" emoji="🤖" onClick={() => setCurrentScreen('bots')} subtext="Play with Bots" />
          <MenuButton title="Play Online" emoji="🌐" onClick={() => setCurrentScreen('bots')} subtext="Play with Bots" />
          <MenuButton title="Play Friends" emoji="🥰" onClick={() => setCurrentScreen('friends')} subtext="Real Multiplayer" />
        </div>
      )}

      {currentScreen === 'bots' && (
        <div className="w-full flex-1 flex flex-col items-center pt-4 z-10 max-w-md">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-md mb-8">Bot Match</h1>
          <p className="font-black uppercase tracking-widest mb-4">Total Players (You + Bots)</p>
          <div className="grid grid-cols-4 gap-3 w-full mb-8">
            {[2,3,4,5].map(num => ( <button key={num} onClick={() => setMaxPlayers(num)} className={`p-3 rounded-2xl border-4 ${maxPlayers === num ? 'bg-purple-500 border-yellow-400 scale-110' : 'bg-purple-800 border-purple-600'}`}><div className="text-yellow-400 font-black text-2xl">{num}</div></button> ))}
          </div>
          <button onClick={() => createRoom(true)} disabled={isCreating} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl text-2xl uppercase">Start Match</button>
        </div>
      )}

      {currentScreen === 'friends' && (
        <div className="w-full flex-1 flex flex-col justify-center items-center z-10 max-w-md">
          <div className="flex flex-col gap-4 w-full">
            <button onClick={() => setCurrentScreen('create')} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl text-2xl uppercase">Create Room</button>
            <button onClick={() => setCurrentScreen('join')} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl text-2xl uppercase">Join Room</button>
          </div>
        </div>
      )}

      {currentScreen === 'create' && (
        <div className="w-full flex-1 flex flex-col items-center pt-4 z-10 max-w-md">
          <p className="font-black uppercase tracking-widest mb-4">Select Players</p>
          <div className="grid grid-cols-4 gap-3 w-full mb-8">
            {[2,3,4,5,6,7,8,10].map(num => ( <button key={num} onClick={() => setMaxPlayers(num)} className={`p-3 rounded-2xl border-4 ${maxPlayers === num ? 'bg-purple-500 border-yellow-400 scale-110' : 'bg-purple-800 border-purple-600'}`}><div className="text-yellow-400 font-black text-2xl">{num}</div></button> ))}
          </div>
          <button onClick={() => createRoom(false)} disabled={isCreating} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl text-2xl uppercase">Create Room</button>
        </div>
      )}

      {currentScreen === 'join' && (
        <div className="w-full flex-1 flex flex-col items-center pt-4 z-10 max-w-md">
          <p className="font-black uppercase tracking-widest mb-4">Enter Room Code</p>
          <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="w-full bg-white border-4 border-zinc-200 text-red-600 px-6 py-5 rounded-2xl text-center font-black text-3xl uppercase tracking-widest mb-8" maxLength={6} />
          <button onClick={() => { if(joinCode) router.push(`/room/${joinCode}`) }} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl text-2xl uppercase">Join Room</button>
        </div>
      )}
    </main>
  );
}