// tool-sea entry for ExecV2 — same harness contract as main.ts (ExecV3):
// --tool-spec emits the tool's own wire spec, default mode runs the real
// handler. Rules-free (empty list): builtinRules is the CLI's permission
// layer, not the tool; the sandbox container is the boundary here.
import { createExecV2 } from '../../../packages/claude-sdk-tools/src/ExecV2/ExecV2';
import { ExecV2InputSchema } from '../../../packages/claude-sdk-tools/src/ExecV2/schema';
import { executor } from '../../../packages/claude-sdk-tools/src/exec-shared';
import { nodeFs } from '../../../packages/claude-sdk-tools/src/fs/nodeFs';
import { runHarness } from './harness';

const tool = createExecV2(nodeFs, executor, []);
await runHarness(tool, ExecV2InputSchema);
