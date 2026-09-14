'use client';
import { motion } from 'framer-motion';
import React from 'react';

export const FadeIn = ({ 
  children, 
  delay = 0, 
  className = "",
  style,
  direction = "up"
}: { 
  children: React.ReactNode, 
  delay?: number, 
  className?: string,
  style?: React.CSSProperties,
  direction?: "up" | "down" | "left" | "right" | "none"
}) => {
  const getInitialY = () => direction === "up" ? 40 : direction === "down" ? -40 : 0;
  const getInitialX = () => direction === "left" ? 40 : direction === "right" ? -40 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: getInitialY(), x: getInitialX() }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] as const }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};
