export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white font-sans">
      
      {/* Lobby Container */}
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        
        {/* UNO Title */}
        <h1 className="text-6xl font-black tracking-tighter mb-2">
          <span className="text-red-500">U</span>
          <span className="text-yellow-500">N</span>
          <span className="text-green-500">O</span>
        </h1>
        <p className="text-zinc-400 font-medium mb-8 uppercase tracking-widest text-sm">Friends Edition</p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
            Create a New Room
          </button>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-700"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-500 text-sm">OR</span>
            <div className="flex-grow border-t border-zinc-700"></div>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter Room Code" 
              className="bg-zinc-950 border border-zinc-700 text-white px-4 py-3 rounded-xl flex-grow focus:outline-none focus:border-blue-500 text-center uppercase"
              maxLength={6}
            />
            <button className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95">
              Join
            </button>
          </div>
        </div>

      </div>

    </main>
  );
}