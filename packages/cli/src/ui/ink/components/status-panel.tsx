import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { activeApiUrl, activeToken, loadConfig, loadCreds } from '../../../config';
import { isApiReachable } from '../../../api/client';
import { getClient } from '../../../api/client';

export function StatusPanel() {
  const [status, setStatus] = useState({
    account: '…',
    model: loadConfig().model,
    agent: loadConfig().activeAgent ?? 'none',
    api: '…',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = loadConfig();
      const creds = loadCreds();
      const reachable = await isApiReachable();
      let account = 'not logged in';
      let model = cfg.model;

      if (activeToken() && reachable) {
        try {
          const { user } = await getClient().auth.me();
          account = user.email;
          model = user.defaultModel;
        } catch {
          account = 'invalid credentials';
        }
      } else if (creds.email) {
        account = creds.email;
      }

      if (!cancelled) {
        setStatus({
          account,
          model,
          agent: cfg.activeAgent ?? 'none',
          api: `${reachable ? '●' : '○'} ${activeApiUrl()}`,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="#ffb000" paddingX={1} marginBottom={1}>
      <Text color="#ffb000" bold>
        STATUS
      </Text>
      <Text>
        <Text color="#6b6456">account </Text>
        <Text color="#f3ede1">{status.account}</Text>
      </Text>
      <Text>
        <Text color="#6b6456">model   </Text>
        <Text color="#ffb000">{status.model}</Text>
      </Text>
      <Text>
        <Text color="#6b6456">agent   </Text>
        <Text color="#f3ede1">{status.agent}</Text>
      </Text>
      <Text>
        <Text color="#6b6456">api     </Text>
        <Text color="#aaa291">{status.api}</Text>
      </Text>
    </Box>
  );
}
