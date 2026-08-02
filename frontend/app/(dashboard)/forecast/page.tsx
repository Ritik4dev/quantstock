'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { forecastService } from '@/services/forecastService';
import { TrendingUp, Calendar, CloudSun, ShieldCheck, Sparkles } from 'lucide-react';
import ExplainWithAIButton from '@/components/ai/ExplainWithAIButton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function ForecastPage() {
  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ['forecastOverview'],
    queryFn: forecastService.getOverview,
  });

  const { data: weeklyTrend, isLoading: weeklyLoading } = useQuery({
    queryKey: ['weeklyForecast'],
    queryFn: forecastService.getWeeklyForecast,
  });

  if (forecastLoading || weeklyLoading) {
    return <div className="p-8 text-slate-400">Loading XGBoost ML Demand Forecast Engine...</div>;
  }

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-inspo p-7">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#C6FF00]" />
            XGBoost ML Demand Forecast Engine
          </h1>
          <p className="text-xs text-[#8E8E8E] mt-1">
            Predictive demand forecasting integrating Open-Meteo Weather API, Holiday calendars, and sales velocity lags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/20 text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Avg Model Confidence: {forecastData ? (forecastData.average_confidence_score * 100).toFixed(0) : 0}%
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-inspo p-6 flex flex-col justify-between h-[130px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E8E]">Products Forecasted</div>
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
            {forecastData ? forecastData.total_products_forecasted : 0}
          </div>
        </div>
        <div className="card-inspo p-6 flex flex-col justify-between h-[130px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E8E]">7-Day Predicted Sales Demand</div>
          <div className="text-3xl font-extrabold text-[#C6FF00] tracking-tight font-mono">
            {forecastData ? forecastData.total_7d_predicted_units : 0} units
          </div>
        </div>
        <div className="card-inspo p-6 flex flex-col justify-between h-[130px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E8E]">30-Day Predicted Sales Demand</div>
          <div className="text-3xl font-extrabold text-[#B7FF38] tracking-tight font-mono">
            {forecastData ? forecastData.total_30d_predicted_units : 0} units
          </div>
        </div>
      </div>

      {/* 7-Day Weekly Breakdown Chart */}
      <div className="card-inspo p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
          <Calendar className="w-4 h-4 text-[#C6FF00]" />
          7-Day Store-Wide Sales Forecast Breakdown
        </h2>

        {weeklyTrend && weeklyTrend.length > 0 ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day_name" stroke="#8E8E8E" fontSize={11} />
                <YAxis stroke="#8E8E8E" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151515',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="predicted_demand" fill="#C6FF00" radius={[6, 6, 0, 0]} name="Predicted Demand (Units)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[#8E8E8E] bg-[#101010] rounded-2xl border border-white/5">
            No Data Available
          </div>
        )}
      </div>

      {/* Product-Level Forecast Cards Table */}
      <div className="card-inspo p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
          <Sparkles className="w-4 h-4 text-[#C6FF00]" />
          Item-Level Multi-Horizon Predictions
        </h2>

        {forecastData?.product_forecasts && forecastData.product_forecasts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#8E8E8E]">
              <thead className="text-[11px] font-semibold text-[#555555] uppercase border-b border-white/5">
                <tr>
                  <th className="pb-3 px-3 font-semibold">SKU</th>
                  <th className="pb-3 px-3 font-semibold">Product Name</th>
                  <th className="pb-3 px-3 font-semibold">Current Stock</th>
                  <th className="pb-3 px-3 font-semibold">1-Day Demand</th>
                  <th className="pb-3 px-3 font-semibold">7-Day Demand</th>
                  <th className="pb-3 px-3 font-semibold">30-Day Demand</th>
                  <th className="pb-3 px-3 font-semibold">Model Factors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {forecastData.product_forecasts.map((f) => (
                  <tr key={f.product_id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="py-3.5 px-3 font-mono text-xs text-[#C6FF00]">{f.sku}</td>
                    <td className="py-3.5 px-3 font-medium text-white">{f.product_name}</td>
                    <td className="py-3.5 px-3 font-semibold text-white font-mono">{f.current_stock}</td>
                    <td className="py-3.5 px-3 font-bold text-[#C6FF00] font-mono">{f.forecast_1d}</td>
                    <td className="py-3.5 px-3 font-bold text-[#B7FF38] font-mono">{f.forecast_7d}</td>
                    <td className="py-3.5 px-3 font-bold text-[#FFD84D] font-mono">{f.forecast_30d}</td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {f.key_factors.slice(0, 2).map((factor, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] bg-[#101010] text-[#8E8E8E] border border-white/5 font-medium"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                        <ExplainWithAIButton
                          topic={`XGBoost Demand Forecast for '${f.product_name}'`}
                          contextData={{
                            product: f.product_name,
                            current_stock: f.current_stock,
                            forecast_7d: f.forecast_7d,
                            forecast_30d: f.forecast_30d,
                            daily_avg_demand: f.daily_avg_demand,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#8E8E8E] bg-[#101010] rounded-2xl border border-white/5">
            No Data Available
          </div>
        )}
      </div>
    </div>
  );
}
