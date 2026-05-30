"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();
  
  // Navigation State: 'home' | 'friends' | 'create' | 'join'
  const [currentScreen, setCurrentScreen] = useState<'home' | 'friends' | 'create' | 'join'>('home');
  
  // Game Setup State
  const [joinCode, setJoinCode] = useState("");
  const [betAmount, setBetAmount] = useState(50);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = async () => {
    setIsCreating(true);
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from('rooms').insert([{ 
      id: newRoomId, 
      status: 'waiting', 
      players: [],
      entry_bet: betAmount,
      pot: 0,
      max_players: maxPlayers
    }]);

    if (error) {
      alert("Failed to create room!");
      setIsCreating(false);
      return;
    }
    router.push(`/room/${newRoomId}`);
  };

  // VIBRANT BUTTON COMPONENT
  const MenuButton = ({ title, emoji, onClick, subtext = "" }: { title: string, emoji: string, onClick: () => void, subtext?: string }) => (
    <button onClick={onClick} className="relative w-full max-w-sm mx-auto group active:scale-95 transition-transform duration-200">
      <div className="absolute inset-0 bg-purple-900 rounded-3xl translate-y-2"></div>
      <div className="relative bg-gradient-to-b from-purple-500 to-purple-700 border-4 border-purple-400 rounded-3xl p-4 flex items-center justify-between shadow-xl">
        <div className="text-5xl drop-shadow-md z-10 absolute -left-4 -top-4 transform -rotate-12 group-hover:rotate-12 transition-transform">{emoji}</div>
        <div className="flex-1 text-center pl-8">
          <div className="bg-yellow-400 text-red-600 font-black text-sm px-4 py-1 rounded-full inline-block mb-1 border-2 border-yellow-200 shadow-sm uppercase">{title.split(' ')[0]}</div>
          <h2 className="text-3xl font-black text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] tracking-tighter uppercase">{title.substring(title.indexOf(' ') + 1)}</h2>
          {subtext && <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mt-1">{subtext}</p>}
        </div>
        <div className="text-white text-3xl font-black opacity-50">▶</div>
      </div>
    </button>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-500 via-red-600 to-red-800 flex flex-col items-center p-6 text-white font-sans overflow-hidden select-none relative">
      
      {/* Top Header - Profile & Coins */}
      <div className="w-full max-w-md flex justify-between items-center mb-12 mt-4">
        <div className="bg-yellow-400 text-yellow-900 font-black px-4 py-2 rounded-full border-b-4 border-yellow-600 shadow-lg flex items-center gap-2">
           <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xl">🧔🏻‍♂️</div>
           AHIDUR
        </div>
        <div className="bg-yellow-400 text-yellow-900 font-black px-6 py-2 rounded-full border-b-4 border-yellow-600 shadow-lg flex items-center gap-2 text-xl">
           <span className="bg-yellow-200 rounded-full w-6 h-6 flex items-center justify-center text-sm border border-yellow-500">$</span> 950
        </div>
      </div>

      {/* SCREEN 1: HOME */}
      {currentScreen === 'home' && (
        <div className="w-full flex-1 flex flex-col justify-center gap-8 z-10">
          <MenuButton title="Play Offline" emoji="😆" onClick={() => alert("Bots coming soon!")} />
          <MenuButton title="Play Online" emoji="😮" onClick={() => alert("Global matchmaking coming soon!")} />
          <MenuButton title="Play With Friends" emoji="🥰" onClick={() => setCurrentScreen('friends')} subtext="Local or Remote" />
        </div>
      )}

      {/* SCREEN 2: FRIENDS MENU */}
      {currentScreen === 'friends' && (
        <div className="w-full flex-1 flex flex-col justify-center items-center z-10 max-w-md">
          <button onClick={() => setCurrentScreen('home')} className="absolute top-6 left-6 w-12 h-12 bg-yellow-400 rounded-xl border-b-4 border-yellow-600 flex items-center justify-center font-black text-yellow-900 text-2xl active:scale-95 z-50">{'<'}</button>
          
          <div className="relative bg-gradient-to-b from-purple-500 to-purple-700 border-4 border-purple-400 rounded-3xl p-8 shadow-2xl w-full text-center mb-8">
             <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-6xl drop-shadow-lg">🥰</div>
             <h2 className="text-3xl font-black text-yellow-300 drop-shadow-md tracking-tighter uppercase mt-4">Play With<br/>Friends</h2>
          </div>
          
          <p className="text-xl font-black uppercase tracking-widest mb-6 drop-shadow-md text-center">What would you like to do?</p>
          
          <div className="flex flex-col gap-4 w-full">
            <button onClick={() => setCurrentScreen('create')} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl text-2xl uppercase active:scale-95 active:translate-y-2 transition-all">Create Room</button>
            <button onClick={() => setCurrentScreen('join')} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl text-2xl uppercase active:scale-95 active:translate-y-2 transition-all">Join Room</button>
          </div>
        </div>
      )}

      {/* SCREEN 3: CREATE ROOM (Player & Bet Selection) */}
      {currentScreen === 'create' && (
        <div className="w-full flex-1 flex flex-col items-center pt-10 z-10 max-w-md">
          <button onClick={() => setCurrentScreen('friends')} className="absolute top-6 left-6 w-12 h-12 bg-yellow-400 rounded-xl border-b-4 border-yellow-600 flex items-center justify-center font-black text-yellow-900 text-2xl active:scale-95 z-50">{'<'}</button>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-md mb-8">Room Type</h1>

          <p className="font-black uppercase tracking-widest mb-4">Please Select Players</p>
          <div className="grid grid-cols-4 gap-3 w-full mb-8">
            {[2,3,4,5,6,7,8,10].map(num => (
              <button key={num} onClick={() => setMaxPlayers(num)} className={`relative p-3 rounded-2xl border-4 transition-all active:scale-95 ${maxPlayers === num ? 'bg-purple-500 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-110 z-10' : 'bg-purple-800 border-purple-600'}`}>
                <div className="text-yellow-400 font-black text-2xl">{num}</div>
                <div className="text-[10px] text-white uppercase font-bold tracking-widest">Players</div>
              </button>
            ))}
          </div>

          <p className="font-black uppercase tracking-widest mb-4">Please Select Bet</p>
          <div className="flex gap-4 w-full mb-12">
            {[50, 100, 500].map(amt => (
              <button key={amt} onClick={() => setBetAmount(amt)} className={`flex-1 relative py-6 rounded-2xl border-4 transition-all active:scale-95 flex flex-col items-center justify-center ${betAmount === amt ? 'bg-blue-500 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105' : 'bg-blue-800 border-blue-600'}`}>
                <div className="text-white font-black text-2xl drop-shadow-md">${amt}</div>
                <div className="text-3xl mt-2 drop-shadow-xl">🪙</div>
              </button>
            ))}
          </div>

          <button onClick={createRoom} disabled={isCreating} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl text-2xl uppercase active:scale-95 transition-all">
            {isCreating ? 'Creating...' : 'Continue'}
          </button>
        </div>
      )}

      {/* SCREEN 4: JOIN ROOM */}
      {currentScreen === 'join' && (
        <div className="w-full flex-1 flex flex-col items-center pt-10 z-10 max-w-md">
          <button onClick={() => setCurrentScreen('friends')} className="absolute top-6 left-6 w-12 h-12 bg-yellow-400 rounded-xl border-b-4 border-yellow-600 flex items-center justify-center font-black text-yellow-900 text-2xl active:scale-95 z-50">{'<'}</button>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-md mb-8">Join Friends</h1>

          <p className="font-black uppercase tracking-widest mb-4">Select Room Bet</p>
          <div className="flex gap-4 w-full mb-8">
            {[50, 100, 500].map(amt => (
              <button key={amt} onClick={() => setBetAmount(amt)} className={`flex-1 py-4 rounded-2xl border-4 transition-all ${betAmount === amt ? 'bg-blue-500 border-white scale-105' : 'bg-blue-800 border-blue-600'}`}>
                <div className="text-white font-black text-xl">${amt}</div>
              </button>
            ))}
          </div>

          <p className="font-black uppercase tracking-widest mb-4">Enter Room Code</p>
          <input 
            type="text" 
            value={joinCode} 
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
            className="w-full bg-white border-4 border-zinc-200 text-red-600 px-6 py-5 rounded-2xl focus:outline-none focus:border-yellow-400 text-center font-black text-3xl uppercase tracking-widest mb-8" 
            maxLength={6} 
          />

          <button onClick={() => { if(joinCode) router.push(`/room/${joinCode}`) }} className="w-full bg-yellow-400 text-yellow-900 border-b-8 border-yellow-600 font-black py-5 rounded-3xl text-2xl uppercase active:scale-95 transition-all">
            Join Room
          </button>
        </div>
      )}
    </main>
  );
}