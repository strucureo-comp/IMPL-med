import { motion } from 'framer-motion';

export default function HeroSection() {
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const child = {
    hidden: { opacity: 0, y: 15, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { type: "spring", damping: 25, stiffness: 120 },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 pt-12 pb-10 px-4">
      {/* Subtle Trust Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
          KLS Martin • 5,274 Grounded Instruments
        </span>
      </motion.div>

      {/* Animated Title */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="max-w-3xl"
      >
        <motion.h1
          variants={child}
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-display leading-tight"
        >
          <span className="text-gradient-premium pb-1 inline-block">
            Precision Instrument Matcher.
          </span>
        </motion.h1>
      </motion.div>

      {/* Elegant Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-[15px] md:text-base text-slate-500 max-w-xl mx-auto leading-relaxed font-medium"
      >
        Instantly cross-reference competitor codes, anatomy descriptions, or surgical photos with deterministic catalog grounding.
      </motion.p>
    </div>
  );
}
