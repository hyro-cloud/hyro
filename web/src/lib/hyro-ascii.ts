/**
 * HYRO block ASCII logo — fixed width per line so columns stay aligned in the browser.
 * Source: classic ANSI “banner” style (same family as the CLI boot screen).
 */
/** Same glyph grid as CLI `LOGO_LINES` — leading/trailing spaces keep columns aligned. */
export const HYRO_ASCII_LINES = [
  ' ██╗  ██╗██╗   ██╗██████╗  ██████╗ ',
  ' ██║  ██║╚██╗ ██╔╝██╔══██╗██╔═══██╗',
  ' ███████║ ╚████╔╝ ██████╔╝██║   ██║',
  ' ██╔══██║  ╚██╔╝  ██╔══██╗██║   ██║',
  ' ██║  ██║   ██║   ██║  ██║╚██████╔╝',
  ' ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ',
] as const;

export const HYRO_ASCII = HYRO_ASCII_LINES.join('\n');
