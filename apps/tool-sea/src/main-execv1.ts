// tool-sea entry for Exec (v1) — same harness contract as main.ts (ExecV3):
// --tool-spec emits the tool's own wire spec, default mode runs the real
// handler. Rules-free (empty list): builtinRules is the CLI's permission
// layer, not the tool; the sandbox container is the boundary here.
import { createExec } from '../../../packages/claude-sdk-tools/src/Exec/Exec';
import { ExecInputSchema } from '../../../packages/claude-sdk-tools/src/Exec/schema';
import { executor } from '../../../packages/claude-sdk-tools/src/exec-shared';
import { nodeFs } from '../../../packages/claude-sdk-tools/src/fs/nodeFs';
import { runHarness } from './harness';

const tool = createExec(nodeFs, executor, []);
await runHarness(tool, ExecInputSchema);
