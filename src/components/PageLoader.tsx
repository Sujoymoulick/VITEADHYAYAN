import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-transparent">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-64 h-64 rounded-full bg-teal-500/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute w-96 h-96 rounded-full bg-purple-500/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Main logo animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          <motion.div
            animate={{ 
              rotateY: [0, 360],
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30"
          >
            <BookOpen className="w-10 h-10 text-white" />
          </motion.div>
          
          {/* Orbiting sparkles */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-1.5rem]"
          >
            <Sparkles className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-5 text-yellow-400" />
          </motion.div>
        </motion.div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 flex flex-col items-center"
        >
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400 tracking-wider">
            ADHYAYAN
          </h2>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-slate-400 uppercase tracking-widest">Loading</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-1 h-1 bg-teal-500 rounded-full"
                />
              ))}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
