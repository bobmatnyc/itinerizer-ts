import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5177;

app.use(cors());
app.use(express.json());

// Path to itineraries directory
const ITINERARIES_DIR = path.join(__dirname, '..', 'data', 'itineraries');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Shared handler for getting all itineraries
const getAllItineraries = async (req, res) => {
  try {
    const files = await fs.readdir(ITINERARIES_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== '.gitkeep');

    const itineraries = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(ITINERARIES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Return list item format
        return {
          id: data.id,
          title: data.title,
          startDate: data.startDate,
          endDate: data.endDate,
          destinations: data.destinations,
          segmentCount: data.segments?.length || 0,
          tripType: data.tripType,
          status: data.status || 'CONFIRMED',
        };
      })
    );

    // Sort by start date (most recent first)
    itineraries.sort((a, b) => {
      const dateA = new Date(a.startDate || 0);
      const dateB = new Date(b.startDate || 0);
      return dateB.getTime() - dateA.getTime();
    });

    res.json(itineraries);
  } catch (error) {
    console.error('Error loading itineraries:', error);
    res.status(500).json({ error: 'Failed to load itineraries' });
  }
};

// Shared handler for getting single itinerary
const getItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(ITINERARIES_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    res.json(data);
  } catch (error) {
    console.error('Error loading itinerary:', error);
    res.status(404).json({ error: 'Itinerary not found' });
  }
};

// Shared handler for getting models
const getModels = (req, res) => {
  res.json([
    { name: 'anthropic/claude-3.5-sonnet', description: 'Claude 3.5 Sonnet' },
    { name: 'openai/gpt-4-turbo', description: 'GPT-4 Turbo' },
  ]);
};

// V1 API Routes (primary)
app.get('/api/v1/itineraries', getAllItineraries);
app.get('/api/v1/itineraries/:id', getItinerary);
app.get('/api/v1/models', getModels);

// Legacy routes (for backward compatibility)
app.get('/api/itineraries', getAllItineraries);
app.get('/api/itineraries/:id', getItinerary);
app.get('/api/models', getModels);

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log(`  - Health: http://localhost:${PORT}/api/health`);
  console.log(`  - Itineraries (v1): http://localhost:${PORT}/api/v1/itineraries`);
  console.log(`  - Models (v1): http://localhost:${PORT}/api/v1/models`);
  console.log(`  - Legacy routes still supported at /api/* for backward compatibility`);
});
