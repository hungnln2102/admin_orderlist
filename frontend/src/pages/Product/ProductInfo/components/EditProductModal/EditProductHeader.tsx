import React from "react";

type EditProductHeaderProps = {
  title: string;
};

export const EditProductHeader: React.FC<EditProductHeaderProps> = ({ title }) => (
  <div className="flex items-center justify-center border-b border-white/10 px-5 py-3">
    <h3 className="text-lg font-semibold text-white text-center">{title}</h3>
  </div>
);
