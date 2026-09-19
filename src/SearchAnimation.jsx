import React from 'react';

export default function SearchAnimation() {
  return <div className="search-animation" aria-hidden="true">
    <div className="search-scan">
      <span className="scan-corner corner-top" />
      <span className="scan-corner corner-bottom" />
      <img src="/instruments/metzenbaum.png" alt="" />
      <span className="scan-beam" />
    </div>
    <div className="search-pulse"><span /><span /><span /></div>
  </div>;
}
