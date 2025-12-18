/**
 * Import preview command - shows markdown without LLM processing
 * @module cli/commands/import/preview
 */

import * as p from '@clack/prompts';
import { Command } from 'commander';
import { MarkdownConverterService } from '../../../services/markdown-converter.service.js';
import { PDFExtractorService } from '../../../services/pdf-extractor.service.js';
import { colors, printError } from '../../output/colors.js';

/**
 * Create the import preview command
 */
export function importPreviewCommand(): Command {
  return new Command('preview')
    .argument('<path>', 'Path to PDF file')
    .description('Preview PDF extraction without LLM processing')
    .option('--raw', 'Show raw extracted text instead of markdown', false)
    .option('--confidence', 'Show confidence scores', false)
    .action(async (path, options) => {
      p.intro(colors.heading('Preview Import'));

      const pdfExtractor = new PDFExtractorService();
      const markdownConverter = new MarkdownConverterService();

      // Extract text
      const spinner = p.spinner();
      spinner.start(`Extracting text from ${path}...`);

      const extractResult = await pdfExtractor.extract(path);
      if (!extractResult.success) {
        spinner.stop('Extraction failed');
        printError(extractResult.error.message);
        process.exit(1);
      }

      const { text, pages, metadata } = extractResult.value;
      spinner.stop('Extraction complete');

      // Show metadata
      console.log();
      console.log(colors.heading('PDF Metadata'));
      console.log(`  Pages: ${colors.yellow(pages.toString())}`);
      if (metadata.title) {
        console.log(`  Title: ${colors.cyan(metadata.title)}`);
      }
      if (metadata.author) {
        console.log(`  Author: ${colors.cyan(metadata.author)}`);
      }
      console.log(`  Characters: ${colors.yellow(text.length.toString())}`);
      console.log();

      if (options.raw) {
        // Show raw text
        console.log(colors.heading('Raw Text'));
        console.log(colors.dim('─'.repeat(60)));
        console.log(text);
        console.log(colors.dim('─'.repeat(60)));
      } else {
        // Convert to markdown
        spinner.start('Converting to structured markdown...');
        const structured = markdownConverter.convert(text);
        spinner.stop('Conversion complete');

        // Show confidence scores if requested
        if (options.confidence) {
          console.log(colors.heading('Confidence Scores'));
          console.log(`  Title: ${formatConfidence(structured.confidence.title)}`);
          console.log(`  Dates: ${formatConfidence(structured.confidence.dates)}`);
          console.log(`  Flights: ${formatConfidence(structured.confidence.flights)}`);
          console.log(`  Hotels: ${formatConfidence(structured.confidence.hotels)}`);
          console.log(`  Activities: ${formatConfidence(structured.confidence.activities)}`);
          console.log();
        }

        // Show date range
        if (structured.dateRange?.start || structured.dateRange?.end) {
          console.log(colors.heading('Detected Date Range'));
          if (structured.dateRange.start) {
            console.log(`  Start: ${colors.cyan(structured.dateRange.start.toDateString())}`);
          }
          if (structured.dateRange.end) {
            console.log(`  End: ${colors.cyan(structured.dateRange.end.toDateString())}`);
          }
          console.log();
        }

        // Show sections summary
        console.log(colors.heading('Detected Sections'));
        const sectionCounts = new Map<string, number>();
        for (const section of structured.sections) {
          const count = sectionCounts.get(section.type) ?? 0;
          sectionCounts.set(section.type, count + 1);
        }
        for (const [type, count] of sectionCounts) {
          console.log(`  ${type}: ${colors.yellow(count.toString())}`);
        }
        console.log();

        // Show markdown
        console.log(colors.heading('Structured Markdown'));
        console.log(colors.dim('─'.repeat(60)));
        console.log(structured.markdown);
        console.log(colors.dim('─'.repeat(60)));
      }

      p.outro('Preview complete');
    });
}

/**
 * Format confidence score with color
 */
function formatConfidence(score: number): string {
  const percentage = Math.round(score * 100);
  const bar = '█'.repeat(Math.round(score * 10)) + '░'.repeat(10 - Math.round(score * 10));

  if (score >= 0.7) {
    return colors.green(`${bar} ${percentage}%`);
  } else if (score >= 0.4) {
    return colors.yellow(`${bar} ${percentage}%`);
  } else {
    return colors.red(`${bar} ${percentage}%`);
  }
}
