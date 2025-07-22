import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  IconButton,
  Chip,
  Paper,
  Toolbar,
  ButtonGroup,
  TextField,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Download,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  RotateRight,
  Search,
  NavigateBefore,
  NavigateNext,
  FirstPage,
  LastPage,
  Refresh,
  Print,
  FileCopy,
  FitScreen,
  FindInPage,
  PictureAsPdf,
  Description,
  Slideshow,
} from '@mui/icons-material';
import { uploadsAPI } from '../services/api';
import { LoadingState } from './ui';
import * as XLSX from 'xlsx';

// Helper component to load and display file content
const FileContentLoader: React.FC<{ uploadId: number | undefined }> = ({ uploadId }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchContent = async () => {
      if (!uploadId) {
        setContent('No file ID provided');
        setLoading(false);
        return;
      }
      
      try {
        const response = await uploadsAPI.download(uploadId.toString());
        const text = response.data instanceof Blob 
          ? await response.data.text()
          : String(response.data);
        setContent(text);
      } catch (error) {
        console.error('Error loading file content:', error);
        setContent('Error loading file content');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [uploadId]);
  
  if (loading) {
    return <LoadingState variant="inline" message="" showMessage={false} size="small" />;
  }
  
  return <>{content}</>;
};

interface DocumentViewerProps {
  open?: boolean;
  onClose?: () => void;
  uploadId?: number;
  fileUploadId?: number;
  filename?: string;
  fileSize?: number;
  embedded?: boolean;
}

interface FileData {
  id: number;
  filename: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  status: string;
  download_url?: string;
  preview_url?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  open = true,
  onClose = () => {},
  uploadId,
  fileUploadId,
  filename,
  fileSize,
  embedded = false,
}) => {
  const actualUploadId = uploadId || fileUploadId;
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const viewerRef = useRef<HTMLIFrameElement | null>(null);
  const textContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && actualUploadId) {
      fetchFileData();
    }
  }, [open, actualUploadId]);

  // Keyboard navigation support
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard events if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          if (currentPage > 1) {
            handlePrevPage();
          }
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ': // Space bar
          e.preventDefault();
          if (currentPage < totalPages) {
            handleNextPage();
          }
          break;
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault();
            handleFirstPage();
          }
          break;
        case 'End':
          if (e.ctrlKey) {
            e.preventDefault();
            handleLastPage();
          }
          break;
        case '0':
          if (e.ctrlKey) {
            e.preventDefault();
            handleZoomFit();
          }
          break;
        case '=':
        case '+':
          if (e.ctrlKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case 'r':
          if (e.ctrlKey) {
            e.preventDefault();
            handleRotate();
          }
          break;
        case 'f':
          if (e.ctrlKey) {
            e.preventDefault();
            // Focus search input
            const searchInput = document.querySelector('[placeholder=\"Search in document...\"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
          }
          break;
        case 'Escape':
          if (embedded) {
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, currentPage, totalPages, embedded, onClose]);

  const fetchFileData = async () => {
    if (loading || fileData) return; // Prevent duplicate fetches
    
    setLoading(true);
    setError(null);
    try {
      // Search for the specific file by ID instead of fetching all uploads
      const response = await uploadsAPI.search({ id: actualUploadId, limit: 1 });
      const results = response.data?.results || [];
      
      if (results.length > 0) {
        const file = results[0];
        const fileData = {
          id: file.id,
          filename: file.filename,
          file_size: file.file_size,
          mime_type: file.mime_type,
          uploaded_at: file.uploaded_at,
          status: file.status,
        };
        setFileData(fileData);
        
        // Set up document URL for viewing
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        setDocumentUrl(`${baseUrl}/v1/files/${actualUploadId}/view`);
        
        // For text-based documents, fetch content for search functionality
        const fileType = getFileType(file.filename);
        if (['text', 'document'].includes(fileType)) {
          await fetchTextContent();
        }
      } else {
        setError('File not found');
      }
    } catch (error) {
      console.error('Error fetching file data:', error);
      setError('File data temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTextContent = async () => {
    try {
      const response = await uploadsAPI.download(actualUploadId!.toString());
      const text = await response.data.text();
      setDocumentContent(text);
    } catch (error) {
      console.warn('Could not fetch text content for search:', error);
    }
  };

  const getFileType = (filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop() || '';
    
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico'].includes(extension)) return 'image';
    if (['txt', 'md', 'csv', 'log', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'h'].includes(extension)) return 'text';
    if (['doc', 'docx', 'rtf', 'odt'].includes(extension)) return 'document';
    if (['xls', 'xlsx', 'ods', 'csv'].includes(extension)) return 'spreadsheet';
    if (['ppt', 'pptx', 'odp'].includes(extension)) return 'presentation';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension)) return 'audio';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'archive';
    
    return 'unknown';
  };
  
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return <PictureAsPdf />;
      case 'document': return <Description />;
      case 'presentation': return <Slideshow />;
      case 'spreadsheet': return <Description />;
      default: return <Description />;
    }
  };

  const handleDownload = async () => {
    if (!actualUploadId) return;
    try {
      const response = await uploadsAPI.download(actualUploadId.toString());
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };
  
  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 500));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleZoomFit = () => setZoom(100);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  // Page navigation
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  
  // Search functionality
  const handleSearch = useCallback(() => {
    if (!searchTerm || !documentContent) return;
    
    const regex = new RegExp(searchTerm, 'gi');
    const matches: number[] = [];
    let match;
    
    while ((match = regex.exec(documentContent)) !== null) {
      matches.push(match.index);
    }
    
    setSearchResults(matches);
    setCurrentSearchIndex(0);
  }, [searchTerm, documentContent]);
  
  const handleSearchNext = () => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex(prev => (prev + 1) % searchResults.length);
    }
  };
  
  const handleSearchPrev = () => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex(prev => prev > 0 ? prev - 1 : searchResults.length - 1);
    }
  };
  
  // Print functionality
  const handlePrint = () => {
    if (viewerRef.current?.contentWindow) {
      viewerRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };
  
  // Refresh functionality
  const handleRefresh = () => {
    if (actualUploadId) {
      setFileData(null);
      setDocumentContent('');
      setSearchResults([]);
      setCurrentSearchIndex(0);
      fetchFileData();
    }
  };
  
  // Copy functionality
  const handleCopy = async () => {
    if (documentContent) {
      try {
        await navigator.clipboard.writeText(documentContent);
        console.log('Document content copied to clipboard');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };
  
  // Advanced find functionality
  const handleAdvancedFind = () => {
    // Toggle advanced search mode or open search panel
    console.log('Advanced find functionality - could open search panel');
  };

  // Enhanced PDF viewer with native-like controls
  const renderPDFViewer = () => {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, bgcolor: '#f5f5f5', borderBottom: 1, borderColor: 'divider' }}>
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="First Page (Ctrl+Home)">
              <IconButton 
                onClick={handleFirstPage} 
                disabled={currentPage <= 1}
                aria-label="Go to first page"
                size="large"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <FirstPage />
              </IconButton>
            </Tooltip>
            <Tooltip title="Previous Page (Page Up)">
              <IconButton 
                onClick={handlePrevPage} 
                disabled={currentPage <= 1}
                aria-label="Go to previous page"
                size="large"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <NavigateBefore />
              </IconButton>
            </Tooltip>
            <TextField
              size="small"
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              sx={{ width: 80, mx: 1 }}
              inputProps={{ 
                style: { textAlign: 'center' },
                'aria-label': `Page number, ${currentPage} of ${totalPages}`,
                min: 1,
                max: totalPages,
                step: 1
              }}
              label="Page"
              variant="outlined"
            />
            <Typography variant="body2" sx={{ px: 1, alignSelf: 'center' }}>
              of {totalPages}
            </Typography>
            <Tooltip title="Next Page (Page Down)">
              <IconButton 
                onClick={handleNextPage} 
                disabled={currentPage >= totalPages}
                aria-label="Go to next page"
                size="large"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <NavigateNext />
              </IconButton>
            </Tooltip>
            <Tooltip title="Last Page (Ctrl+End)">
              <IconButton 
                onClick={handleLastPage} 
                disabled={currentPage >= totalPages}
                aria-label="Go to last page"
                size="large"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <LastPage />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
          
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Zoom Out (Ctrl+-)">
              <IconButton 
                onClick={handleZoomOut} 
                disabled={zoom <= 25}
                aria-label={`Zoom out, current zoom ${zoom}%`}
                size="large"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ px: 2, alignSelf: 'center', minWidth: 50, textAlign: 'center' }}>
              {zoom}%
            </Typography>
            <Tooltip title="Zoom In (Ctrl++)">
              <IconButton 
                onClick={handleZoomIn} 
                disabled={zoom >= 500}
                aria-label={`Zoom in, current zoom ${zoom}%`}
                size="large"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Fit to Screen (Ctrl+0)">
              <IconButton 
                onClick={handleZoomFit}
                aria-label="Fit document to screen"
                size="large"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <FitScreen />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rotate 90° (Ctrl+R)">
              <IconButton 
                onClick={handleRotate}
                aria-label={`Rotate document, current rotation ${rotation} degrees`}
                size="large"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <RotateRight />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <TextField
              size="small"
              placeholder="Search in document... (Ctrl+F)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              sx={{ mr: 1, flexGrow: 1, maxWidth: 300 }}
              slotProps={{
                input: {
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                  'aria-label': 'Search in document',
                },
              }}
              label="Search"
              variant="outlined"
            />
            <ButtonGroup size="small">
              <Tooltip title="Find Previous (Shift+F3)">
                <IconButton 
                  onClick={handleSearchPrev} 
                  disabled={searchResults.length === 0}
                  aria-label={`Find previous occurrence, ${currentSearchIndex} of ${searchResults.length} results`}
                  size="large"
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  <NavigateBefore />
                </IconButton>
              </Tooltip>
              <Tooltip title="Find Next (F3)">
                <IconButton 
                  onClick={handleSearchNext} 
                  disabled={searchResults.length === 0}
                  aria-label={`Find next occurrence, ${currentSearchIndex + 1} of ${searchResults.length} results`}
                  size="large"
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  <NavigateNext />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
            {searchResults.length > 0 && (
              <Typography 
                variant="caption" 
                sx={{ ml: 1 }}
                aria-live="polite"
                aria-label={`Search results: ${currentSearchIndex + 1} of ${searchResults.length} matches found`}
              >
                {currentSearchIndex + 1} of {searchResults.length}
              </Typography>
            )}
          </Box>
          
          <ButtonGroup size="small" variant="outlined" sx={{ ml: 'auto' }}>
            <Tooltip title="Refresh Document">
              <IconButton onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Advanced Find">
              <IconButton onClick={handleAdvancedFind}>
                <FindInPage />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy Content">
              <IconButton onClick={handleCopy} disabled={!documentContent}>
                <FileCopy />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton onClick={handlePrint}>
                <Print />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton onClick={handleDownload}>
                <Download />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Toolbar>
        
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <iframe
            ref={viewerRef}
            src={`${documentUrl}#page=${currentPage}&zoom=${zoom}&rotate=${rotation}`}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title={`Document viewer: ${filename || fileData?.filename || 'Unknown document'}`}
            aria-label={`PDF document: ${filename || fileData?.filename || 'Unknown document'}`}
            role="document"
            tabIndex={0}
            onLoad={() => {
              // Try to get total pages from PDF viewer if possible
              try {
                const iframe = viewerRef.current;
                if (iframe?.contentDocument) {
                  // This is a basic attempt - actual implementation would depend on PDF.js integration
                  setTotalPages(10); // Placeholder
                }
              } catch (e) {
                console.log('Cannot access iframe content for page count');
              }
            }}
          />
        </Box>
      </Box>
    );
  };
  
  // Enhanced Word document viewer
  const renderWordViewer = () => {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, bgcolor: '#f5f5f5', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {getFileIcon('document')} {filename || fileData?.filename}
          </Typography>
          
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ px: 2, alignSelf: 'center' }}>
              {zoom}%
            </Typography>
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton onClick={handleDownload}>
                <Download />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Toolbar>
        
        <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#fff' }}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 4, 
              maxWidth: '8.5in', 
              margin: '0 auto',
              minHeight: '11in',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)'
            }}
          >
            <iframe
              src={documentUrl}
              width="100%"
              height="800px"
              style={{ border: 'none' }}
              title={filename || fileData?.filename}
            />
          </Paper>
        </Box>
      </Box>
    );
  };
  
  // Enhanced PowerPoint viewer
  const renderPresentationViewer = () => {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, bgcolor: '#f5f5f5', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            {getFileIcon('presentation')} {filename || fileData?.filename}
          </Typography>
          
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ButtonGroup size="small" variant="outlined">
              <Tooltip title="Previous Slide">
                <IconButton onClick={handlePrevPage} disabled={currentPage <= 1}>
                  <NavigateBefore />
                </IconButton>
              </Tooltip>
              <Typography variant="body2" sx={{ px: 2, alignSelf: 'center' }}>
                Slide {currentPage} of {totalPages}
              </Typography>
              <Tooltip title="Next Slide">
                <IconButton onClick={handleNextPage} disabled={currentPage >= totalPages}>
                  <NavigateNext />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </Box>
          
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ px: 1, alignSelf: 'center' }}>
              {zoom}%
            </Typography>
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton onClick={handleDownload}>
                <Download />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Toolbar>
        
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f0f0f0' }}>
          <Paper 
            elevation={3}
            sx={{
              width: '80%',
              height: '80%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              transform: `scale(${zoom / 100})`,
              bgcolor: 'white'
            }}
          >
            <iframe
              src={documentUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title={filename || fileData?.filename}
            />
          </Paper>
        </Box>
      </Box>
    );
  };

  const renderFileContent = () => {
    if (loading) {
      return (
        <LoadingState
          variant="spinner"
          message="Loading document..."
          size="medium"
          minHeight="500px"
        />
      );
    }

    if (error) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }} role="alert" aria-live="assertive">
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            aria-label={`Error loading document: ${error}`}
          >
            {error}
          </Alert>
          <Typography variant="body2" sx={{ mt: 2 }}>
            File: <strong>{filename}</strong>
          </Typography>
          <Typography variant="body2">
            ID: <strong>{actualUploadId}</strong>
          </Typography>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownload}
            sx={{ mt: 2 }}
          >
            Download File
          </Button>
        </Box>
      );
    }

    if (!fileData) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No file data available
        </Alert>
      );
    }

    const fileType = getFileType(filename || fileData.filename);
    const viewUrl = `/api/v1/files/${actualUploadId}/view`;

    switch (fileType) {
      case 'pdf':
        return renderPDFViewer();

      case 'document':
        return renderWordViewer();

      case 'presentation':
        return renderPresentationViewer();

      case 'image':
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar variant="dense" sx={{ minHeight: 48, bgcolor: '#f5f5f5', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {filename || fileData?.filename}
              </Typography>
              
              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="Zoom Out">
                  <IconButton onClick={handleZoomOut}>
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
                <Typography variant="body2" sx={{ px: 2, alignSelf: 'center' }}>
                  {zoom}%
                </Typography>
                <Tooltip title="Zoom In">
                  <IconButton onClick={handleZoomIn}>
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Fit to Screen">
                  <IconButton onClick={handleZoomFit}>
                    <FitScreen />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Rotate">
                  <IconButton onClick={handleRotate}>
                    <RotateRight />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download">
                  <IconButton onClick={handleDownload}>
                    <Download />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
            </Toolbar>
            
            <Box sx={{ 
              flex: 1,
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              overflow: 'auto',
              bgcolor: '#f0f0f0'
            }}>
              <img
                src={documentUrl}
                alt={filename || fileData?.filename}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}
              />
            </Box>
          </Box>
        );

      case 'text':
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar variant="dense" sx={{ minHeight: 48, bgcolor: '#f5f5f5', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {getFileIcon('text')} {filename || fileData?.filename}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  sx={{ mr: 1, width: 200 }}
                />
                <ButtonGroup size="small">
                  <IconButton onClick={handleSearchPrev} disabled={searchResults.length === 0}>
                    <NavigateBefore />
                  </IconButton>
                  <IconButton onClick={handleSearchNext} disabled={searchResults.length === 0}>
                    <NavigateNext />
                  </IconButton>
                </ButtonGroup>
              </Box>
              
              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="Refresh">
                  <IconButton onClick={handleRefresh}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy Content">
                  <IconButton onClick={handleCopy} disabled={!documentContent}>
                    <FileCopy />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <IconButton onClick={handleZoomOut}>
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
                <Typography variant="body2" sx={{ px: 1, alignSelf: 'center' }}>
                  {zoom}%
                </Typography>
                <Tooltip title="Zoom In">
                  <IconButton onClick={handleZoomIn}>
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download">
                  <IconButton onClick={handleDownload}>
                    <Download />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
            </Toolbar>
            
            <Paper 
              ref={textContentRef}
              sx={{ 
                flex: 1, 
                p: 3, 
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: `${(zoom / 100) * 14}px`,
                lineHeight: 1.5,
                bgcolor: '#fafafa'
              }}
            >
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                <FileContentLoader uploadId={actualUploadId} />
              </Typography>
            </Paper>
          </Box>
        );


      case 'spreadsheet':
        return (
          <Box sx={{ height: '600px', width: '100%' }}>
            <GoogleSheetsSpreadsheetViewer 
              fileId={actualUploadId} 
              filename={filename || fileData.filename} 
            />
          </Box>
        );

      case 'video':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <video
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '600px',
                transform: `scale(${zoom / 100})`,
              }}
            >
              <source src={viewUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </Box>
        );

      case 'audio':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <audio controls style={{ width: '100%' }}>
              <source src={viewUrl} type="audio/mpeg" />
              Your browser does not support the audio tag.
            </audio>
          </Box>
        );

      default:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Document Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This file type is not supported for preview. Please download the file to view it.
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              File: <strong>{filename || fileData.filename}</strong>
            </Typography>
            <Typography variant="body2">
              Type: <strong>{fileType.toUpperCase()}</strong>
            </Typography>
            <Typography variant="body2">
              Size: <strong>{formatFileSize(fileData.file_size)}</strong>
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownload}
              sx={{ mt: 2 }}
            >
              Download {filename || fileData.filename}
            </Button>
          </Box>
        );
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const canZoom = ['pdf', 'image', 'text', 'document', 'presentation'].includes(getFileType(filename || fileData?.filename || ''));
  const canRotate = ['pdf', 'image'].includes(getFileType(filename || fileData?.filename || ''));

  // If embedded, return just the content without dialog wrapper
  if (embedded) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {renderFileContent()}
        </Box>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {fileData?.filename || filename}
            </Typography>
            {fileData?.status && (
              <Chip 
                label={fileData.status.toUpperCase()} 
                size="small" 
                color={fileData.status === 'approved' ? 'success' : 
                       fileData.status === 'rejected' ? 'error' : 'warning'} 
              />
            )}
          </Box>
          <Button 
            size="small"
            startIcon={<Download />} 
            onClick={handleDownload}
            variant="outlined"
          >
            Download
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="span">
              {filename || fileData?.filename || 'Document'}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip 
                label={getFileType(filename || fileData?.filename || '').toUpperCase()} 
                size="small" 
                color="primary" 
              />
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(fileData?.file_size || fileSize)}
              </Typography>
              {fileData?.status && (
                <Chip 
                  label={fileData.status.toUpperCase()} 
                  size="small" 
                  color={fileData.status === 'approved' ? 'success' : 
                         fileData.status === 'rejected' ? 'error' : 'warning'} 
                />
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {renderFileContent()}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canZoom && (
            <>
              <IconButton 
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                disabled={zoom <= 25}
                title="Zoom Out"
              >
                <ZoomOut />
              </IconButton>
              <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '50px' }}>
                {zoom}%
              </Typography>
              <IconButton 
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
                title="Zoom In"
              >
                <ZoomIn />
              </IconButton>
            </>
          )}
          {canRotate && (
            <IconButton 
              onClick={() => setRotation((rotation + 90) % 360)}
              title="Rotate"
            >
              <RotateRight />
            </IconButton>
          )}
          <IconButton 
            onClick={() => {
              const elem = document.documentElement;
              if (elem.requestFullscreen) {
                elem.requestFullscreen();
              }
            }}
            title="Fullscreen"
          >
            <Fullscreen />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            startIcon={<Download />} 
            onClick={handleDownload}
            variant="outlined"
          >
            Download
          </Button>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};


// Fast, reliable Excel viewer that loads immediately
const GoogleSheetsSpreadsheetViewer: React.FC<{ fileId: number | undefined; filename: string }> = ({ fileId, filename }) => {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: any;
  }>({
    loading: true,
    error: null,
    data: null
  });
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGridlines, setShowGridlines] = useState(true);
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const frozenRows = 1; // Freeze header row by default
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resizingColumnRef = useRef<number | null>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  useEffect(() => {
    console.log('🔄 Excel useEffect triggered - fileId:', fileId, 'loaded:', loadedRef.current, 'loading:', loadingRef.current);
    
    // Reset state for new fileId
    if (fileId) {
      loadedRef.current = false;
      setState({
        loading: true,
        error: null,
        data: null
      });
    }
    
    // Only load once per fileId
    if (!fileId || loadedRef.current) {
      console.log('⏹️ Skipping load - no fileId or already loaded');
      return;
    }

    // If currently loading, abort the previous request
    if (loadingRef.current && abortControllerRef.current) {
      console.log('🚫 Aborting previous request and starting new one');
      abortControllerRef.current.abort();
      loadingRef.current = false;
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const loadExcelFile = async () => {
      loadingRef.current = true;
      console.log('🚀 Starting Excel file download for fileId:', fileId);
      
      try {
        // Use the existing API service for proper authentication
        console.log('📥 Downloading file using API service for fileId:', fileId);
        
        const response = await uploadsAPI.download(fileId.toString());
        console.log('📊 API Response received, data type:', typeof response.data);
        
        if (signal.aborted) {
          console.log('🚫 Request was aborted');
          return;
        }
        
        // The API returns response.data as a blob
        const blob = response.data;
        console.log('📦 Blob size:', blob.size, 'bytes', 'Type:', blob.type);
        
        // Debug: Check if it's actually an Excel file by examining the first few bytes
        const debugSlice = blob.slice(0, 200);
        const debugText = await debugSlice.text();
        console.log('📋 First 200 chars of file:', debugText);
        
        // Check if this looks like HTML instead of Excel
        if (debugText.includes('<html>') || debugText.includes('<!DOCTYPE')) {
          console.error('🚨 Downloaded file appears to be HTML, not Excel');
          setState({
            loading: false,
            error: 'File download returned HTML instead of Excel file. The file may not exist or there may be a server error.',
            data: null
          });
          return;
        }
        
        if (signal.aborted) {
          console.log('🚫 Request was aborted after blob creation');
          return;
        }
        
        // Use FileReader to convert blob to array buffer
        const reader = new FileReader();
        console.log('📖 Starting FileReader...');
        
        reader.onload = (e) => {
          console.log('📖 FileReader onload triggered');
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            console.log('📏 ArrayBuffer size:', arrayBuffer.byteLength);
            
            // Process in next tick to avoid blocking
            setTimeout(() => {
              console.log('⏱️ Processing Excel file...');
              try {
                const workbook = XLSX.read(arrayBuffer, { 
                  type: 'array',
                  cellStyles: false,  // Disable style parsing for performance
                  cellFormula: false, // Disable formula parsing for performance
                  cellHTML: false,    // Disable HTML parsing for performance
                });
                
                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                  throw new Error('No valid spreadsheet sheets found in file');
                }
                
                // Convert sheets to simple data arrays with size limits
                const sheets = workbook.SheetNames.map(sheetName => {
                  const worksheet = workbook.Sheets[sheetName];
                  
                  // Limit the range to prevent freezing with large files
                  const rawRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
                  const maxRows = Math.min(rawRange.e.r + 1, 1000); // Limit to 1000 rows
                  const maxCols = Math.min(rawRange.e.c + 1, 50);   // Limit to 50 columns
                  
                  console.log(`📊 Sheet "${sheetName}": Original ${rawRange.e.r + 1}x${rawRange.e.c + 1}, Limited to ${maxRows}x${maxCols}`);
                  
                  const range = {
                    s: { r: 0, c: 0 },
                    e: { r: maxRows - 1, c: maxCols - 1 }
                  };
                  
                  const data: string[][] = [];
                  
                  for (let R = range.s.r; R <= range.e.r; ++R) {
                    const row: string[] = [];
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                      const cell = worksheet[cellAddress];
                      row.push(cell ? String(cell.v || '') : '');
                    }
                    data.push(row);
                  }
                  
                  return {
                    name: sheetName,
                    data,
                    range: worksheet['!ref'] || 'A1:A1',
                    originalSize: `${rawRange.e.r + 1}x${rawRange.e.c + 1}`,
                    limitedSize: `${maxRows}x${maxCols}`,
                    isLimited: maxRows < (rawRange.e.r + 1) || maxCols < (rawRange.e.c + 1)
                  };
                });
                
                console.log('✅ Excel processing complete, setting state');
                loadedRef.current = true; // Only set loaded flag on success
                loadingRef.current = false; // Reset loading flag
                setState({
                  loading: false,
                  error: null,
                  data: { sheets, filename }
                });
              } catch (parseError) {
                console.error('Excel parsing error:', parseError);
                loadingRef.current = false; // Reset loading flag on error
                setState({
                  loading: false,
                  error: 'Failed to parse Excel file',
                  data: null
                });
              }
            }, 0);
          } catch (err) {
            console.error('FileReader error:', err);
            loadingRef.current = false; // Reset loading flag on error
            setState({
              loading: false,
              error: 'Failed to read file',
              data: null
            });
          }
        };

        reader.onerror = () => {
          loadingRef.current = false; // Reset loading flag on error
          setState({
            loading: false,
            error: 'Failed to read file',
            data: null
          });
        };

        reader.readAsArrayBuffer(blob);
        
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Download error:', error);
          loadingRef.current = false; // Reset loading flag on error
          setState({
            loading: false,
            error: 'Failed to download file',
            data: null
          });
        } else {
          console.log('🚫 Request was aborted (AbortError)');
        }
      } finally {
        // Only reset loading flag if not aborted (let successful completion handle it)
        if (signal?.aborted) {
          loadingRef.current = false;
          console.log('🔄 Reset loading flag due to abort');
        }
      }
    };

    loadExcelFile();

    return () => {
      console.log('🧹 Cleanup: aborting requests and resetting flags');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      loadingRef.current = false;
    };
  }, [fileId]);

  const getColumnName = (index: number): string => {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    return String(value);
  };

  // Column resizing handlers
  const getColumnWidth = useCallback((colIndex: number): number => {
    return columnWidths[colIndex] || Math.round((150 * zoomLevel) / 100); // Default width scaled by zoom
  }, [columnWidths, zoomLevel]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (resizingColumnRef.current === null) return;
    
    const deltaX = e.clientX - resizeStartXRef.current;
    const newWidth = Math.max(30, resizeStartWidthRef.current + deltaX); // Minimum width of 30px
    
    console.log('🔧 Resizing column', resizingColumnRef.current, 'to width:', newWidth);
    
    setColumnWidths(prev => {
      const updated = {
        ...prev,
        [resizingColumnRef.current!]: newWidth
      };
      console.log('📊 Updated column widths:', updated);
      return updated;
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingColumnRef.current = null;
    setResizingColumn(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔧 Starting resize for column:', colIndex);
    
    resizingColumnRef.current = colIndex;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = getColumnWidth(colIndex);
    
    setResizingColumn(colIndex);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [getColumnWidth, handleResizeMove, handleResizeEnd]);

  // Cleanup resize listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleResizeMove, handleResizeEnd]);

  // Enhanced cell type detection with sub-sub-headings
  const detectCellType = (value: any, rowIndex: number) => {
    const cellValue = String(value || '').trim();
    
    // Main headers (row 0 and key identifying patterns)
    if (rowIndex === 0) return 'main-header';
    
    // Sub-headers detection (row 1 or specific patterns)
    if (rowIndex === 1 && cellValue !== '') return 'sub-header';
    
    // Check for main sub-header patterns in any row
    if (cellValue !== '' && (
      cellValue.includes('Criteria') ||
      cellValue.includes('Standard') ||
      cellValue.includes('Requirement') ||
      cellValue.includes('Section') ||
      cellValue.includes('Category') ||
      cellValue.match(/^[A-Z]+\s*[-–]\s*/) || // Letters with dashes like "A - ", "ESG - "
      cellValue.match(/^\d+\.\s*[A-Z]/) || // Numbers like "1. Environmental", "2. Social"
      (cellValue.length < 50 && cellValue === cellValue.toUpperCase() && cellValue.includes(' ') && !cellValue.match(/^\d+\.\d+/)) // Short all-caps phrases but not numbered sub-sub
    )) {
      return 'sub-header';
    }
    
    // Sub-sub-header patterns (more specific numbered items and indented content)
    if (cellValue !== '' && (
      cellValue.match(/^\d+\.\d+/) || // Numbers like "1.1", "2.3", "10.2"
      cellValue.match(/^\d+\.\d+\.\d+/) || // Numbers like "1.1.1", "2.3.4"
      cellValue.match(/^[a-z]\)/) || // Letters like "a)", "b)", "c)"
      cellValue.match(/^[ivx]+\)/) || // Roman numerals like "i)", "ii)", "iii)"
      cellValue.match(/^\([a-z]\)/) || // Parenthetical letters like "(a)", "(b)"
      cellValue.match(/^\([ivx]+\)/) || // Parenthetical roman numerals like "(i)", "(ii)"
      cellValue.match(/^•\s/) || // Bullet points
      cellValue.match(/^-\s/) || // Dash points
      cellValue.match(/^\*\s/) || // Star points
      (cellValue.startsWith('  ') || cellValue.startsWith('\t')) || // Indented text
      cellValue.match(/^\d+\.\d+\s+[A-Z]/) || // "1.1 Some Title", "2.3 Another Title"
      (cellValue.includes(':') && cellValue.length < 80) // Short descriptive items with colons
    )) {
      return 'sub-sub-header';
    }
    
    // Empty cells
    if (cellValue === '') return 'empty';
    
    // Default to normal text
    return 'normal';
  };

  const getCellStyle = (value: any, rowIndex: number, colIndex: number) => {
    const scaledFontSize = Math.round((13 * zoomLevel) / 100);
    const scaledPadding = Math.round((6 * zoomLevel) / 100);
    const columnWidth = getColumnWidth(colIndex);
    
    const borderColor = showGridlines ? '#c7c7c7' : 'transparent';
    const cellType = detectCellType(value, rowIndex);
    
    const baseStyle: React.CSSProperties = {
      padding: `${scaledPadding}px ${scaledPadding + 2}px`,
      borderTop: `1px solid ${borderColor}`,
      borderRight: `1px solid ${borderColor}`,
      borderBottom: `1px solid ${borderColor}`,
      borderLeft: `1px solid ${borderColor}`,
      width: `${columnWidth}px`,
      minWidth: `${columnWidth}px`,
      maxWidth: `${columnWidth}px`,
      fontSize: `${scaledFontSize}px`,
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      backgroundColor: '#ffffff',
      cursor: 'cell',
      textAlign: 'left',
      verticalAlign: 'middle',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      transition: 'background-color 0.1s ease',
      position: 'relative',
      userSelect: 'none',
      color: '#323130',
      lineHeight: '1.2',
    };

    // Selected cell styling - HIGHEST PRIORITY (overrides all other styling)
    if (selectedCell?.row === rowIndex && selectedCell?.col === colIndex) {
      const selectedBaseStyle = cellType === 'main-header' || rowIndex < frozenRows ? {
        ...baseStyle,
        backgroundColor: '#c41e3a',
        color: '#ffffff',
        fontWeight: 700,
        fontSize: `${Math.round((14 * zoomLevel) / 100)}px`,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        textAlign: 'center' as const,
      } : cellType === 'sub-header' ? {
        ...baseStyle,
        backgroundColor: '#f8e6e9',
        color: '#c41e3a',
        fontWeight: 600,
        textAlign: 'left' as const,
      } : cellType === 'sub-sub-header' ? {
        ...baseStyle,
        backgroundColor: '#fdf0f1',
        color: '#a01729',
        fontWeight: 500,
        textAlign: 'left' as const,
      } : baseStyle;

      return {
        ...selectedBaseStyle,
        borderTop: '2px solid #217346',
        borderRight: '2px solid #217346',
        borderBottom: '2px solid #217346',
        borderLeft: '2px solid #217346',
        zIndex: 25,
        outline: 'none'
      };
    }

    // Main header styling (typically row 0 + frozen rows)
    if (cellType === 'main-header' || rowIndex < frozenRows) {
      return {
        ...baseStyle,
        backgroundColor: '#c41e3a', // Red theme color
        color: '#ffffff',
        fontWeight: 700,
        fontSize: `${Math.round((14 * zoomLevel) / 100)}px`,
        borderBottom: '3px solid #a01729',
        borderRight: showGridlines ? '1px solid #a01729' : '1px solid transparent',
        position: 'sticky' as const,
        top: 0,
        zIndex: 20,
        textAlign: 'center' as const,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
      };
    }
    
    // Sub-header styling
    if (cellType === 'sub-header') {
      return {
        ...baseStyle,
        backgroundColor: '#f8e6e9', // Light red/pink
        color: '#c41e3a',
        fontWeight: 600,
        fontSize: `${Math.round((13 * zoomLevel) / 100)}px`,
        borderBottom: '2px solid #f2bcc4',
        borderLeft: '3px solid #c41e3a',
        textAlign: 'left' as const,
        fontStyle: 'normal' as const,
      };
    }
    
    // Sub-sub-header styling
    if (cellType === 'sub-sub-header') {
      return {
        ...baseStyle,
        backgroundColor: '#fdf0f1', // Very light red/pink
        color: '#a01729',
        fontWeight: 500,
        fontSize: `${Math.round((12 * zoomLevel) / 100)}px`,
        borderBottom: '1px solid #f5d2d6',
        borderLeft: '2px solid #d9425a',
        textAlign: 'left' as const,
        fontStyle: 'italic' as const,
        paddingLeft: `${scaledPadding + 8}px`, // Extra left padding for indentation
      };
    }

    // No row/column highlighting to match Excel behavior

    // Note: Hover effects are handled via CSS classes in production

    // Value-based styling
    if (typeof value === 'number') {
      return {
        ...baseStyle,
        textAlign: 'right' as const,
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontVariantNumeric: 'tabular-nums'
      };
    }

    // Excel-like status colors
    if (String(value).toLowerCase() === 'complete' || String(value).toLowerCase() === 'yes') {
      return {
        ...baseStyle,
        color: '#107c10',
        fontWeight: 500,
        backgroundColor: '#dff6dd',
      };
    }

    if (String(value).toLowerCase() === 'incomplete' || String(value).toLowerCase() === 'pending') {
      return {
        ...baseStyle,
        color: '#8a8100',
        fontWeight: 500,
        backgroundColor: '#fff4ce',
      };
    }

    if (String(value).toLowerCase() === 'missing' || String(value).toLowerCase() === 'no') {
      return {
        ...baseStyle,
        color: '#d13438',
        fontWeight: 500,
        backgroundColor: '#fde7e9',
      };
    }

    // Enhanced normal text styling for better readability
    if (cellType === 'normal' && String(value).trim() !== '') {
      return {
        ...baseStyle,
        backgroundColor: '#ffffff',
        color: '#2d2d2d',
        fontWeight: 400,
        lineHeight: '1.4',
        padding: `${scaledPadding + 2}px ${scaledPadding + 4}px`,
        borderLeft: showGridlines ? '1px solid #e0e0e0' : 'none',
        borderTop: showGridlines ? '1px solid #e0e0e0' : 'none',
      };
    }

    // Empty cell styling
    if (cellType === 'empty') {
      return {
        ...baseStyle,
        backgroundColor: '#fafafa',
        borderColor: showGridlines ? '#f0f0f0' : 'transparent',
      };
    }

    return baseStyle;
  };

  const handleDownload = async () => {
    if (!fileId) return;
    try {
      const response = await uploadsAPI.download(fileId.toString());
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'spreadsheet.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };


  if (state.loading) {
    return (
      <LoadingState
        variant="spinner"
        message={`Loading Excel file... (ID: ${fileId})`}
        size="large"
        minHeight="400px"
      />
    );
  }

  if (state.error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" bgcolor="#fafafa">
        <Typography variant="h6" color="error" gutterBottom>
          Error Loading Spreadsheet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {state.error}
        </Typography>
        <Button variant="contained" onClick={handleDownload} startIcon={<Download />}>
          Download Original File
        </Button>
      </Box>
    );
  }

  if (!state.data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" bgcolor="#fafafa">
        <Typography variant="body1">No spreadsheet data available</Typography>
      </Box>
    );
  }

  const spreadsheetData = state.data;
  const currentSheet = spreadsheetData.sheets[activeSheet];
  const maxCols = Math.max(...currentSheet.data.map((row: any[]) => row.length));
  
  // Limit visible rows for performance (show only first 100 rows initially)
  const visibleRows = Math.min(currentSheet.data.length, 100);
  const visibleData = currentSheet.data.slice(0, visibleRows);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff', border: '1px solid #c7c7c7' }}>
      {/* Excel-like Ribbon/Toolbar */}
      <Box sx={{ 
        bgcolor: '#f0f0f0', 
        borderBottom: '1px solid #c7c7c7', 
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '48px'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            width: 28, 
            height: 28, 
            bgcolor: '#217346', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            borderRadius: '2px'
          }}>
            ✕
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#323130' }}>
            {filename}
          </Typography>
          
          {/* Zoom Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 4 }}>
            <Button 
              size="small" 
              variant="outlined"
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
              disabled={zoomLevel <= 50}
              sx={{ 
                minWidth: '32px', 
                height: '28px', 
                fontSize: '12px',
                color: '#333333 !important',
                backgroundColor: '#F8F8F8 !important',
                borderColor: '#E8E8E8 !important',
                fontWeight: '400 !important',
                '&:hover': {
                  backgroundColor: '#F0F0F0 !important',
                  borderColor: '#DDDDDD !important',
                },
                '&.Mui-disabled': {
                  color: '#BBBBBB !important',
                  backgroundColor: '#FAFAFA !important',
                  borderColor: '#F0F0F0 !important',
                },
                '@media (prefers-color-scheme: dark)': {
                  color: '#333333 !important',
                  backgroundColor: '#E8E8E8 !important',
                  borderColor: '#D0D0D0 !important',
                  '&:hover': {
                    backgroundColor: '#DDDDDD !important',
                    borderColor: '#CCCCCC !important',
                  },
                  '&.Mui-disabled': {
                    color: '#BBBBBB !important',
                    backgroundColor: '#F0F0F0 !important',
                    borderColor: '#E0E0E0 !important',
                  }
                }
              }}
            >
              −
            </Button>
            <Typography 
              variant="body2" 
              sx={{ 
                minWidth: '60px', 
                textAlign: 'center', 
                fontSize: '12px',
                color: '#333333 !important',
                fontWeight: '400 !important',
              }}
            >
              {zoomLevel}%
            </Typography>
            <Button 
              size="small" 
              variant="outlined"
              onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
              disabled={zoomLevel >= 200}
              sx={{ 
                minWidth: '32px', 
                height: '28px', 
                fontSize: '12px',
                color: '#333333 !important',
                backgroundColor: '#F8F8F8 !important',
                borderColor: '#E8E8E8 !important',
                fontWeight: '400 !important',
                '&:hover': {
                  backgroundColor: '#F0F0F0 !important',
                  borderColor: '#DDDDDD !important',
                },
                '&.Mui-disabled': {
                  color: '#BBBBBB !important',
                  backgroundColor: '#FAFAFA !important',
                  borderColor: '#F0F0F0 !important',
                },
                '@media (prefers-color-scheme: dark)': {
                  color: '#333333 !important',
                  backgroundColor: '#E8E8E8 !important',
                  borderColor: '#D0D0D0 !important',
                  '&:hover': {
                    backgroundColor: '#DDDDDD !important',
                    borderColor: '#CCCCCC !important',
                  },
                  '&.Mui-disabled': {
                    color: '#BBBBBB !important',
                    backgroundColor: '#F0F0F0 !important',
                    borderColor: '#E0E0E0 !important',
                  }
                }
              }}
            >
              +
            </Button>
          </Box>

          {/* Gridlines Toggle */}
          <Button 
            size="small" 
            variant={showGridlines ? "contained" : "outlined"}
            onClick={() => setShowGridlines(!showGridlines)}
            sx={{ height: '28px', fontSize: '11px' }}
          >
            Gridlines
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" sx={{ color: '#605e5c' }}>
            {currentSheet.isLimited 
              ? `Limited view: ${visibleRows}/${currentSheet.data.length} rows × ${maxCols} cols`
              : `${currentSheet.data.length} rows × ${maxCols} columns`
            }
          </Typography>
          <Button 
            size="small" 
            variant="contained"
            onClick={handleDownload} 
            startIcon={<Download />}
            sx={{ height: '28px', fontSize: '11px', bgcolor: '#0078d4', '&:hover': { bgcolor: '#106ebe' } }}
          >
            Download
          </Button>
        </Box>
      </Box>

      {/* Sheet Tabs - Excel Style */}
      {spreadsheetData.sheets.length > 1 && (
        <Box sx={{ bgcolor: '#f3f2f1', borderBottom: '1px solid #c7c7c7', px: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'end', py: 0.5 }}>
            {spreadsheetData.sheets.map((sheet: any, index: number) => (
              <Box
                key={index}
                onClick={() => setActiveSheet(index)}
                sx={{ 
                  px: 2,
                  py: 0.5,
                  cursor: 'pointer',
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: '4px',
                  bgcolor: activeSheet === index ? '#ffffff' : '#e1dfdd',
                  color: activeSheet === index ? '#323130' : '#605e5c',
                  fontWeight: activeSheet === index ? 600 : 400,
                  fontSize: '12px',
                  fontFamily: '"Segoe UI", system-ui, sans-serif',
                  border: activeSheet === index ? '1px solid #c7c7c7' : '1px solid #d2d0ce',
                  borderBottom: activeSheet === index ? '1px solid #ffffff' : '1px solid #c7c7c7',
                  marginBottom: activeSheet === index ? '-1px' : '0',
                  '&:hover': {
                    bgcolor: activeSheet === index ? '#ffffff' : '#edebe9'
                  }
                }}
              >
                {sheet.name}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Formula Bar - Excel Style */}
      <Box sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #c7c7c7', px: 1, py: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            border: '1px solid #8a8886',
            px: 1.5,
            py: 0.5,
            minWidth: '70px',
            fontSize: '13px',
            bgcolor: '#faf9f8',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            fontWeight: 600,
            color: '#323130',
            borderRadius: '2px',
            textAlign: 'center'
          }}>
            {selectedCell 
              ? `${getColumnName(selectedCell.col)}${selectedCell.row + 1}`
              : 'A1'
            }
          </Box>
          <Typography sx={{ fontSize: '14px', color: '#605e5c', mx: 1 }}>𝑓ₓ</Typography>
          <Box sx={{ 
            flex: 1,
            border: '1px solid #8a8886',
            px: 1.5,
            py: 0.5,
            fontSize: '13px',
            bgcolor: '#ffffff',
            minHeight: '28px',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            color: '#323130',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '2px',
          }}>
            {selectedCell && visibleData[selectedCell.row] 
              ? formatCellValue(visibleData[selectedCell.row][selectedCell.col])
              : ''
            }
          </Box>
        </Box>
      </Box>

      {/* Spreadsheet Grid - Excel Style */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#ffffff' }}>
        <table style={{ 
          borderCollapse: 'separate', 
          borderSpacing: 0,
          width: '100%', 
          tableLayout: 'fixed',
          fontSize: `${Math.round((13 * zoomLevel) / 100)}px`,
          fontFamily: '"Segoe UI", system-ui, sans-serif'
        }}>
          <thead>
            <tr>
              <th style={{ 
                width: Math.round((50 * zoomLevel) / 100),
                backgroundColor: '#f3f2f1',
                fontWeight: 600,
                textAlign: 'center',
                padding: '6px 4px',
                border: showGridlines ? '1px solid #c7c7c7' : '1px solid #f3f2f1',
                borderRight: '1px solid #c7c7c7',
                borderBottom: '1px solid #c7c7c7',
                fontSize: `${Math.round((11 * zoomLevel) / 100)}px`,
                color: '#605e5c',
                position: 'sticky',
                top: 0,
                zIndex: 30,
                userSelect: 'none'
              }}>
                
              </th>
              {Array.from({ length: maxCols }, (_, colIndex) => (
                <th 
                  key={colIndex}
                  style={{ 
                    width: `${getColumnWidth(colIndex)}px`,
                    backgroundColor: '#f3f2f1',
                    fontWeight: 600,
                    textAlign: 'center',
                    padding: 0,
                    border: showGridlines ? '1px solid #c7c7c7' : '1px solid #f3f2f1',
                    borderBottom: '1px solid #c7c7c7',
                    fontSize: `${Math.round((11 * zoomLevel) / 100)}px`,
                    fontFamily: '"Segoe UI", system-ui, sans-serif',
                    color: '#605e5c',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    userSelect: 'none'
                  }}
                >
                  <Box 
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      height: '100%',
                      position: 'relative'
                    }}
                    onClick={() => setSelectedCell({ row: 0, col: colIndex })}
                  >
                    {getColumnName(colIndex)}
                    {/* Resize Handle */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: -3,
                        width: '6px',
                        height: '100%',
                        cursor: 'col-resize',
                        backgroundColor: resizingColumn === colIndex ? '#a01729' : 'transparent',
                        zIndex: 30,
                        '&:hover': {
                          backgroundColor: '#c41e3a',
                          opacity: 0.8,
                        },
                        '&:active': {
                          backgroundColor: '#a01729',
                        }
                      }}
                      onMouseDown={(e: React.MouseEvent) => {
                        console.log('🖱️ Resize handle mousedown for column:', colIndex);
                        handleResizeStart(e, colIndex);
                      }}
                      onClick={(e: React.MouseEvent) => {
                        console.log('🖱️ Resize handle click for column:', colIndex);
                        e.stopPropagation();
                      }}
                      title="Drag to resize column"
                    />
                  </Box>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleData.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex}>
                <td style={{ 
                  width: Math.round((50 * zoomLevel) / 100),
                  backgroundColor: '#f3f2f1',
                  fontWeight: 600,
                  textAlign: 'center',
                  padding: '6px 4px',
                  border: showGridlines ? '1px solid #c7c7c7' : '1px solid #f3f2f1',
                  borderRight: '1px solid #c7c7c7',
                  fontSize: `${Math.round((11 * zoomLevel) / 100)}px`,
                  fontFamily: '"Segoe UI", system-ui, sans-serif',
                  color: '#605e5c',
                  userSelect: 'none',
                  cursor: 'pointer'
                }}>
                  {rowIndex + 1}
                </td>
                {Array.from({ length: maxCols }, (_, colIndex) => (
                  <td 
                    key={colIndex}
                    onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                    style={getCellStyle(row[colIndex], rowIndex, colIndex)}
                    title={formatCellValue(row[colIndex])}
                  >
                    {formatCellValue(row[colIndex])}
                  </td>
                ))}
              </tr>
            ))}
            {currentSheet.data.length > visibleRows && (
              <tr>
                <td colSpan={maxCols + 1} style={{ 
                  textAlign: 'center',
                  padding: '16px',
                  backgroundColor: '#faf9f8',
                  border: showGridlines ? '1px solid #c7c7c7' : 'none',
                  fontStyle: 'italic',
                  color: '#605e5c',
                  fontSize: `${Math.round((12 * zoomLevel) / 100)}px`,
                  fontFamily: '"Segoe UI", system-ui, sans-serif'
                }}>
                  ⋯ {currentSheet.data.length - visibleRows} more rows (download file to view complete dataset)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Box>

      {/* Status Bar - Excel Style */}
      <Box sx={{ 
        bgcolor: '#f3f2f1', 
        borderTop: '1px solid #c7c7c7',
        px: 2,
        py: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#605e5c',
        minHeight: '32px'
      }}>
        <Typography variant="caption" sx={{ fontSize: '12px', color: '#605e5c' }}>
          {selectedCell 
            ? `${getColumnName(selectedCell.col)}${selectedCell.row + 1}: ${formatCellValue(visibleData[selectedCell.row]?.[selectedCell.col] || '')}`
            : currentSheet.isLimited 
              ? `Limited view: ${visibleRows}/${currentSheet.data.length} rows shown`
              : 'Ready'
          }
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontSize: '12px' }}>
            Sheet {activeSheet + 1} of {spreadsheetData.sheets.length}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '12px' }}>
            {currentSheet.originalSize}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '12px', fontWeight: 500 }}>
            {zoomLevel}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default DocumentViewer;