/* ========= Web Worker for Database Processing ========= */

// This worker handles heavy processing in a separate thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch(type) {
    case 'processLines':
      processLines(data);
      break;
    case 'countUniqueCMPGIDs':
      countUniqueCMPGIDs(data);
      break;
    case 'detectSchema':
      detectSchema(data);
      break;
  }
};

function processLines({ lines, startIndex, endIndex }) {
  const results = [];
  
  for (let i = startIndex; i < endIndex && i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    const parts = line.split('|');
    results.push({
      index: i,
      parts: parts,
      line: line
    });
    
    // Yield control every 1000 lines
    if (i % 1000 === 0) {
      self.postMessage({
        type: 'progress',
        processed: i - startIndex,
        total: endIndex - startIndex
      });
    }
  }
  
  self.postMessage({
    type: 'complete',
    results: results
  });
}

function countUniqueCMPGIDs({ lines }) {
  const uniqueIds = new Set();
  
  for (const line of lines) {
    if (!line || line.length === 0) continue;
    
    const pipeIndex = line.indexOf('|');
    if (pipeIndex === -1) continue;
    
    const cmpg = line.substring(0, pipeIndex).trim();
    if (cmpg) uniqueIds.add(cmpg);
  }
  
  self.postMessage({
    type: 'countResult',
    count: uniqueIds.size
  });
}

function detectSchema({ lines, sampleSize = 600 }) {
  const sample = lines.slice(0, Math.min(sampleSize, lines.length));
  const votes = { email: new Map(), unit: new Map(), atSign: new Map() };
  let maxCols = 0;
  const unitRegex = /^KRHRED(?:_Unit)?_\d+$/i;

  for (const line of sample) {
    const parts = line.split('|');
    maxCols = Math.max(maxCols, parts.length);
    parts.forEach((f, idx) => {
      const field = (f||'').trim();
      
      // email vote (strict)
      const isEmailStrict = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(field);
      if (isEmailStrict) votes.email.set(idx, (votes.email.get(idx)||0)+1);
      
      // fallback: contains '@'
      if (field.includes('@')) votes.atSign.set(idx, (votes.atSign.get(idx)||0)+1);
      
      // unit vote
      if (unitRegex.test(field)) votes.unit.set(idx, (votes.unit.get(idx)||0)+1);
    });
  }
  
  const maxKey = (m, def) => m.size ? [...m.entries()].sort((a,b)=>b[1]-a[1])[0][0] : def;
  
  let emailIdx = maxKey(votes.email, undefined);
  if (emailIdx === undefined) emailIdx = maxKey(votes.atSign, 1);
  const unitIdx = maxKey(votes.unit, 2);
  
  let textIdx = unitIdx + 1;
  if (textIdx >= maxCols) textIdx = Math.max(3, maxCols - 1);
  const cmpgIdx = 0;
  
  self.postMessage({
    type: 'schemaResult',
    schema: { cmpgIdx, emailIdx, unitIdx, textIdx }
  });
}
