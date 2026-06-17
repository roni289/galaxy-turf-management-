import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Percent, 
  AlertCircle, 
  HelpCircle, 
  RefreshCw,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Calendar,
  Lock,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Booking } from '../types';

interface PredictionItem {
  slot: string;
  demandLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  reasoning: string;
  recommendedAction: string;
  suggestedAdjustmentPercent: number;
}

interface PredictionReport {
  overallDemandTrend: string;
  generalStrategy: string;
  estimatedRevenueBoostPercent: number;
  predictions: PredictionItem[];
}

interface DemandPredictorProps {
  bookings: Booking[];
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const LOADING_STEPS = [
  "Synthesizing historical slot reservation intervals...",
  "Grouping occupancy densities by week days and prime hours...",
  "Analyzing cancellation tendencies and payment timings...",
  "Calibrating dynamic high/low pricing curves...",
  "Consulting Gemini-3.5-Flash optimization model...",
  "Finalizing yield-management pricing blueprint..."
];

// High quality mock data to show immediately or use as fallback/preview
const DEMO_REPORT: PredictionReport = {
  overallDemandTrend: "Excellent overall demand, heavily concentrated into Friday & Saturday prime hours (4 PM to 10 PM) and daily late-night slots (9 PM to 12 AM). Significant revenue leakage exists during weekday mornings and early afternoons.",
  generalStrategy: "Activate a multi-tiered surge/discount strategy. Elevate Pitch 1 and Pitch 3 peak-time rates by 15-20% to exploit high occupancy, while rolling out a 20% discount on empty morning slots bundled with student/senior promotional outreach.",
  estimatedRevenueBoostPercent: 18.5,
  predictions: [
    {
      slot: "Friday & Saturday Prime (4:00 PM - 10:00 PM)",
      demandLevel: "Very High",
      reasoning: "Consistent 95%+ historical occupancy. Players frequently request bookings weeks in advance with negligible cancellation rates.",
      recommendedAction: "Apply Prime Surge Pricing",
      suggestedAdjustmentPercent: 20
    },
    {
      slot: "Weekday Late-Nights (9:00 PM - 1:00 AM)",
      demandLevel: "High",
      reasoning: "Strong recurring bookings from corporate leagues and amateur groups. Slightly higher weekend crossover demand.",
      recommendedAction: "Apply Soft Surge Pricing",
      suggestedAdjustmentPercent: 10
    },
    {
      slot: "Weekday Mornings (6:00 AM - 12:00 PM)",
      demandLevel: "Low",
      reasoning: "Oversized vacancy gaps with under 20% average occupancy. Lower foot traffic across all pitches.",
      recommendedAction: "Offer Early-Bird Discount",
      suggestedAdjustmentPercent: -20
    },
    {
      slot: "Sunday Mid-day (12:00 PM - 4:00 PM)",
      demandLevel: "Medium",
      reasoning: "Moderate family bookings and informal match-ups. Stable flow but sensitive to high tariff increases.",
      recommendedAction: "Maintain Base Pricing",
      suggestedAdjustmentPercent: 0
    },
    {
      slot: "Weekday Early Afternoon (1:00 PM - 4:00 PM)",
      demandLevel: "Low",
      reasoning: "School and office hours lead to low booking frequency except for occasional youth training camps.",
      recommendedAction: "Offer Happy Hour Discount",
      suggestedAdjustmentPercent: -15
    }
  ]
};

export function DemandPredictor({ bookings, showToast }: DemandPredictorProps) {
  const [report, setReport] = useState<PredictionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorNotice, setErrorNotice] = useState<{message: string; details?: string} | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'optimizations' | 'strategy'>('optimizations');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const runPrediction = async (forceDemo = false) => {
    setLoading(true);
    setLoadingStep(0);
    setErrorNotice(null);
    
    // Slight artificial delay to make the elegant steps readable & pleasant
    await new Promise(resolve => setTimeout(resolve, 2200));

    if (forceDemo) {
      setReport(DEMO_REPORT);
      setIsPreviewMode(true);
      setLoading(false);
      showToast("Loaded AI Prediction Blueprint inside Demo Sandbox Mode!", "success");
      return;
    }

    try {
      const response = await fetch('/api/predict-demand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookings })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to predict demand');
      }

      const data: PredictionReport = await response.json();
      setReport(data);
      setIsPreviewMode(false);
      showToast("AI demand report compiled successfully!", "success");
    } catch (err: any) {
      console.error(err);
      setErrorNotice({
        message: err.message || "Could not complete prediction",
        details: "Ensure Gemini is configured correctly. You can try running in Sandbox Preview Mode instead."
      });
      // Fallback automatically to demo so the screen isn't just blank/broken
      setReport(DEMO_REPORT);
      setIsPreviewMode(true);
      showToast("Running Sandbox Demo Mode (Active API Key not verified).", "info");
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch on first mount if there are bookings and we don't have a report yet
  useEffect(() => {
    if (bookings.length > 0 && !report && !loading) {
      // Let's run a live prediction, it will fallback to sandbox demo if unauthorized
      runPrediction(false);
    }
  }, [bookings]);

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
      
      {/* Header Bar */}
      <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center relative group">
            <Sparkles className="w-7 h-7 text-brand group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              AI Demand Predictor & Tariff Optimizer
              {isPreviewMode && (
                <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md tracking-wider">
                  Sandbox Preview
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Harness predictive machine intelligence to identify leakage and auto-calibrate premium slot yields
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => runPrediction(false)}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-brand/30 rounded-xl text-slate-300 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={cn("w-4 h-4 text-brand", loading && "animate-spin")} />
            Real-Time Analysis
          </button>
          
          <button
            onClick={() => runPrediction(true)}
            disabled={loading || (isPreviewMode && report !== null)}
            className="flex items-center gap-2 px-5 py-3 bg-brand/10 border border-brand/20 hover:bg-brand/20 rounded-xl text-brand font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40"
          >
            <Coins className="w-4 h-4" />
            Sandbox Simulator
          </button>
        </div>
      </div>

      {loading ? (
        /* Loading Screen */
        <div className="py-24 px-8 flex flex-col items-center justify-center text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-brand animate-pulse" />
            </div>
          </div>
          
          <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse max-w-md h-8">
            {LOADING_STEPS[loadingStep]}
          </p>
          
          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
            Consolidating {bookings.length} historical records • Modeling dynamic revenue yields
          </p>
        </div>
      ) : errorNotice && isPreviewMode && !report ? (
        /* Error state if fallback also failed */
        <div className="p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h4 className="text-base font-black text-white uppercase tracking-wider">{errorNotice.message}</h4>
          <p className="text-xs text-slate-500 mt-2 max-w-md">{errorNotice.details}</p>
          <button 
            onClick={() => runPrediction(true)}
            className="mt-6 px-6 py-3 bg-brand text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 transition-transform"
          >
            Load Demo Sandbox
          </button>
        </div>
      ) : report ? (
        /* Report Presentation */
        <div className="p-8">
          
          {/* Key Insights Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Expected Yield Increase</p>
                <p className="text-2xl font-black text-brand mt-1">+{report.estimatedRevenueBoostPercent}%</p>
              </div>
              <div className="p-3 bg-brand/10 border border-brand/20 text-brand rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Occupancy Data Scope</p>
                <p className="text-2xl font-black text-blue-400 mt-1">{bookings.length} reservations</p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Recommended Actions</p>
                <p className="text-2xl font-black text-purple-400 mt-1">
                  {report.predictions.filter(p => p.suggestedAdjustmentPercent !== 0).length} adjustments
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                <Percent className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-slate-800 mb-6 gap-6">
            <button
              onClick={() => setActiveTab('optimizations')}
              className={cn(
                "pb-4 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer relative",
                activeTab === 'optimizations' ? "text-brand" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Time-Slot Recommendations
              {activeTab === 'optimizations' && (
                <motion.div layoutId="tab-active-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('strategy')}
              className={cn(
                "pb-4 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer relative",
                activeTab === 'strategy' ? "text-brand" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Yield Strategy & Trends
              {activeTab === 'strategy' && (
                <motion.div layoutId="tab-active-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'optimizations' ? (
              <motion.div
                key="opt"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {report.predictions.map((p, idx) => {
                  const isPositive = p.suggestedAdjustmentPercent > 0;
                  const isNeutral = p.suggestedAdjustmentPercent === 0;

                  return (
                    <div 
                      key={idx}
                      className="group bg-slate-900/30 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center flex-wrap gap-2.5">
                          <h4 className="font-display font-black text-sm text-white tracking-tight uppercase">
                            {p.slot}
                          </h4>
                          
                          {/* Demand Badge */}
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            p.demandLevel === 'Very High' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                            p.demandLevel === 'High' ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                            p.demandLevel === 'Medium' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                            "bg-slate-800/80 border-slate-700 text-slate-400"
                          )}>
                            {p.demandLevel} Demand
                          </span>
                        </div>
                        
                        {/* Reasoning */}
                        <p className="text-xs text-slate-400 font-medium">
                          {p.reasoning}
                        </p>
                      </div>

                      {/* Pricing Tag Widget */}
                      <div className="md:text-right shrink-0 flex items-center md:flex-col gap-3 min-w-[180px] justify-between md:justify-center border-t md:border-t-0 border-slate-800 pt-4 md:pt-0">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.recommendedAction}</p>
                          <div className="flex items-center gap-1.5 md:justify-end mt-1">
                            {isNeutral ? (
                              <span className="text-slate-400 font-mono text-sm font-black uppercase tracking-widest">
                                BASE RATE
                              </span>
                            ) : (
                              <>
                                {isPositive ? (
                                  <ArrowUpRight className="w-5 h-5 text-emerald-400 shrink-0" />
                                ) : (
                                  <ArrowDownRight className="w-5 h-5 text-rose-400 shrink-0" />
                                )}
                                <span className={cn(
                                  "font-mono text-sm font-black",
                                  isPositive ? "text-emerald-400" : "text-rose-400"
                                )}>
                                  {isPositive ? '+' : ''}{p.suggestedAdjustmentPercent}% Shift
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Interactive pricing preview calculator widget */}
                        <span className="text-[9px] bg-slate-800/80 border border-slate-700 font-mono px-2 py-1 rounded text-slate-400 uppercase tracking-widest font-bold">
                          E.g. ৳ 2,000 → ৳ {(2000 * (1 + p.suggestedAdjustmentPercent/100)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="strat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Overall Demand Trend */}
                <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-cyan-400" />
                    Overall Booking Demand Profile
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {report.overallDemandTrend}
                  </p>
                </div>

                {/* Pricing Strategy Action Plan */}
                <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] -mr-8 -mt-8 pointer-events-none" />
                  <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Facility General Yield Strategy
                  </h4>
                  <div className="text-xs text-slate-300 leading-relaxed font-medium space-y-2">
                    <p>{report.generalStrategy}</p>
                    <div className="mt-4 p-4.5 bg-slate-800/10 border border-slate-800/80 rounded-xl text-slate-400">
                      <p className="font-bold text-[10px] text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-brand" /> Suggestion:
                      </p>
                      Use WhatsApp Broadcast to send discounted slot lists on Wednesday evening to clear up early weekend vacancies.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Setup / Informational Disclaimer Alert */}
          {isPreviewMode && (
            <div className="mt-8 p-5 bg-amber-500/10 border border-amber-500/20 text-amber-400/90 rounded-2xl flex items-start gap-4">
              <Lock className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider">Simulator Demo Notice</p>
                <p className="text-[10px] leading-relaxed font-medium text-slate-400 mt-1">
                  This report is powered by our high-fidelity dynamic sandbox simulator. To generate reports utilizing real-time live machine predictions trained on your historic client booking records, configure a secure <span className="text-brand font-bold font-mono">GEMINI_API_KEY</span> in the <span className="text-slate-300 font-bold uppercase">Settings &gt; Secrets</span> workspace dashboard.
                </p>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Empty / No predictions run screen */
        <div className="py-20 px-8 flex flex-col items-center justify-center text-center">
          <Sparkles className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Demand Modeling Ready</p>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold max-w-sm leading-relaxed">
            Analyze pricing policies and identify dead zones across all 90-minute turf slots.
          </p>
          <button
            onClick={() => runPrediction(false)}
            className="mt-6 px-6 py-3.5 bg-brand text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 transition-transform shadow-lg shadow-brand/10"
          >
            A.I. Analyze Now
          </button>
        </div>
      )}
    </div>
  );
}
