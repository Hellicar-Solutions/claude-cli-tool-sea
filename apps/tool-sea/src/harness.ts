// Shared stdio harness logic for any tool-sea entry: --tool-spec prints the
// tool's own wire spec (toWireTool), default mode runs the real handler on one
// JSON input from stdin. Factored out so adding another tool (Exec, ExecV2,
// ExecV3, ...) is a new thin entry file, not a new harness.
import { toWireTool } from '../../../packages/claude-sdk/src/index';

// biome-ignore lint/suspicious/noExplicitAny: the harness is tool-shape-agnostic by design
type AnyTool = { handler: (input: any, signal?: AbortSignal) => Promise<{ textContent: unknown }> };
// biome-ignore lint/suspicious/noExplicitAny: same
type AnySchema = { safeParse: (input: unknown) => { success: true; data: any } | { success: false; error: { issues: unknown } } };

export async function runHarness(tool: AnyTool, inputSchema: AnySchema): Promise<void> {
  const write = (payload: unknown): void => {
    process.stdout.write(JSON.stringify(payload));
  };

  if (process.argv.includes('--tool-spec')) {
    write(toWireTool(tool as Parameters<typeof toWireTool>[0]));
    process.exit(0);
  }

  const readStdin = async (): Promise<string> => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
  };

  const fail = (payload: unknown): never => {
    write(payload);
    process.exit(1);
  };

  const raw = await readStdin();

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    fail({ error: 'invalid JSON', message: (err as Error).message });
  }

  const parsed = inputSchema.safeParse(json);
  if (!parsed.success) {
    fail({ error: 'invalid input', issues: parsed.error.issues });
  }

  try {
    const timeout = (parsed as { data: { timeout?: number } }).data.timeout;
    const signal = timeout != null ? AbortSignal.timeout(timeout) : undefined;
    const { textContent } = await tool.handler((parsed as { data: unknown }).data, signal);
    write(textContent);
  } catch (err) {
    fail({ error: 'handler threw', name: (err as Error).name, message: (err as Error).message });
  }
}
