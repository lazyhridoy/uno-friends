"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { startGame, playCard, drawCard, passTurn, executeBotTurn, isPlayable, RoomData, Card, Player, CardColor } from "../../../lib/gameEngine";

let isBgmAudioMuted = false;
let isSfxAudioMuted = false;
let bgmAudioCtx: AudioContext | null = null;
let bgmInterval: any = null;

const startBGM = async () => {
  if (isBgmAudioMuted) return;
  try {
    if (!bgmAudioCtx) bgmAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (bgmAudioCtx.state === 'suspended') await bgmAudioCtx.resume();
    if (bgmInterval) clearInterval(bgmInterval);

    const notes = [293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 392.00]; 
    let noteIdx = 0;

    bgmInterval = setInterval(() => {
       if (isBgmAudioMuted || !bgmAudioCtx) return;
       try {
          const osc = bgmAudioCtx.createOscillator(); const gain = bgmAudioCtx.createGain();
          osc.connect(gain); gain.connect(bgmAudioCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(notes[noteIdx % notes.length], bgmAudioCtx.currentTime);
          gain.gain.setValueAtTime(0, bgmAudioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0.12, bgmAudioCtx.currentTime + 0.05); 
          gain.gain.linearRampToValueAtTime(0, bgmAudioCtx.currentTime + 0.25); 
          osc.start(bgmAudioCtx.currentTime); osc.stop(bgmAudioCtx.currentTime + 0.25);
          noteIdx++;
       } catch(e){}
    }, 280); 
  } catch(e){}
};

const stopBGM = () => { if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; } };

const playSound = (type: 'deal' | 'play' | 'turn' | 'error' | 'win' | 'uno' | 'draw2' | 'draw4') => {
  if (isSfxAudioMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); const now = ctx.currentTime;
    
    if (type === 'deal') { osc.type = 'sine'; osc.frequency.setValueAtTime(900, now); osc.frequency.exponentialRampToValueAtTime(150, now + 0.12); gain.gain.setValueAtTime(1.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12); osc.start(now); osc.stop(now + 0.12); } 
    else if (type === 'play') { osc.type = 'triangle'; osc.frequency.setValueAtTime(180, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.15); gain.gain.setValueAtTime(1.6, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); } 
    else if (type === 'turn') { osc.type = 'sine'; osc.frequency.setValueAtTime(480, now); osc.frequency.setValueAtTime(720, now + 0.08); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(1.0, now + 0.04); gain.gain.linearRampToValueAtTime(0, now + 0.25); osc.start(now); osc.stop(now + 0.25); }
    else if (type === 'draw2') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(320, now); osc.frequency.linearRampToValueAtTime(600, now + 0.15); osc.frequency.linearRampToValueAtTime(200, now + 0.3); gain.gain.setValueAtTime(1.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); } 
    else if (type === 'draw4') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(450, now); osc.frequency.linearRampToValueAtTime(120, now + 0.4); osc.frequency.linearRampToValueAtTime(80, now + 0.65); gain.gain.setValueAtTime(1.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65); osc.start(now); osc.stop(now + 0.65); } 
    else if (type === 'uno') { osc.type = 'square'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(659.25, now + 0.08); osc.frequency.setValueAtTime(783.99, now + 0.16); osc.frequency.setValueAtTime(1046.50, now + 0.24); gain.gain.setValueAtTime(0.8, now); gain.gain.linearRampToValueAtTime(0, now + 0.45); osc.start(now); osc.stop(now + 0.45); }
  } catch (e) {}
};

const FastCard = ({ color, value, isPlayable, onClick, isDrawDeck = false }: any) => {
  const bgColors: Record<string, string> = { red: "bg-[#FF0000]", blue: "bg-[#0033FF]", green: "bg-[#00AA00]", yellow: "bg-[#FFDE00]", black: "bg-zinc-900" };
  const displayValue = value === 'skip' ? '⊘' : value === 'reverse' ? '⇄' : value === 'draw_2' ? '+2' : value === 'wild' ? 'W' : value === 'wild_draw_4' ? '+4' : value;

  // ⭐️ UPDATED: Replaced DUO with UNO
  if (isDrawDeck) {
    return (
      <motion.div whileTap={{ scale: 0.9 }} onClick={() => { playSound('deal'); onClick(); }} className="relative w-16 sm:w-24 h-24 sm:h-36 bg-[#0B2545] rounded-xl border-4 border-white shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer overflow-hidden">
        <div className="absolute w-[80%] h-[90%] bg-[#FF0000] rounded-[50%] transform -rotate-[25deg] shadow-inner flex items-center justify-center border-4 border-black/20">
          <span className="text-[#FFDE00] font-black text-xl sm:text-3xl transform rotate-[25deg] drop-shadow-[2px_2px_0_#000]">UNO</span>
        </div>
      </motion.div>
    );
  }

  const WildCenter = () => (
    <div className="w-[85%] h-[85%] rounded-[50%] shadow-inner flex items-center justify-center overflow-hidden border-2 border-zinc-200" style={{ background: 'conic-gradient(#FF0000 0 90deg, #0033FF 90deg 180deg, #00AA00 180deg 270deg, #FFDE00 270deg 360deg)' }}>
       {value === 'wild_draw_4' && (
         <div className="relative w-full h-full flex items-center justify-center transform -rotate-[15deg]">
            <div className="absolute w-4 h-6 sm:w-6 sm:h-9 bg-[#00AA00] rounded-sm shadow-md -ml-6 sm:-ml-8 mt-4 border border-black/20"></div>
            <div className="absolute w-4 h-6 sm:w-6 sm:h-9 bg-[#0033FF] rounded-sm shadow-md -ml-2 sm:-ml-3 -mt-4 border border-black/20"></div>
            <div className="absolute w-4 h-6 sm:w-6 sm:h-9 bg-[#FF0000] rounded-sm shadow-md ml-2 sm:ml-3 mt-2 border border-black/20"></div>
            <div className="absolute w-4 h-6 sm:w-6 sm:h-9 bg-[#FFDE00] rounded-sm shadow-md ml-6 sm:ml-8 -mt-2 border border-black/20"></div>
         </div>
       )}
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5 }}
      whileHover={isPlayable ? { y: -20, scale: 1.1, zIndex: 100 } : {}} whileTap={isPlayable ? { scale: 0.9 } : {}}
      onClick={() => { if (isPlayable) { onClick(); } else { playSound('error'); } }}
      className={`relative w-16 sm:w-24 h-24 sm:h-36 rounded-xl border-2 sm:border-4 border-white shadow-[0_5px_10px_rgba(0,0,0,0.4)] flex items-center justify-center select-none ${bgColors[color] || "bg-zinc-500"} ${isPlayable ? 'cursor-pointer' : 'opacity-80 saturate-50'}`}
    >
      <div className="w-[75%] h-[85%] bg-white rounded-t-full rounded-b-full transform -rotate-12 flex items-center justify-center shadow-inner overflow-hidden border sm:border-2 border-zinc-200">
        {color === 'black' ? <WildCenter /> : <span className={`text-4xl sm:text-6xl font-black transform rotate-12 drop-shadow-sm ${color === 'yellow' ? 'text-[#FFDE00]' : color === 'red' ? 'text-[#FF0000]' : color === 'blue' ? 'text-[#0033FF]' : color === 'green' ? 'text-[#00AA00]' : 'text-black'}`}>{displayValue}</span>}
      </div>
      <span className={`absolute top-1 left-1.5 font-black text-xs sm:text-sm leading-none drop-shadow-md text-white`} style={color==='black'?{WebkitTextStroke:'1px black'}:{}}>{displayValue}</span>
      <span className={`absolute bottom-1 right-1.5 font-black text-xs sm:text-sm leading-none rotate-180 drop-shadow-md text-white`} style={color==='black'?{WebkitTextStroke:'1px black'}:{}}>{displayValue}</span>
    </motion.div>
  );
};

export default function GameRoom() {
  const params = useParams(); const router = useRouter();
  const roomId = (params.id as string).toUpperCase();

  const [profile, setProfile] = useState<{name: string, avatar: string, coins: number} | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [restartTimer, setRestartTimer] = useState(10);
  
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
  const [calledUno, setCalledUno] = useState(false);
  
  const roomDataRef = useRef(roomData);
  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);

  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  useEffect(() => {
    const saved = localStorage.getItem('uno_profile');
    if (saved) setProfile(JSON.parse(saved)); else router.push('/');
    
    const savedBgm = localStorage.getItem('uno_bgm_muted') === 'true';
    const savedSfx = localStorage.getItem('uno_sfx_muted') === 'true';
    isBgmAudioMuted = savedBgm; setBgmMuted(savedBgm);
    isSfxAudioMuted = savedSfx; setSfxMuted(savedSfx);
    
    const fetchRoom = async () => { const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single(); if (data) setRoomData(data as RoomData); };
    fetchRoom();

    const roomChannel = supabase.channel(`room_${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        const newData = payload.new as RoomData;
        if (profile && newData.current_turn === profile.name && roomDataRef.current?.current_turn !== profile.name) {
           playSound('turn'); setHasDrawnThisTurn(false); setCalledUno(false);
        }
        setRoomData(newData); setPendingWildCardId(null);
      }).subscribe();
      
    const initAudio = () => { if(!isBgmAudioMuted) startBGM(); };
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => { supabase.removeChannel(roomChannel); stopBGM(); document.removeEventListener('click', initAudio); document.removeEventListener('touchstart', initAudio); };
  }, [roomId, router, profile?.name]);

  useEffect(() => {
    if (roomData?.status !== 'playing' || !profile) return;
    const players = roomData.players || [];
    if (players.find(p => p.hand && p.hand.length === 0)) return; 

    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (roomDataRef.current?.current_turn === profile.name) {
             playSound('error');
             const topCard = roomDataRef.current.discard_pile[roomDataRef.current.discard_pile.length - 1];
             const myLocalPlayer = roomDataRef.current.players.find(p => p.name === profile.name);
             const playable = myLocalPlayer ? myLocalPlayer.hand.filter(c => isPlayable(c, topCard)) : [];
             
             if (playable.length > 0) {
                playCard(roomId, roomDataRef.current, profile.name, playable[0].id, undefined, true);
             } else {
                drawCard(roomId, roomDataRef.current, profile.name).then(() => {
                   passTurn(roomId, roomDataRef.current!, profile.name);
                });
             }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const activePlayer = players.find(p => p.name === roomData.current_turn);
    if (activePlayer && activePlayer.isBot && players[0].name === profile.name) {
        const botTimer = setTimeout(() => { executeBotTurn(roomId, roomDataRef.current!, activePlayer.name); }, 2000);
        return () => { clearInterval(interval); clearTimeout(botTimer); }
    }
    return () => clearInterval(interval);
  }, [roomData?.current_turn, roomData?.status, roomId, profile]);

  const winner = roomData?.players?.find(p => p.hand && p.hand.length === 0);
  const winnerName = winner?.name;
  const isPlayingStatus = roomData?.status === 'playing';

  useEffect(() => {
    if (winnerName && isPlayingStatus) {
      setRestartTimer(10);
      const interval = setInterval(() => {
        setRestartTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (roomDataRef.current && roomDataRef.current.players[0]?.name === profileRef.current?.name) {
              startGame(roomId, roomDataRef.current.players);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [winnerName, isPlayingStatus, roomId]);

  const joinGame = async () => {
    if (!profile || !roomData) return;
    if (roomData.players.find(p => p.name === profile.name)) { setHasJoined(true); return; }
    const newPlayer = { name: profile.name, hand: [], avatar: profile.avatar, isBot: false } as Player;
    const updatedPlayers = [...(roomData.players || []), newPlayer];
    const { error } = await supabase.from('rooms').update({ players: updatedPlayers }).eq('id', roomId);
    if (!error) setHasJoined(true);
  };

  const toggleBGM = () => { const newM = !bgmMuted; setBgmMuted(newM); isBgmAudioMuted = newM; localStorage.setItem('uno_bgm_muted', String(newM)); if(newM) stopBGM(); else startBGM(); };
  const toggleSFX = () => { const newM = !sfxMuted; setSfxMuted(newM); isSfxAudioMuted = newM; localStorage.setItem('uno_sfx_muted', String(newM)); };

  const handleStartGame = async () => { if (roomData && roomData.players.length >= 2) await startGame(roomId, roomData.players); };
  
  const handlePlayCard = async (card: Card) => {
    if (!roomData || !profile || roomData.current_turn !== profile.name) return;
    const topCard = roomData.discard_pile[roomData.discard_pile.length - 1];
    if (!isPlayable(card, topCard)) return;
    if (card.color === 'wild') { setPendingWildCardId(card.id); return; }
    
    if (card.value === 'draw_2') playSound('draw2');
    else if (card.value === 'wild_draw_4') playSound('draw4');
    else playSound('play');

    await playCard(roomId, roomData, profile.name, card.id, undefined, calledUno);
  };

  const handlePlayWildCard = async (chosenColor: CardColor) => {
    if (!roomData || !profile || !pendingWildCardId) return;
    const myHandCard = myPlayer?.hand.find(c => c.id === pendingWildCardId);
    if (myHandCard?.value === 'wild_draw_4') playSound('draw4'); else playSound('play');
    await playCard(roomId, roomData, profile.name, pendingWildCardId, chosenColor, calledUno);
  };

  const handleDrawAction = async () => {
    if (!roomData || !profile || roomData.current_turn !== profile.name || hasDrawnThisTurn) return;
    const isPlayable = await drawCard(roomId, roomData, profile.name);
    if (isPlayable) setHasDrawnThisTurn(true);
  };

  if (!profile) return null;
  const players = roomData?.players || [];
  const isPlaying = roomData?.status === 'playing';
  const myPlayer = players.find(p => p.name === profile.name);
  const otherPlayers = players.filter(p => p.name !== profile.name);

  if (isPlaying && hasJoined && myPlayer && roomData) {
    const topCard = roomData.discard_pile[roomData.discard_pile.length - 1];
    const isMyTurn = roomData.current_turn === myPlayer.name;
    const stackedPile = roomData.discard_pile.slice(-4); 
    
    return (
      <main className="h-screen w-full bg-[#1853db] flex flex-col text-white font-sans overflow-hidden relative select-none">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

        <AnimatePresence>
          {winner && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
               <h1 className="text-5xl sm:text-6xl font-black text-[#FFDE00] uppercase tracking-tighter mb-2">Game Over!</h1>
               <p className="text-white/80 text-lg uppercase tracking-widest mb-6">Results Tray</p>
               <div className="bg-white rounded-3xl p-4 w-full max-w-sm flex flex-col gap-3 shadow-2xl">
                 {[...players].sort((a,b) => (a.hand?.length || 0) - (b.hand?.length || 0)).map((p, idx) => (
                     <div key={p.name} className={`flex items-center justify-between p-3 rounded-xl ${idx === 0 ? 'bg-[#FFDE00] text-yellow-950 font-black scale-105' : 'bg-zinc-100 text-zinc-700'}`}>
                       <div className="flex items-center gap-3">
                         <span className="font-black text-lg opacity-50">#{idx + 1}</span>
                         <span className="text-2xl">{(p as any).avatar || '🤖'}</span>
                         <span className="font-black truncate max-w-[100px] uppercase text-sm">{p.name}</span>
                       </div>
                       <span className="text-xs font-black bg-black/10 px-2 py-1 rounded-md">{p.hand?.length || 0} Cards Left</span>
                     </div>
                 ))}
               </div>
               <div className="mt-8 text-white font-bold tracking-widest uppercase bg-white/10 px-6 py-2.5 rounded-full animate-pulse border border-white/20 text-sm">
                 Next match splits in {restartTimer}s...
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {pendingWildCardId && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
             <div className="bg-[#0a4ada] border-4 border-white p-6 rounded-3xl text-center shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handlePlayWildCard('red')} className="w-20 h-20 rounded-xl bg-[#FF0000] border-4 border-white shadow-xl active:scale-95"></button>
                  <button onClick={() => handlePlayWildCard('blue')} className="w-20 h-20 rounded-xl bg-[#0033FF] border-4 border-white shadow-xl active:scale-95"></button>
                  <button onClick={() => handlePlayWildCard('green')} className="w-20 h-20 rounded-xl bg-[#00AA00] border-4 border-white shadow-xl active:scale-95"></button>
                  <button onClick={() => handlePlayWildCard('yellow')} className="w-20 h-20 rounded-xl bg-[#FFDE00] border-4 border-white shadow-xl active:scale-95"></button>
                </div>
             </div>
          </div>
        )}

        <div className="w-full flex items-center justify-between p-4 z-20 absolute top-0 left-0">
          <button onClick={() => router.push('/')} className="w-10 h-10 bg-[#FFDE00] rounded-xl flex items-center justify-center font-black text-yellow-900 shadow-md border-b-4 border-[#d39e00]">{'<'}</button>
          
          <div className="relative">
             <button onClick={() => setShowAudioSettings(!showAudioSettings)} className="w-10 h-10 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-xl flex items-center justify-center text-xl shadow-lg">
                {bgmMuted && sfxMuted ? '🔇' : '🔊'}
             </button>
             <AnimatePresence>
               {showAudioSettings && (
                 <motion.div initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute top-12 right-0 bg-white rounded-2xl shadow-2xl p-4 w-48 border-4 border-[#0B2545] z-50">
                    <h4 className="text-[#0B2545] font-black uppercase text-sm mb-3 border-b-2 border-blue-100 pb-2">Audio Setup</h4>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-zinc-600 font-bold text-xs uppercase">Music</span>
                      <button onClick={toggleBGM} className={`w-12 h-6 rounded-full transition-colors relative ${bgmMuted ? 'bg-zinc-300' : 'bg-green-500'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${bgmMuted ? 'left-0.5' : 'left-6'}`}></div></button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600 font-bold text-xs uppercase">SFX</span>
                      <button onClick={toggleSFX} className={`w-12 h-6 rounded-full transition-colors relative ${sfxMuted ? 'bg-zinc-300' : 'bg-green-500'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${sfxMuted ? 'left-0.5' : 'left-6'}`}></div></button>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>

        <div className="w-full h-48 sm:h-64 mt-12 sm:mt-8 z-10 relative flex justify-center items-end max-w-3xl mx-auto px-2 pointer-events-none">
            {otherPlayers.map((p, index) => {
              const isTurn = roomData.current_turn === p.name;
              const total = otherPlayers.length; let angle = 0;
              if (total > 1) { const startAngle = -65; const endAngle = 65; angle = startAngle + (endAngle - startAngle) * (index / (total - 1)); }
              const rad = angle * (Math.PI / 180);
              const x = Math.sin(rad) * 160; const y = (1 - Math.cos(rad)) * 80; 

              return (
                <div key={p.name} className="absolute flex flex-col items-center transition-transform duration-500 ease-in-out pb-4" style={{ transform: `translate(${x}px, ${y}px)` }}>
                  <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black text-3xl shadow-lg bg-white/10 backdrop-blur-md border-4 ${isTurn ? 'border-[#00AA00] scale-110 shadow-[0_0_15px_rgba(0,170,0,0.8)]' : 'border-white/20'}`}>
                    <span>{p.avatar || '🤖'}</span>
                    {isTurn && <div className="absolute -top-3 -left-3 bg-[#FF0000] animate-pulse text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white z-20">{timeLeft}</div>}
                    <div className="absolute -bottom-2 -right-2 bg-white text-[#0a4ada] text-xs font-black px-2 py-0.5 rounded-md border-2 border-zinc-200">{p.hand?.length || 0}</div>
                  </div>
                  <div className="mt-2 text-[10px] sm:text-xs font-black text-white capitalize truncate max-w-[60px] drop-shadow-md">{p.name}</div>
                </div>
              );
            })}
        </div>

        <div className="flex-1 w-full relative z-10">
          <div className="absolute inset-0 m-auto w-48 h-48 sm:w-64 sm:h-64 rounded-full border-[6px] border-white/10 border-l-transparent border-b-transparent pointer-events-none animate-spin flex items-center justify-center" style={{ animationDuration: '4s' }}></div>
          <div className="absolute inset-0 m-auto w-full max-w-lg h-36 flex items-center justify-center">
            
            <div className="absolute left-4 sm:left-12 z-20">
               <FastCard color="black" value="DUO" isDrawDeck={true} onClick={() => { if (isMyTurn && !winner && !hasDrawnThisTurn) handleDrawAction(); }} />
            </div>

            <div className="relative w-16 sm:w-24 h-24 sm:h-36 z-10">
              <AnimatePresence>
                {stackedPile.map((card, i) => {
                  const rRot = (card.id.charCodeAt(0) % 30) - 15; const rX = (card.id.charCodeAt(1) % 16) - 8; const rY = (card.id.charCodeAt(2) % 16) - 8;
                  return (
                    <motion.div key={card.id} initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1, x: rX, y: rY, rotate: rRot }} className="absolute inset-0 origin-center" style={{ zIndex: i }}>
                      <FastCard color={card.color === 'wild' ? 'black' : card.color} value={card.value} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="absolute right-4 sm:right-12 z-20">
               <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-[1.25rem] flex items-center justify-center font-black text-4xl shadow-lg bg-white/10 backdrop-blur-md border-4 transition-transform ${isMyTurn ? 'border-[#00AA00] scale-110 shadow-[0_0_20px_rgba(0,170,0,0.8)] z-20' : 'border-white/20'}`}>
                 <span>{profile.avatar}</span>
                 {isMyTurn && !winner && <div className="absolute -top-3 -left-3 bg-[#FF0000] animate-bounce text-white text-xs font-black w-8 h-8 flex items-center justify-center rounded-full border-2 border-white z-30">{timeLeft}</div>}
               </div>
            </div>

          </div>
        </div>

        <div className="flex flex-col justify-end pb-24 sm:pb-32 shrink-0 relative z-30 w-full max-w-full mx-auto pointer-events-auto mb-4">
          
          <div className="flex justify-center mb-4 h-12 relative">
            {isMyTurn && myPlayer.hand.length === 2 && !calledUno && !winner && (
               <motion.button initial={{ scale: 0 }} animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }} onClick={() => { setCalledUno(true); playSound('uno'); }} className="absolute -top-16 bg-[#FF0000] text-white border-4 border-[#FFDE00] px-8 py-3 rounded-full font-black text-2xl shadow-[0_0_30px_rgba(255,0,0,0.8)] uppercase tracking-widest z-50">
                 UNO!
               </motion.button>
            )}
            {isMyTurn && hasDrawnThisTurn && !winner && (
              <button onClick={() => passTurn(roomId, roomData, profile.name)} className="bg-[#FF0000] text-white border-b-4 border-red-900 px-8 py-2 rounded-full font-black text-xl shadow-lg uppercase tracking-widest active:scale-95">Pass Turn</button>
            )}
          </div>

          <div className="flex overflow-visible max-w-full items-end justify-center px-4 pb-4">
            <AnimatePresence mode="popLayout">
              {myPlayer.hand.map((card, idx) => {
                 const cardCount = myPlayer.hand.length;
                 const dynamicScale = cardCount > 7 ? Math.max(0.5, 7 / cardCount) : 1;
                 const marginLeftStyle = idx === 0 ? "0px" : (cardCount > 7 ? `${-45 * dynamicScale}px` : "-24px");
                 
                 return (
                    <motion.div 
                      key={card.id} 
                      layout
                      style={{ 
                        zIndex: idx, 
                        transform: `scale(${dynamicScale})`,
                        transformOrigin: "bottom center",
                        marginLeft: marginLeftStyle
                      }}
                      className="shrink-0 transition-all duration-200"
                    >
                      <FastCard color={card.color === 'wild' ? 'black' : card.color} value={card.value} index={idx} isPlayable={isMyTurn && !winner && isPlayable(card, topCard)} onClick={() => handlePlayCard(card)} />
                    </motion.div>
                 );
              })}
            </AnimatePresence>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#e52521] via-[#c61b17] to-[#8b0f0b] flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden relative">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-2xl text-center relative z-10 border-b-8 border-red-900/30">
        {!hasJoined ? (
          <button onClick={joinGame} className="w-full bg-[#FFDE00] text-yellow-900 border-b-8 border-[#d39e00] font-black py-5 rounded-2xl text-2xl uppercase">Take Seat</button>
        ) : (
          <div className="space-y-6 pt-2">
            <h2 className="text-3xl font-black text-[#e52521] uppercase animate-pulse">Waiting...</h2>
            <div className="bg-yellow-100 border-4 border-[#FFDE00] rounded-2xl py-4 flex flex-col items-center"><span className="text-yellow-700 font-bold uppercase tracking-widest text-xs mb-1">Room Code</span><span className="text-5xl font-black text-yellow-900 tracking-widest">{roomId}</span></div>
            <div className="flex flex-wrap justify-center gap-6">
              {players.map((p, i) => (
                <div key={i} className="flex flex-col items-center"><div className="w-16 h-16 rounded-2xl border-4 border-zinc-200 bg-zinc-100 flex items-center justify-center font-black text-4xl shadow-lg">{p.avatar || '🤖'}</div><span className="text-xs font-black text-zinc-600 uppercase mt-2">{p.name}</span></div>
              ))}
            </div>
            {players.length >= 2 && players[0].name === profile?.name && (
              <button onClick={handleStartGame} className="mt-4 w-full bg-[#00AA00] text-white border-b-8 border-green-700 font-black py-5 rounded-2xl text-2xl uppercase tracking-wider">Start Game</button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}