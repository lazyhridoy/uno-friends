"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [betAmount, setBetAmount] = useState(50);

  const createRoom = async () => {
    setIsCreating(true);
    // Generate a random 6 character code
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Insert the room with the selected bet amount
    const { error } = await supabase
      .from('rooms')
      .insert([{ 
        id: newRoomId, 
        status: 'waiting', 
        players: [],
        entry_bet: betAmount,
        pot: 0
      }]);

    if (error) {
      console.error("Creation Error:", error);
      alert("Failed to create room! Check the console.");
      setIsCreating(false);
      return;
    }

    router.push(`/room/${newRoomId}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-600 via-red-700 to-red-900 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden relative select-none">
      
      {/* Decorative Bubbles */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-yellow-500 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-[3rem] p-8 shadow-2xl text-center relative z-10 border-b-8 border-red-900/20">
        
        {/* Title */}
        <h1 className="text-6xl font-black mb-8 text-red-600 tracking-tighter drop-shadow-sm">
          UNO<br/>
          <span className="text-4xl text-yellow-500">FRIENDS</span>
        </h1>

        {/* Create Room Section */}
        <div className="bg-zinc-100 p-6 rounded-3xl mb-6 shadow-inner">
          <h2 className="text-xl font-black text-zinc-500 uppercase mb-4 tracking-widest">Choose Bet</h2>
          
          <div className="flex justify-center gap-3 mb-6">
            {[50, 100, 500].map(amt => (
              <button 
                key={amt} 
                onClick={() => setBetAmount(amt)} 
                className={`px-4 py-3 rounded-2xl font-black text-lg transition-all ${betAmount === amt ? 'bg-yellow-400 text-yellow-900 border-b-4 border-yellow-600 scale-110 shadow-lg' : 'bg-white text-zinc-400 border-2 border-zinc-200 hover:border-yellow-400'}`}
              >
                ${amt}
              </button>
            ))}
          </div>

          <button 
            onClick={createRoom} 
            disabled={isCreating} 
            className="w-full bg-green-500 hover:bg-green-400 text-white border-b-8 border-green-700 font-black py-4 rounded-2xl transition-all active:scale-95 active:border-b-4 active:translate-y-1 text-xl uppercase tracking-widest shadow-xl"
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </button>
        </div>

        {/* Join Room Section */}
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="ROOM CODE" 
            value={joinCode} 
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
            className="bg-zinc-100 border-4 border-zinc-200 text-red-600 px-6 py-4 rounded-2xl w-full focus:outline-none focus:border-yellow-400 text-center font-black text-xl uppercase placeholder-zinc-300" 
            maxLength={6} 
          />
          <button 
            onClick={() => { if(joinCode) router.push(`/room/${joinCode}`) }} 
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 border-b-8 border-yellow-600 font-black px-6 rounded-2xl transition-all active:scale-95 active:border-b-4 active:translate-y-1 text-xl uppercase shadow-xl"
          >
            Join
          </button>
        </div>

      </div>
    </main>
  );
}