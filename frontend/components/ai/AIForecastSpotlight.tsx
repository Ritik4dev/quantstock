'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { forecastService } from '@/services/forecastService';
import { Sparkles, TrendingUp, Calendar, ShieldCheck, Activity, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import ExplainWithAIButton from './ExplainWithAIButton';

export default function AIForecastSpotlight() {
  const { data: forecast, isLoading } = useQuery({
    queryKey: ['forecastOverview'],
    queryFn: forecastService.getOverview,
  });

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-[#151C28] border border-[#222D3F] animate-pulse space-y-4">
        <div className="h-6 w-64 bg-slate-800 rounded" />
        <div className="h-48 w-full bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (!forecast) return null;

  // Build aggregate 7-day store demand trend from product forecasts
  const weeklyAggregates: Record<string, number> = {};
  forecast.product_forecasts.forEach((pf) => {
    pf.weekly_breakdown?.forEach((wb) => {
      weeklyAggregates[wb.day_name] = (weeklyAggregates[wb.day_name] || 0) + wb.predicted_demand;
    });
  });

  const chartData = Object.entries(weeklyAggregates).map(([day_name, predicted_demand]) => ({
    day_name,
    predicted_demand,
  }));

  const confidencePct = Math.round(forecast.average_confidence_score * 100);

  return (
    <div className="space-y-6 bg-[#151C28] border border-indigo-500/30 p-6 rounded-2xl shadow-xl relative overflow-hidden">
      {/* Title & Core Feature Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222D3F] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              AI Demand Forecasting & Inventory Predictions
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              Platform Speciality ⭐
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            XGBoost Machine Learning model trained on historic sales velocity, seasonality, and lead times.
          </p>
        </div>

        <ExplainWithAIButton
          topic="XGBoost ML Demand Forecasting Engine"
          contextData={{
            forecasted_products: forecast.total_products_forecasted,
            predicted_7d_units: forecast.total_7d_predicted_units,
            predicted_30d_units: forecast.total_30d_predicted_units,
            confidence_score: `${confidencePct}%`,
          }}
          label="Explain Forecast Model with AI"
          size="md"
        />
      </div>

      {/* Grid: 3 Metric Cards + 7-Day Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Cards Column */}
        <div className="space-y-4">
          <div className="bg-[#0E1420] border border-[#222D3F] p-4 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                7-Day Predicted Demand
              </div>
              <div className="text-2xl font-extrabold text-indigo-400 mt-1">
                {forecast.total_7d_predicted_units} <span className="text-xs font-normal text-slate-400">units</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#0E1420] border border-[#222D3F] p-4 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                30-Day Predicted Demand
              </div>
              <div className="text-2xl font-extrabold text-violet-400 mt-1">
                {forecast.total_30d_predicted_units} <span className="text-xs font-normal text-slate-400">units</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#0E1420] border border-[#222D3F] p-4 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Model Confidence Score
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                {confidencePct}%
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  High Accuracy
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 7-Day Demand Bar Chart Column */}
        <div className="lg:col-span-2 bg-[#0E1420] border border-[#222D3F] p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              7-Day Store-Wide Forecast Breakdown
            </h3>
            <span className="text-[10px] text-slate-400">Predicted Daily Sales</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222D3F" />
                <XAxis dataKey="day_name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151C28',
                    borderColor: '#222D3F',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="predicted_demand" fill="#6366F1" radius={[4, 4, 0, 0]} name="Predicted Units" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
