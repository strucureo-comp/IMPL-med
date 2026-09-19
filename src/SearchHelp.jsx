import React, { useRef, useState } from 'react';
import { ArrowDownToLine, FileSpreadsheet, ImagePlus, Search, ShoppingBag } from 'lucide-react';
import { exampleCsv, exampleCsvText } from './csvImport';

const tips = [
  ['Article code', '11-285-18-07', 'Enter the full article code on its own.'],
  ['Instrument or specifications', 'Metzenbaum scissors curved 18 cm', 'Add shape and size where known.'],
  ['Instrument family', '11-285', 'Shows available articles and sizes.'],
  ['Competitor reference', 'Aesculap BC605R', 'Include the brand. Verify equivalent specifications.'],
];
const fields = [
  ['Code', 'Text', 'Catalog or competitor reference.', '11-285-18-07'],
  ['Description', 'Text', 'Instrument name or specifications.', 'Metzenbaum scissors, curved'],
  ['Brand', 'Text · Optional', 'Manufacturer of a competitor item.', 'Aesculap'],
  ['Size', 'Text · Optional', 'Include the unit. Used without a code.', '18 cm'],
  ['Quantity', 'Whole number · Optional', 'Positive integer. Blank or unmapped defaults to 1.', '2'],
];
export default function SearchHelp() {
  const [tab, setTab] = useState('search');
  const tabs = useRef([]);
  const select = index => { setTab(index === 0 ? 'search' : 'csv'); tabs.current[index]?.focus(); };
  return <div className="search-help">
    <div className="help-tabs" role="tablist" aria-label="Help topics" onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); select(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : tab === 'search' ? 1 : 0);
    }}>{[['search', 'Search guide', Search], ['csv', 'CSV format', FileSpreadsheet]].map(([id, label, Icon], index) => <button key={id} ref={element => { tabs.current[index] = element; }} id={`help-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`help-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}><Icon size={17} />{label}</button>)}</div>
    <section role="tabpanel" id="help-panel-search" aria-labelledby="help-tab-search" hidden={tab !== 'search'} tabIndex={0}><div className="help-search-tips">{tips.map(([title, example, description]) => <div className="help-tip" key={title}><h3>{title}</h3><code>{example}</code><p>{description}</p></div>)}</div><div className="help-note"><ImagePlus size={20} /><div><h3>Search with a photo</h3><p>Upload, paste, or drop a clear instrument photo (up to 10 MB), then search.</p></div></div><div className="help-note"><ShoppingBag size={20} /><div><h3>Review, then build your tray</h3><p><strong>View details</strong> → select article and size → add to tray. Adjust quantities and export PDF or CSV in <strong>Surgery tray</strong>.</p></div></div></section>
    <section role="tabpanel" id="help-panel-csv" aria-labelledby="help-tab-csv" hidden={tab !== 'csv'} tabIndex={0}><div className="help-csv-heading"><div><h3>One requested instrument per row</h3><p>Each row needs a code or description. Map columns after uploading.</p></div><span>100 items · 2 MB</span></div><div className="help-schema-scroll"><table className="help-schema"><thead><tr><th>Column</th><th>Format / rule</th><th>Example</th></tr></thead><tbody>{fields.map(([name, type, rule, example]) => <tr key={name}><td><code>{name}</code></td><td><strong>{type}</strong><p>{rule}</p></td><td>{example}</td></tr>)}</tbody></table></div><div className="help-example-heading"><h3>Example CSV</h3><button className="secondary-button" onClick={exampleCsv}><ArrowDownToLine size={16} /> Download example CSV</button></div><pre className="help-csv-example" aria-label="CSV example"><code>{exampleCsvText()}</code></pre><p className="help-small">Keep codes as text. Quote cells containing commas.</p><ol className="help-import-steps"><li><strong>Import list:</strong> upload a CSV and map its columns. Set whether the first row contains headers.</li><li><strong>Check rows:</strong> correct or exclude invalid rows, then search.</li><li><strong>Review matches:</strong> exact codes are ready automatically. For other matches, select an article and click <strong>Use this article</strong>.</li><li><strong>Add ready items to tray:</strong> quantities for the same article are combined. Added rows cannot be added twice.</li></ol><p className="help-small">Pause, resume, or retry failed rows. Reloading clears the review; added tray items stay saved.</p></section>
  </div>;
}
