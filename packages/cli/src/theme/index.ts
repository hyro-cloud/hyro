import chalk from 'chalk';

let colorEnabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

export function setColorEnabled(enabled: boolean): void {
  colorEnabled = enabled;
  chalk.level = enabled ? chalk.level || 3 : 0;
}

export const theme = {
  amber: chalk.hex('#ffb000'),
  amberHi: chalk.hex('#ffd166'),
  amberDim: chalk.hex('#b9760a'),
  ink: chalk.hex('#f3ede1'),
  mute: chalk.hex('#aaa291'),
  dim: chalk.hex('#6b6456'),
  faint: chalk.hex('#423d35'),
  green: chalk.hex('#57d98a'),
  red: chalk.hex('#ff6b5e'),
  cyan: chalk.hex('#57e0d8'),
  gray: chalk.hex('#aaa291'),
  bold: chalk.bold,
  dimStyle: chalk.dim,
};

export const LOGO_LINES = [
  ' ██╗  ██╗██╗   ██╗██████╗  ██████╗ ',
  ' ██║  ██║╚██╗ ██╔╝██╔══██╗██╔═══██╗',
  ' ███████║ ╚████╔╝ ██████╔╝██║   ██║',
  ' ██╔══██║  ╚██╔╝  ██╔══██╗██║   ██║',
  ' ██║  ██║   ██║   ██║  ██║╚██████╔╝',
  ' ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ',
];

export function renderLogo(): string {
  if (!colorEnabled) return LOGO_LINES.join('\n');
  const colors = [theme.amberHi, theme.amberHi, theme.amber, theme.amber, theme.amberDim, theme.amberDim];
  return LOGO_LINES.map((line, i) => colors[i]!(line)).join('\n');
}

export function renderBanner(version: string): string {
  const lines = [
    '',
    renderLogo(),
    '',
    `  ${theme.bold(theme.amber('HYRO TERMINAL'))}  ${theme.dim('·')}  ${theme.dim(`v${version}`)}`,
    `  ${theme.dim('The Operating System for Autonomous Agents')}`,
    '',
    `  ${['Observe', 'Decide', 'Execute', 'Remember'].map((m) => theme.amber(m)).join(theme.dim(' · '))}`,
    '',
  ];
  return lines.join('\n');
}
