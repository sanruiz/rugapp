import RugProcessorApp from "@/components/rug-processor-app";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Rug Prompt Generator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Upload your rug CSV file to generate AI prompts and batch requests
            for Gemini API
          </p>
        </header>

        <RugProcessorApp />
      </div>
    </main>
  );
}
