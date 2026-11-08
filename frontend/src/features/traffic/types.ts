export interface DailyTrafficItem {
  date: string;
  fullDate?: string;
  visitors: number;
  sessions: number;
  pageviews: number;
  bounceRate: number;
  avgDuration: string;
}

export interface SourceItem {
  name: string;
  channel?: string;
  sessions: number;
  users: number;
  newUsers?: number;
  bounceRate: string;
  share: number;
}

export interface TopPageItem {
  path: string;
  title: string;
  views: number;
  users: number;
  time: string;
  bounceRate: string;
}

export interface DeviceItem {
  device: string;
  name?: string;
  os: string;
  browser: string;
  sessions: number;
  users: number;
  share: number;
  color?: string;
}

export interface LocationItem {
  city: string;
  country: string;
  sessions: number;
  users: number;
  share: number;
}

export interface TrafficApiResponse {
  source: string;
  available?: boolean;
  reason?: string;
  domain: string;
  days: number;
  lastUpdated: string;
  kpi: {
    pageviews: string;
    pageviewsChange: string;
    visitors: string;
    visitorsChange: string;
    sessions: string;
    sessionsChange: string;
    avgDuration: string;
    avgDurationChange: string;
    bounceRate: string;
    bounceRateChange: string;
    returningRate: string;
    returningRateChange: string;
  };
  trafficData: DailyTrafficItem[];
  sourceData: SourceItem[];
  topPages: TopPageItem[];
  deviceData: DeviceItem[];
  locationData: LocationItem[];
  newVsReturning: { name: string; value: number; share: number; color?: string }[];
}
