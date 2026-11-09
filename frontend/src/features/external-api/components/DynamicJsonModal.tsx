import React from "react";

export interface ExternalApiModalProps {
  children: React.ReactNode;
}

export const DynamicJsonModal: React.FC<ExternalApiModalProps> = ({ children }) => <>{children}</>;
