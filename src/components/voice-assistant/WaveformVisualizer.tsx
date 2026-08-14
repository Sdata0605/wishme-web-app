import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface WaveformVisualizerProps {
  isActive: boolean;
  audioLevel?: number;
  className?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  audioLevel = 0,
  className
}) => {
  const [bars, setBars] = useState<number[]>(Array(8).fill(0));
  const animationRef = useRef<number>();

  useEffect(() => {
    if (isActive) {
      const animate = () => {
        setBars(prev => prev.map(() => {
          const baseHeight = audioLevel * 100;
          const randomVariation = Math.random() * 30;
          return Math.min(100, baseHeight + randomVariation);
        }));
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      setBars(Array(8).fill(0));
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel]);

  return (
    <div className={cn(
      "flex items-center justify-center gap-1 h-12 transition-opacity duration-300",
      isActive ? "opacity-100" : "opacity-0",
      className
    )}>
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-1 bg-primary rounded-full transition-all duration-100"
          style={{
            height: `${Math.max(4, height)}%`,
            transitionTimingFunction: 'ease-in-out'
          }}
        />
      ))}
    </div>
  );
};
