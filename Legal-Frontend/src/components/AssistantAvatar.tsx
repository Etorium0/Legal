import React from 'react';
import { motion } from 'framer-motion';

type Props = {
  state: 'idle' | 'listening' | 'processing' | 'speaking';
};

export const AssistantAvatar: React.FC<Props> = ({ state }) => 
{
  const color = {
    idle: 'bg-indigo-500',
    listening: 'bg-emerald-500',
    processing: 'bg-yellow-400',
    speaking: 'bg-sky-500',
  }[state];

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className={`w-40 h-40 rounded-full ${color} shadow-lg flex items-center justify-center text-white text-2xl font-semibold`}
        animate={state === 'listening' ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 1.2, repeat: state === 'listening' ? Infinity : 0 }}
      >
        {/* Minimal avatar: initials or mic icon */}
        {state === 'listening' ? '🎙️' : 'VA'}
      </motion.div>
      <div className="mt-3 text-sm text-gray-600">{state.toUpperCase()}</div>
    </div>
  );
};

export default AssistantAvatar;
