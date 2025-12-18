/**
 * View command - render itineraries in various formats
 * @module cli/commands/view
 */

import * as p from '@clack/prompts';
import { Command } from 'commander';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { JsonItineraryStorage } from '../../storage/json-storage.js';
import { ViewerService } from '../../services/viewer.service.js';
import { HierarchicalViewer } from '../../services/viewers/hierarchical.viewer.js';
import type { ViewerConfig, ViewerType, ViewerOutputFormat } from '../../domain/types/viewer.js';
import { colors, printError, printSuccess, printInfo } from '../output/colors.js';

/**
 * Create the view command
 */
export function viewCommand(): Command {
  return new Command('view')
    .description('View itinerary in various formats')
    .argument('[id]', 'Itinerary ID (uses working itinerary if not provided)')
    .option('-t, --type <type>', 'Viewer type (hierarchical, calendar, map, timeline)', 'hierarchical')
    .option('-f, --format <format>', 'Output format (html, json, markdown)', 'html')
    .option('-o, --output <path>', 'Output file path (displays in terminal if not provided)')
    .option('--theme <theme>', 'Theme (light, dark)', 'light')
    .option('--no-collapsible', 'Disable collapsible sections')
    .option('--no-inline-styles', 'Separate CSS from HTML')
    .option('--open', 'Open HTML in browser after generating')
    .action(async (id, options) => {
      p.intro(colors.heading('View Itinerary'));

      // Initialize storage
      const storage = new JsonItineraryStorage();
      await storage.initialize();

      // Get itinerary ID
      let itineraryId = id;
      if (!itineraryId) {
        // List available itineraries
        const listResult = await storage.list();
        if (!listResult.success) {
          printError('Failed to list itineraries');
          process.exit(1);
        }

        if (listResult.value.length === 0) {
          printError('No itineraries found. Import a PDF first.');
          process.exit(1);
        }

        const selected = await p.select({
          message: 'Select an itinerary to view:',
          options: listResult.value.slice(0, 10).map((i) => ({
            value: i.id,
            label: `${i.title} (${i.segmentCount} segments)`,
            hint: i.status,
          })),
        });

        if (p.isCancel(selected)) {
          p.cancel('Cancelled');
          process.exit(0);
        }

        itineraryId = selected as string;
      }

      // Load itinerary
      const loadResult = await storage.load(itineraryId);
      if (!loadResult.success) {
        printError(`Itinerary not found: ${itineraryId}`);
        process.exit(1);
      }

      const itinerary = loadResult.value;
      printInfo(`Loaded: ${itinerary.title}`);

      // Initialize viewer service with plugins
      const viewerService = new ViewerService();
      viewerService.registerPlugin(new HierarchicalViewer());
      // Future: viewerService.registerPlugin(new CalendarViewer());
      // Future: viewerService.registerPlugin(new MapViewer());

      // Check if viewer type is available
      const viewerType = options.type as ViewerType;
      const plugin = viewerService.getPlugin(viewerType);
      if (!plugin) {
        const available = viewerService.getPlugins().map((p) => p.id).join(', ');
        printError(`Viewer type '${viewerType}' not available. Available: ${available}`);
        process.exit(1);
      }

      // Build config
      const config: ViewerConfig = {
        type: viewerType,
        format: options.format as ViewerOutputFormat,
        theme: options.theme,
        collapsible: options.collapsible !== false,
        inlineStyles: options.inlineStyles !== false,
        showDetails: true,
        groupByDay: true,
      };

      // Render
      const spinner = p.spinner();
      spinner.start(`Rendering ${viewerType} view...`);

      try {
        const output = await viewerService.render(itinerary, config);
        spinner.stop('Rendered successfully');

        if (options.output) {
          // Write to file
          const outputPath = resolve(options.output);
          await mkdir(dirname(outputPath), { recursive: true });
          await writeFile(outputPath, output.content, 'utf-8');
          printSuccess(`Saved to: ${outputPath}`);

          // Open in browser if requested
          if (options.open && config.format === 'html') {
            const open = await import('open').then((m) => m.default).catch(() => null);
            if (open) {
              await open(outputPath);
              printInfo('Opened in browser');
            } else {
              printInfo(`Open in browser: file://${outputPath}`);
            }
          }
        } else {
          // Display in terminal
          if (config.format === 'html') {
            // For HTML, save to temp file and show path
            const tempPath = `/tmp/itinerary-${itineraryId}.html`;
            await writeFile(tempPath, output.content, 'utf-8');
            printSuccess(`HTML saved to: ${tempPath}`);
            console.log();
            console.log(colors.dim('Open in browser to view, or use --output to save elsewhere'));

            // Try to open
            if (options.open) {
              const open = await import('open').then((m) => m.default).catch(() => null);
              if (open) {
                await open(tempPath);
              }
            }
          } else {
            // For JSON/Markdown, print to console
            console.log();
            console.log(output.content);
          }
        }

        // Show metadata
        console.log();
        console.log(colors.dim(`Generated: ${output.metadata.generatedAt.toISOString()}`));
        console.log(colors.dim(`Days: ${output.metadata.dayCount} | Segments: ${output.metadata.segmentCount}`));

        p.outro('View complete');
      } catch (error) {
        spinner.stop('Render failed');
        printError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * List available viewers
 */
export function viewersCommand(): Command {
  return new Command('viewers')
    .description('List available viewer types')
    .action(() => {
      const viewerService = new ViewerService();
      viewerService.registerPlugin(new HierarchicalViewer());

      console.log(colors.heading('Available Viewers'));
      console.log();

      for (const plugin of viewerService.getPlugins()) {
        console.log(`  ${colors.cyan(plugin.id)}`);
        console.log(`    ${plugin.description}`);
        console.log(`    Formats: ${plugin.supportedFormats.join(', ')}`);
        console.log();
      }
    });
}

/**
 * View all itineraries as a gallery
 */
export function viewAllCommand(): Command {
  return new Command('view-all')
    .description('View all itineraries as an HTML gallery')
    .option('-o, --output <path>', 'Output file path', '/tmp/itinerary-gallery.html')
    .option('--theme <theme>', 'Theme (light, dark)', 'light')
    .option('--open', 'Open HTML in browser after generating')
    .action(async (options) => {
      p.intro(colors.heading('Itinerary Gallery'));

      // Initialize storage
      const storage = new JsonItineraryStorage();
      await storage.initialize();

      // Initialize viewer service
      const viewerService = new ViewerService();
      viewerService.registerPlugin(new HierarchicalViewer());

      // List all itineraries
      const listResult = await storage.list();
      if (!listResult.success) {
        printError('Failed to list itineraries');
        process.exit(1);
      }

      if (listResult.value.length === 0) {
        printError('No itineraries found. Import a PDF first.');
        process.exit(1);
      }

      const spinner = p.spinner();
      spinner.start('Generating gallery...');

      // Load all itineraries
      const itineraries = [];
      for (const summary of listResult.value) {
        const loadResult = await storage.load(summary.id);
        if (loadResult.success) {
          itineraries.push(loadResult.value);
        }
      }

      // Generate individual HTML files and gallery
      const galleryDir = dirname(resolve(options.output));
      await mkdir(galleryDir, { recursive: true });

      const itineraryLinks = [];
      for (const itinerary of itineraries) {
        // Generate individual view
        const config: ViewerConfig = {
          type: 'hierarchical',
          format: 'html',
          theme: options.theme,
          collapsible: true,
          inlineStyles: true,
          showDetails: true,
          groupByDay: true,
        };

        const output = await viewerService.render(itinerary, config);
        const filename = `itinerary-${itinerary.id}.html`;
        const filepath = resolve(galleryDir, filename);
        await writeFile(filepath, output.content, 'utf-8');

        itineraryLinks.push({
          id: itinerary.id,
          title: itinerary.title,
          description: itinerary.description || '',
          status: itinerary.status,
          startDate: itinerary.startDate,
          endDate: itinerary.endDate,
          segmentCount: itinerary.segments?.length || 0,
          filename,
        });
      }

      // Generate gallery HTML
      const galleryHtml = generateGalleryHtml(itineraryLinks, options.theme);
      const outputPath = resolve(options.output);
      await writeFile(outputPath, galleryHtml, 'utf-8');

      spinner.stop('Gallery generated');
      printSuccess(`Gallery saved to: ${outputPath}`);
      printInfo(`Generated ${itineraries.length} itinerary views`);

      // Open in browser if requested
      if (options.open) {
        const open = await import('open').then((m) => m.default).catch(() => null);
        if (open) {
          await open(outputPath);
          printInfo('Opened in browser');
        }
      }

      p.outro('Gallery complete');
    });
}

/**
 * Generate HTML for the gallery page with two-pane layout
 */
function generateGalleryHtml(
  itineraries: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    startDate: Date;
    endDate: Date;
    segmentCount: number;
    filename: string;
  }>,
  theme: string
): string {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const navItems = itineraries
    .map(
      (it, index) => `
    <div class="nav-item ${index === 0 ? 'active' : ''}" data-src="${it.filename}" data-id="${it.id}">
      <div class="nav-item-title">${it.title}</div>
      <div class="nav-item-meta">
        <span class="status-badge status-${it.status}">${it.status}</span>
        <span>${formatDate(it.startDate)}</span>
      </div>
      <div class="nav-item-stats">📍 ${it.segmentCount} segments</div>
    </div>
  `
    )
    .join('\n');

  const firstItinerary = itineraries[0]?.filename || '';

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Itinerary Viewer</title>
  <style>
:root {
  --bg-primary: ${theme === 'dark' ? '#1a1a2e' : '#f8fafc'};
  --bg-sidebar: ${theme === 'dark' ? '#0f0f1a' : '#ffffff'};
  --bg-card: ${theme === 'dark' ? '#16213e' : '#ffffff'};
  --text-primary: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'};
  --text-secondary: ${theme === 'dark' ? '#94a3b8' : '#64748b'};
  --border-color: ${theme === 'dark' ? '#334155' : '#e2e8f0'};
  --accent-color: #3b82f6;
  --hover-bg: ${theme === 'dark' ? '#1e293b' : '#f1f5f9'};
  --active-bg: ${theme === 'dark' ? '#1e3a5f' : '#dbeafe'};
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  display: flex;
}

/* Sidebar Navigation */
.sidebar {
  width: 320px;
  min-width: 320px;
  height: 100vh;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-sidebar);
}

.sidebar-header h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sidebar-header p {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.nav-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.nav-item {
  padding: 0.875rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 0.375rem;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.nav-item:hover {
  background: var(--hover-bg);
}

.nav-item.active {
  background: var(--active-bg);
  border-color: var(--accent-color);
}

.nav-item-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.nav-item-stats {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.status-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-DRAFT { background: #fef3c7; color: #92400e; }
.status-PLANNED { background: #dbeafe; color: #1e40af; }
.status-CONFIRMED { background: #d1fae5; color: #065f46; }
.status-IN_PROGRESS { background: #e0e7ff; color: #3730a3; }
.status-COMPLETED { background: #f3f4f6; color: #374151; }
.status-CANCELLED { background: #fee2e2; color: #991b1b; }

/* Main Content */
.main-content {
  flex: 1;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

.content-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem;
}

.empty-state-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

/* Keyboard shortcuts hint */
.keyboard-hint {
  padding: 0.75rem 1rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-color);
  background: var(--bg-sidebar);
}

.keyboard-hint kbd {
  background: var(--border-color);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.65rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    min-width: 100%;
    height: auto;
    max-height: 40vh;
  }

  body {
    flex-direction: column;
  }

  .main-content {
    height: 60vh;
  }
}
  </style>
</head>
<body>
  <nav class="sidebar">
    <header class="sidebar-header">
      <h1>🌍 Itineraries</h1>
      <p>${itineraries.length} trip${itineraries.length === 1 ? '' : 's'}</p>
    </header>

    <div class="nav-list">
      ${navItems}
    </div>

    <div class="keyboard-hint">
      <kbd>↑</kbd> <kbd>↓</kbd> Navigate &nbsp;&bull;&nbsp; <kbd>Enter</kbd> Select
    </div>
  </nav>

  <main class="main-content">
    ${itineraries.length > 0
      ? `<iframe class="content-frame" src="${firstItinerary}" title="Itinerary Viewer"></iframe>`
      : `<div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">No Itineraries</div>
          <p>Import a PDF to get started</p>
        </div>`
    }
  </main>

  <script>
document.addEventListener('DOMContentLoaded', function() {
  const navItems = document.querySelectorAll('.nav-item');
  const iframe = document.querySelector('.content-frame');
  let currentIndex = 0;

  // Click handler for nav items
  navItems.forEach((item, index) => {
    item.addEventListener('click', function() {
      selectItem(index);
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      selectItem(Math.min(currentIndex + 1, navItems.length - 1));
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      selectItem(Math.max(currentIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Already selected, but could trigger additional action
    }
  });

  function selectItem(index) {
    // Remove active class from all items
    navItems.forEach(item => item.classList.remove('active'));

    // Add active class to selected item
    navItems[index].classList.add('active');
    currentIndex = index;

    // Update iframe src
    const src = navItems[index].getAttribute('data-src');
    if (iframe && src) {
      iframe.src = src;
    }

    // Scroll item into view if needed
    navItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
  </script>
</body>
</html>`;
}
