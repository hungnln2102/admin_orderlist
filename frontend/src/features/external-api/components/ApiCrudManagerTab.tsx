import React from "react";

export interface ExternalApiPanelProps {
  children: React.ReactNode;
}

export const ApiCrudManagerTab: React.FC<ExternalApiPanelProps> = ({ children }) => <>{children}</>;
