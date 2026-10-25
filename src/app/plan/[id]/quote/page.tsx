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
import { Button, Icon, Surface } from "@/components/ui";

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
        <span className="text-success font-bold">
          Within Budget (Saving {formatCurrency(diff, currency)})
        </span>
      );
    } else {
      varianceNode = (
        <span className="text-danger font-bold">
          Over Budget by {formatCurrency(Math.abs(diff), currency)}
        </span>
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-display">
          Vendor Quote & Contract Auditor
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Paste any vendor proposal or email estimate. AI scrutinizes hidden fees, payment terms, and budget variance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Column */}
        <div className="lg:col-span-5 space-y-4">
          <Surface className="p-5 space-y-4">
            <div>
              <label htmlFor="quote-category" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Compare with Budget Category (Optional)
              </label>
              <select
                id="quote-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-neutral-900 dark:text-neutral-100"
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
              <label htmlFor="quote-textarea" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Paste Vendor Quote / Contract Text *
              </label>
              <textarea
                id="quote-textarea"
                required
                rows={9}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Paste the vendor's proposal, itemized pricing, deposit requirements, overtime policy, etc..."
                className="w-full text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono"
              />
              <div className="flex justify-between items-center text-xs text-neutral-400 mt-1">
                <span>Safe text audit: no file uploads required</span>
                <span className="font-mono tnum">{quoteText.length} / 8000</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-md bg-danger-surface text-danger text-xs">
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon="sparkles"
              isLoading={isAuditing}
              disabled={isAuditing || quoteText.length < 10}
              className="w-full"
              onClick={handleAuditQuote}
            >
              {isAuditing ? "Auditing Contract with AI..." : "Audit Quote with AI"}
            </Button>
          </Surface>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 space-y-4">
          {!result && !isAuditing && (
            <Surface className="p-12 text-center text-neutral-400 text-xs space-y-2">
              <Icon name="file" size="lg" className="mx-auto text-neutral-300 dark:text-neutral-700" aria-hidden="true" />
              <p className="font-semibold text-neutral-600 dark:text-neutral-300">No Quote Audited Yet</p>
              <p>Paste quote or agreement text on the left to review line items and hidden risks.</p>
            </Surface>
          )}

          {isAuditing && (
            <Surface className="p-12 text-center text-xs text-neutral-500 space-y-3 animate-pulse">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                Auditing quote against budget and risk database...
              </p>
            </Surface>
          )}

          {result && !isAuditing && (
            <div className="space-y-4">
              {/* Financial Summary Card */}
              <Surface className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100 font-display">
                      {result.vendorName || "Audited Vendor Quote"}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Category: {result.category || selectedCategory || "General"}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-extrabold text-primary-600 dark:text-primary-400 font-mono tnum">
                      {result.totalCostMinor !== undefined
                        ? formatCurrency(result.totalCostMinor, currency)
                        : "Quote Total Unspecified"}
                    </div>
                    {varianceNode && <div className="text-xs mt-0.5">{varianceNode}</div>}
                  </div>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {result.summary}
                </p>

                {/* Add to Pipeline Button */}
                <div className="pt-2 flex justify-end">
                  {addedSuccess ? (
                    <span className="text-xs font-semibold text-success flex items-center gap-1.5">
                      <Icon name="check" size="xs" aria-hidden="true" />
                      <span>Added to Vendor Pipeline</span>
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon="plus"
                      onClick={handleAddAsVendor}
                    >
                      Add Vendor to Plan
                    </Button>
                  )}
                </div>
              </Surface>

              {/* Line Items */}
              {result.lineItems.length > 0 && (
                <Surface className="p-5 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                    Extracted Line Items ({result.lineItems.length})
                  </h4>
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {result.lineItems.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {item.description}
                          </p>
                          {item.notes && <p className="text-neutral-400 text-xs">{item.notes}</p>}
                        </div>
                        <span className="font-mono text-neutral-700 dark:text-neutral-300 tnum">
                          {item.costMinor !== undefined
                            ? formatCurrency(item.costMinor, currency)
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </Surface>
              )}

              {/* Hidden Fees & Contract Risks */}
              {result.hiddenFeesAndRisks.length > 0 && (
                <div className="p-5 rounded-md border border-warning bg-warning-surface space-y-2">
                  <h4 className="font-bold text-xs text-warning flex items-center gap-1.5">
                    <Icon name="alert-triangle" size="xs" className="text-warning" aria-hidden="true" />
                    <span>Hidden Fees & Contract Risks Flagged</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-neutral-800 dark:text-neutral-200">
                    {result.hiddenFeesAndRisks.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-warning shrink-0" aria-hidden="true">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions to Ask */}
              {result.questionsToAskVendor.length > 0 && (
                <Surface className="p-5 space-y-2 border-l-4 border-l-primary-600">
                  <h4 className="font-bold text-xs text-primary-600 dark:text-primary-400">
                    Negotiation Questions to Ask Before Signing
                  </h4>
                  <ul className="space-y-1.5 text-xs text-neutral-800 dark:text-neutral-200">
                    {result.questionsToAskVendor.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary-600 font-bold shrink-0 font-mono tnum">{idx + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </Surface>
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
    <React.Suspense fallback={<div className="p-8 text-center text-neutral-400">Loading quote auditor...</div>}>
      <QuotePageInner {...props} />
    </React.Suspense>
  );
}
