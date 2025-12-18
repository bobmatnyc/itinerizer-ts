/**
 * Import costs command - show cost tracking summary
 * @module cli/commands/import/costs
 */

import * as p from '@clack/prompts';
import { Command } from 'commander';
import { CostTrackerService } from '../../../services/cost-tracker.service.js';
import { YamlConfigStorage } from '../../../storage/yaml-config.js';
import { colors, printError, printWarning } from '../../output/colors.js';

/**
 * Create the import costs command
 */
export function importCostsCommand(): Command {
  return new Command('costs')
    .description('Show cost tracking summary')
    .option('--clear', 'Clear all cost tracking data', false)
    .option('--json', 'Output as JSON', false)
    .action(async (options) => {
      p.intro(colors.heading('Import Costs'));

      // Get config for cost log path
      const configStorage = new YamlConfigStorage();
      await configStorage.initialize();

      const configResult = await configStorage.getConfig();
      const costLogPath = configResult.success
        ? configResult.value.costTracking?.logPath ?? './data/imports/cost-log.json'
        : './data/imports/cost-log.json';

      const costTracker = new CostTrackerService(costLogPath, true);
      await costTracker.initialize();

      // Clear if requested
      if (options.clear) {
        const confirm = await p.confirm({
          message: 'Are you sure you want to clear all cost tracking data?',
        });

        if (confirm) {
          await costTracker.clear();
          console.log(colors.green('✓ Cost tracking data cleared'));
        }
        return;
      }

      // Get summary
      const summaryResult = await costTracker.getSummary();
      if (!summaryResult.success) {
        printError('Failed to get cost summary');
        process.exit(1);
      }

      const summary = summaryResult.value;

      if (options.json) {
        // JSON output
        const jsonOutput = {
          totalCostUSD: summary.totalCostUSD,
          totalInputTokens: summary.totalInputTokens,
          totalOutputTokens: summary.totalOutputTokens,
          requestCount: summary.requestCount,
          byModel: Object.fromEntries(summary.byModel),
          recentEntries: summary.recentEntries,
        };
        console.log(JSON.stringify(jsonOutput, null, 2));
        return;
      }

      // Show summary
      if (summary.requestCount === 0) {
        printWarning('No import costs recorded yet');
        p.outro('Run some imports to track costs');
        return;
      }

      console.log();
      console.log(colors.heading('Overall Summary'));
      console.log(`  Total Cost: ${colors.green('$' + summary.totalCostUSD.toFixed(4))}`);
      console.log(`  Total Requests: ${colors.yellow(summary.requestCount.toString())}`);
      console.log(`  Total Input Tokens: ${colors.cyan(summary.totalInputTokens.toLocaleString())}`);
      console.log(`  Total Output Tokens: ${colors.cyan(summary.totalOutputTokens.toLocaleString())}`);
      console.log();

      // Show by model
      if (summary.byModel.size > 0) {
        console.log(colors.heading('Cost by Model'));

        // Sort by cost descending
        const modelEntries = Array.from(summary.byModel.entries()).sort(
          (a, b) => b[1].costUSD - a[1].costUSD
        );

        for (const [model, stats] of modelEntries) {
          console.log(`  ${colors.cyan(model)}`);
          console.log(`    Cost: ${colors.green('$' + stats.costUSD.toFixed(4))}`);
          console.log(`    Requests: ${colors.yellow(stats.requestCount.toString())}`);
          console.log(
            `    Tokens: ${colors.dim(
              `${stats.inputTokens.toLocaleString()} in / ${stats.outputTokens.toLocaleString()} out`
            )}`
          );
        }
        console.log();
      }

      // Show recent entries
      if (summary.recentEntries.length > 0) {
        console.log(colors.heading('Recent Requests'));
        console.log();

        for (const entry of summary.recentEntries.slice(-5).reverse()) {
          const date = new Date(entry.timestamp);
          const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
          const status = entry.success ? colors.green('✓') : colors.red('✗');

          console.log(
            `  ${status} ${colors.dim(dateStr)} ${colors.cyan(entry.model)} ` +
              `${colors.green('$' + entry.costUSD.toFixed(4))}`
          );
          if (entry.sourceFile) {
            console.log(`    ${colors.dim(entry.sourceFile)}`);
          }
        }
      }

      p.outro(`Tracking ${summary.requestCount} requests`);
    });
}
