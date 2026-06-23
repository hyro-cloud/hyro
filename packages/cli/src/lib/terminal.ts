/** True when Ink raw-mode UI (chat TUI) is expected to work. */
export function supportsInteractiveInk(): boolean {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  if (process.env.CI) return false;
  if (process.env.HYRO_NO_INK === '1') return false;

  if (process.platform === 'win32') {
    // Windows Terminal, VS Code / Cursor, PowerShell 7+ generally support Ink.
    if (process.env.WT_SESSION) return true;
    if (process.env.TERM_PROGRAM === 'vscode' || process.env.TERM_PROGRAM === 'cursor') return true;
    // Classic cmd.exe + conhost: Ink renders then exits; readline fallback is reliable.
    if (/cmd\.exe/i.test(process.env.ComSpec ?? '')) return false;
  }

  return true;
}
