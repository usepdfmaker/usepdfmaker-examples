// Shared invoice logic for the example workflow.
// scripts/build-workflow.mjs pastes this file in front of every Code-node script that needs it,
// so it must stay a plain script: no import/export statements.
//
// Money rules
// - Amounts are integers in minor units (cents), held as BigInt. Nothing is summed in floating point.
// - Each input number is checked for its decimal places before it is converted (see scaleToInteger).
// - Rounding policy: half up (ties go up) for each line amount (quantity x unit price) and for the
//   tax (subtotal x tax rate). Tax is charged on the subtotal only, not per line.
// - Total = subtotal + tax. The HTML prints these same integers, so the displayed figures reconcile exactly.

const INVOICE_LIMITS = Object.freeze({
  maxItems: 200,
  maxQuantity: 10000,
  maxUnitPrice: 1000000,
  maxTextLength: 200,
  maxAddressLength: 300,
  maxEmailLength: 254,
});

const INVOICE_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

// Throws one error that lists every problem found, so the user can fix them in one pass.
function fail(errors) {
  const error = new Error(`Invoice validation failed: ${errors.join('; ')}`);
  error.name = 'InvoiceValidationError';
  error.errors = errors;
  throw error;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkText(value, label, errors, { required = true, max = INVOICE_LIMITS.maxTextLength } = {}) {
  const text = typeof value === 'string' ? value.trim() : value;
  if (text === undefined || text === null || text === '') {
    if (required) errors.push(`${label} is required`);
    return '';
  }
  if (typeof text !== 'string') {
    errors.push(`${label} must be a string`);
    return '';
  }
  if (text.length > max) errors.push(`${label} must be at most ${max} characters`);
  if (CONTROL_CHAR_PATTERN.test(text)) errors.push(`${label} contains control characters`);
  return text;
}

// Converts value * 10^digits to a BigInt, but only if value has at most `digits` decimal places.
// Returns null otherwise, so 1.005 is rejected for prices instead of being silently rounded.
function scaleToInteger(value, digits) {
  const factor = 10 ** digits;
  const scaled = Math.round(value * factor);
  if (Math.abs(scaled / factor - value) > 1e-9) return null;
  return BigInt(scaled);
}

// Checks a finite number against a range and its decimal places. Returns a BigInt in units of 10^-digits, or null.
function checkAmount(value, label, errors, { min, max, minExclusive = false, digits, decimalsHint }) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${label} must be a finite number`);
    return null;
  }
  if (minExclusive ? value <= min : value < min) {
    errors.push(`${label} must be ${minExclusive ? 'greater than' : 'at least'} ${min}`);
    return null;
  }
  if (value > max) {
    errors.push(`${label} must be at most ${max}`);
    return null;
  }
  const scaled = scaleToInteger(value, digits);
  if (scaled === null) {
    errors.push(`${label} ${decimalsHint}`);
    return null;
  }
  return scaled;
}

function checkDate(value, label, errors) {
  const time = typeof value === 'string' && ISO_DATE_PATTERN.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    errors.push(`${label} must be a real date in YYYY-MM-DD format`);
    return null;
  }
  return time;
}

function checkParty(value, label, errors) {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object`);
    return { name: '', address: '', email: '' };
  }
  const name = checkText(value.name, `${label}.name`, errors);
  const address = checkText(value.address, `${label}.address`, errors, {
    required: false,
    max: INVOICE_LIMITS.maxAddressLength,
  });
  const email = checkText(value.email, `${label}.email`, errors, {
    required: false,
    max: INVOICE_LIMITS.maxEmailLength,
  });
  if (email && !EMAIL_PATTERN.test(email)) errors.push(`${label}.email is not a valid email address`);
  return { name, address, email };
}

// Validates raw invoice data. Returns a normalized invoice with BigInt amounts, or throws InvoiceValidationError.
function validateInvoice(raw) {
  if (!isPlainObject(raw)) fail(['invoice data must be a JSON object']);
  const errors = [];

  const invoiceNumber = checkText(raw.invoiceNumber, 'invoiceNumber', errors);
  if (invoiceNumber && !INVOICE_NUMBER_PATTERN.test(invoiceNumber)) {
    errors.push(
      'invoiceNumber may contain only letters, digits, "." "_" and "-", must start with a letter or digit, and is at most 40 characters',
    );
  }

  const issueTime = checkDate(raw.issueDate, 'issueDate', errors);
  const dueTime = checkDate(raw.dueDate, 'dueDate', errors);
  let paymentDays = null;
  if (issueTime !== null && dueTime !== null) {
    if (dueTime < issueTime) errors.push('dueDate must be the same as or later than issueDate');
    else paymentDays = (dueTime - issueTime) / 86400000;
  }

  let currency = null;
  if (typeof raw.currency === 'string' && CURRENCY_PATTERN.test(raw.currency)) {
    currency = raw.currency.toUpperCase();
  } else {
    errors.push('currency must be a three-letter ISO-style code, for example USD');
  }

  // Tax rate as a fraction (0.2 = 20%). Stored as basis points: 1 bp = 0.01%, so 4 fraction digits.
  const taxBp = checkAmount(raw.taxRate, 'taxRate', errors, {
    min: 0,
    max: 1,
    digits: 4,
    decimalsHint: 'may have at most 2 decimal places in percent (for example 0.075 for 7.5%)',
  });

  const items = [];
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    errors.push('items must contain at least one line item');
  } else if (raw.items.length > INVOICE_LIMITS.maxItems) {
    errors.push(`items may contain at most ${INVOICE_LIMITS.maxItems} line items`);
  } else {
    raw.items.forEach((item, index) => {
      const label = `items[${index}]`;
      if (!isPlainObject(item)) {
        errors.push(`${label} must be an object`);
        return;
      }
      const description = checkText(item.description, `${label}.description`, errors);
      // Quantity in thousandths (up to 3 decimal places). Unit price in cents (up to 2 decimal places).
      const qtyMilli = checkAmount(item.quantity, `${label}.quantity`, errors, {
        min: 0,
        max: INVOICE_LIMITS.maxQuantity,
        minExclusive: true,
        digits: 3,
        decimalsHint: 'may have at most 3 decimal places',
      });
      const unitMinor = checkAmount(item.unitPrice, `${label}.unitPrice`, errors, {
        min: 0,
        max: INVOICE_LIMITS.maxUnitPrice,
        digits: 2,
        decimalsHint: 'may have at most 2 decimal places',
      });
      items.push({ description, qtyMilli, unitMinor });
    });
  }

  const seller = checkParty(raw.seller, 'seller', errors);
  const customer = checkParty(raw.customer, 'customer', errors);

  if (errors.length > 0) fail(errors);

  return {
    invoiceNumber,
    issueDate: raw.issueDate,
    dueDate: raw.dueDate,
    paymentDays,
    currency,
    taxBp,
    seller,
    customer,
    items,
  };
}

// Integer division with half-up rounding. Both arguments are non-negative BigInts.
function roundHalfUpDivide(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

// Formats an integer scaled by 10^digits without trailing zeros: (1050n, 2) -> "10.5".
function formatScaled(value, digits) {
  const factor = 10n ** BigInt(digits);
  const whole = value / factor;
  const fraction = value % factor;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(digits, '0').replace(/0+$/, '')}`;
}

// Always two decimals: (169850n, "USD") -> "USD 1698.50".
function formatMoney(minor, currency) {
  return `${currency} ${minor / 100n}.${(minor % 100n).toString().padStart(2, '0')}`;
}

// Computes every printed figure from the validated invoice. The template only prints these values.
function buildInvoiceModel(inv) {
  const lines = inv.items.map((item) => {
    const amountMinor = roundHalfUpDivide(item.qtyMilli * item.unitMinor, 1000n);
    return {
      description: item.description,
      quantity: formatScaled(item.qtyMilli, 3),
      unitPrice: formatMoney(item.unitMinor, inv.currency),
      amount: formatMoney(amountMinor, inv.currency),
      amountMinor,
    };
  });

  const subtotalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0n);
  const taxMinor = roundHalfUpDivide(subtotalMinor * inv.taxBp, 10000n);
  const totalMinor = subtotalMinor + taxMinor;

  const paymentTerms =
    inv.paymentDays === 0
      ? 'Payment is due on the issue date.'
      : `Payment is due on ${inv.dueDate}, ${inv.paymentDays} ${inv.paymentDays === 1 ? 'day' : 'days'} after the issue date.`;

  return {
    ...inv,
    lines,
    taxPercent: formatScaled(inv.taxBp, 2),
    subtotal: formatMoney(subtotalMinor, inv.currency),
    tax: formatMoney(taxMinor, inv.currency),
    total: formatMoney(totalMinor, inv.currency),
    paymentTerms,
    subtotalMinor,
    taxMinor,
    totalMinor,
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

// Builds a safe file name from the invoice number. Validation already limits the characters;
// this is a second guard before the value reaches a file name.
function invoiceFileName(invoiceNumber) {
  const base = String(invoiceNumber ?? '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 40);
  if (!base) throw new Error('Cannot build a PDF file name: the invoice number is empty after sanitizing.');
  return `${base}.pdf`;
}

// Renames the UsePDFMaker PDF to <invoiceNumber>.pdf.
// n8n keeps the name of a stored binary file in its own storage (filesystem mode writes it once, when the file is
// stored, and the download uses that stored name). Changing only the `fileName` field does not change the download.
// So the PDF bytes are read and stored again under the new name. The bytes and MIME type are unchanged.
async function nameInvoicePdf(item, invoiceNumber, helpers) {
  const pdf = item && item.binary && item.binary.data;
  if (!pdf) {
    throw new Error('The UsePDFMaker node returned no binary property "data". The PDF was not generated.');
  }
  const fileName = invoiceFileName(invoiceNumber);
  const bytes = await helpers.getBinaryDataBuffer(0, 'data');
  if (bytes.length < 5 || bytes.subarray(0, 4).toString('latin1') !== '%PDF') {
    throw new Error('The UsePDFMaker binary property "data" does not contain PDF bytes.');
  }
  const data = await helpers.prepareBinaryData(bytes, fileName, pdf.mimeType);
  return {
    json: { invoiceNumber, fileName },
    binary: { ...item.binary, data },
  };
}
