import React from 'react';
import { motion } from 'motion/react';
import SolarLoader from './ui/solar-loader';

export function PageLoader() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-transparent">
      <div className="relative z-10 flex flex-col items-center">
        {/* Solar Loader Animation */}
        <div className="mb-12">
          <SolarLoader size={30} speed={1} />
        </div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-16 flex flex-col items-center"
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
