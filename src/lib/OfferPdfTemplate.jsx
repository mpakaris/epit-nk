import React from 'react';
import path from 'path';
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/inter-400.ttf'), fontWeight: 400, fontStyle: 'normal' },
    { src: path.join(process.cwd(), 'public/fonts/inter-400-italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
    { src: path.join(process.cwd(), 'public/fonts/inter-700.ttf'), fontWeight: 700, fontStyle: 'normal' },
  ],
});

const DEFAULT_ACCENT = '#2563eb';
const ENTRY_TYPE_ORDER = { material: 0, labour: 1, transport: 2, equipment: 3, other: 4 };
const sortEntries = (arr) => [...arr].sort((a, b) => (ENTRY_TYPE_ORDER[a.entry_type] ?? 4) - (ENTRY_TYPE_ORDER[b.entry_type] ?? 4));
const SLATE   = '#0f172a';
const MUTED   = '#64748b';
const LIGHT   = '#94a3b8';
const BORDER  = '#e2e8f0';
const BG_CARD = '#f8fafc';
const BG_ALT  = '#f1f5f9';

const WINDOW_M2 = 1.5;
const DOOR_M2   = 2.0;

const PDF_TR = {
  hu: {
    docTitle: 'AJÁNLAT', labelNumber: 'Szám:', labelDate: 'Kelt:', labelValidUntil: 'Érvényes:',
    labelStartDate: 'Kezdés:', labelEndDate: 'Befejezés:', clientSection: 'Megrendelő',
    noClient: 'Nincs megrendelő megadva.', taxPrefix: 'Adószám:',
    sectionNum: (n) => `${n}. szakasz`, subtotal: 'Részösszeg',
    measureFloor: 'Padló:', measureHeight: (h) => `Magasság: ${h} m`,
    measureWindows: (c) => `${c} ablak`, measureDoors: (c) => `${c} ajtó`,
    measureNetWall: 'Falfelület (nettó):',
    colDescription: 'Megnevezés', colType: 'Típus', colQty: 'Menny.', colUnitPrice: 'Egységár', colAmount: 'Összeg',
    noEntries: 'Nincsenek tételek ebben a szakaszban.', generalItems: 'Általános tételek',
    netTotal: 'Nettó összeg', vatLine: (r) => `ÁFA (${r}%)`, grossTotal: 'Bruttó összeg',
    signContractor: 'Vállalkozó aláírása', signClient: 'Megrendelő aláírása',
    footerValidUntil: 'Az ajánlat érvényes:', footerPaymentDays: 'Fizetési határidő:',
    footerPaymentDaysUnit: 'nap teljesítéstől', footerDeposit: 'Előleg:',
    footerDepositSuffix: 'az ajánlat elfogadásakor', footerWarranty: 'Garancia:',
    footerWarrantyUnit: 'hónap', footerTerms: 'Mellékelt ÁSZF:',
    typeMaterial: 'Anyag', typeLabour: 'Munkadíj', typeEquipment: 'Eszközb.', typeTransport: 'Szállítás', typeOther: 'Egyéb',
  },
  en: {
    docTitle: 'QUOTATION', labelNumber: 'No.:', labelDate: 'Date:', labelValidUntil: 'Valid until:',
    labelStartDate: 'Start:', labelEndDate: 'End:', clientSection: 'Client',
    noClient: 'No client specified.', taxPrefix: 'Tax number:',
    sectionNum: (n) => `Section ${n}`, subtotal: 'Subtotal',
    measureFloor: 'Floor:', measureHeight: (h) => `Height: ${h} m`,
    measureWindows: (c) => `${c} window(s)`, measureDoors: (c) => `${c} door(s)`,
    measureNetWall: 'Net wall area:',
    colDescription: 'Description', colType: 'Type', colQty: 'Qty.', colUnitPrice: 'Unit price', colAmount: 'Amount',
    noEntries: 'No entries in this section.', generalItems: 'General items',
    netTotal: 'Net total', vatLine: (r) => `VAT (${r}%)`, grossTotal: 'Gross total',
    signContractor: 'Contractor signature', signClient: 'Client signature',
    footerValidUntil: 'Offer valid until:', footerPaymentDays: 'Payment due:',
    footerPaymentDaysUnit: 'days after completion', footerDeposit: 'Deposit:',
    footerDepositSuffix: 'upon acceptance', footerWarranty: 'Warranty:',
    footerWarrantyUnit: 'month(s)', footerTerms: 'Attached T&C:',
    typeMaterial: 'Material', typeLabour: 'Labour', typeEquipment: 'Equipment', typeTransport: 'Transport', typeOther: 'Other',
  },
  de: {
    docTitle: 'ANGEBOT', labelNumber: 'Nr.:', labelDate: 'Datum:', labelValidUntil: 'Gültig bis:',
    labelStartDate: 'Beginn:', labelEndDate: 'Ende:', clientSection: 'Auftraggeber',
    noClient: 'Kein Auftraggeber angegeben.', taxPrefix: 'Steuernummer:',
    sectionNum: (n) => `Abschnitt ${n}`, subtotal: 'Zwischensumme',
    measureFloor: 'Boden:', measureHeight: (h) => `Höhe: ${h} m`,
    measureWindows: (c) => `${c} Fenster`, measureDoors: (c) => `${c} Tür(en)`,
    measureNetWall: 'Nettowandfläche:',
    colDescription: 'Bezeichnung', colType: 'Typ', colQty: 'Menge', colUnitPrice: 'Einzelpreis', colAmount: 'Betrag',
    noEntries: 'Keine Positionen in diesem Abschnitt.', generalItems: 'Allgemeine Positionen',
    netTotal: 'Nettobetrag', vatLine: (r) => `MwSt. (${r}%)`, grossTotal: 'Bruttobetrag',
    signContractor: 'Unterschrift Auftragnehmer', signClient: 'Unterschrift Auftraggeber',
    footerValidUntil: 'Angebot gültig bis:', footerPaymentDays: 'Zahlungsfrist:',
    footerPaymentDaysUnit: 'Tage nach Fertigstellung', footerDeposit: 'Anzahlung:',
    footerDepositSuffix: 'bei Auftragserteilung', footerWarranty: 'Garantie:',
    footerWarrantyUnit: 'Monat(e)', footerTerms: 'Anhang AGB:',
    typeMaterial: 'Material', typeLabour: 'Arbeit', typeEquipment: 'Gerätemiete', typeTransport: 'Transport', typeOther: 'Sonstiges',
  },
};

const ENTRY_COLORS = {
  material:  '#1d4ed8',
  labour:    '#15803d',
  equipment: '#c2410c',
  transport: '#7c3aed',
  other:     '#475569',
};

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtM2(v) {
  return Number(v).toFixed(2).replace('.', ',') + ' m²';
}

function getMeasurementChips(section, tr) {
  const w    = Number(section.width_m);
  const l    = Number(section.length_m);
  const h    = Number(section.height_m) || 0;
  const wins = section.window_count || 0;
  const doors= section.door_count   || 0;
  const floor = w > 0 && l > 0 ? w * l : (section.size_m2 != null ? Number(section.size_m2) : null);
  const perimeter = w > 0 && l > 0 ? 2 * (w + l) : null;
  const openings  = wins * WINDOW_M2 + doors * DOOR_M2;
  const grossWall = perimeter && h > 0 ? perimeter * h : null;
  const netWall   = grossWall != null ? Math.max(0, grossWall - openings) : null;

  return [
    floor     != null && `${tr.measureFloor} ${fmtM2(floor)}`,
    h > 0             && tr.measureHeight(h),
    wins > 0          && tr.measureWindows(wins),
    doors > 0         && tr.measureDoors(doors),
    netWall   != null && `${tr.measureNetWall} ${fmtM2(netWall)}`,
  ].filter(Boolean);
}

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, color: SLATE, backgroundColor: '#fff', paddingTop: 20, paddingBottom: 20 },

  accentBar:  { height: 5 },
  body:       { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 28 },

  // Header
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  senderName: { fontSize: 11, fontWeight: 700, color: SLATE, marginBottom: 2 },
  senderSub:  { fontSize: 8, color: MUTED, lineHeight: 1.6 },
  badgeTitle: { fontSize: 20, fontWeight: 700, textAlign: 'right', letterSpacing: -0.5 },
  badgeMeta:  { fontSize: 7.5, color: MUTED, textAlign: 'right', lineHeight: 1.8, marginTop: 6 },

  divider:    { height: 1, backgroundColor: BORDER, marginBottom: 16 },

  // Client row
  clientRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  clientLabel:{ fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: LIGHT, marginBottom: 4 },
  clientName: { fontSize: 9, fontWeight: 700, color: SLATE, marginBottom: 1 },
  clientText: { fontSize: 8.5, color: '#475569', lineHeight: 1.6 },
  offerTitle: { fontSize: 11, fontWeight: 700, color: SLATE, textAlign: 'right', lineHeight: 1.3 },
  offerMeta:  { fontSize: 8, color: MUTED, textAlign: 'right', marginTop: 3 },

  // Description
  descBox:    { backgroundColor: BG_CARD, borderLeftWidth: 3, borderTopWidth: 1, borderTopColor: BORDER, borderRightWidth: 1, borderRightColor: BORDER, borderBottomWidth: 1, borderBottomColor: BORDER, padding: '7 10', marginBottom: 16 },
  descText:   { fontSize: 8.5, color: '#475569', lineHeight: 1.5 },

  // Section header
  sectionWrap:{ marginBottom: 12 },
  sectionHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: BG_CARD, borderLeftWidth: 4, borderTopWidth: 1, borderTopColor: BORDER, borderRightWidth: 1, borderRightColor: BORDER, borderBottomWidth: 1, borderBottomColor: BORDER, padding: '6 9', borderTopRightRadius: 4 },
  sectionNum: { fontSize: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  sectionName:{ fontSize: 9.5, fontWeight: 700, color: SLATE },
  sectionSub: { fontSize: 7.5, color: MUTED, fontStyle: 'italic', marginTop: 2 },
  sectionSubtotal: { textAlign: 'right' },
  subtotalLabel: { fontSize: 6, textTransform: 'uppercase', letterSpacing: 0.5, color: LIGHT },
  subtotalVal: { fontWeight: 700, fontSize: 9, color: SLATE },

  // Measurement chips
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 3 },
  chip:       { fontSize: 6.5, fontWeight: 700, padding: '1 4', backgroundColor: BG_ALT, color: '#475569' },

  // Table
  table:      { borderLeftWidth: 1, borderLeftColor: BORDER, borderRightWidth: 1, borderRightColor: BORDER, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableHead:  { flexDirection: 'row', backgroundColor: BG_ALT, borderBottomWidth: 1, borderBottomColor: BORDER },
  thDesc:     { flex: 1, padding: '4 7', fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: MUTED },
  thType:     { width: 48, padding: '4 4', fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: MUTED, textAlign: 'center' },
  thQty:      { width: 44, padding: '4 4', fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: MUTED, textAlign: 'right' },
  thUnit:     { width: 52, padding: '4 4', fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: MUTED, textAlign: 'right' },
  thAmt:      { width: 62, padding: '4 7', fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: MUTED, textAlign: 'right' },

  trEven:     { flexDirection: 'row', backgroundColor: '#fff',    borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  trOdd:      { flexDirection: 'row', backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tdDesc:     { flex: 1, padding: '5 7' },
  tdDescMain: { fontSize: 8.5, fontWeight: 700, color: SLATE },
  tdDescNote: { fontSize: 7, color: LIGHT, marginTop: 1 },
  tdType:     { width: 48, padding: '5 4', textAlign: 'center', justifyContent: 'center', alignItems: 'center' },
  tdQty:      { width: 44, padding: '5 4', textAlign: 'right', fontSize: 8, color: '#475569', justifyContent: 'flex-end' },
  tdUnit:     { width: 52, padding: '5 4', textAlign: 'right', fontSize: 8, color: '#475569', justifyContent: 'flex-end' },
  tdAmt:      { width: 62, padding: '5 7', textAlign: 'right', fontWeight: 700, fontSize: 8.5, color: SLATE, justifyContent: 'flex-end' },

  typeBadge:  { fontSize: 6, fontWeight: 700, padding: '1.5 4', borderRadius: 999 },

  emptySection: { padding: '7 9', borderLeftWidth: 1, borderLeftColor: BORDER, borderRightWidth: 1, borderRightColor: BORDER, borderBottomWidth: 1, borderBottomColor: BORDER, fontSize: 7.5, color: LIGHT, fontStyle: 'italic' },

  // Totals
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  totalsBox:  { minWidth: 230, borderWidth: 1, borderColor: BORDER, borderRadius: 6, overflow: 'hidden' },
  totalsRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '6 10', borderBottomWidth: 1, borderBottomColor: BORDER },
  totalsLabel:{ fontSize: 8, color: MUTED },
  totalsVal:  { fontSize: 8.5, fontWeight: 700, color: SLATE },
  totalsGross:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '8 10' },
  totalsGrossLabel: { fontSize: 8.5, fontWeight: 700, color: '#fff' },
  totalsGrossVal:   { fontSize: 11, fontWeight: 700, color: '#fff' },

  // Signature
  sigGrid:    { flexDirection: 'row', gap: 40, marginTop: 36 },
  sigItem:    { flex: 1, alignItems: 'center' },
  sigLine:    { height: 1, backgroundColor: '#cbd5e1', width: '100%', marginBottom: 6 },
  sigLabel:   { fontSize: 7.5, color: LIGHT },

  // Footer
  footerBox:  { marginTop: 24, paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER },
  footerText: { fontSize: 7.5, color: LIGHT, lineHeight: 1.5 },
});

function TypeBadge({ type, tr }) {
  const labelKey = { material: 'typeMaterial', labour: 'typeLabour', equipment: 'typeEquipment', transport: 'typeTransport', other: 'typeOther' };
  const label = tr[labelKey[type]] || tr.typeOther;
  const color = ENTRY_COLORS[type] || ENTRY_COLORS.other;
  return (
    <Text style={[s.typeBadge, { color, backgroundColor: color + '18' }]}>{label}</Text>
  );
}

function SectionBlock({ section, entries, index, accentColor, tr, fmtMoney }) {
  const sectionTotal = entries.reduce((acc, e) => acc + Number(e.amount_huf || 0), 0);
  const chips = getMeasurementChips(section, tr);

  return (
    <View style={s.sectionWrap}>
      <View style={[s.sectionHdr, { borderLeftColor: accentColor }]} wrap={false}>
        <View style={{ flex: 1 }}>
          <Text style={[s.sectionNum, { color: accentColor }]}>{tr.sectionNum(index + 1)}</Text>
          <Text style={s.sectionName}>{section.name}</Text>
          {chips.length > 0 && (
            <View style={s.chipRow}>
              {chips.map(c => <Text key={c} style={s.chip}>{c}</Text>)}
            </View>
          )}
          {section.description ? <Text style={s.sectionSub}>{section.description}</Text> : null}
        </View>
        {sectionTotal > 0 && (
          <View style={s.sectionSubtotal}>
            <Text style={s.subtotalLabel}>{tr.subtotal}</Text>
            <Text style={s.subtotalVal}>{fmtMoney(sectionTotal)}</Text>
          </View>
        )}
      </View>

      {entries.length > 0 ? (
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={s.thDesc}>{tr.colDescription}</Text>
            <Text style={s.thType}>{tr.colType}</Text>
            <Text style={s.thQty}>{tr.colQty}</Text>
            <Text style={s.thUnit}>{tr.colUnitPrice}</Text>
            <Text style={s.thAmt}>{tr.colAmount}</Text>
          </View>
          {entries.map((e, i) => (
            <View key={e.id} style={i % 2 === 0 ? s.trEven : s.trOdd} wrap={false}>
              <View style={s.tdDesc}>
                <Text style={s.tdDescMain}>{e.work_description}</Text>
                {e.notes ? <Text style={s.tdDescNote}>{e.notes}</Text> : null}
              </View>
              <View style={s.tdType}><TypeBadge type={e.entry_type} tr={tr} /></View>
              <View style={s.tdQty}><Text>{e.quantity != null ? `${e.quantity} ${e.unit || 'db'}` : '—'}</Text></View>
              <View style={s.tdUnit}><Text>{e.unit_price != null ? fmtMoney(e.unit_price) : '—'}</Text></View>
              <View style={s.tdAmt}><Text>{fmtMoney(e.amount_huf)}</Text></View>
            </View>
          ))}
        </View>
      ) : (
        <View style={s.emptySection}>
          <Text>{tr.noEntries}</Text>
        </View>
      )}
    </View>
  );
}

export function OfferPdfTemplate({ quote, client, sections, allEntries, profile, accentColor = DEFAULT_ACCENT, locale = 'hu' }) {
  const tr = PDF_TR[locale] || PDF_TR.hu;
  const fmtMoney = (n) => {
    const num = Number(n) || 0;
    return num.toLocaleString('hu-HU') + ' Ft';
  };

  const offerTerms      = quote.offer_terms_text  || null;
  const validUntil      = quote.valid_until ? formatDate(quote.valid_until) : null;
  const termsPdfName    = profile.terms_pdf_name  || null;
  const paymentDays     = quote.payment_deadline_days > 0 ? quote.payment_deadline_days : null;
  const paymentMethod   = quote.payment_method || null;
  const depositPct      = quote.deposit_percent > 0 ? quote.deposit_percent : null;
  const warrantyMonths  = quote.warranty_months > 0 ? quote.warranty_months : null;
  const netTotal   = allEntries.reduce((acc, e) => acc + Number(e.amount_huf || 0), 0);
  const taxRate    = Number(quote.tax_percent ?? 27);
  const taxAmount  = Math.round(netTotal * taxRate / 100);
  const grossTotal = netTotal + taxAmount;

  const senderName = [profile.last_name, profile.first_name].filter(Boolean).join(' ');

  const sortedEntries = sortEntries(allEntries);
  const unsectioned = sortedEntries.filter(e => !e.section_id);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={[s.accentBar, { backgroundColor: accentColor }]} />
        <View style={s.body}>

          {/* Header */}
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              {profile.company_name ? <Text style={s.senderName}>{profile.company_name}</Text> : null}
              {senderName ? <Text style={profile.company_name ? s.senderSub : s.senderName}>{senderName}</Text> : null}
              {(profile.zip || profile.city || profile.street) ? (
                <Text style={s.senderSub}>
                  {[profile.zip, profile.city].filter(Boolean).join(' ')}
                  {profile.street ? `, ${[profile.street, profile.street_number].filter(Boolean).join(' ')}` : ''}
                </Text>
              ) : null}
              {profile.tax_number   ? <Text style={[s.senderSub, { marginTop: 3 }]}>{tr.taxPrefix} {profile.tax_number}</Text> : null}
              {profile.phone        ? <Text style={s.senderSub}>{profile.phone}</Text> : null}
              {profile.bank_account ? <Text style={s.senderSub}>{profile.bank_account}{profile.bank_name ? ` · ${profile.bank_name}` : ''}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.badgeTitle, { color: accentColor }]}>{tr.docTitle}</Text>
              <Text style={s.badgeMeta}>
                {quote.offer_number ? `${tr.labelNumber} ${quote.offer_number}\n` : ''}
                {tr.labelDate}{' '}{formatDate(quote.created_at?.split('T')[0])}
                {validUntil ? `\n${tr.labelValidUntil} ${validUntil}` : ''}
                {quote.start_date ? `\n${tr.labelStartDate} ${formatDate(quote.start_date)}` : ''}
                {quote.end_date   ? `\n${tr.labelEndDate} ${formatDate(quote.end_date)}` : ''}
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Client + offer title */}
          <View style={s.clientRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.clientLabel}>{tr.clientSection}</Text>
              {client ? (
                <>
                  <Text style={s.clientName}>{client.name}</Text>
                  {client.address ? <Text style={s.clientText}>{client.address}</Text> : null}
                  {client.phone   ? <Text style={s.clientText}>{client.phone}</Text>   : null}
                  {client.email   ? <Text style={s.clientText}>{client.email}</Text>   : null}
                </>
              ) : (
                <Text style={[s.clientText, { fontStyle: 'italic', color: LIGHT }]}>{tr.noClient}</Text>
              )}
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={s.offerTitle}>{quote.title}</Text>
              {quote.location  ? <Text style={s.offerMeta}>{quote.location}</Text>  : null}
              {quote.work_type ? <Text style={s.offerMeta}>{quote.work_type}</Text> : null}
            </View>
          </View>

          {/* Description */}
          {quote.description ? (
            <View style={[s.descBox, { borderLeftColor: accentColor }]}>
              <Text style={s.descText}>{quote.description}</Text>
            </View>
          ) : null}

          {/* Sections */}
          {sections.map((section, i) => (
            <SectionBlock
              key={section.id}
              section={section}
              entries={sortedEntries.filter(e => e.section_id === section.id)}
              index={i}
              accentColor={accentColor}
              tr={tr}
              fmtMoney={fmtMoney}
            />
          ))}

          {/* Unsectioned entries */}
          {unsectioned.length > 0 && (
            <View style={s.sectionWrap}>
              <View style={[s.sectionHdr, { borderLeftColor: LIGHT }]}>
                <Text style={s.sectionName}>{tr.generalItems}</Text>
              </View>
              <View style={s.table}>
                <View style={s.tableHead}>
                  <Text style={s.thDesc}>{tr.colDescription}</Text>
                  <Text style={s.thType}>{tr.colType}</Text>
                  <Text style={s.thQty}>{tr.colQty}</Text>
                  <Text style={s.thUnit}>{tr.colUnitPrice}</Text>
                  <Text style={s.thAmt}>{tr.colAmount}</Text>
                </View>
                {unsectioned.map((e, i) => (
                  <View key={e.id} style={i % 2 === 0 ? s.trEven : s.trOdd} wrap={false}>
                    <View style={s.tdDesc}>
                      <Text style={s.tdDescMain}>{e.work_description}</Text>
                      {e.notes ? <Text style={s.tdDescNote}>{e.notes}</Text> : null}
                    </View>
                    <View style={s.tdType}><TypeBadge type={e.entry_type} tr={tr} /></View>
                    <View style={s.tdQty}><Text>{e.quantity != null ? `${e.quantity} ${e.unit || 'db'}` : '—'}</Text></View>
                    <View style={s.tdUnit}><Text>{e.unit_price != null ? fmtMoney(e.unit_price) : '—'}</Text></View>
                    <View style={s.tdAmt}><Text>{fmtMoney(e.amount_huf)}</Text></View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Totals */}
          <View style={s.totalsWrap}>
            <View style={s.totalsBox}>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>{tr.netTotal}</Text>
                <Text style={s.totalsVal}>{fmtMoney(netTotal)}</Text>
              </View>
              {taxRate > 0 && (
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>{tr.vatLine(taxRate)}</Text>
                  <Text style={[s.totalsVal, { color: MUTED, fontWeight: 400 }]}>{fmtMoney(taxAmount)}</Text>
                </View>
              )}
              <View style={[s.totalsGross, { backgroundColor: accentColor }]}>
                <Text style={s.totalsGrossLabel}>{tr.grossTotal}</Text>
                <Text style={s.totalsGrossVal}>{fmtMoney(grossTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Signature */}
          <View style={s.sigGrid}>
            {[tr.signContractor, tr.signClient].map(label => (
              <View key={label} style={s.sigItem}>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          {(validUntil || paymentDays || depositPct || warrantyMonths || termsPdfName || offerTerms) && (
            <View style={s.footerBox}>
              {validUntil    && <Text style={s.footerText}>{tr.footerValidUntil} {validUntil}</Text>}
              {paymentDays   && <Text style={s.footerText}>{tr.footerPaymentDays} {paymentDays} {tr.footerPaymentDaysUnit}{paymentMethod ? `, ${paymentMethod}` : ''}</Text>}
              {depositPct    && <Text style={s.footerText}>{tr.footerDeposit} {depositPct}%{grossTotal > 0 ? ` (${fmtMoney(Math.round(grossTotal * depositPct / 100))})` : ''} {tr.footerDepositSuffix}</Text>}
              {warrantyMonths && <Text style={s.footerText}>{tr.footerWarranty} {warrantyMonths} {tr.footerWarrantyUnit}</Text>}
              {termsPdfName  && <Text style={s.footerText}>{tr.footerTerms} {termsPdfName}</Text>}
              {offerTerms    && <Text style={s.footerText}>{offerTerms}</Text>}
            </View>
          )}

        </View>
      </Page>
    </Document>
  );
}
