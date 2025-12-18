/**
 * Import file command
 * @module cli/commands/import/file
 */

import * as p from '@clack/prompts';
import { Command } from 'commander';
import { DocumentImportService } from '../../../services/document-import.service.js';
import { ItineraryService } from '../../../services/itinerary.service.js';
import { JsonItineraryStorage } from '../../../storage/json-storage.js';
import { YamlConfigStorage } from '../../../storage/yaml-config.js';
import { colors, printError, printSuccess, printWarning } from '../../output/colors.js';
import { formatItinerary } from '../../output/formatters.js';

/**
 * Create the import file command
 */
export function importFileCommand(): Command {
  return new Command('file')
    .argument('<path>', 'Path to PDF file')
    .description('Import a PDF itinerary into JSON')
    .option('-m, --model <model>', 'LLM model to use')
    .option('--no-save', 'Do not save to storage after import')
    .option('--raw', 'Show raw JSON output', false)
    .action(async (path, options) => {
      p.intro(colors.heading('Import PDF'));

      // Load configuration
      const configStorage = new YamlConfigStorage();
      await configStorage.initialize();

      const configResult = await configStorage.getImportConfig();
      if (!configResult.success) {
        printError('Import not configured. Run: itinerizer import config --set-key <key>');
        printError(configResult.error.message);
        process.exit(1);
      }

      const config = configResult.value;

      // Initialize services
      let itineraryService: ItineraryService | undefined;
      if (options.save) {
        const storage = new JsonItineraryStorage();
        await storage.initialize();
        itineraryService = new ItineraryService(storage);
      }

      const importService = new DocumentImportService(config, itineraryService);
      await importService.initialize();

      // Check configuration
      const spinner = p.spinner();
      spinner.start('Checking API connection...');

      const checkResult = await importService.checkConfiguration();
      if (!checkResult.success) {
        spinner.stop('API connection failed');
        printError(checkResult.error.message);
        process.exit(1);
      }

      spinner.stop('API connection OK');

      // Import the file
      spinner.start(`Importing ${path}...`);

      const model = options.model ?? config.defaultModel;
      const result = await importService.importWithValidation(path, {
        model,
        saveToStorage: options.save,
        validateContinuity: true,
      });

      if (!result.success) {
        spinner.stop('Import failed');
        printError(result.error.message);
        if ('details' in result.error && result.error.details) {
          const details = result.error.details as Record<string, unknown>;
          // Show validation errors if available
          if (details.errors) {
            console.log();
            console.log(colors.heading('Validation Errors:'));
            const errors = details.errors as Array<{path: string[]; message: string}>;
            for (const err of errors.slice(0, 5)) {
              console.log(`  ${colors.red('•')} ${err.path?.join('.') || 'root'}: ${err.message}`);
            }
            if (errors.length > 5) {
              console.log(colors.dim(`  ... and ${errors.length - 5} more errors`));
            }
          }
          // Show raw response for debugging if verbose
          if (details.rawResponse && process.env.DEBUG) {
            console.log();
            console.log(colors.heading('Raw LLM Response:'));
            console.log(colors.dim(String(details.rawResponse).slice(0, 500) + '...'));
          }
        }
        process.exit(1);
      }

      spinner.stop('Import complete');

      const { parsedItinerary, usage, continuityValidation } = result.value;

      // Show results
      if (options.raw) {
        console.log(JSON.stringify(parsedItinerary, null, 2));
      } else {
        printSuccess('Itinerary parsed successfully!');
        console.log();
        console.log(formatItinerary(parsedItinerary));
      }

      // Show usage
      console.log();
      console.log(colors.heading('Usage'));
      console.log(`  Model: ${colors.cyan(usage.model)}`);
      console.log(`  Input tokens: ${colors.yellow(usage.inputTokens.toString())}`);
      console.log(`  Output tokens: ${colors.yellow(usage.outputTokens.toString())}`);
      console.log(`  Cost: ${colors.green('$' + usage.costUSD.toFixed(4))}`);

      // Show geographic continuity validation
      if (continuityValidation) {
        console.log();
        if (continuityValidation.valid) {
          console.log(colors.green('✓ Geographic Continuity: Valid'));
          console.log(colors.dim(`  All ${continuityValidation.segmentCount} segments are geographically connected`));
        } else {
          console.log(colors.yellow('⚠ Geographic Continuity: Gaps Detected'));
          console.log();
          for (const gap of continuityValidation.gaps) {
            const icon = gap.suggestedType === 'FLIGHT' ? '✈️' : '🚗';
            console.log(colors.yellow(`  ${icon} ${gap.description}`));
            console.log(colors.dim(`     Classification: ${gap.gapType}`));
            console.log(colors.dim(`     Suggested: Add ${gap.suggestedType} segment`));
            console.log();
          }
        }

        // Show inferred segments if any
        const inferredSegments = parsedItinerary.segments.filter(s => s.inferred);
        if (inferredSegments.length > 0) {
          console.log(colors.cyan(`ℹ ${inferredSegments.length} segment(s) were auto-inferred:`));
          for (const seg of inferredSegments) {
            console.log(colors.dim(`  • ${seg.type}: ${seg.inferredReason || 'Geographic gap'}`));
          }
          console.log();
        }
      }

      if (options.save) {
        printSuccess('Saved to storage');
      } else {
        printWarning('Not saved to storage (use --save to persist)');
      }

      p.outro(`Import ID: ${result.value.id}`);
    });
}
