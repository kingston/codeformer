import { describe, expect, it, vitest } from 'vitest';

import { exampleCommand } from './example-command.js';

describe('exampleCommand', () => {
  it('should print the content', async () => {
    const spy = vitest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    await exampleCommand({ content: 'test' });
    expect(spy).toHaveBeenCalledWith('Example command', {
      content: 'test',
    });
  });
});
