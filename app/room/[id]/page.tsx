"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { startGame, playCard, drawCard, isPlayable, RoomData, Card, Player, CardColor } from "../../../lib/gameEngine";
import UnoCard from "../../../components/UnoCard";

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
const roomId = (params.id as string).toUpperCase();

  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (data) setRoomData(data as RoomData);
    };
    fetchRoom();

    const roomChannel = supabase.channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoomData(payload.new as RoomData);
          setPendingWildCardId(null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  const joinGame = async () => {
    if (!playerName.trim() || !roomData) return;
    
    const newPlayer: Player = { name: playerName, hand: [] };
    const updatedPlayers = [...(roomData.players || []), newPlayer];
    const newPot = (roomData.pot || 0) + (roomData.entry_bet || 0);

    const { error } = await supabase
      .from('rooms')
      .update({ players: updatedPlayers, pot: newPot })
      .eq('id', roomId);

    if (!error) setHasJoined(true);
  };

  const handleStartGame = async () => {
    if (!roomData || roomData.players.length < 2) return;
    try {
      await startGame(roomId, roomData.players);
    } catch (e) {
      console.error("Failed to start game", e);
    }
  };

  const handlePlayCard = async (card: Card) => {
    if (!roomData || roomData.current_turn !== playerName) return;
    const topCard = roomData.discard_pile[roomData.discard_pile.length - 1];
    
    if (!isPlayable(card, topCard)) return;

    if (card.color === 'wild') {
      setPendingWildCardId(card.id);
      return;
    }

    try {
      await playCard(roomId, roomData, playerName, card.id);
    } catch (e) {
      console.error("Failed to play card", e);
    }
  };

  const handlePlayWildCard = async (chosenColor: CardColor) => {
    if (!roomData || !pendingWildCardId || roomData.current_turn !== playerName) return;
    try {
      await playCard(roomId, roomData, playerName, pendingWildCardId, chosenColor);
      setPendingWildCardId(null);
    } catch (e) {
      console.error("Failed to play wild card", e);
    }
  };

  const handleDrawCard = async () => {
    if (!roomData || roomData.current_turn !== playerName) return;
    try {
      await drawCard(roomId, roomData, playerName);
    } catch (e) {
      console.error("Failed to draw card", e);
    }
  };

  const players = roomData?.players || [];
  const isPlaying = roomData?.status === 'playing';
  const myPlayer = players.find(p => p.name === playerName);
  const otherPlayers = players.filter(p => p.name !== playerName);

  const getCardColor = (color: string) => color === 'wild' ? 'black' : color as any;
  const getCardValue = (value: string) => {
    switch (value) {
      case 'skip': return '⊘';
      case 'reverse': return '⇄';
      case 'draw_2': return '+2';
      case 'wild': return 'W';
      case 'wild_draw_4': return '+4';
      default: return value;
    }
  };

  // ==========================================
  // ACTIVE GAME BOARD (Image 4 Aesthetic)
  // ==========================================
  if (isPlaying && hasJoined && myPlayer && roomData) {
    const topCard = roomData.discard_pile[roomData.discard_pile.length - 1];
    const isMyTurn = roomData.current_turn === myPlayer.name;
    
    return (
      <main className="h-screen w-full bg-gradient-to-b from-blue-500 to-blue-700 flex flex-col text-white font-sans overflow-hidden relative select-none">
        
        {/* Wild Color Selection Modal */}
        {pendingWildCardId && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
             <div className="bg-blue-600 border-4 border-white p-8 rounded-3xl text-center shadow-2xl scale-110">
                <h3 className="text-3xl font-black mb-6 uppercase tracking-tighter text-white drop-shadow-md">Choose Color</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handlePlayWildCard('red')} className="w-24 h-24 rounded-2xl bg-red-500 border-4 border-white shadow-xl active:scale-90 transition-all"></button>
                  <button onClick={() => handlePlayWildCard('blue')} className="w-24 h-24 rounded-2xl bg-blue-500 border-4 border-white shadow-xl active:scale-90 transition-all"></button>
                  <button onClick={() => handlePlayWildCard('green')} className="w-24 h-24 rounded-2xl bg-green-500 border-4 border-white shadow-xl active:scale-90 transition-all"></button>
                  <button onClick={() => handlePlayWildCard('yellow')} className="w-24 h-24 rounded-2xl bg-yellow-400 border-4 border-white shadow-xl active:scale-90 transition-all"></button>
                </div>
             </div>
          </div>
        )}

        {/* TOP STATUS BAR (Scrollable for 10 Players) */}
        <div className="w-full flex items-center justify-start sm:justify-center overflow-x-auto gap-4 p-4 shrink-0 no-scrollbar z-20 mt-4">
          
          {/* Top Left Controls */}
          <div className="flex gap-2 sticky left-0 shrink-0">
            <button onClick={() => router.push('/')} className="w-12 h-12 bg-yellow-400 rounded-xl border-b-4 border-yellow-600 flex items-center justify-center font-black text-yellow-900 text-xl active:scale-95 shadow-md">
              {'<'}
            </button>
            <button className="w-12 h-12 bg-blue-900/40 rounded-xl border-2 border-white/20 flex items-center justify-center font-black text-white text-xl backdrop-blur-sm">
              🔊
            </button>
          </div>
          
          {/* Opponent Avatars */}
          <div className="flex gap-6 mx-4 shrink-0">
            {otherPlayers.map((p, index) => {
              const isTurn = roomData.current_turn === p.name;
              return (
                <div key={index} className="flex flex-col items-center relative transition-all">
                  <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl shadow-lg transition-transform ${isTurn ? 'bg-yellow-400 text-yellow-900 border-4 border-white scale-110 shadow-[0_0_20px_rgba(250,204,21,0.8)] z-10' : 'bg-blue-800 text-white border-2 border-white/50'}`}>
                    {p.name.charAt(0).toUpperCase()}
                    
                    {/* Card Count Badge */}
                    <div className="absolute -bottom-2 -right-2 bg-white text-blue-900 text-xs font-black px-2 py-1 rounded-md border-2 border-blue-900 shadow-md">
                      {p.hand.length}
                    </div>
                  </div>
                  <div className={`mt-3 text-sm font-black uppercase tracking-widest bg-blue-900/50 px-3 py-1 rounded-full border border-white/10 ${isTurn ? 'text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'text-white'}`}>
                    {p.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Right Pot/Coins */}
          {roomData.pot !== undefined && (
            <div className="sticky right-0 shrink-0 bg-yellow-400 text-yellow-900 border-b-4 border-yellow-600 px-4 h-12 rounded-xl flex items-center font-black text-lg shadow-md ml-auto">
               💰 {roomData.pot}
            </div>
          )}
        </div>

        {/* CENTER ARENA (Draw & Discard) */}
        <div className="flex-1 flex items-center justify-center relative w-full overflow-hidden">
          
          {/* Giant Directional Arrows Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
             <div className={`w-96 h-96 border-[24px] border-white rounded-full border-t-transparent border-b-transparent transition-transform duration-1000 ${roomData.direction === 1 ? 'rotate-45' : '-rotate-45'}`}></div>
          </div>

          <div className="flex gap-4 sm:gap-8 items-center z-10 relative mt-8">
            {/* Draw Deck (DUO) */}
            <div 
              className={`relative ${isMyTurn ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'opacity-90'} transform -rotate-6`}
              onClick={handleDrawCard}
            >
              <UnoCard color="black" value="DUO" />
            </div>

            {/* Active Discard Card */}
            <div className="relative transform rotate-6 drop-shadow-2xl">
              {topCard ? (
                <UnoCard color={getCardColor(topCard.color)} value={getCardValue(topCard.value)} />
              ) : (
                <div className="w-28 h-40 border-4 border-dashed border-white/40 rounded-2xl flex items-center justify-center bg-black/10">
                  <span className="text-white/50 font-black tracking-widest uppercase">Drop</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM HAND AREA */}
        <div className="h-64 flex flex-col justify-end pb-8 shrink-0 relative z-30 w-full max-w-4xl mx-auto">
          
          {/* Hand Header */}
          <div className="flex justify-between items-end px-6 mb-2">
            <span className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-md">
              <span className="text-yellow-400">YOUR</span> HAND
            </span>
            <div className={`px-6 py-2 rounded-full font-black uppercase tracking-widest text-sm border-2 shadow-lg transition-colors ${isMyTurn ? 'bg-green-500 text-white border-white shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-pulse' : 'bg-blue-900 text-white/50 border-blue-800'}`}>
              {isMyTurn ? 'Your Turn' : "Waiting..."}
            </div>
          </div>
          
          {/* Fanned Cards with proper overlapping */}
          <div className="flex justify-center items-end h-48 px-4 overflow-visible">
            {myPlayer.hand.map((card, idx) => {
               const playable = isMyTurn && isPlayable(card, topCard);
               // Overlap magic: negative left margin pulls them together
               return (
                <div 
                  key={card.id} 
                  className={`relative flex-shrink-0 transition-all duration-300 ${playable ? 'cursor-pointer hover:-translate-y-8 hover:z-50' : 'opacity-80 cursor-not-allowed'} ${idx !== 0 ? '-ml-10 sm:-ml-8' : ''}`}
                  style={{ zIndex: playable ? idx + 10 : idx }}
                  onClick={() => handlePlayCard(card)}
                >
                  <UnoCard 
                    color={getCardColor(card.color)} 
                    value={getCardValue(card.value)} 
                    isPlayable={playable}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // WAITING LOBBY (Images 1-3 Aesthetic)
  // ==========================================
  return (
    <main className="min-h-screen bg-gradient-to-b from-red-500 via-red-600 to-red-800 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden relative">
      
      {/* Top Nav */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <button onClick={() => router.push('/')} className="bg-yellow-400 text-yellow-900 border-b-4 border-yellow-600 w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-md active:scale-95 transition-all">
          {'<'}
        </button>
        <div className="bg-yellow-400 text-yellow-900 border-b-4 border-yellow-600 px-6 py-2 rounded-xl flex items-center gap-3 shadow-md font-black text-sm uppercase">
          Room: {roomId}
        </div>
      </div>

      <div className="max-w-md w-full bg-white rounded-[3rem] p-8 shadow-2xl text-center relative z-10 border-b-8 border-red-900/20">
        
        {!hasJoined ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-black mb-4 uppercase text-red-600 drop-shadow-sm">Join Game</h2>
            
            {roomData?.entry_bet && (
               <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-700 font-black py-3 rounded-2xl text-lg uppercase tracking-widest">
                 Entry: ${roomData.entry_bet}
               </div>
            )}
            
            <input 
              type="text" 
              placeholder="YOUR NAME" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bg-zinc-100 border-4 border-zinc-200 text-red-600 px-6 py-5 rounded-3xl w-full focus:outline-none focus:border-yellow-400 text-center font-black text-2xl uppercase placeholder-zinc-400 tracking-widest"
              maxLength={10}
            />
            
            <button 
              onClick={joinGame}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl transition-all shadow-xl active:scale-95 active:border-b-4 active:translate-y-1 text-2xl uppercase"
            >
              Play
            </button>
          </div>
        ) : (
          <div className="space-y-8 pt-4">
            <h2 className="text-3xl font-black text-red-500 uppercase">Waiting...</h2>
            
            <div className="flex flex-wrap justify-center gap-4">
              {players.map((p, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl border-4 border-red-100 bg-red-500 flex items-center justify-center font-black text-3xl text-white shadow-lg">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-black text-zinc-500 uppercase mt-2">{p.name}</span>
                </div>
              ))}

              {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex flex-col items-center opacity-30">
                  <div className="w-20 h-20 rounded-2xl border-4 border-dashed border-zinc-300 bg-zinc-100 flex items-center justify-center text-zinc-400 text-3xl font-black">
                    ?
                  </div>
                </div>
              ))}
            </div>

            {players.length >= 2 && (
              <button 
                onClick={handleStartGame}
                className="mt-6 w-full bg-green-500 hover:bg-green-400 text-white border-b-8 border-green-700 font-black py-5 rounded-3xl transition-all shadow-xl active:scale-95 active:border-b-4 active:translate-y-1 text-2xl uppercase tracking-wider"
              >
                Start
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}