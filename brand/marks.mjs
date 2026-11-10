// Three mark options. Mark only (no letters) so a rename never touches the logo.
export const GRAD = ['#6E7BFF', '#22D3A6'];
const defs = (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GRAD[0]}"/><stop offset="1" stop-color="${GRAD[1]}"/></linearGradient></defs>`;
export const marks = {
  // A · Rising check: a call (check) whose stroke keeps rising into an arrow: called it, odds up.
  A: (fill, fg = '#fff', id = 'ga') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${fill.startsWith('url') ? defs(id) : ''}<rect width="32" height="32" rx="9" fill="${fill}"/><path d="M7.5 17.2l5 5L24.2 9.8" fill="none" stroke="${fg}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.6 9.4h5.9v5.9" fill="none" stroke="${fg}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // B · Split orb: Yes/No halves, the larger side winning.
  B: (fill, fg = '#fff', id = 'gb') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${fill.startsWith('url') ? defs(id) : ''}<rect width="32" height="32" rx="9" fill="${fill}"/><circle cx="16" cy="16" r="9" fill="none" stroke="${fg}" stroke-width="3"/><path d="M16 7a9 9 0 0 1 0 18z" fill="${fg}"/></svg>`,
  // C · Seal: hexagonal proof stamp around a pulse.
  C: (fill, fg = '#fff', id = 'gc') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${fill.startsWith('url') ? defs(id) : ''}<rect width="32" height="32" rx="9" fill="${fill}"/><path d="M16 5.5l9 5.2v10.6l-9 5.2-9-5.2V10.7z" fill="none" stroke="${fg}" stroke-width="2.6" stroke-linejoin="round"/><path d="M10.5 17h3l2-4 2.4 7 1.8-3h2" fill="none" stroke="${fg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
