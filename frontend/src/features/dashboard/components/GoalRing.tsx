import React from "react";

interface Props {
  progress: number;
  color: string;
}

const GoalRing: React.FC<Props> = ({ progress, color }) => (
  <div className="relative h-14 w-14">
    <div
      className="absolute inset-0 rounded-full border-4 border-white/30"
      aria-hidden="true"
    />
    <svg className="absolute inset-0" viewBox="0 0 36 36" role="presentation">
      <path
        className="stroke-white/20"
        strokeWidth="4"
        fill="none"
        d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831"
      />
      <path
        className="transition-all"
        strokeLinecap="round"
        strokeWidth="4"
        stroke={color}
        fill="none"
        strokeDasharray={`${Math.min(100, progress)}, 100`}
        d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831"
      />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
      {Math.round(progress)}%
    </div>
  </div>
);

export default GoalRing;
