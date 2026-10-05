export function calculateProjectFinancials(project, invoices = [], labourEntries = [], members = [], currentUserId = null) {
  const projectInvoices = invoices.filter(inv => inv.project_id === project.id);
  const totalCost = projectInvoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);

  const projectLabour = labourEntries.filter(le => le.project_id === project.id);
  const totalLabourValue = projectLabour.reduce((sum, le) => sum + Number(le.value_huf || 0), 0);

  const memberIds = project.members || members.map(m => m.id);
  const memberCount = Math.max(memberIds.length, 1);
  const equalCostShare = Math.round(totalCost / memberCount);
  const equalLabourShare = Math.round(totalLabourValue / memberCount);

  const ownInvoices = currentUserId
    ? projectInvoices.filter(inv => inv.uploaded_by === currentUserId)
    : [];
  const ownPaid = ownInvoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);

  const ownLabour = currentUserId
    ? projectLabour.filter(le => le.uploaded_by === currentUserId)
    : [];
  const ownLabourValue = ownLabour.reduce((sum, le) => sum + Number(le.value_huf || 0), 0);

  const costBalance = ownPaid - equalCostShare;
  const labourBalance = ownLabourValue - equalLabourShare;
  const balance = costBalance + labourBalance;

  const memberBreakdown = members.map(m => {
    const mInvoices = projectInvoices.filter(inv => inv.uploaded_by === m.id);
    const mPaid = mInvoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);
    const mLabour = projectLabour.filter(le => le.uploaded_by === m.id);
    const mLabourValue = mLabour.reduce((sum, le) => sum + Number(le.value_huf || 0), 0);
    const mLabourHours = mLabour.reduce((sum, le) => sum + Number(le.hours || 0), 0);

    return {
      userId: m.id,
      displayName: m.display_name || m.email,
      role: m.role,
      paid: mPaid,
      costBalance: mPaid - equalCostShare,
      labourValue: mLabourValue,
      labourHours: mLabourHours,
      labourBalance: mLabourValue - equalLabourShare,
      balance: (mPaid - equalCostShare) + (mLabourValue - equalLabourShare),
      invoicesCount: mInvoices.length,
      labourCount: mLabour.length
    };
  });

  const categoryTotals = {};
  projectInvoices.forEach(inv => {
    categoryTotals[inv.category] = (categoryTotals[inv.category] || 0) + Number(inv.value_huf || 0);
  });

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
    equalCostShare,
    equalShare: equalCostShare,
    ownPaid,
    costBalance,
    totalLabourValue,
    equalLabourShare,
    ownLabourValue,
    labourBalance,
    balance,
    projectInvoices,
    projectLabour,
    memberCount,
    memberBreakdown,
    categoryTotals,
    settlements
  };
}
