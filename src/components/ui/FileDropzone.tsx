'use client';

import { useDropzone, DropzoneOptions } from 'react-dropzone';

interface FileDropzoneProps {
  onDrop: (files: File[]) => void;
  processing: boolean;
  accept?: DropzoneOptions['accept'];
  title?: string;
  description?: string;
  activeText?: string;
}

export default function FileDropzone({
  onDrop,
  processing,
  accept = { 'text/csv': ['.csv'] },
  title = 'Drag and drop a CSV file here, or click to select',
  description = 'Supports rug inventory CSV files with product details',
  activeText = 'Drop the CSV file here...',
}: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    disabled: processing,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
      } ${processing ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input {...getInputProps()} />
      {processing ? (
        <p className="text-gray-600 dark:text-gray-400">Processing...</p>
      ) : isDragActive ? (
        <p className="text-blue-600 dark:text-blue-400">{activeText}</p>
      ) : (
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">{title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">{description}</p>
        </div>
      )}
    </div>
  );
}
