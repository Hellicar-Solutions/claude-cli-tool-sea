// tool-sea — packages one real claude-cli tool as a stdio single-executable, so
// a benchmark scaffold can hand the model the ACTUAL tool (its own wire spec and
// its own handler), not a re-implementation. Built for the structured-execution
// experiment (ExecV3), but the tool is a single swap point for reuse.
//
// Two modes on one binary:
//   --tool-spec : print the tool's production wire spec (toWireTool) — name,
//                 description, input_schema (from the zod schema), input_examples.
//                 This is byte-for-byte what the CLI sends the API, so the model
//                 reads the real documentation, never a transcription.
//   (default)   : read one tool input as JSON on stdin, run the REAL handler,
//                 write its textContent as JSON on stdout.
//
// The ONLY thing dropped is builtinRules — that is the CLI's permission layer,
// not part of the tool; here the sandbox container is the boundary. Passing an
// empty rules list keeps the real handler (normaliseCommands, engine, stripAnsi,
// output shape) intact. Input validation is KEPT: it is the tool's contract, so
// a malformed spec is rejected structurally and the model self-corrects.
// Imported by source path (not package export): the SEA bundles from source, and
// the rules-free instance needs createExecV3 + executor, which the package's
// public exports do not expose.
import { toWireTool } from '../../../packages/claude-sdk/src/index';
import { createExecV3 } from '../../../packages/claude-sdk-tools/src/ExecV3/ExecV3';
import { ExecV3InputSchema } from '../../../packages/claude-sdk-tools/src/ExecV3/schema';
import { executor } from '../../../packages/claude-sdk-tools/src/exec-shared';
import { nodeFs } from '../../../packages/claude-sdk-tools/src/fs/nodeFs';

// The tool under test, built exactly as production does — minus the CLI-only
// permission rules (empty list). Swap this one line to harness another tool.
const tool = createExecV3(nodeFs, executor, []);
const inputSchema = ExecV3InputSchema;

const write = (payload: unknown): void => {
  process.stdout.write(JSON.stringify(payload));
};

if (process.argv.includes('--tool-spec')) {
  write(toWireTool(tool));
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
  fail({ error: 'invalid ExecV3 input', issues: parsed.error.issues });
}

try {
  const { textContent } = await tool.handler(parsed.data, AbortSignal.timeout(parsed.data.timeout));
  write(textContent);
} catch (err) {
  fail({ error: 'handler threw', name: (err as Error).name, message: (err as Error).message });
}
