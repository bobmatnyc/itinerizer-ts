import { Command } from 'commander';
import { VERSION } from './utils/version.js';

/**
 * Itinerizer - A modern CLI tool for managing travel itineraries
 */
const program = new Command();

program
  .name('itinerizer')
  .description('A modern CLI tool for managing travel itineraries')
  .version(VERSION, '-v, --version', 'Display version information');

/**
 * Setup command - Initialize itinerizer configuration
 */
program
  .command('setup')
  .description('Initialize itinerizer configuration')
  .action(() => {
    console.log('Setting up itinerizer...');
    console.log('TODO: Implement setup command');
  });

/**
 * Itinerary command - Manage travel itineraries
 */
const itineraryCmd = program
  .command('itinerary')
  .alias('itin')
  .description('Manage travel itineraries');

itineraryCmd
  .command('create')
  .description('Create a new itinerary')
  .action(() => {
    console.log('Creating new itinerary...');
    console.log('TODO: Implement itinerary create command');
  });

itineraryCmd
  .command('list')
  .description('List all itineraries')
  .action(() => {
    console.log('Listing itineraries...');
    console.log('TODO: Implement itinerary list command');
  });

itineraryCmd
  .command('show <id>')
  .description('Show itinerary details')
  .action((id: string) => {
    console.log(`Showing itinerary: ${id}`);
    console.log('TODO: Implement itinerary show command');
  });

/**
 * Demo command - Run interactive demo
 */
program
  .command('demo')
  .description('Run an interactive demo of itinerizer')
  .action(() => {
    console.log('Running demo...');
    console.log('TODO: Implement demo command');
  });

/**
 * Doctor command - Diagnose installation and configuration
 */
program
  .command('doctor')
  .description('Check itinerizer installation and configuration')
  .action(() => {
    console.log('Running diagnostics...');
    console.log(`Version: ${VERSION}`);
    console.log('TODO: Implement doctor command');
  });

/**
 * Parse command line arguments and execute
 */
program.parse();
