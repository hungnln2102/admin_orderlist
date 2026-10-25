import React from "react";

export const LoginBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#060911]" aria-hidden="true">
      {/* Dynamic Aurora Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] max-w-[650px] max-h-[650px] rounded-full bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-sky-500/20 blur-[100px] aurora-blob-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-gradient-to-bl from-cyan-500/25 via-indigo-600/20 to-violet-600/30 blur-[110px] aurora-blob-2" />
      <div className="absolute top-[30%] right-[20%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] rounded-full bg-gradient-to-br from-fuchsia-600/15 via-indigo-500/15 to-transparent blur-[90px] aurora-blob-3" />

      {/* Cyber Grid Dot Matrix */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
        }}
      />
    </div>
  );
};
