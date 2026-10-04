import { CapexAsset, DepreciationCalculation } from './types';

/**
 * Calculates straight-line or WDV depreciation for an asset as of a target date.
 */
export function calculateAssetDepreciation(
  asset: CapexAsset,
  asOfDate: Date = new Date()
): DepreciationCalculation {
  const pDate = new Date(asset.purchase_date);
  const targetDate = new Date(asOfDate);

  // Calculate elapsed months
  let monthsElapsed = (targetDate.getFullYear() - pDate.getFullYear()) * 12 + (targetDate.getMonth() - pDate.getMonth());
  if (targetDate.getDate() >= pDate.getDate()) {
    monthsElapsed += 1;
  }
  monthsElapsed = Math.max(0, monthsElapsed);

  const usefulLife = Math.max(1, asset.useful_life_months);
  const depreciableBase = Math.max(0, asset.purchase_cost - asset.salvage_value);

  let monthlyDepreciation = 0;
  let accumulatedDepreciation = 0;
  let currentBookValue = asset.purchase_cost;

  if (asset.depreciation_method === 'SLM') {
    // Straight Line: (Cost - Salvage) / Useful Life
    monthlyDepreciation = Math.round(depreciableBase / usefulLife);
    const monthsCapped = Math.min(monthsElapsed, usefulLife);
    accumulatedDepreciation = Math.min(depreciableBase, monthlyDepreciation * monthsCapped);
    currentBookValue = Math.max(asset.salvage_value, asset.purchase_cost - accumulatedDepreciation);
  } else {
    // Written-Down Value (WDV) approx monthly
    const annualRate = (asset.annual_depreciation_rate || 20) / 100;
    const monthlyRate = 1 - Math.pow(1 - annualRate, 1 / 12);
    let bookVal = asset.purchase_cost;
    for (let m = 0; m < monthsElapsed && bookVal > asset.salvage_value; m++) {
      const dep = bookVal * monthlyRate;
      bookVal -= dep;
      monthlyDepreciation = Math.round(dep);
    }
    currentBookValue = Math.max(asset.salvage_value, Math.round(bookVal));
    accumulatedDepreciation = Math.max(0, asset.purchase_cost - currentBookValue);
  }

  const remainingMonths = Math.max(0, usefulLife - monthsElapsed);
  const isFullyDepreciated = currentBookValue <= asset.salvage_value || remainingMonths === 0;

  return {
    assetId: asset.id,
    assetName: asset.name,
    purchaseCost: asset.purchase_cost,
    salvageValue: asset.salvage_value,
    monthlyDepreciation: isFullyDepreciated ? 0 : monthlyDepreciation,
    accumulatedDepreciation,
    currentBookValue,
    monthsActive: monthsElapsed,
    remainingMonths,
    isFullyDepreciated
  };
}

/**
 * Calculates total depreciation expense for a specific date range across all active assets.
 */
export function calculateRangeDepreciation(
  assets: CapexAsset[],
  startDateStr: string,
  endDateStr: string
): { totalDepreciation: number; assetBreakdown: { assetId: string; name: string; amount: number }[] } {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  // Number of months or fraction of months in the range
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const monthsMultiplier = days / 30.4375;

  let total = 0;
  const breakdown: { assetId: string; name: string; amount: number }[] = [];

  assets.forEach(asset => {
    if (asset.status !== 'ACTIVE') return;
    const pDate = new Date(asset.purchase_date);
    if (pDate > end) return; // Not yet purchased

    const depCalc = calculateAssetDepreciation(asset, end);
    const rangeDep = Math.round(depCalc.monthlyDepreciation * monthsMultiplier);
    const actualDep = Math.min(rangeDep, Math.max(0, depCalc.currentBookValue - asset.salvage_value));

    if (actualDep > 0) {
      total += actualDep;
      breakdown.push({
        assetId: asset.id,
        name: asset.name,
        amount: actualDep
      });
    }
  });

  return { totalDepreciation: total, assetBreakdown: breakdown };
}
