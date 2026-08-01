function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sumWhere(txns, predicate) {
  return txns.filter(predicate).reduce((s, t) => s + Number(t.amount), 0);
}

function categoryTotals(txns, key) {
  const totals = {};
  txns.forEach((t) => {
    totals[t.purpose || "Other"] = (totals[t.purpose || "Other"] || 0) + Number(t.amount);
  });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

/**
 * Builds the figures for the monthly donor summary email, covering the
 * calendar month before `now` (so running this on the 1st reports on the
 * month that just finished).
 */
export function buildMonthlyReport(allTxns, now = new Date()) {
  const reportMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const lastYearSameMonth = new Date(now.getFullYear() - 1, now.getMonth() - 1, 1);

  const key = monthKey(reportMonth);
  const prevKey = monthKey(prevMonth);
  const lastYearKey = monthKey(lastYearSameMonth);

  const inMonth = (k) => (t) => t.txn_date?.slice(0, 7) === k;
  const isDeposit = (t) => t.type !== "Withdrawal";
  const isWithdrawal = (t) => t.type === "Withdrawal";

  const deposits = sumWhere(allTxns, (t) => isDeposit(t) && inMonth(key)(t));
  const withdrawals = sumWhere(allTxns, (t) => isWithdrawal(t) && inMonth(key)(t));
  const net = deposits - withdrawals;

  const prevDeposits = sumWhere(allTxns, (t) => isDeposit(t) && inMonth(prevKey)(t));
  const prevWithdrawals = sumWhere(allTxns, (t) => isWithdrawal(t) && inMonth(prevKey)(t));
  const prevNet = prevDeposits - prevWithdrawals;

  const lastYearDeposits = sumWhere(allTxns, (t) => isDeposit(t) && inMonth(lastYearKey)(t));
  const lastYearWithdrawals = sumWhere(allTxns, (t) => isWithdrawal(t) && inMonth(lastYearKey)(t));
  const lastYearNet = lastYearDeposits - lastYearWithdrawals;

  const monthChange = prevNet ? ((net - prevNet) / Math.abs(prevNet)) * 100 : null;
  const yearChange = lastYearNet ? ((net - lastYearNet) / Math.abs(lastYearNet)) * 100 : null;

  // All-time cumulative net balance, as of right now — "funds available".
  const allTimeDeposits = sumWhere(allTxns, isDeposit);
  const allTimeWithdrawals = sumWhere(allTxns, isWithdrawal);
  const availableBalance = allTimeDeposits - allTimeWithdrawals;

  const depositCategories = categoryTotals(allTxns.filter((t) => isDeposit(t) && inMonth(key)(t)));
  const withdrawalCategories = categoryTotals(allTxns.filter((t) => isWithdrawal(t) && inMonth(key)(t)));

  return {
    monthLabel: reportMonth.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    deposits, withdrawals, net,
    monthChange, yearChange,
    availableBalance,
    depositCategories, withdrawalCategories,
  };
}
