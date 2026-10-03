export function calculateProjectFinancials(project, invoices = [], members = [], currentUserId = null) {
  const projectInvoices = invoices.filter(inv => inv.project_id === project.id);
  const totalCost = projectInvoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);

  // Project members count
  const memberIds = project.members || (members.map(m => m.id));
  const memberCount = Math.max(memberIds.length, 1);
  const equalShare = Math.round(totalCost / memberCount);

  // Current user's stats
  const ownInvoices = currentUserId 
    ? projectInvoices.filter(inv => inv.uploaded_by === currentUserId)
    : [];
  const ownPaid = ownInvoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);
  const balance = ownPaid - equalShare;

  // Detailed breakdown per user
  const memberBreakdown = members.map(m => {
    const mInvoices = projectInvoices.filter(inv => inv.uploaded_by === m.id);
    const mPaid = mInvoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);
    const mBalance = mPaid - equalShare;
    return {
      userId: m.id,
      displayName: m.display_name || m.email,
      role: m.role,
      paid: mPaid,
      balance: mBalance,
      invoicesCount: mInvoices.length
    };
  });

  // Category breakdown
  const categoryTotals = {};
  projectInvoices.forEach(inv => {
    categoryTotals[inv.category] = (categoryTotals[inv.category] || 0) + Number(inv.value_huf || 0);
  });

  // Settlement: who pays whom to balance the split
  const creditors = memberBreakdown
    .filter(m => m.balance > 0)
    .map(m => ({ ...m, remaining: m.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = memberBreakdown
    .filter(m => m.balance < 0)
    .map(m => ({ ...m, remaining: -m.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const settlements = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].remaining, debtors[di].remaining);
    if (amount > 1) {
      settlements.push({
        from: debtors[di].displayName,
        fromId: debtors[di].userId,
        to: creditors[ci].displayName,
        toId: creditors[ci].userId,
        amount: Math.round(amount)
      });
    }
    creditors[ci].remaining -= amount;
    debtors[di].remaining -= amount;
    if (creditors[ci].remaining <= 1) ci++;
    if (debtors[di].remaining <= 1) di++;
  }

  return {
    totalCost,
    memberCount,
    equalShare,
    ownPaid,
    balance,
    projectInvoices,
    memberBreakdown,
    categoryTotals,
    settlements
  };
}
