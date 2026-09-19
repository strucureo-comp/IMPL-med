import Papa from 'papaparse';

export const csvFields = ['code', 'description', 'brand', 'size', 'quantity'];
export const fieldLabels = { code: 'Code', description: 'Description', brand: 'Brand', size: 'Size', quantity: 'Quantity' };
const aliases = { code: ['code', 'articlecode', 'article', 'articlenumber', 'productcode', 'reference', 'ref', 'sku'], description: ['description', 'instrument', 'name', 'product', 'instrumentname'], brand: ['brand', 'manufacturer', 'make'], size: ['size', 'length', 'dimension', 'dimensions'], quantity: ['quantity', 'qty', 'count', 'amount'] };
export function suggestMapping(header) {
  return Object.fromEntries(csvFields.map(field => [field, header.findIndex(value => aliases[field].includes(String(value).toLowerCase().replace(/[^a-z]/g, '')))]));
}
export async function parseCsv(file) {
  if (!/\.csv$/i.test(file.name)) throw new Error('Choose a CSV file. You can download an example below.');
  if (file.size > 2 * 1024 * 1024) throw new Error('This file exceeds 2 MB. Split it into smaller CSV lists.');
  const result = Papa.parse((await file.text()).replace(/^\uFEFF/, ''), { dynamicTyping: false, skipEmptyLines: 'greedy', delimitersToGuess: [',', ';', '\t', '|'] });
  if (result.errors.some(error => error.type === 'Quotes')) throw new Error('The CSV has an unclosed or invalid quoted cell. Correct it and upload again.');
  if (!result.data.length) throw new Error('This CSV is empty. Add an instrument code or description.');
  return result.data;
}
export const isCatalogBrand = value => /^(?:kls[ ._-]*martin(?: group)?|kls)$/i.test(String(value || '').trim());
// The existing API requires a bare catalog code for its exact/prefix code path.
// Keep the catalog brand in the source row, but omit it from the actual query.
export const makeQuery = row => (row.code ? [isCatalogBrand(row.brand) ? '' : row.brand, row.code.replace(/[\u2010-\u2015]/g, '-')] : [isCatalogBrand(row.brand) ? '' : row.brand, row.description, row.size]).filter(Boolean).join(' ').trim();
export function rowError(row) {
  if (!row.code && !row.description) return 'Enter a code or description.';
  const value = String(row.quantity).trim();
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return 'Quantity must be a positive whole number.';
  return '';
}
export function mapCsvRows(matrix, hasHeader, mapping) {
  return matrix.slice(hasHeader ? 1 : 0).map((cells, index) => {
    const row = { id: index + 1, sourceRow: index + (hasHeader ? 2 : 1), excluded: false };
    csvFields.forEach(field => { row[field] = String(cells[mapping[field]] ?? '').trim(); });
    if (!row.quantity) row.quantity = '1';
    return row;
  });
}
export const exampleCsvText = () => Papa.unparse([['Code', 'Description', 'Brand', 'Size', 'Quantity'], ['11-285-18-07', 'Metzenbaum scissors, curved', 'KLS Martin', '18 cm', '2'], ['', 'Needle holder', '', '16 cm', '1'], ['BC605R', '', 'Aesculap', '', '1']]);
export function exampleCsv() {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + exampleCsvText()], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'IMPL-list-example.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
