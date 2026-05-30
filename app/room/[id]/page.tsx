"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { startGame, playCard, drawCard, passTurn, isPlayable, RoomData, Card, Player, CardColor } from "../../../lib/gameEngine";

// --- GLOBAL MUTE STATE ---
let isAudioMuted = false;

// --- INBUILT SYNTHETIC AUDIO ENGINE ---
const playSound = (type: 'deal' | 'play' | 'turn' | 'error' | 'win') => {
  if (isAudioMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    
    if (type === 'deal') { 
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'play') { 
      osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      gain.gain.setValueAtTime(0.8, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'turn') { 
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(660, now + 0.1);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.3, now + 0.05); gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'error') { 
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
      gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'win') {
      osc.type = 'square'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(554, now + 0.1); osc.frequency.setValueAtTime(659, now + 0.2); osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.2, now + 0.1); gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now); osc.stop(now + 0.6);
    }
  } catch (e) { /* Audio context block protection */ }
};

// --- PREMIUM CARD UI ---
const AnimatedCard = ({ color, value, isPlayable, onClick, isDrawDeck = false, index = 0 }: any) => {
  const bgColors: Record<string, string> = { red: "bg-[#FF0000]", blue: "bg-[#0033FF]", green: "bg-[#00AA00]", yellow: "bg-[#FFDE00]", black: "bg-black" };
  const currentBg = bgColors[color] || "bg-zinc-500";
  const displayValue = value === 'skip' ? '⊘' : value === 'reverse' ? '⇄' : value === 'draw_2' ? '+2' : value === 'wild' ? 'W' : value === 'wild_draw_4' ? '+4' : value;

  if (isDrawDeck) {
    return (
      <motion.div 
        whileHover={{ y: -5, scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => { playSound('deal'); onClick(); }}
        className="w-16 sm:w-24 h-24 sm:h-36 bg-black rounded-xl border-4 border-white shadow-xl flex flex-col items-center justify-center cursor-pointer"
      >
        <div className="grid grid-cols-2 gap-1 w-10 h-10 mb-1 transform -rotate-12">
          <div className="bg-[#00AA00] rounded-tl-lg"></div><div className="bg-[#0033FF] rounded-tr-lg"></div>
          <div className="bg-[#FFDE00] rounded-bl-lg"></div><div className="bg-[#FF0000] rounded-br-lg"></div>
        </div>
        <span className="text-white font-black text-lg transform -rotate-12">DUO</span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      layoutId={`card-${value}-${color}-${index}`} 
      initial={{ opacity: 0, y: 100, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, y: -200 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.05 }}
      whileHover={isPlayable ? { y: -24, scale: 1.15, zIndex: 100 } : {}}
      whileTap={isPlayable ? { scale: 0.9 } : {}}
      onClick={() => {
        if (isPlayable) { playSound('play'); onClick(); }
        else { playSound('error'); }
      }}
      className={`relative w-16 sm:w-24 h-24 sm:h-36 rounded-xl border-4 border-white shadow-[0_10px_20px_rgba(0,0,0,0.4)] flex items-center justify-center select-none ${currentBg} ${isPlayable ? 'cursor-pointer' : 'opacity-80 saturate-50'}`}
    >
      <div className="w-[75%] h-[85%] bg-white rounded-t-full rounded-b-full transform -rotate-12 flex items-center justify-center shadow-inner">
        {color === 'black' ? (
          <div className="grid grid-cols-2 gap-0.5 w-8 h-8 transform rotate-12">
             <div className="bg-[#00AA00] rounded-tl-full"></div><div className="bg-[#0033FF] rounded-tr-full"></div>
             <div className="bg-[#FFDE00] rounded-bl-full"></div><div className="bg-[#FF0000] rounded-br-full"></div>
          </div>
        ) : (
          <span className={`text-4xl sm:text-6xl font-black transform rotate-12 drop-shadow-sm ${color === 'yellow' ? 'text-[#FFDE00]' : color === 'red' ? 'text-[#FF0000]' : color === 'blue' ? 'text-[#0033FF]' : color === 'green' ? 'text-[#00AA00]' : 'text-black'}`}>{displayValue}</span>
        )}
      </div>
      <span className="absolute top-1 left-1.5 text-white font-black text-xs sm:text-sm leading-none drop-shadow-md">{displayValue}</span>
      <span className="absolute bottom-1 right-1.5 text-white font-black text-xs sm:text-sm leading-none rotate-180 drop-shadow-md">{displayValue}</span>
    </motion.div>
  );
};

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params.id as string).toUpperCase();

  const [playerName, setPlayerName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🧔🏻‍♂️");
  const AVATARS = ['🧔🏻‍♂️', '👱🏼‍♀️', '👨🏾‍🦱', '👩🏻‍🦰', '👦🏻', '👧🏽', '👽', '🤖'];

  const [hasJoined, setHasJoined] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(30);
  const [restartTimer, setRestartTimer] = useState(10);
  
  // ⭐️ NEW: Mute & Draw States
  const [muted, setMuted] = useState(false);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);

  const toggleMute = () => {
    isAudioMuted = !isAudioMuted;
    setMuted(isAudioMuted);
  };
  
  const roomDataRef = useRef(roomData);
  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (data) setRoomData(data as RoomData);
    };
    fetchRoom();

    const roomChannel = supabase.channel(`room_${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        const newData = payload.new as RoomData;
        if (newData.current_turn === playerName && roomDataRef.current?.current_turn !== playerName && newData.status === 'playing') {
           playSound('turn');
           // Reset the draw state when a new turn starts
           setHasDrawnThisTurn(false);
        }
        setRoomData(newData);
        setPendingWildCardId(null);
      }).subscribe();
    return () => { supabase.removeChannel(roomChannel); };
  }, [roomId, playerName]);

  // AFK Timer
  useEffect(() => {
    if (roomData?.status !== 'playing') return;
    const players = roomData.players || [];
    const winner = players.find(p => p.hand && p.hand.length === 0);
    if (winner) return; 

    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (roomDataRef.current?.current_turn === playerName) {
            playSound('error');
            drawCard(roomId, roomDataRef.current, playerName);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [roomData?.current_turn, roomData?.status, playerName, roomId]);

  // Win State & 10s Auto-Restart
  useEffect(() => {
    const players = roomData?.players || [];
    const winner = players.find(p => p.hand && p.hand.length === 0);
    
    if (winner && roomData?.status === 'playing') {
      playSound('win');
      setRestartTimer(10);
      const interval = setInterval(() => {
        setRestartTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (players[0].name === playerName) handleStartGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [roomData?.players, roomData?.status, playerName]);

  const joinGame = async () => {
    if (!playerName.trim() || !roomData) return;
    playSound('turn'); 
    const newPlayer = { name: playerName, hand: [], avatar: selectedAvatar } as unknown as Player;
    const updatedPlayers = [...(roomData.players || []), newPlayer];
    const { error } = await supabase.from('rooms').update({ players: updatedPlayers }).eq('id', roomId);
    if (!error) setHasJoined(true);
  };

  const handleStartGame = async () => {
    if (!roomData || roomData.players.length < 2) return;
    playSound('deal');
    await startGame(roomId, roomData.players);
  };

  const handlePlayCard = async (card: Card) => {
    if (!roomData || roomData.current_turn !== playerName) return;
    const topCard = roomData.discard_pile[roomData.discard_pile.length - 1];
    if (!isPlayable(card, topCard)) return;
    if (card.color === 'wild') { setPendingWildCardId(card.id); return; }
    await playCard(roomId, roomData, playerName, card.id);
  };

  const handlePlayWildCard = async (chosenColor: CardColor) => {
    if (!roomData || !pendingWildCardId) return;
    playSound('play');
    await playCard(roomId, roomData, playerName, pendingWildCardId, chosenColor);
  };

  const handleDrawAction = async () => {
    if (!roomData || roomData.current_turn !== playerName || hasDrawnThisTurn) return;
    try {
      // Draw card evaluates if the drawn card is playable
      const isDrawnCardPlayable = await drawCard(roomId, roomData, playerName);
      if (isDrawnCardPlayable) {
         setHasDrawnThisTurn(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePassTurn = async () => {
    if (!roomData || roomData.current_turn !== playerName) return;
    try {
      await passTurn(roomId, roomData, playerName);
    } catch (e) {
      console.error(e);
    }
  };

  const players = roomData?.players || [];
  const isPlaying = roomData?.status === 'playing';
  const myPlayer = players.find(p => p.name === playerName);
  const otherPlayers = players.filter(p => p.name !== playerName);
  const winner = players.find(p => p.hand && p.hand.length === 0);

  // ==========================================
  // ACTIVE GAME BOARD
  // ==========================================
  if (isPlaying && hasJoined && myPlayer && roomData) {
    const topCard = roomData.discard_pile[roomData.discard_pile.length - 1];
    const isMyTurn = roomData.current_turn === myPlayer.name;
    const stackedPile = roomData.discard_pile.slice(-8); // Show up to 8 cards underneath
    
    return (
      <main className="h-screen w-full bg-[radial-gradient(circle_at_center,_#1a5ce6_0%,_#041852_100%)] flex flex-col text-white font-sans overflow-hidden relative select-none">
        
        {/* LEADERBOARD & AUTO-RESTART OVERLAY */}
        <AnimatePresence>
          {winner && (
            <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
               <h1 className="text-5xl sm:text-7xl font-black text-[#FFDE00] uppercase tracking-tighter mb-2 drop-shadow-[0_5px_15px_rgba(255,222,0,0.5)]">Game Over!</h1>
               <p className="text-white text-xl sm:text-2xl font-bold uppercase tracking-widest mb-8">{winner.name} Wins!</p>
               <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4">
                 {[...players].sort((a,b) => (a.hand?.length || 0) - (b.hand?.length || 0)).map((p, idx) => {
                   const avatar = (p as any).avatar || '👤';
                   return (
                     <div key={p.name} className={`flex items-center justify-between p-4 rounded-2xl ${idx === 0 ? 'bg-[#FFDE00] text-yellow-900 border-4 border-yellow-500 shadow-lg scale-105 z-10' : 'bg-zinc-100 text-zinc-800'}`}>
                       <div className="flex items-center gap-4">
                         <span className="font-black text-2xl opacity-40">#{idx + 1}</span>
                         <span className="text-4xl drop-shadow-sm">{avatar}</span>
                         <span className="font-black text-xl uppercase truncate max-w-[100px]">{p.name}</span>
                       </div>
                       <div className="font-black text-lg bg-white/60 px-3 py-1 rounded-xl shadow-sm">{p.hand?.length || 0} Cards</div>
                     </div>
                   );
                 })}
               </div>
               <div className="mt-8 text-white/80 font-black text-2xl animate-pulse uppercase tracking-widest bg-white/10 px-6 py-3 rounded-full border border-white/20">
                 Next game in {restartTimer}s...
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WILD COLOR PICKER */}
        {pendingWildCardId && !winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
             <div className="bg-[#0a4ada] border-4 border-white p-6 rounded-3xl text-center shadow-2xl">
                <h3 className="text-2xl font-black mb-4 uppercase text-white">Choose Color</h3>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => handlePlayWildCard('red')} className="w-20 h-20 rounded-xl bg-[#FF0000] border-4 border-white shadow-xl"></motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => handlePlayWildCard('blue')} className="w-20 h-20 rounded-xl bg-[#0033FF] border-4 border-white shadow-xl"></motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => handlePlayWildCard('green')} className="w-20 h-20 rounded-xl bg-[#00AA00] border-4 border-white shadow-xl"></motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => handlePlayWildCard('yellow')} className="w-20 h-20 rounded-xl bg-[#FFDE00] border-4 border-white shadow-xl"></motion.button>
                </div>
             </div>
          </motion.div>
        )}

        {/* TOP OPPONENT LOBBY */}
        <div className="w-full flex items-center justify-between p-4 z-20">
          <button onClick={() => router.push('/')} className="w-10 h-10 bg-[#FFDE00] rounded-xl flex items-center justify-center font-black text-yellow-900 shadow-md border-b-4 border-[#d39e00] active:scale-95">{'<'}</button>
          
          <div className="flex-1 flex justify-center gap-4 sm:gap-8 mx-4 overflow-x-auto no-scrollbar py-2">
            <AnimatePresence>
              {otherPlayers.map((p, index) => {
                const isTurn = roomData.current_turn === p.name;
                const avatar = (p as any).avatar || '👤';
                return (
                  <motion.div key={p.name} layout className="flex flex-col items-center shrink-0">
                    <motion.div animate={{ scale: isTurn ? 1.1 : 1, y: isTurn ? 5 : 0 }} className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-[1.25rem] flex items-center justify-center font-black text-4xl shadow-lg bg-white/10 backdrop-blur-md border-4 ${isTurn ? 'border-[#00AA00] shadow-[0_0_20px_rgba(0,170,0,0.8)]' : 'border-white/20'}`}>
                      <span className="drop-shadow-lg">{avatar}</span>
                      {isTurn && !winner && (
                        <div className={`absolute -top-3 -left-3 ${timeLeft <= 5 ? 'bg-[#FF0000] animate-pulse' : 'bg-[#0033FF]'} text-white text-xs font-black w-8 h-8 flex items-center justify-center rounded-full border-2 border-white shadow-md z-20`}>
                          {timeLeft}s
                        </div>
                      )}
                      <motion.div key={p.hand?.length} initial={{ scale: 2 }} animate={{ scale: 1 }} className="absolute -bottom-2 -right-2 bg-white text-[#0a4ada] text-xs font-black px-2 py-0.5 rounded-md border-2 border-zinc-200 shadow-md">
                        {p.hand?.length || 0}
                      </motion.div>
                    </motion.div>
                    <div className="mt-3 text-sm font-black text-white capitalize drop-shadow-md">{p.name}</div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ⭐️ NEW: Mute Button */}
          <button onClick={toggleMute} className="w-10 h-10 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md active:scale-95">
             {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* CENTER ARENA */}
        <div className="flex-1 flex flex-col items-center justify-center relative w-full mt-4 sm:mt-0 z-10">
          <div className="w-full max-w-3xl flex items-center justify-between px-4 sm:px-12 relative">
            
            <div className="flex-1 flex justify-start z-10">
               <AnimatedCard color="black" value="DUO" isDrawDeck={true} onClick={() => { if (isMyTurn && !winner && !hasDrawnThisTurn) handleDrawAction(); }} />
            </div>

            {/* ⭐️ UPDATED: Messy Stacking Discard Pile */}
            <div className="relative flex-shrink-0 flex items-center justify-center mx-4">
              <motion.div animate={{ rotate: roomData.direction === 1 ? 360 : -360 }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute w-32 h-32 sm:w-48 sm:h-48 rounded-full border-4 border-white/20 border-l-transparent border-b-transparent opacity-80 pointer-events-none"></motion.div>
              
              <div className="relative w-16 sm:w-24 h-24 sm:h-36 drop-shadow-[0_15px_25px_rgba(0,0,0,0.5)] z-10">
                <AnimatePresence>
                  {stackedPile.map((card, i) => {
                    // Create deterministic random offsets for a messy physical pile
                    const randomRotation = (card.id.charCodeAt(0) % 30) - 15; // -15 to +15 deg
                    const randomX = (card.id.charCodeAt(1) % 20) - 10;        // -10 to +10 px
                    const randomY = (card.id.charCodeAt(2) % 20) - 10;        // -10 to +10 px

                    return (
                      <motion.div
                        key={card.id}
                        initial={{ scale: 1.5, opacity: 0, y: -100 }}
                        animate={{ scale: 1, opacity: 1, x: randomX, y: randomY, rotate: randomRotation }}
                        className="absolute inset-0 origin-center"
                        style={{ zIndex: i }}
                      >
                        <AnimatedCard color={card.color === 'wild' ? 'black' : card.color} value={card.value} />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex-1 flex justify-end items-center relative z-10">
               <motion.div animate={{ scale: isMyTurn ? 1.15 : 1 }} className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-[1.25rem] flex items-center justify-center font-black text-4xl shadow-lg bg-white/10 backdrop-blur-md border-4 ${isMyTurn ? 'border-[#00AA00] shadow-[0_0_30px_rgba(0,170,0,1)] z-20' : 'border-white/20'}`}>
                 <span className="drop-shadow-lg">{(myPlayer as any).avatar || '👤'}</span>
                 {isMyTurn && !winner && (
                    <div className={`absolute -top-4 -left-4 ${timeLeft <= 10 ? 'bg-[#FF0000] animate-bounce' : 'bg-[#0033FF]'} text-white text-sm font-black w-10 h-10 flex items-center justify-center rounded-full border-2 border-white shadow-xl z-30`}>
                      {timeLeft}
                    </div>
                  )}
               </motion.div>
            </div>
          </div>
        </div>

        {/* ⭐️ FIXED: BOTTOM HAND AREA with extra padding so it's not cut off */}
        <div className="flex flex-col justify-end pb-12 sm:pb-20 pt-4 shrink-0 relative z-30 w-full max-w-5xl mx-auto pointer-events-auto mb-6">
          
          {/* ⭐️ NEW: Pass Turn Button */}
          <div className="flex justify-center mb-6 h-10">
            {isMyTurn && hasDrawnThisTurn && !winner && (
              <motion.button 
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={handlePassTurn} 
                className="bg-[#FF0000] text-white border-b-4 border-red-900 px-8 py-2 rounded-full font-black text-xl shadow-[0_0_20px_rgba(255,0,0,0.6)] uppercase tracking-widest active:scale-95 transition-transform"
              >
                Pass Turn
              </motion.button>
            )}
          </div>

          <div className="flex justify-center items-end px-4 overflow-visible -space-x-4 sm:-space-x-8">
            <AnimatePresence>
              {myPlayer.hand.map((card, idx) => (
                <motion.div key={card.id} layout style={{ zIndex: idx }}>
                  <AnimatedCard color={card.color === 'wild' ? 'black' : card.color} value={card.value} index={idx} isPlayable={isMyTurn && !winner && isPlayable(card, topCard)} onClick={() => handlePlayCard(card)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // WAITING LOBBY
  // ==========================================
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#e52521] via-[#c61b17] to-[#8b0f0b] flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden relative">
      
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <button onClick={() => router.push('/')} className="bg-[#FFDE00] text-yellow-900 border-b-4 border-[#d39e00] w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-md active:scale-95 transition-all">
          {'<'}
        </button>
      </div>

      <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-2xl text-center relative z-10 border-b-8 border-red-900/30">
        {!hasJoined ? (
          <div className="space-y-4">
            <h2 className="text-3xl font-black mb-2 uppercase text-[#e52521]">Join Game</h2>
            
            <div className="py-2">
              <p className="text-zinc-400 font-black text-xs uppercase tracking-widest mb-3">Choose Your Avatar</p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {AVATARS.map(av => (
                  <button 
                    key={av} 
                    onClick={() => setSelectedAvatar(av)} 
                    className={`text-3xl sm:text-4xl p-2 rounded-2xl transition-all ${selectedAvatar === av ? 'bg-[#FFDE00] scale-110 shadow-lg border-2 border-yellow-500' : 'bg-zinc-100 opacity-50 hover:opacity-100 hover:scale-105'}`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <input 
              type="text" placeholder="YOUR NAME" value={playerName} onChange={(e) => setPlayerName(e.target.value)} 
              className="bg-zinc-100 border-4 border-zinc-200 text-[#e52521] px-6 py-4 rounded-2xl w-full focus:outline-none focus:border-[#FFDE00] text-center font-black text-2xl uppercase placeholder-zinc-300" maxLength={10} 
            />
            
            <button onClick={joinGame} className="w-full mt-2 bg-[#FFDE00] text-yellow-900 border-b-8 border-[#d39e00] font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 active:translate-y-1 text-2xl uppercase tracking-widest">
              Play
            </button>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <h2 className="text-3xl font-black text-[#e52521] uppercase animate-pulse">Waiting...</h2>
            
            <div className="bg-yellow-100 border-4 border-[#FFDE00] rounded-2xl py-4 flex flex-col items-center shadow-inner">
              <span className="text-yellow-700 font-bold uppercase tracking-widest text-xs mb-1">Room Code</span>
              <span className="text-5xl font-black text-yellow-900 tracking-widest drop-shadow-sm">{roomId}</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {players.map((p, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl border-4 border-zinc-200 bg-zinc-100 flex items-center justify-center font-black text-4xl shadow-lg drop-shadow-md">
                    {(p as any).avatar || '👤'}
                  </div>
                  <span className="text-xs font-black text-zinc-600 uppercase mt-2">{p.name}</span>
                </div>
              ))}
              
              {Array.from({ length: Math.max(0, (roomData?.max_players || 4) - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex flex-col items-center opacity-40">
                  <div className="w-16 h-16 rounded-2xl border-4 border-dashed border-zinc-400 bg-zinc-100 flex items-center justify-center text-zinc-400 text-2xl font-black">?</div>
                </div>
              ))}
            </div>

            {players.length >= 2 && (
              <button onClick={handleStartGame} className="mt-4 w-full bg-[#00AA00] text-white border-b-8 border-green-700 font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 active:translate-y-1 text-2xl uppercase tracking-wider">
                Start
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}