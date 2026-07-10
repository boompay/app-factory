import { LoggerProvider } from "./services";
import {
  bootstrapRun,
  runApplicantPipeline,
  runCoApplicants,
} from "./workflows/pipeline";

const logger = LoggerProvider.create("application-runner");

export async function run(link: string): Promise<void> {
  try {
    const ctx = await bootstrapRun(link);
    await runApplicantPipeline(ctx);
    await runCoApplicants(ctx);
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    logger.error(`Error running application flow: ${message}`);
    throw error;
  }
}

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith("runner.ts") || process.argv[1].endsWith("runner"));

if (isDirectExecution) {
  const magicLink =
    process.argv[2] ||
    "https://screen.staging2.boompay.app/a/MCzt7UT5V2iZqbgRTSIv";
  run(magicLink).catch((error) => {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    logger.error(`Fatal error: ${message}`);
    process.exit(1);
  });
}
