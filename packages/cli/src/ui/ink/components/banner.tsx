import React from 'react';
import { Text, Box } from 'ink';
import { LOGO_LINES } from '../../../theme';

const INK_COLORS = ['#ffd166', '#ffd166', '#ffb000', '#ffb000', '#b9760a', '#b9760a'];

export function Banner({ version }: { version: string }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {LOGO_LINES.map((line, i) => (
        <Text key={line} color={INK_COLORS[i]}>
          {line}
        </Text>
      ))}
      <Text>
        <Text color="#ffb000" bold>
          {'  HYRO TERMINAL'}
        </Text>
        <Text color="#6b6456"> · </Text>
        <Text color="#6b6456">v{version}</Text>
      </Text>
      <Text color="#6b6456">  Observe · Decide · Execute · Remember</Text>
    </Box>
  );
}
