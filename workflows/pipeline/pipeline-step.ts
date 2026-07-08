import { RunContext } from "./run-context";

export interface PipelineStepSnapshot {
  delayMs?: number;
}

export interface PipelineStep {
  readonly name: string;
  readonly snapshot?: boolean | PipelineStepSnapshot;
  execute(ctx: RunContext): Promise<void>;
  afterSnapshot?: (ctx: RunContext) => Promise<void>;
}
