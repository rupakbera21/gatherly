"use client";

/**
 * @module PlanQuotePage
 * @purpose Vendor Quote & Contract Auditor.
 *          Parses unstructured quote text, compares against budget allocation,
 *          flags hidden fees/risks, and adds approved quotes to the vendor pipeline.
 * @rubric Tier 2 Features – Vendor Quote Analyzer & Budget Variance.
 */

import React, { use, useState } from "react";
import { formatCurrency } from "@/domain/money";
import { VendorItem } from "@/domain/types";
import { QuoteAnalysisResult } from "@/services/ai/prompts/quote";
import { useGatherlyStore } from "@/store";

interface QuotePageProps {
  params: Promise<{ id: string }>;
}

function QuotePageInner({ params }: QuotePageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { events, applyPatchToPlan } = useGatherlyStore();
  const plan = events[eventId];

  const [quoteText, setQuoteText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [result, setResult] = useState<QuoteAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!plan) return null;

  const currency = plan.profile.currency;
  const categories = plan.budgetCategories;

  // Selected category allocated budget
  const matchedCat = categories.find((c) => c.name === selectedCategory);
  const categoryBudgetMinor = matchedCat?.allocatedMinor;

  async function handleAuditQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || !quoteText.trim() || quoteText.length < 10) return;

    setIsAuditing(true);
    setErrorMsg(null);
    setAddedSuccess(false);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteText,
          categoryBudgetMinor,
          currency,
          language: plan.profile.language,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setErrorMsg(data.message || "Failed to analyze quote.");
      }
    } catch {
      setErrorMsg("Network error connecting to quote audit service.");
    } finally {
      setIsAuditing(false);
    }
  }

  function handleAddAsVendor() {
    if (!result) return;

    const vendorName = result.vendorName || "Audited Vendor";
    const category = selectedCategory || result.category || "General";
    const estimatedCostMinor = result.totalCostMinor;

    const newItem: VendorItem = {
      id: `v_quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: vendorName,
      category,
      status: "quoted",
      estimatedCostMinor,
      quoteNotes: result.summary,
    };

    applyPatchToPlan(eventId, {
      op: "addVendorItem",
      item: newItem,
    });

    setAddedSuccess(true);
  }

  const totalCostMinor = result?.totalCostMinor;
  let varianceNode: React.ReactNode = null;
  if (totalCostMinor !== undefined && categoryBudgetMinor !== undefined) {
    const diff = categoryBudgetMinor - totalCostMinor;
    if (diff >= 0) {
      varianceNode = (
        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
          Within Budget (Saving {formatCurrency(diff, currency)})
        </span>
      );
    } else {
      varianceNode = (
        <span className="text-rose-600 dark:text-rose-400 font-bold">
          Over Budget by {formatCurrency(Math.abs(diff), currency)}
        </span>
      );
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Vendor Quote & Contract Auditor
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste any vendor proposal or email estimate. AI scrutinizes hidden fees, payment terms, and budget variance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Column */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleAuditQuote}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4"
          >
            <div>
              <label htmlFor="quote-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Compare with Budget Category (Optional)
              </label>
              <select
                id="quote-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="">Select a category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({formatCurrency(c.allocatedMinor, currency)} allocated)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quote-textarea" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paste Vendor Quote / Contract Text *
              </label>
              <textarea
                id="quote-textarea"
                required
                rows={9}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Paste the vendor's proposal, itemized pricing, deposit requirements, overtime policy, etc..."
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                <span>Safe text audit: no file uploads required</span>
                <span>{quoteText.length} / 8000</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuditing || quoteText.length < 10}
              className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <svg className={`w-4 h-4 ${isAuditing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {isAuditing ? "Auditing Contract with AI..." : "Audit Quote with AI"}
            </button>
          </form>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 space-y-4">
          {!result && !isAuditing && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
              <svg className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-semibold text-slate-600 dark:text-slate-300">No Quote Audited Yet</p>
              <p>Paste quote or agreement text on the left to review line items and hidden risks.</p>
            </div>
          )}

          {isAuditing && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-3 animate-pulse">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Auditing quote against budget and risk database...
              </p>
            </div>
          )}

          {result && !isAuditing && (
            <div className="space-y-4 animate-fade-in">
              {/* Financial Summary Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {result.vendorName || "Audited Vendor Quote"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Category: {result.category || selectedCategory || "General"}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {result.totalCostMinor !== undefined
                        ? formatCurrency(result.totalCostMinor, currency)
                        : "Quote Total Unspecified"}
                    </div>
                    {varianceNode && <div className="text-xs mt-0.5">{varianceNode}</div>}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {result.summary}
                </p>

                {/* Add to Pipeline Button */}
                <div className="pt-2 flex justify-end">
                  {addedSuccess ? (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      ✓ Added to Vendor Pipeline
                    </span>
                  ) : (
                    <button
                      onClick={handleAddAsVendor}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <span>+</span> Add Vendor to Plan
                    </button>
                  )}
                </div>
              </div>

              {/* Line Items */}
              {result.lineItems.length > 0 && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Extracted Line Items ({result.lineItems.length})
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {result.lineItems.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.description}
                          </p>
                          {item.notes && <p className="text-slate-400 text-[11px]">{item.notes}</p>}
                        </div>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {item.costMinor !== undefined
                            ? formatCurrency(item.costMinor, currency)
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden Fees & Contract Risks */}
              {result.hiddenFeesAndRisks.length > 0 && (
                <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs space-y-2">
                  <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Hidden Fees & Contract Risks Flagged
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                    {result.hiddenFeesAndRisks.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 shrink-0">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions to Ask */}
              {result.questionsToAskVendor.length > 0 && (
                <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs space-y-2">
                  <h4 className="font-bold text-xs text-indigo-800 dark:text-indigo-300">
                    Negotiation Questions to Ask Before Signing
                  </h4>
                  <ul className="space-y-1.5 text-xs text-indigo-950 dark:text-indigo-200">
                    {result.questionsToAskVendor.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold shrink-0">{idx + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlanQuotePage(props: QuotePageProps) {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading quote auditor...</div>}>
      <QuotePageInner {...props} />
    </React.Suspense>
  );
}
