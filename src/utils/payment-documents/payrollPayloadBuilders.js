const resolveBenefitPlan = (payroll) => {
  if (!payroll) return null;
  if (payroll.benefitPlan) return payroll.benefitPlan;

  const raw = payroll?.paymentPlan?.benefitPlan;
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed);
      } catch (e) {
        return null;
      }
    }
    return parsed;
  } catch (e) {
    return null;
  }
};

// Program identifier for document file names — the payment module serves many
// programs, so slips should be named by their program (benefit/payment plan)
// rather than a hardcoded scheme prefix.
export const resolveProgramName = (payroll) => {
  const benefitPlan = resolveBenefitPlan(payroll);
  return (
    benefitPlan?.code
    || benefitPlan?.name
    || (typeof payroll?.paymentPlan?.benefitPlan === 'string' ? payroll.paymentPlan.benefitPlan : null)
    || payroll?.paymentPlan?.code
    || payroll?.paymentPlan?.name
    || 'Program'
  );
};

// Human-readable program label for document headings (prefers the program's
// name; falls back to its code). Returns null when unknown so the renderer
// can fall back to its default heading.
const resolveProgramLabel = (payroll) => {
  const benefitPlan = resolveBenefitPlan(payroll);
  return (
    benefitPlan?.name
    || benefitPlan?.code
    || payroll?.paymentPlan?.name
    || payroll?.paymentPlan?.code
    || (typeof payroll?.paymentPlan?.benefitPlan === 'string' ? payroll.paymentPlan.benefitPlan : null)
    || null
  );
};

const resolveLocationName = (location) => location?.name || '-';

const resolveLocationHierarchy = (paymentPoint) => {
  const village = paymentPoint?.location;
  const ward = village?.parent;
  const council = ward?.parent;
  return {
    village: resolveLocationName(village),
    ward: resolveLocationName(ward),
    council: resolveLocationName(council),
  };
};

const formatDateRange = (startDate, endDate) => {
  const parts = [startDate, endDate].filter(Boolean);
  return parts.length ? parts.join(' → ') : '-';
};

const sumAmounts = (benefitConsumption = []) => benefitConsumption.reduce((total, benefit) => {
  const attachments = benefit?.benefitAttachment || [];
  const attachmentTotal = attachments.reduce((acc, attachment) => {
    const amount = parseFloat(attachment?.bill?.amountTotal);
    return Number.isFinite(amount) ? acc + amount : acc;
  }, 0);
  if (attachmentTotal > 0) return total + attachmentTotal;
  const fallback = parseFloat(benefit?.amount);
  return Number.isFinite(fallback) ? total + fallback : total;
}, 0);

const parseJsonExt = (jsonExt) => {
  if (!jsonExt) return {};
  if (typeof jsonExt === 'object') return jsonExt;
  if (typeof jsonExt !== 'string') return {};
  try {
    return JSON.parse(jsonExt);
  } catch (e) {
    return {};
  }
};

const buildBreakdownRows = (benefit) => {
  const data = parseJsonExt(benefit?.jsonExt);
  const breakdown = data?.pct_breakdown || data?.extra_info || {};
  const rows = [];

  const pushIfFinite = (label, value, group = 'left') => {
    const amount = parseFloat(value);
    if (Number.isFinite(amount)) rows.push({ label, amount, group });
  };

  pushIfFinite('Ruzuku isiyo na Masharti', breakdown.base_amount, 'left');
  pushIfFinite('Malipo ya Watoto < 18', breakdown.young_child_amount, 'left');
  pushIfFinite('Malipo ya Ulemavu', breakdown.disability_amount, 'left');
  pushIfFinite('Malipo ya Watoto Shule ya Msingi', breakdown.primary_amount, 'left');
  pushIfFinite('Malipo ya Sekondari', breakdown.secondary_amount, 'left');
  pushIfFinite('Adhabu ya kutotimiza masharti ya Elimu', breakdown.education_penalty, 'right');
  pushIfFinite('Adhabu ya kutotimiza masharti ya Afya', breakdown.health_penalty, 'right');
  pushIfFinite('Malipo yaliyozidishwa Kipindi cha nyuma', breakdown.overpayment, 'right');

  return rows;
};

const sumGroup = (rows, group) => rows
  .filter((row) => row.group === group)
  .reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);

const safeName = (text) => String(text || 'payroll')
  .replace(/[^a-z0-9_-]+/gi, '_')
  .replace(/^_+|_+$/g, '');

const formatTotalAmount = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function buildPaylistPayload(payroll) {
  const benefitConsumption = payroll?.benefitConsumption || [];
  const location = resolveLocationHierarchy(payroll?.paymentPoint);
  const cycle = payroll?.paymentCycle || {};
  const totalAmount = sumAmounts(benefitConsumption);

  const items = benefitConsumption.map((benefit) => {
    const fullName = [benefit?.individual?.firstName, benefit?.individual?.lastName]
      .filter(Boolean).join(' ');
    const billCode = benefit?.benefitAttachment?.[0]?.bill?.code;
    const billAmount = parseFloat(benefit?.benefitAttachment?.[0]?.bill?.amountTotal);
    return {
      controlNumber: billCode || benefit?.code || '-',
      headName: fullName || '-',
      representativeName: fullName || '-',
      channel: payroll?.paymentMethod || '-',
      amount: Number.isFinite(billAmount) ? billAmount : parseFloat(benefit?.amount) || 0,
    };
  });

  return {
    fileName: `TASAF_Paylist_${safeName(payroll?.name)}.pdf`,
    title: 'ORODHA YA MALIPO YA WALENGWA YA KIJIJI',
    programName: resolveProgramLabel(payroll),
    security: { enabled: true },
    metadata: [
      { label: 'Tarehe:', value: new Date().toLocaleDateString() },
      { label: 'Wilaya:', value: location.council },
      { label: 'Kata:', value: location.ward },
      { label: 'Kijiji:', value: location.village },
      { label: 'Kipindi:', value: formatDateRange(cycle.startDate, cycle.endDate) },
    ],
    summaryText: `Jumla ya Walengwa: ${benefitConsumption.length} | Jumla ya Fedha: ${formatTotalAmount(totalAmount)} | Njia ya Malipo: ${payroll?.paymentMethod || '-'}`,
    items,
  };
}

export function buildPaymentSlipPayloadForBenefit(payroll, benefit) {
  const location = resolveLocationHierarchy(payroll?.paymentPoint);
  const cycle = payroll?.paymentCycle || {};
  const fullName = [benefit?.individual?.firstName, benefit?.individual?.lastName]
    .filter(Boolean).join(' ');
  const billCode = benefit?.benefitAttachment?.[0]?.bill?.code;
  const billAmount = parseFloat(benefit?.benefitAttachment?.[0]?.bill?.amountTotal);
  const breakdownRows = buildBreakdownRows(benefit);
  const totalLeft = sumGroup(breakdownRows, 'left');
  const totalRight = sumGroup(breakdownRows, 'right');
  const totalPayable = Number.isFinite(billAmount)
    ? billAmount
    : parseFloat(benefit?.amount) || (totalLeft - totalRight);

  return {
    fileName: `${safeName(resolveProgramName(payroll))}_Slip_${safeName(payroll?.name)}_${safeName(billCode || benefit?.code || benefit?.id)}.pdf`,
    title: 'ORODHA YA MALIPO YA WALENGWA YA KIJIJI',
    subtitle: 'MUHTASARI WA TAARIFA YA MALIPO YA HALMASHAURI',
    programName: resolveProgramLabel(payroll),
    security: { enabled: true },
    payCode: billCode || benefit?.code || '-',
    qrLabel: 'Scan to verify',
    profileRows: [
      { label: 'MAMLAKA YA ENEO LA UTEKELEZAJI', value: location.council },
      { label: 'KATA', value: location.ward },
      { label: 'KIJIJI/MTAA/SHEHIA', value: location.village },
      { label: 'MSIMAMIZI WA KAYA', value: fullName || '-' },
      { label: 'KIPINDI CHA MALIPO', value: formatDateRange(cycle.startDate, cycle.endDate) },
      { label: 'JINA LA MWAKILISHI', value: fullName || '-' },
      { label: 'NAMBA YA KITAMBULISHO CHA MPANGO', value: benefit?.code || '-' },
      { label: 'NJIA YA MALIPO', value: payroll?.paymentMethod || '-' },
    ],
    breakdown: breakdownRows.length
      ? breakdownRows
      : [{ label: 'Malipo', amount: totalPayable, group: 'left' }],
    totals: {
      leftLabel: 'Jumla Ndogo ya Dhana ya Malipo',
      leftAmount: totalLeft || totalPayable,
      rightLabel: 'Jumla Ndogo ya Dhana ya Makato',
      rightAmount: totalRight,
      totalLabel: 'JUMLA YA MALIPO',
      totalAmount: totalPayable,
    },
  };
}

export function buildPaymentSlipsPayloads(payroll) {
  const benefitConsumption = payroll?.benefitConsumption || [];
  return benefitConsumption.map((benefit) => buildPaymentSlipPayloadForBenefit(payroll, benefit));
}
