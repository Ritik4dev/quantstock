import { apiClient } from './apiClient';
import { DashboardCards, DashboardSummary } from '@/types/api';

export interface SpoilageRiskItem {
  product_id: number;
  product_name: string;
  sku: string;
  expiry_date: string;
  days_until_expiry: number;
  current_stock: number;
  buying_price: number;
  potential_loss: number;
  spoilage_risk_pct: number;
  recommended_discount_pct: number;
  recommendation_text: string;
}

export interface HourlyFootfallPrediction {
  peak_hours_window: string;
  predicted_surge_pct: number;
  recommended_staffing: number;
  weather_impact: string;
  insight_text: string;
  has_sufficient_data: boolean;
}

export interface SmartInsightsResponse {
  spoilage_risks: SpoilageRiskItem[];
  footfall_prediction?: HourlyFootfallPrediction;
}

export interface InventoryCapacityMetric {
  total_occupied_units: number;
  total_capacity_units: number;
  utilization_pct: number;
  status: string;
  zone_breakdown: {
    zone_name: string;
    occupied: number;
    capacity: number;
    utilization_pct: number;
  }[];
}

export interface ShortestRunwayItem {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  daily_velocity: number;
  days_remaining: number;
  status: string;
}

export interface StockRunwayMetric {
  overall_days_remaining: number;
  daily_burn_rate_units: number;
  total_current_stock: number;
  shortest_runway_items: ShortestRunwayItem[];
}

export interface ItemStockSuggestion {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  sales_velocity_daily: number;
  action_type: string;
  suggested_order_qty: number;
  lead_time_days: number;
  supplier_name?: string;
  insight_text: string;
}

export const dashboardService = {
  getCards: async (): Promise<DashboardCards> => {
    const res = await apiClient.get<DashboardCards>('/dashboard');
    return res.data;
  },

  getSummary: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return res.data;
  },

  getSmartInsights: async (): Promise<SmartInsightsResponse> => {
    const res = await apiClient.get<SmartInsightsResponse>('/dashboard/smart-insights');
    return res.data;
  },

  getInventoryCapacity: async (): Promise<InventoryCapacityMetric> => {
    const res = await apiClient.get<InventoryCapacityMetric>('/dashboard/capacity');
    return res.data;
  },

  getStockRunway: async (): Promise<StockRunwayMetric> => {
    const res = await apiClient.get<StockRunwayMetric>('/dashboard/runway');
    return res.data;
  },

  getItemStockSuggestions: async (): Promise<ItemStockSuggestion[]> => {
    const res = await apiClient.get<ItemStockSuggestion[]>('/dashboard/suggestions');
    return res.data;
  },
};
