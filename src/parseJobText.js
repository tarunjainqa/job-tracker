// Best-effort extraction of company / title / URL / salary from a block of pasted text
// (e.g. copied straight off a LinkedIn job posting, or a job description someone emailed you).
// This is plain regex/heuristics, not an AI call -- there's no backend here to send text to,
// and this app is meant to work fully offline. It will get things wrong on unusual formats;
// the caller always leaves the result in editable fields rather than auto-submitting anything.

function firstLabeledValue(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]\\s*(.+)`, 'i');
    const m = text.match(re);
    if (m) return m[1].split('\n')[0].trim();
  }
  return '';
}

const TITLE_FILLER_PREFIXES =
  /^(we'?re hiring( a| an)?|we are hiring( a| an)?|hiring( a| an)?|looking for( a| an)?|seeking( a| an)?|now hiring( a| an)?)\s*/i;

export function parseJobPosting(rawText) {
  const text = (rawText || '').replace(/\r\n/g, '\n').trim();
  const empty = { company: '', title: '', linkedinUrl: '', salaryRange: '' };
  if (!text) return empty;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Any http(s) link in the pasted text -- good enough for "the job posting URL".
  const urlMatch = text.match(/https?:\/\/[^\s)\]]+/i);
  const linkedinUrl = urlMatch ? urlMatch[0].replace(/[.,)\]]+$/, '') : '';

  // A currency amount, optionally ranged, with an optional LPA/K/annum suffix on either side
  // (handles both "₹25-30 LPA" and "$190K-$220K" style ranges).
  const salaryMatch = text.match(
    /(?:₹|\$|Rs\.?|INR|USD)\s?[\d][\d,.]*\s*[Kk]?\s*(?:-|–|to)\s*(?:₹|\$)?\s?[\d][\d,.]*\s*(?:LPA|lpa|K|k|per annum|\/year|\/yr)?/
  );
  const salaryRange = salaryMatch ? salaryMatch[0].trim() : '';

  let company = firstLabeledValue(text, ['Company Name', 'Company', 'Employer', 'Organization']);
  let title = firstLabeledValue(text, ['Job Title', 'Title', 'Role', 'Position']);

  // "<Title> at <Company>" -- common in plain-text postings and emailed job descriptions.
  // The company capture stops at the first sentence boundary or connector word ("to", "in",
  // "for", ...) rather than swallowing the rest of the sentence.
  if (!company || !title) {
    const atMatch = text.match(
      /^(.{3,80}?)\s+at\s+([^,.\n]+?)(?=\s+(?:to|in|for|as|which|that|and)\b|[,.\n]|$)/im
    );
    if (atMatch) {
      if (!title) title = atMatch[1].replace(TITLE_FILLER_PREFIXES, '').trim();
      if (!company) company = atMatch[2].trim();
    }
  }

  // LinkedIn's own copy-paste layout is usually:
  //   <Job Title>
  //   <Company> · <Location> (· Remote/Hybrid)
  //   <Posted time> · <applicant count> ...
  if (lines.length >= 2) {
    if (!title) title = lines[0].replace(TITLE_FILLER_PREFIXES, '').trim();
    if (!company) {
      const secondLine = lines[1];
      const middotParts = secondLine.split(/\s*[·|]\s*/);
      // Guard against grabbing a line that's clearly not a company (e.g. "500+ applicants")
      if (!/^\d/.test(middotParts[0]) && middotParts[0].length <= 80) {
        company = middotParts[0];
      }
    }
  }

  return {
    company: (company || '').slice(0, 120),
    title: (title || '').slice(0, 120),
    linkedinUrl,
    salaryRange,
  };
}
