'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { forecastService } from '@/services/forecastService';
import { TrendingUp, Calendar, CloudSun, ShieldCheck, Sparkles } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C28] p-6 rounded-2xl border border-[#222D3F]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
            XGBoost ML Demand Forecast Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Predictive demand forecasting integrating Open-Meteo Weather API, Holiday calendars, and sales velocity lags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Avg Model Confidence: {forecastData ? (forecastData.average_confidence_score * 100).toFixed(0) : 0}%
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="text-xs font-semibold uppercase text-slate-400">Products Forecasted</div>
          <div className="text-2xl font-bold text-white mt-2">
            {forecastData ? forecastData.total_products_forecasted : 0}
          </div>
        </div>
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="text-xs font-semibold uppercase text-slate-400">7-Day Predicted Sales Demand</div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">
            {forecastData ? forecastData.total_7d_predicted_units : 0} units
          </div>
        </div>
        <div className="bg-[#151C28] border border-[#222D3F] p-5 rounded-2xl">
          <div className="text-xs font-semibold uppercase text-slate-400">30-Day Predicted Sales Demand</div>
          <div className="text-2xl font-bold text-violet-400 mt-2">
            {forecastData ? forecastData.total_30d_predicted_units : 0} units
          </div>
        </div>
      </div>

      {/* 7-Day Weekly Breakdown Chart */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          7-Day Store-Wide Sales Forecast Breakdown
        </h2>

        {weeklyTrend && weeklyTrend.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222D3F" />
                <XAxis dataKey="day_name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151C28',
                    borderColor: '#222D3F',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="predicted_demand" fill="#6366F1" radius={[6, 6, 0, 0]} name="Predicted Demand (Units)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 bg-[#0E1420] rounded-xl border border-[#222D3F]">
            No Data Available
          </div>
        )}
      </div>

      {/* Product-Level Forecast Cards Table */}
      <div className="bg-[#151C28] border border-[#222D3F] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          Item-Level Multi-Horizon Predictions
        </h2>

        {forecastData?.product_forecasts && forecastData.product_forecasts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0E1420] text-xs uppercase text-slate-400 border-b border-[#222D3F]">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">SKU</th>
                  <th className="px-4 py-3.5 font-semibold">Product Name</th>
                  <th className="px-4 py-3.5 font-semibold">Current Stock</th>
                  <th className="px-4 py-3.5 font-semibold">1-Day Demand</th>
                  <th className="px-4 py-3.5 font-semibold">7-Day Demand</th>
                  <th className="px-4 py-3.5 font-semibold">30-Day Demand</th>
                  <th className="px-4 py-3.5 font-semibold">Model Factors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222D3F]">
                {forecastData.product_forecasts.map((f) => (
                  <tr key={f.product_id} className="hover:bg-[#1E2738]/50">
                    <td className="px-4 py-3.5 font-mono text-xs text-indigo-400">{f.sku}</td>
                    <td className="px-4 py-3.5 font-medium text-white">{f.product_name}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-200">{f.current_stock}</td>
                    <td className="px-4 py-3.5 font-bold text-indigo-400">{f.forecast_1d}</td>
                    <td className="px-4 py-3.5 font-bold text-violet-400">{f.forecast_7d}</td>
                    <td className="px-4 py-3.5 font-bold text-emerald-400">{f.forecast_30d}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {f.key_factors.slice(0, 2).map((factor, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-[#0E1420] rounded-xl border border-[#222D3F]">
            No Data Available
          </div>
        )}
      </div>
    </div>
  );
}
