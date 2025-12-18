/**
 * Hierarchical viewer plugin - collapsible day/segment view
 * @module services/viewers/hierarchical
 */

import type {
  ItineraryView,
  ViewerConfig,
  ViewerOutput,
  ViewerPlugin,
} from '../../domain/types/viewer.js';

/**
 * Hierarchical viewer - displays itinerary with collapsible sections
 */
export class HierarchicalViewer implements ViewerPlugin {
  readonly id = 'hierarchical' as const;
  readonly name = 'Hierarchical View';
  readonly description = 'Collapsible day-by-day view with segment details';
  readonly supportedFormats = ['html', 'json', 'markdown'] as const;

  async render(view: ItineraryView, config: ViewerConfig): Promise<ViewerOutput> {
    switch (config.format) {
      case 'json':
        return this.renderJson(view);
      case 'markdown':
        return this.renderMarkdown(view);
      case 'html':
      default:
        return this.renderHtml(view, config);
    }
  }

  /**
   * Render as JSON
   */
  private renderJson(view: ItineraryView): ViewerOutput {
    return {
      content: JSON.stringify(view, null, 2),
      contentType: 'application/json',
      viewerType: 'hierarchical',
      metadata: {
        generatedAt: new Date(),
        itineraryId: view.id,
        segmentCount: view.stats.totalSegments,
        dayCount: view.days.length,
      },
    };
  }

  /**
   * Render as Markdown
   */
  private renderMarkdown(view: ItineraryView): ViewerOutput {
    let md = `# ${view.title}\n\n`;

    if (view.description) {
      md += `${view.description}\n\n`;
    }

    md += `**Dates:** ${view.dateRange}\n`;
    md += `**Duration:** ${view.durationDays} days\n`;
    md += `**Destinations:** ${view.destinations.join(', ')}\n`;
    md += `**Status:** ${view.status}\n\n`;

    // Stats
    md += `## Overview\n\n`;
    md += `- ✈️ ${view.stats.flights} flights\n`;
    md += `- 🏨 ${view.stats.hotels} hotels\n`;
    md += `- 🎯 ${view.stats.activities} activities\n`;
    md += `- 🚗 ${view.stats.transfers} transfers\n\n`;

    // Days
    for (const day of view.days) {
      md += `## ${day.title}\n\n`;
      md += `*${day.dateFormatted}*\n\n`;

      for (const segment of day.segments) {
        md += `### ${segment.icon} ${segment.title}\n\n`;
        md += `${segment.timeRange} | ${segment.status}\n\n`;

        if (segment.details.length > 0) {
          for (const detail of segment.details) {
            md += `- ${detail}\n`;
          }
          md += '\n';
        }
      }
    }

    // Metadata
    md += `---\n\n`;
    md += `*Generated: ${new Date().toISOString()}*\n`;
    md += `*Version: ${view.metadata.version}*\n`;

    return {
      content: md,
      contentType: 'text/markdown',
      viewerType: 'hierarchical',
      metadata: {
        generatedAt: new Date(),
        itineraryId: view.id,
        segmentCount: view.stats.totalSegments,
        dayCount: view.days.length,
      },
    };
  }

  /**
   * Render as HTML with inline styles and JS
   */
  private renderHtml(view: ItineraryView, config: ViewerConfig): ViewerOutput {
    const theme = config.theme || 'light';
    const collapsible = config.collapsible !== false;

    const css = this.generateCss(theme);
    const js = collapsible ? this.generateJs() : '';
    const body = this.generateBody(view, config);

    const html = `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(view.title)} - Itinerary</title>
  ${config.inlineStyles !== false ? `<style>${css}</style>` : ''}
  ${config.customCss ? `<link rel="stylesheet" href="${config.customCss}">` : ''}
</head>
<body>
  ${body}
  ${collapsible ? `<script>${js}</script>` : ''}
</body>
</html>`;

    return {
      content: html,
      contentType: 'text/html',
      viewerType: 'hierarchical',
      css: config.inlineStyles === false ? css : undefined,
      js: config.inlineStyles === false ? js : undefined,
      metadata: {
        generatedAt: new Date(),
        itineraryId: view.id,
        segmentCount: view.stats.totalSegments,
        dayCount: view.days.length,
      },
    };
  }

  /**
   * Generate CSS
   */
  private generateCss(theme: string): string {
    const isDark = theme === 'dark';

    return `
/* CSS Variables */
:root {
  --bg-primary: ${isDark ? '#1a1a2e' : '#ffffff'};
  --bg-secondary: ${isDark ? '#16213e' : '#f8f9fa'};
  --bg-card: ${isDark ? '#1f2937' : '#ffffff'};
  --text-primary: ${isDark ? '#e4e4e7' : '#1f2937'};
  --text-secondary: ${isDark ? '#a1a1aa' : '#6b7280'};
  --border-color: ${isDark ? '#374151' : '#e5e7eb'};
  --accent-color: #3b82f6;
  --accent-hover: #2563eb;
  --flight-color: #8b5cf6;
  --hotel-color: #10b981;
  --activity-color: #f59e0b;
  --transfer-color: #6366f1;
  --meeting-color: #ec4899;
  --shadow: ${isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)'};
}

/* Reset & Base */
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  padding: 2rem;
}

/* Container */
.itinerary-container {
  max-width: 900px;
  margin: 0 auto;
}

/* Header */
.itinerary-header {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
}

.itinerary-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.itinerary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.itinerary-meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-DRAFT { background: #fef3c7; color: #92400e; }
.status-PLANNED { background: #dbeafe; color: #1e40af; }
.status-CONFIRMED { background: #d1fae5; color: #065f46; }
.status-IN_PROGRESS { background: #e0e7ff; color: #3730a3; }
.status-COMPLETED { background: #f3f4f6; color: #374151; }
.status-CANCELLED { background: #fee2e2; color: #991b1b; }

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-color);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

/* Days */
.day-container {
  margin-bottom: 1.5rem;
}

.day-header {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.day-header:hover {
  background: var(--border-color);
}

.day-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.day-date {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.day-toggle {
  font-size: 1.2rem;
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.day-header.collapsed .day-toggle {
  transform: rotate(-90deg);
}

.day-content {
  padding: 1rem 0 0 1rem;
  border-left: 2px solid var(--border-color);
  margin-left: 1rem;
}

.day-content.hidden {
  display: none;
}

/* Segments */
.segment {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.segment-header {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  transition: background 0.2s;
}

.segment-header:hover {
  background: var(--bg-secondary);
}

.segment-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
}

.segment-info {
  flex: 1;
}

.segment-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.segment-summary {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.segment-time {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.segment-details {
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

.segment-details.hidden {
  display: none;
}

.segment-details ul {
  list-style: none;
  padding: 0;
}

.segment-details li {
  padding: 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  border-bottom: 1px solid var(--border-color);
}

.segment-details li:last-child {
  border-bottom: none;
}

/* Segment type indicators */
.segment-flight { border-left: 4px solid var(--flight-color); }
.segment-hotel { border-left: 4px solid var(--hotel-color); }
.segment-activity { border-left: 4px solid var(--activity-color); }
.segment-transfer { border-left: 4px solid var(--transfer-color); }
.segment-meeting { border-left: 4px solid var(--meeting-color); }

/* Footer */
.itinerary-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
}

/* Responsive */
@media (max-width: 600px) {
  body { padding: 1rem; }
  .itinerary-header { padding: 1.5rem; }
  .itinerary-title { font-size: 1.5rem; }
  .itinerary-meta { flex-direction: column; gap: 0.5rem; }
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
  .segment-header { flex-direction: column; }
  .segment-time { margin-top: 0.5rem; }
}
`;
  }

  /**
   * Generate JavaScript for collapsible behavior
   */
  private generateJs(): string {
    return `
document.addEventListener('DOMContentLoaded', function() {
  // Day collapse/expand
  document.querySelectorAll('.day-header').forEach(function(header) {
    header.addEventListener('click', function() {
      const content = this.nextElementSibling;
      const isHidden = content.classList.contains('hidden');

      if (isHidden) {
        content.classList.remove('hidden');
        this.classList.remove('collapsed');
      } else {
        content.classList.add('hidden');
        this.classList.add('collapsed');
      }
    });
  });

  // Segment details collapse/expand
  document.querySelectorAll('.segment-header').forEach(function(header) {
    header.addEventListener('click', function(e) {
      e.stopPropagation();
      const details = this.nextElementSibling;
      if (details && details.classList.contains('segment-details')) {
        details.classList.toggle('hidden');
      }
    });
  });

  // Expand/Collapse All buttons
  document.getElementById('expand-all')?.addEventListener('click', function() {
    document.querySelectorAll('.day-content').forEach(c => c.classList.remove('hidden'));
    document.querySelectorAll('.day-header').forEach(h => h.classList.remove('collapsed'));
    document.querySelectorAll('.segment-details').forEach(d => d.classList.remove('hidden'));
  });

  document.getElementById('collapse-all')?.addEventListener('click', function() {
    document.querySelectorAll('.day-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.day-header').forEach(h => h.classList.add('collapsed'));
    document.querySelectorAll('.segment-details').forEach(d => d.classList.add('hidden'));
  });
});
`;
  }

  /**
   * Generate HTML body
   */
  private generateBody(view: ItineraryView, config: ViewerConfig): string {
    return `
<div class="itinerary-container">
  ${this.generateHeader(view)}

  <div class="controls" style="margin-bottom: 1rem; display: flex; gap: 0.5rem;">
    <button id="expand-all" style="padding: 0.5rem 1rem; cursor: pointer;">Expand All</button>
    <button id="collapse-all" style="padding: 0.5rem 1rem; cursor: pointer;">Collapse All</button>
  </div>

  ${this.generateDays(view, config)}
  ${this.generateFooter(view)}
</div>
`;
  }

  /**
   * Generate header section
   */
  private generateHeader(view: ItineraryView): string {
    return `
<header class="itinerary-header">
  <h1 class="itinerary-title">${this.escapeHtml(view.title)}</h1>
  ${view.description ? `<p class="itinerary-description">${this.escapeHtml(view.description)}</p>` : ''}

  <div class="itinerary-meta">
    <span class="itinerary-meta-item">📅 ${this.escapeHtml(view.dateRange)}</span>
    <span class="itinerary-meta-item">⏱️ ${view.durationDays} days</span>
    <span class="itinerary-meta-item">📍 ${this.escapeHtml(view.destinations.join(', '))}</span>
    <span class="status-badge status-${view.status}">${view.status}</span>
  </div>

  <div class="stats-grid">
    <div class="stat-item">
      <div class="stat-value">${view.stats.flights}</div>
      <div class="stat-label">✈️ Flights</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${view.stats.hotels}</div>
      <div class="stat-label">🏨 Hotels</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${view.stats.activities}</div>
      <div class="stat-label">🎯 Activities</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${view.stats.transfers}</div>
      <div class="stat-label">🚗 Transfers</div>
    </div>
  </div>
</header>
`;
  }

  /**
   * Generate days section
   */
  private generateDays(view: ItineraryView, _config: ViewerConfig): string {
    return view.days
      .map(
        (day) => `
<div class="day-container">
  <div class="day-header">
    <div>
      <div class="day-title">${this.escapeHtml(day.title)}</div>
      <div class="day-date">${this.escapeHtml(day.dateFormatted)}</div>
    </div>
    <span class="day-toggle">▼</span>
  </div>
  <div class="day-content">
    ${day.segments.map((segment) => this.generateSegment(segment)).join('')}
  </div>
</div>
`
      )
      .join('');
  }

  /**
   * Generate segment card
   */
  private generateSegment(segment: ItineraryView['days'][0]['segments'][0]): string {
    return `
<div class="segment ${segment.cssClass}">
  <div class="segment-header">
    <span class="segment-icon">${segment.icon}</span>
    <div class="segment-info">
      <div class="segment-title">${this.escapeHtml(segment.title)}</div>
      <div class="segment-summary">${this.escapeHtml(segment.summary)}</div>
    </div>
    <span class="segment-time">${this.escapeHtml(segment.timeRange)}</span>
  </div>
  ${
    segment.details.length > 0
      ? `
  <div class="segment-details hidden">
    <ul>
      ${segment.details.map((d) => `<li>${this.escapeHtml(d)}</li>`).join('')}
    </ul>
  </div>
  `
      : ''
  }
</div>
`;
  }

  /**
   * Generate footer
   */
  private generateFooter(view: ItineraryView): string {
    return `
<footer class="itinerary-footer">
  <p>Generated ${new Date().toLocaleString()} | Version ${view.metadata.version}</p>
  ${view.metadata.travelerCount > 0 ? `<p>Travelers: ${this.escapeHtml(view.metadata.travelerNames.join(', '))}</p>` : ''}
</footer>
`;
  }

  /**
   * HTML escape helper
   */
  private escapeHtml(str: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
  }
}
