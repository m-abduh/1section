"use client"

import { motion } from "framer-motion"

interface SectionHeaderProps {
  badge: string
  title: string
  accent?: string
  description: string
  className?: string
}

export default function SectionHeader({ badge, title, accent, description, className = "" }: SectionHeaderProps) {
  const parts = accent ? title.split(accent) : [title]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`mb-16 text-center ${className}`}
    >
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#f97316]">
        {badge}
      </p>
      <h2 className="font-heading text-5xl font-black tracking-[-0.04em] sm:text-6xl text-white">
        {accent ? (
          <>
            {parts[0]}
            <span className="text-[#f97316]">{accent}</span>
            {parts[1]}
          </>
        ) : (
          title
        )}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-lg text-white/40">
        {description}
      </p>
    </motion.div>
  )
}
