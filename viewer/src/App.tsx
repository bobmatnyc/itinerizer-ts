import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Upload, Loader2 } from 'lucide-react';
import { useItineraries, useItinerary, useImportPDF, useModels } from './hooks/useItineraries';
import { ItineraryList } from './components/ItineraryList';
import { ItineraryDetail } from './components/ItineraryDetail';

const queryClient = new QueryClient();

function AppContent() {
  const [selectedId, setSelectedId] = useState<string>();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');

  const { data: itineraries, isLoading, error } = useItineraries();
  const { data: selectedItinerary } = useItinerary(selectedId);
  const { data: models } = useModels();
  const importMutation = useImportPDF();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleImport = async () => {
    if (!uploadFile) return;

    try {
      await importMutation.mutateAsync({
        file: uploadFile,
        model: selectedModel || undefined,
      });
      setUploadFile(null);
      setSelectedModel('');
      alert('Import successful!');
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Check console for details.');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Itinerizer Viewer
          </h1>

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Select PDF
            </label>

            {uploadFile && (
              <>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Auto-select model</option>
                  {models?.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name.split('/')[1]} (max {model.maxTokens.toLocaleString()} tokens)
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {importMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Import {uploadFile.name}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Itinerary List */}
        <aside className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          {isLoading && (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-red-600 dark:text-red-400">
              Error loading itineraries
            </div>
          )}

          {itineraries && (
            <ItineraryList
              itineraries={itineraries}
              onSelect={setSelectedId}
              selectedId={selectedId}
            />
          )}
        </aside>

        {/* Main Panel - Itinerary Detail */}
        <main className="flex-1 bg-white dark:bg-gray-800">
          {!selectedItinerary && (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              Select an itinerary to view details
            </div>
          )}

          {selectedItinerary && <ItineraryDetail itinerary={selectedItinerary} />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
