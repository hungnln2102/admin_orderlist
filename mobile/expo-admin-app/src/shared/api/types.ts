export type HealthResponse = {
  status: string;
  uptime: number;
  dbConnected: boolean;
  redisConnected: boolean;
};
