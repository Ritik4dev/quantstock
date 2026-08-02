'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { forecastService } from '@/services/forecastService';
import { Sparkles, X, TrendingUp, Clock, AlertTriangle, CheckCircle2, ShieldCheck, DollarSign, Calendar } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface IndividualProductForecastModalProps {
  productId: number | null;
  productName: string;
  sku: string;
  currentStock: number;
  onClose: () => void;
}

export default function IndividualProductForecastModal({
  productId,
  productName,
  sku,
  currentStock,
  onClose,
}: IndividualProductForecastModalProps) {
  const { data: forecast, isLoading, error } = useQuery({
    queryKey: ['productForecast', productId],
    queryFn: () => (productId ? forecastService.getProductForecast(productId) : null),
    enabled: !!productId,
  });

  if (!productId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#151C28] border border-[#222D3F] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222D3F] bg-[#0E1420]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{productName}</h2>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {sku}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                XGBoost ML Demand Forecast & Stockout Runway Prediction
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1E2738] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-12 text-center text-indigo-400 font-medium flex items-center justify-center gap-3">
              <Sparkles className="w-5 h-5 animate-spin" />
              Running XGBoost Demand Forecast Model for '{productName}'...
            </div>
          ) : error || !forecast ? (
            <div className="p-8 text-center text-slate-400 bg-[#0E1420] rounded-xl border border-[#222D3F]">
              Unable to calculate prediction for this product. Awaiting transaction history.
            </div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#0E1420] p-3 rounded-xl border border-[#222D3F]">
                  <span className="text-slate-400 block font-medium">7-Day Demand</span>
                  <span className="text-base font-extrabold text-emerald-400 mt-1 block">
                    {forecast.horizon_7d_units} units
                  </span>
                </div>

                <div className="bg-[#0E1420] p-3 rounded-xl border border-[#222D3F]">
                  <span className="text-slate-400 block font-medium">30-Day Demand</span>
                  <span className="text-base font-extrabold text-indigo-400 mt-1 block">
                    {forecast.horizon_30d_units} units
                  </span>
                </div>

                <div className="bg-[#0E1420] p-3 rounded-xl border border-[#222D3F]">
                  <span className="text-slate-400 block font-medium">ML Confidence</span>
                  <span className="text-base font-extrabold text-purple-400 mt-1 block">
                    {forecast.confidence_score}%
                  </span>
                </div>

                <div className="bg-[#0E1420] p-3 rounded-xl border border-[#222D3F]">
                  <span className="text-slate-400 block font-medium">Current Stock</span>
                  <span className="text-base font-extrabold text-white mt-1 block">
                    {currentStock} units
                  </span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    AI Stocking Recommendation
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                    Lead Time: {forecast.lead_time_days || 3} days
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium">
                  {forecast.recommendation_summary ||
                    `Based on weekly velocity, reorder ${Math.max(10, forecast.horizon_7d_units ?? forecast.forecast_7d ?? 0)} units to maintain optimal safety stock.`}
                </p>
              </div>

              {/* Daily 7-Day Forecast Chart */}
              {forecast.weekly_breakdown && forecast.weekly_breakdown.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Daily Predicted Sales (Next 7 Days)
                  </h3>

                  <div className="h-52 w-full bg-[#0E1420] p-3 rounded-xl border border-[#222D3F]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={forecast.weekly_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222D3F" />
                        <XAxis dataKey="day_name" stroke="#64748B" fontSize={11} />
                        <YAxis stroke="#64748B" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#151C28',
                            borderColor: '#222D3F',
                            borderRadius: '12px',
                            color: '#fff',
                          }}
                        />
                        <Bar dataKey="predicted_demand" fill="#6366F1" radius={[4, 4, 0, 0]} name="Units" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
