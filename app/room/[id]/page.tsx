"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { startGame, playCard, drawCard, passTurn, executeBotTurn, isPlayable, RoomData, Card, Player, CardColor } from "../../../lib/gameEngine";

let isAudioMuted = false;
let bgmInterval: any = null;

// AUDIO ENGINE (SFX + Slow Continuous BGM)
const playSound = (type: 'deal' | 'play' | 'turn' | 'error' | 'win' | 'uno') => {
  if (isAudioMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); const now = ctx.currentTime;
    
    if (type === 'deal') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1); gain.gain.setValueAtTime(0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); } 
    else if (type === 'play') { osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.15); gain.gain.setValueAtTime(0.8, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); } 
    else if (type === 'turn') { osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(660, now + 0.1); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.3, now + 0.05); gain.gain.linearRampToValueAtTime(0, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
    else if (type === 'uno') { osc.type = 'square'; osc.frequency.setValueAtTime(880, now); osc.frequency.setValueAtTime(1200, now + 0.1); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.5, now + 0.05); gain.gain.linearRampToValueAtTime(0, now + 0.4); osc.start(now); osc.stop(now + 0.4); }
  } catch (e) {}
};

// ⭐️ NEW: Continuous Slow Ambient Background Music
const startBGM = () => {
  if (bgmInterval || isAudioMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [261.63, 329.63, 392.00, 329.63]; // C E G E
    let noteIdx = 0;
    bgmInterval = setInterval(() => {
       if (isAudioMuted) return;
       try {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.setValueAtTime(notes[noteIdx % notes.length] / 2, ctx.currentTime);
          gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.5); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 2.0);
          noteIdx++;
       } catch(e){}
    }, 2000);
  } catch(e){}
};

const stopBGM = () => { if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; } };

const FastCard = ({ color, value, isPlayable, onClick, isDrawDeck = false }: any) => {
  const bgColors: Record<string, string> = { red: "bg-[#FF0000]", blue: "bg-[#0033FF]", green: "bg-[#00AA00]", yellow: "bg-[#FFDE00]", black: "bg-black" };
  const displayValue = value === 'skip' ? '⊘' : value === 'reverse' ? '⇄' : value === 'draw_2' ? '+2' : value === 'wild' ? 'W' : value === 'wild_draw_4' ? '+4' : value;

  // ⭐️ UPDATED: Classic DUO deck visuals
  if (isDrawDeck) {
    return (
      <motion.div whileTap={{ scale: 0.9 }} onClick={() => { playSound('deal'); onClick(); }} className="relative w-16 sm:w-24 h-24 sm:h-36 bg-[#0B2545] rounded-xl border-4 border-white shadow-xl flex items-center justify-center cursor-pointer overflow-hidden">
        <div className="absolute w-[80%] h-[90%] bg-[#FF0000] rounded-[50%] transform -rotate-[25deg] shadow-inner flex items-center justify-center border-4 border-black/20">
          <span className="text-[#FFDE00] font-black text-xl sm:text-3xl transform rotate-[25deg] drop-shadow-[2px_2px_0_#000]">DUO</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5 }}
      whileHover={isPlayable ? { y: -20, scale: 1.1, zIndex: 100 } : {}} whileTap={isPlayable ? { scale: 0.9 } : {}}
      onClick={() => { if (isPlayable) { playSound('play'); onClick(); } else { playSound('error'); } }}
      className={`relative w-16 sm:w-24 h-24 sm:h-36 rounded-xl border-2 sm:border-4 border-white shadow-lg flex items-center justify-center select-none ${bgColors[color] || "bg-zinc-500"} ${isPlayable ? 'cursor-pointer' : 'opacity-80 saturate-50'}`}
    >
      <div className="w-[75%] h-[85%] bg-white rounded-t-full rounded-b-full transform -rotate-12 flex items-center justify-center shadow-inner">
        {color === 'black' ? ( <span className="text-black font-black text-2xl sm:text-4xl">W</span> ) : ( <span className={`text-4xl sm:text-6xl font-black transform rotate-12 drop-shadow-sm ${color === 'yellow' ? 'text-[#FFDE00]' : color === 'red' ? 'text-[#FF0000]' : color === 'blue' ? 'text-[#0033FF]' : color === 'green' ? 'text-[#00AA00]' : 'text-black'}`}>{displayValue}</span> )}
      </div>
      <span className="absolute top-1 left-1.5 text-white font-black text-xs sm:text-sm leading-none drop-shadow-md">{displayValue}</span>
      <span className="absolute bottom-1 right-1.5 text-white font-black text-xs sm:text-sm leading-none rotate-180 drop-shadow-md">{displayValue}</span>
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
  
  const [muted, setMuted] = useState(false);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
  
  // ⭐️ NEW: UNO call state
  const [calledUno, setCalledUno] = useState(false);
  
  const roomDataRef = useRef(roomData);
  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);

  useEffect(() => {
    const saved = localStorage.getItem('uno_profile');
    if (saved) setProfile(JSON.parse(saved)); else router.push('/');
    
    const isM = localStorage.getItem('uno_muted') === 'true';
    isAudioMuted = isM; setMuted(isM);
    if (!isM) startBGM();

    const fetchRoom = async () => { const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single(); if (data) setRoomData(data as RoomData); };
    fetchRoom();

    const roomChannel = supabase.channel(`room_${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        const newData = payload.new as RoomData;
        if (profile && newData.current_turn === profile.name && roomDataRef.current?.current_turn !== profile.name) {
           playSound('turn'); setHasDrawnThisTurn(false); setCalledUno(false); // Reset states on new turn
        }
        setRoomData(newData); setPendingWildCardId(null);
      }).subscribe();
      
    return () => { supabase.removeChannel(roomChannel); stopBGM(); };
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
          if (roomDataRef.current?.current_turn === profile.name) drawCard(roomId, roomDataRef.current, profile.name);
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

  const joinGame = async () => {
    if (!profile || !roomData) return;
    if (roomData.players.find(p => p.name === profile.name)) { setHasJoined(true); return; }
    const newPlayer = { name: profile.name, hand: [], avatar: profile.avatar, isBot: false } as Player;
    const updatedPlayers = [...(roomData.players || []), newPlayer];
    const { error } = await supabase.from('rooms').update({ players: updatedPlayers }).eq('id', roomId);
    if (!error) setHasJoined(true);
  };

  const toggleMute = () => { 
    const newM = !muted; setMuted(newM); isAudioMuted = newM; 
    localStorage.setItem('uno_muted', String(newM)); 
    if (newM) stopBGM(); else startBGM();
  };

  const handleStartGame = async () => { if (roomData && roomData.players.length >= 2) await startGame(roomId, roomData.players); };
  
  const handlePlayCard = async (card: Card) => {
    if (!roomData || !profile || roomData.current_turn !== profile.name) return;
    const topCard = roomData.discard_pile[roomData.discard_pile.length - 1];
    if (!isPlayable(card, topCard)) return;
    if (card.color === 'wild') { setPendingWildCardId(card.id); return; }
    // Pass the calledUno state to the engine
    await playCard(roomId, roomData, profile.name, card.id, undefined, calledUno);
  };

  const handlePlayWildCard = async (chosenColor: CardColor) => {
    if (!roomData || !profile || !pendingWildCardId) return;
    playSound('play');
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
  const winner = players.find(p => p.hand && p.hand.length === 0);

  if (isPlaying && hasJoined && myPlayer && roomData) {
    const topCard = roomData.discard_pile[roomData.discard_pile.length - 1];
    const isMyTurn = roomData.current_turn === myPlayer.name;
    const stackedPile = roomData.discard_pile.slice(-4); 
    
    return (
      <main className="h-screen w-full bg-[radial-gradient(circle_at_center,_#1a5ce6_0%,_#041852_100%)] flex flex-col text-white font-sans overflow-hidden relative select-none">
        
        {/* WILD COLOR PICKER */}
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

        <div className="w-full flex items-center justify-between p-4 z-20">
          <button onClick={() => router.push('/')} className="w-10 h-10 bg-[#FFDE00] rounded-xl flex items-center justify-center font-black text-yellow-900 shadow-md border-b-4 border-[#d39e00]">{'<'}</button>
          
          <div className="flex-1 flex justify-center gap-4 mx-4 overflow-x-auto no-scrollbar py-2">
            {otherPlayers.map((p, index) => {
              const isTurn = roomData.current_turn === p.name;
              return (
                <div key={p.name} className="flex flex-col items-center shrink-0">
                  <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-lg bg-white/10 backdrop-blur-md border-4 ${isTurn ? 'border-[#00AA00] scale-110 shadow-[0_0_15px_rgba(0,170,0,0.8)]' : 'border-white/20'}`}>
                    <span>{p.avatar || '🤖'}</span>
                    {isTurn && <div className="absolute -top-3 -left-3 bg-[#FF0000] animate-pulse text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white z-20">{timeLeft}</div>}
                    <div className="absolute -bottom-2 -right-2 bg-white text-[#0a4ada] text-xs font-black px-2 py-0.5 rounded-md border-2 border-zinc-200">{p.hand?.length || 0}</div>
                  </div>
                  <div className="mt-2 text-[10px] sm:text-xs font-black text-white capitalize truncate max-w-[60px]">{p.name}</div>
                </div>
              );
            })}
          </div>
          <button onClick={toggleMute} className="w-10 h-10 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-xl flex items-center justify-center text-xl">{muted ? '🔇' : '🔊'}</button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative w-full z-10">
          <div className="w-full max-w-2xl flex items-center justify-between px-6 relative">
            <div className="flex-1 flex justify-start z-10">
               <FastCard color="black" value="DUO" isDrawDeck={true} onClick={() => { if (isMyTurn && !winner && !hasDrawnThisTurn) handleDrawAction(); }} />
            </div>

            <div className="relative flex-shrink-0 flex items-center justify-center mx-4">
              <div className={`absolute w-32 h-32 sm:w-48 sm:h-48 rounded-full border-4 border-white/10 border-l-transparent border-b-transparent pointer-events-none animate-spin ${roomData.direction === -1 && 'animation-reverse'}`} style={{ animationDuration: '4s' }}></div>
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
            </div>

            <div className="flex-1 flex justify-end items-center relative z-10">
               <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-[1.25rem] flex items-center justify-center font-black text-4xl shadow-lg bg-white/10 backdrop-blur-md border-4 transition-transform ${isMyTurn ? 'border-[#00AA00] scale-110 shadow-[0_0_20px_rgba(0,170,0,0.8)] z-20' : 'border-white/20'}`}>
                 <span>{profile.avatar}</span>
                 {isMyTurn && !winner && <div className="absolute -top-3 -left-3 bg-[#FF0000] animate-bounce text-white text-xs font-black w-8 h-8 flex items-center justify-center rounded-full border-2 border-white z-30">{timeLeft}</div>}
               </div>
            </div>
          </div>
        </div>

        {/* BOTTOM HAND AREA */}
        <div className="flex flex-col justify-end pb-24 sm:pb-32 pt-4 shrink-0 relative z-30 w-full max-w-5xl mx-auto pointer-events-auto mb-10">
          
          {/* ⭐️ NEW: UNO Call Button & Pass Turn Actions */}
          <div className="flex justify-center mb-4 h-12 relative">
            
            {/* Show UNO Button if it's my turn, I have exactly 2 cards, and haven't called it yet */}
            {isMyTurn && myPlayer.hand.length === 2 && !calledUno && !winner && (
               <motion.button 
                 initial={{ scale: 0 }} animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                 onClick={() => { setCalledUno(true); playSound('uno'); }}
                 className="absolute -top-16 bg-[#FF0000] text-white border-4 border-[#FFDE00] px-8 py-3 rounded-full font-black text-2xl shadow-[0_0_30px_rgba(255,0,0,0.8)] uppercase tracking-widest z-50"
               >
                 UNO!
               </motion.button>
            )}

            {isMyTurn && hasDrawnThisTurn && !winner && (
              <button onClick={() => passTurn(roomId, roomData, profile.name)} className="bg-[#FF0000] text-white border-b-4 border-red-900 px-8 py-2 rounded-full font-black text-xl shadow-lg uppercase tracking-widest active:scale-95">Pass Turn</button>
            )}
          </div>

          <div className="flex justify-center items-end px-4 overflow-visible -space-x-4 sm:-space-x-8">
            <AnimatePresence>
              {myPlayer.hand.map((card, idx) => (
                <div key={card.id} style={{ zIndex: idx }}>
                  <FastCard color={card.color === 'wild' ? 'black' : card.color} value={card.value} index={idx} isPlayable={isMyTurn && !winner && isPlayable(card, topCard)} onClick={() => handlePlayCard(card)} />
                </div>
              ))}
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