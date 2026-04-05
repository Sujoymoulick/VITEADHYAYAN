import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export function GalaxyBackground({ theme }: { theme: 'dark' | 'light' }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number }>>([]);

  useEffect(() => {
    // Generate random particles
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
    }));
    setParticles(newParticles);
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      {/* Base Background */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{
          backgroundColor: isDark ? '#050505' : '#f0f4f8',
        }}
        transition={{ duration: 1 }}
      />

      {/* Nebula Gradients */}
      <motion.div
        className="absolute inset-0 opacity-50"
        initial={false}
        animate={{
          background: isDark
            ? 'radial-gradient(circle at 20% 30%, rgba(0, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(138, 43, 226, 0.15) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 30%, rgba(49, 130, 206, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)',
        }}
        transition={{ duration: 1 }}
      />

      {/* Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: isDark ? '#00FFFF' : '#3182CE',
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
