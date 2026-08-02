export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface BusinessProfile {
  id: number;
  business_id: number;
  location_type?: string;
  nearby_places?: string[];
  primary_customers?: string[];
  daily_customers?: string;
  top_products?: string[];
  employees?: string;
  supplier_count?: string;
  seasonality?: string;
  business_scale?: string;
  notes?: string;
}

export interface Business {
  id: number;
  owner_id: number;
  business_name: string;
  business_type: string;
  created_at: string;
  profile?: BusinessProfile;
}

export interface Product {
  id: number;
  business_id: number;
  sku: string;
  name: string;
  category?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  inventory?: Inventory;
}

export interface Inventory {
  id: number;
  business_id: number;
  product_id: number;
  supplier_id?: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  buying_price: number;
  selling_price: number;
  expiry_date?: string;
  status: string; // Healthy, Low Stock, Out Of Stock, Overstock, Expired, Expiring Soon
}

export interface Supplier {
  id: number;
  business_id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  lead_time_days: number;
}

export interface ImportHistory {
  id: number;
  filename: string;
  rows_imported: number;
  rows_failed: number;
  status: string;
  upload_time: string;
}

export interface InventoryHealthBreakdown {
  healthy_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  overstock_count: number;
  expired_count: number;
  expiring_soon_count: number;
}

export interface DashboardCards {
  total_products: number;
  total_inventory_value_cost: number;
  total_inventory_value_retail: number;
  todays_sales: number;
  weekly_sales: number;
  monthly_sales: number;
  total_revenue: number;
  total_profit: number;
  total_suppliers: number;
  products_running_low: number;
  products_expiring: number;
  inventory_health: InventoryHealthBreakdown;
}

export interface DashboardSummary {
  cards: DashboardCards;
  low_stock_alerts: any[];
  expiring_alerts: any[];
}

export interface SalesTrendPoint {
  period: string;
  sales_count: number;
  revenue: number;
  profit: number;
}

export interface ProductPerformanceItem {
  product_id: number;
  name: string;
  sku: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_profit: number;
  current_stock: number;
  status: string;
}

export interface CategoryDistributionItem {
  category: string;
  product_count: number;
  total_stock: number;
  inventory_value: number;
}

export interface AnalyticsOverview {
  daily_sales: SalesTrendPoint[];
  weekly_sales: SalesTrendPoint[];
  monthly_sales: SalesTrendPoint[];
  total_revenue: number;
  total_profit: number;
  total_inventory_value: number;
  best_sellers: ProductPerformanceItem[];
  worst_sellers: ProductPerformanceItem[];
  fast_moving_products: ProductPerformanceItem[];
  slow_moving_products: ProductPerformanceItem[];
  category_distribution: CategoryDistributionItem[];
}

export interface WeeklyForecastDay {
  day_name: string;
  date: string;
  predicted_demand: number;
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_name?: string;
  weather_summary?: string;
}

export interface ProductForecast {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  forecast_1d: number;
  forecast_3d: number;
  forecast_7d: number;
  forecast_14d: number;
  forecast_30d: number;
  horizon_7d_units?: number;
  horizon_30d_units?: number;
  lead_time_days?: number;
  recommendation_summary?: string;
  confidence_score: number;
  daily_avg_demand: number;
  weekly_breakdown: WeeklyForecastDay[];
  key_factors: string[];
}

export interface ForecastOverview {
  total_products_forecasted: number;
  total_7d_predicted_units: number;
  total_30d_predicted_units: number;
  average_confidence_score: number;
  product_forecasts: ProductForecast[];
}

export interface ProductRecommendation {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  buying_price: number;
  selling_price: number;
  recommended_order_quantity: number;
  reorder_threshold: number;
  safety_stock: number;
  supplier_lead_time_days: number;
  supplier_name?: string;
  stockout_risk: string;
  overstock_risk: string;
  expiry_risk: string;
  dead_stock_risk: string;
  action_type: string;
  action_reason: string;
}

export interface RecommendationOverview {
  total_recommended_reorder_units: number;
  total_estimated_reorder_cost: number;
  high_priority_reorders_count: number;
  clearance_items_count: number;
  recommendations: ProductRecommendation[];
}

export interface RiskAlertItem {
  product_id: number;
  product_name: string;
  sku: string;
  risk_type: string;
  severity: string;
  description: string;
  suggested_action: string;
}

export interface RiskScorecard {
  overall_business_risk_score: number;
  inventory_health_score: number;
  forecast_confidence_score: number;
  stockout_risk_count: number;
  overstock_risk_count: number;
  expiry_risk_count: number;
  dead_stock_risk_count: number;
  active_risk_alerts: RiskAlertItem[];
}

export interface ChatResponse {
  session_id: string;
  message: string;
  intent: string;
  grounding_sources: string[];
  suggested_followups: string[];
}

export interface DailyBriefResponse {
  greeting: string;
  date: string;
  expected_sales_today: number;
  low_stock_count: number;
  products_to_buy: string[];
  business_opportunities: string[];
  risks_summary: string;
  business_summary: string;
}

export interface ReportSummaryResponse {
  period: string;
  total_revenue: number;
  total_profit: number;
  best_sellers: string[];
  inventory_health_score: number;
  executive_summary: string;
}

export interface ParseCommandResponse {
  action: string;
  product_name: string;
  quantity: number;
  executed: boolean;
  message: string;
  product_id?: number;
  updated_stock?: number;
}
