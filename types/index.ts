export interface SearchRequest {
  from: string;
  to: string;
  date: string;
  returnDate?: string;
  flightClass?: string;
  trainClass?: string;
}

export interface LocationCode {
  code: string;
  name: string;
  type: 'train' | 'bus' | 'flight';
}

export interface TravelOption {
  id: string;
  provider: string;
  type: 'train' | 'bus' | 'flight';
  from: {
    code: string;
    name: string;
    time: string;
  };
  to: {
    code: string;
    name: string;
    time: string;
  };
  duration: string;
  price: {
    amount: number;
    currency: string;
  };
  availability: boolean;
  bookingReference?: string;
  class?: string;
  operator?: string;
  stops?: number;
}

export interface SearchResponse {
  success: boolean;
  data: {
    options: TravelOption[];
    searchParams: SearchRequest;
    timestamp: string;
  };
  errors?: string[];
}

export interface ProviderResponse {
  provider: string;
  success: boolean;
  data?: TravelOption[];
  error?: string;
}

export type AnalyticsEventType = 'signup' | 'login' | 'booking';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: string;
  userEmail?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsSummary {
  counts: {
    signups: number;
    logins: number;
    bookings: number;
  };
  uniqueUsers: number;
  recent: {
    signups: AnalyticsEvent[];
    logins: AnalyticsEvent[];
    bookings: AnalyticsEvent[];
  };
  lastUpdated: string;
}

export interface LocationSearchResult {
  code: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
}
