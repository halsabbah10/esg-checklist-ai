/**
 * Integration tests for the FileUploader component
 * Tests file upload functionality with API mocking
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';

// Mock the API service
vi.mock('../services/api', () => ({
  uploadFile: vi.fn(),
  api: {
    post: vi.fn(),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FileUploader Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render file upload area correctly', () => {
    render(
      <TestWrapper>
        <FileUploader onFilesUploaded={() => {}} />
      </TestWrapper>
    );

    expect(screen.getByText(/click to select files/i)).toBeInTheDocument();
    expect(screen.getByText(/choose files/i)).toBeInTheDocument();
  });

  it('should handle file selection and upload', async () => {
    const mockUploadFile = vi.fn().mockResolvedValue({
      success: true,
      fileId: 'test-file-id',
      message: 'File uploaded successfully',
    });

    vi.doMock('../services/api', () => ({
      uploadFile: mockUploadFile,
    }));

    const onFilesUploaded = vi.fn();
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <FileUploader onFilesUploaded={onFilesUploaded} />
      </TestWrapper>
    );

    // Create a test file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

    // Find file input (it might be hidden)
    const fileInput = screen.getByRole('button', { name: /choose files/i });

    if (fileInput) {
      await user.click(fileInput);
    }

    // Simulate file drop
    const dropzone = screen.getByText(/click to select files/i).closest('div');
    if (dropzone) {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });
    }

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();
    });
  });

  it('should handle file size validation errors', async () => {
    render(
      <TestWrapper>
        <FileUploader onFilesUploaded={() => {}} maxFileSize={1024} />
      </TestWrapper>
    );

    // Create a file that's too large (larger than 1KB limit)
    const largeFile = new File(['x'.repeat(2048)], 'large-file.txt', { type: 'text/plain' });

    // Simulate file drop
    const dropzone = screen.getByText(/click to select files/i).closest('div');
    if (dropzone) {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [largeFile],
        },
      });
    }

    // Should show error message for file size
    await waitFor(() => {
      expect(
        screen.getByText(/too large/i) || screen.getByText(/maximum size/i)
      ).toBeInTheDocument();
    });
  });

  it('should validate file types', async () => {
    render(
      <TestWrapper>
        <FileUploader onFilesUploaded={() => {}} acceptedFileTypes={['.txt', '.pdf']} />
      </TestWrapper>
    );

    // Try to upload an invalid file type
    const invalidFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    const dropzone = screen.getByText(/click to select files/i).closest('div');
    if (dropzone) {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [invalidFile],
        },
      });
    }

    // Should show validation error
    await waitFor(() => {
      expect(
        screen.getByText(/invalid file type/i) || screen.getByText(/not supported/i)
      ).toBeInTheDocument();
    });
  });
});
