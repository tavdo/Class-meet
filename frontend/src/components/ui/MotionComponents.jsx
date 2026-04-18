import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { forwardRef } from 'react'

/** @type {(...args: any[]) => string} */
function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const MotionButton = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-accent-500/40 disabled:opacity-50 disabled:pointer-events-none",
        "bg-surface-800 border border-white/10 text-white hover:bg-surface-700",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
})
MotionButton.displayName = 'MotionButton'

export const MotionCard = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "glass overflow-hidden rounded-2xl shadow-glass transition-shadow hover:shadow-accent-500/10",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
})
MotionCard.displayName = 'MotionCard'

export const MotionInput = forwardRef(({ label, error, className, ...props }, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="text-xs font-medium text-slate-400 ml-1">{label}</label>}
      <motion.div
        whileFocus={{ scale: 1.005 }}
        className="relative"
      >
        <input
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3 text-sm text-white transition-all focus:border-accent-500/50 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-accent-500/10 placeholder:text-slate-600",
            error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10",
            className
          )}
          {...props}
        />
      </motion.div>
      {error && <p className="text-[10px] text-red-500 ml-1">{error}</p>}
    </div>
  )
})
MotionInput.displayName = 'MotionInput'
