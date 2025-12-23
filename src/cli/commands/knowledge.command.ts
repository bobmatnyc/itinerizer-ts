/**
 * Knowledge command router
 * @module cli/commands/knowledge
 */

import { Command } from 'commander';
import { ingestCommand } from './knowledge/ingest.js';
import { searchCommand } from './knowledge/search.js';
import { statsCommand } from './knowledge/stats.js';

/**
 * Create the knowledge command with all subcommands
 * @returns Configured knowledge command
 */
export function knowledgeCommand(): Command {
  const cmd = new Command('knowledge')
    .alias('kb')
    .description('Manage the knowledge base');

  cmd.addCommand(ingestCommand());
  cmd.addCommand(searchCommand());
  cmd.addCommand(statsCommand());

  return cmd;
}
