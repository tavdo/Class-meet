import { motion, useReducedMotion } from 'framer-motion'
import { memo } from 'react'

export const AnimatedBackground = memo(({ performanceMode = false }) => {
  const shouldReduceMotion = useReducedMotion()
  const isPaused = performanceMode || shouldReduceMotion

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#05060b]">
      {/* Mesh Gradient Layers */}
      <motion.div
        animate={isPaused ? {} : {
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] rounded-full bg-emerald-500/10 blur-[120px]"
      />
      <motion.div
        animate={isPaused ? {} : {
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
          delay: 2
        }}
        className="absolute top-[20%] -right-[10%] h-[60%] w-[60%] rounded-full bg-blue-600/10 blur-[120px]"
      />
      <motion.div
        animate={isPaused ? {} : {
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
          delay: 5
        }}
        className="absolute -bottom-[20%] left-[20%] h-[50%] w-[80%] rounded-full bg-purple-600/5 blur-[120px]"
      />
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  )
})

AnimatedBackground.displayName = 'AnimatedBackground'
