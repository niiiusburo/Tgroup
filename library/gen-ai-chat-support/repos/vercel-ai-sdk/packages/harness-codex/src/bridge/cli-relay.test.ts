import { describe, expect, test } from 'vitest';
import { composeToolUsageInstructions, isToolRelayCommand } from './cli-relay';

describe('composeToolUsageInstructions', () => {
  test('requires each host tool use to run through the relay in the current turn', () => {
    const instructions = composeToolUsageInstructions({
      cliShimPath: '/work dir/harness-tool.mjs',
      tools: [
        {
          name: 'get_weather',
          description: 'Get weather',
          inputSchema: {
            type: 'object',
            properties: { city: { type: 'string' } },
            required: ['city'],
          },
        },
      ],
    });

    expect(instructions).toContain(
      "node '/work dir/harness-tool.mjs' <toolName> '<jsonInput>'",
    );
    expect(instructions).toContain(
      'run a separate CLI invocation for each needed tool call in the current turn before answering',
    );
    expect(instructions).toContain('Do not reuse previous tool results');
  });
});

describe('isToolRelayCommand', () => {
  test('matches direct shim invocations only', () => {
    const cliShimPath = '/work dir/harness-tool.mjs';

    expect(
      isToolRelayCommand({
        command: "node '/work dir/harness-tool.mjs' get_weather '{}'",
        cliShimPath,
      }),
    ).toBe(true);
    expect(
      isToolRelayCommand({
        command: "echo '/work dir/harness-tool.mjs'",
        cliShimPath,
      }),
    ).toBe(false);
    expect(
      isToolRelayCommand({
        command: "node '/work dir/harness-tool.mjs.bak' get_weather '{}'",
        cliShimPath,
      }),
    ).toBe(false);
  });
});
