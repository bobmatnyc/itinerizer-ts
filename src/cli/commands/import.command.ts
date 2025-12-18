/**
 * Import command router
 * @module cli/commands/import
 */

import { Command } from 'commander';
import { importFileCommand } from './import/file.js';
import { importPreviewCommand } from './import/preview.js';
import { importCostsCommand } from './import/costs.js';
import { importTestModelsCommand } from './import/test-models.js';
import { importConfigCommand } from './import/config.js';

/**
 * Create the import command with all subcommands
 * @returns Configured import command
 */
export function importCommand(): Command {
  const cmd = new Command('import')
    .alias('im')
    .description('Import documents into itineraries');

  cmd.addCommand(importFileCommand());
  cmd.addCommand(importPreviewCommand());
  cmd.addCommand(importCostsCommand());
  cmd.addCommand(importTestModelsCommand());
  cmd.addCommand(importConfigCommand());

  return cmd;
}
