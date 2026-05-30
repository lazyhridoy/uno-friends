"use client";

import { motion } from "framer-motion";

interface UnoCardProps {
  color: 'red' | 'blue' | 'green' | 'yellow' | 'black';
  value: string;
  isPlayable?: boolean;
}

export default function UnoCard({ color, value, isPlayable = false }: UnoCardProps) {
  // Duo aesthetic color mapping
  const colorStyles = {
    red: "bg-gradient-to-br from-red-500 to-red-700 border-red-800 text-red-600 shadow-red-900/50",
    blue: "bg-gradient-to-br from-blue-400 to-blue-600 border-blue-800 text-blue-600 shadow-blue-900/50",
    green: "bg-gradient-to-br from-green-400 to-green-600 border-green-800 text-green-600 shadow-green-900/50",
    yellow: "bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-700 text-yellow-600 shadow-yellow-900/50",
    black: "bg-gradient-to-br from-zinc-700 to-zinc-900 border-black text-zinc-800 shadow-black/80"
  };

  const currentStyle = colorStyles[color];

  return (
    <motion.div
      // Aggressive spring physics for an immediate, crisp "pop"
      whileHover={isPlayable ? { y: -24, scale: 1.1, zIndex: 50 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`
        relative w-28 h-40 rounded-[1.25rem] shadow-2xl flex items-center justify-center cursor-pointer select-none
        border-[6px] ${currentStyle.split(' ')[2]}
        ${isPlayable ? 'hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] z-10' : 'opacity-80 brightness-75'}
      `}
    >
      {/* Outer gradient colored area */}
      <div className={`absolute inset-0 rounded-xl ${currentStyle.split(' ')[0]} ${currentStyle.split(' ')[1]}`}></div>
      
      {/* Inner white oval with a thick border */}
      <div className="absolute w-[4.5rem] h-[6.5rem] bg-white rounded-[40px] transform -rotate-[15deg] flex items-center justify-center shadow-inner border-2 border-white/20">
        {/* Main Center Value */}
        <span className={`text-[3.25rem] leading-none font-black transform rotate-[15deg] ${currentStyle.split(' ')[3]} drop-shadow-md tracking-tighter`}>
          {value}
        </span>
      </div>

      {/* Micro-typography Top Left */}
      <span className="absolute top-1.5 left-2 text-white font-black text-lg leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
        {value}
      </span>

      {/* Micro-typography Bottom Right */}
      <span className="absolute bottom-1.5 right-2 text-white font-black text-lg leading-none transform rotate-180 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
        {value}
      </span>
      
      {/* Glassy reflection effect overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none"></div>
    </motion.div>
  );
}