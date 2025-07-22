import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Download,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { filesAPI } from '../services/api';

interface ExcelViewerProps {
  uploadId: number;
  filename: string;
}

interface CellData {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'formula';
  formula?: string;
  style?: {
    backgroundColor?: string;
    color?: string;
    fontWeight?: string;
    textAlign?: string;
  };
}

interface WorksheetData {
  name: string;
  data: CellData[][];
  range: string;
  cols: number;
  rows: number;
}

interface WorkbookData {
  sheets: WorksheetData[];
  filename: string;
}

const ExcelViewer: React.FC<ExcelViewerProps> = ({ uploadId, filename }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Column labels: A, B, C, ..., Z, AA, AB, etc.
  const getColumnLabel = useCallback((index: number): string => {
    let result = '';
    let num = index;
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  }, []);

  // Parse Excel file using xlsx library
  const parseExcelFile = useCallback(async (arrayBuffer: ArrayBuffer): Promise<WorkbookData> => {
    try {
      console.log('Starting Excel file parsing with XLSX library...');
      
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellStyles: true,
        cellHTML: false,
        cellFormula: true,
        cellDates: true,
      });

      console.log('XLSX.read completed successfully');
      console.log('Workbook sheet names:', workbook.SheetNames);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in Excel file');
      }

      const sheets: WorksheetData[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      const rows = range.e.r + 1;
      const cols = range.e.c + 1;
      
      // Aggressive limits to prevent lag (max 50 rows x 20 columns initially)
      const maxRows = Math.min(rows, 50);
      const maxCols = Math.min(cols, 20);
      
      // Initialize data array with limited size
      const data: CellData[][] = Array(maxRows).fill(null).map(() => 
        Array(maxCols).fill(null).map(() => ({ value: '', type: 'string' as const }))
      );
      
      console.log(`Processing sheet "${sheetName}": ${maxRows}x${maxCols} (original: ${rows}x${cols})`);
      
      // Fill data from worksheet with size limits
      for (let row = 0; row < maxRows; row++) {
        for (let col = 0; col < maxCols; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell) {
            let cellData: CellData = {
              value: cell.v || '',
              type: 'string',
            };

            // Determine cell type
            if (cell.t === 'n') {
              cellData.type = 'number';
              cellData.value = typeof cell.v === 'number' ? cell.v : parseFloat(cell.v || '0');
            } else if (cell.t === 'b') {
              cellData.type = 'boolean';
              cellData.value = Boolean(cell.v);
            } else if (cell.t === 'd') {
              cellData.type = 'date';
              cellData.value = cell.v;
            } else if (cell.f) {
              cellData.type = 'formula';
              cellData.formula = cell.f;
              cellData.value = cell.v || '';
            } else {
              cellData.type = 'string';
              cellData.value = String(cell.v || '');
            }

            // Add basic styling if available
            if (cell.s) {
              cellData.style = {
                backgroundColor: cell.s.fgColor?.rgb ? `#${cell.s.fgColor.rgb}` : undefined,
                color: cell.s.font?.color?.rgb ? `#${cell.s.font.color.rgb}` : undefined,
                fontWeight: cell.s.font?.bold ? 'bold' : undefined,
                textAlign: cell.s.alignment?.horizontal || 'left',
              };
            }

            data[row][col] = cellData;
          }
        }
        
        // Yield control every 20 rows to prevent freezing
        if (row % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      sheets.push({
        name: sheetName,
        data,
        range: worksheet['!ref'] || 'A1:A1',
        cols: maxCols,
        rows: maxRows,
      });
    }

      console.log(`Processed ${sheets.length} sheets successfully`);

      return {
        sheets,
        filename,
      };
    } catch (error: any) {
      console.error('Error parsing Excel file:', error);
      throw new Error(`Failed to parse Excel file: ${error.message || 'Unknown parsing error'}`);
    }
  }, [filename]);

  // Load Excel file
  useEffect(() => {
    const loadExcelFile = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Loading Excel file for upload ID:', uploadId);
        
        // Download the Excel file
        const response = await filesAPI.download(uploadId.toString());
        console.log('Downloaded file response:', response);
        console.log('Response content type:', response.headers['content-type']);
        console.log('Response data type:', typeof response.data);
        console.log('Response data instanceof Blob:', response.data instanceof Blob);
        
        if (!response.data) {
          throw new Error('No file data received from server');
        }
        
        // Ensure we have a blob
        let blob = response.data;
        if (!(blob instanceof Blob)) {
          console.log('Converting response data to blob...');
          blob = new Blob([response.data]);
        }
        
        console.log('Blob size:', blob.size, 'bytes');
        console.log('Blob type:', blob.type);
        
        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        // Convert blob to array buffer
        const arrayBuffer = await blob.arrayBuffer();
        console.log('Array buffer size:', arrayBuffer.byteLength, 'bytes');
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('File content is empty');
        }
        
        // Check if it looks like Excel file by checking the file signature
        const uint8Array = new Uint8Array(arrayBuffer.slice(0, 8));
        const signature = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('File signature (first 8 bytes):', signature);
        
        // Excel files should start with PK (50 4B) for XLSX or specific signatures for XLS
        if (!signature.startsWith('504b') && !signature.startsWith('d0cf')) {
          throw new Error(`File does not appear to be a valid Excel file. File signature: ${signature}`);
        }
        
        // Parse the Excel file
        console.log('Parsing Excel file...');
        const parsedWorkbook = await parseExcelFile(arrayBuffer);
        console.log('Parsed Excel workbook with', parsedWorkbook.sheets.length, 'sheets');
        
        setWorkbook(parsedWorkbook);
        
      } catch (error: any) {
        console.error('=== Excel Viewer Error Details ===');
        console.error('Full error object:', error);
        console.error('Error message:', error.message);
        console.error('Error response:', error.response);
        console.error('Error response status:', error.response?.status);
        console.error('Error response data:', error.response?.data);
        console.error('Error config:', error.config);
        console.error('Request URL:', error.config?.url);
        console.error('Request headers:', error.config?.headers);
        
        let errorMessage = 'Unable to load Excel file.';
        if (error.response?.status === 404) {
          errorMessage = `File not found on server. Upload ID: ${uploadId}.\n\nThis appears to be a backend issue where the file record exists in the database but the physical file is missing from disk. This typically happens when:\n• Files fail to save properly during upload\n• Files are deleted after upload\n• There's a mismatch between database and file system\n\nPlease contact the administrator or try re-uploading the file.`;
        } else if (error.response?.status === 403) {
          errorMessage = 'Access denied. You may not have permission to view this file.';
        } else if (error.response?.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.code === 'NETWORK_ERROR') {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message) {
          errorMessage = `${error.message} (Status: ${error.response?.status || 'Unknown'})`;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadExcelFile();
  }, [uploadId, parseExcelFile, filename]);

  // Format cell value for display
  const formatCellValue = useCallback((cellData: CellData): string => {
    if (cellData.value === null || cellData.value === undefined) return '';
    
    switch (cellData.type) {
      case 'number':
        if (typeof cellData.value === 'number') {
          // Format numbers appropriately
          return cellData.value % 1 === 0 
            ? cellData.value.toString() 
            : cellData.value.toFixed(2);
        }
        return String(cellData.value);
      case 'boolean':
        return cellData.value ? 'TRUE' : 'FALSE';
      case 'date':
        return cellData.value instanceof Date 
          ? cellData.value.toLocaleDateString() 
          : String(cellData.value);
      case 'formula':
        return String(cellData.value); // Show calculated value, not formula
      default:
        return String(cellData.value);
    }
  }, []);

  // Handle cell click - optimized with React.memo
  const handleCellClick = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
  }, []);

  // Handle context menu
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX - 2, mouseY: event.clientY - 4 });
  }, []);

  // Download file
  const handleDownload = useCallback(() => {
    filesAPI.download(uploadId.toString()).then(response => {
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }).catch(error => {
      console.error('Download failed:', error);
    });
  }, [uploadId, filename]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading Excel Spreadsheet...</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Parsing {filename}...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h5" gutterBottom color="primary">
          📊 Microsoft Excel Spreadsheet
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {error}
        </Typography>
        <Typography variant="h6" sx={{ mb: 3 }}>
          {filename}
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          startIcon={<Download />}
          onClick={handleDownload}
          sx={{ 
            px: 4, 
            py: 1.5,
            background: 'linear-gradient(45deg, #107C41 30%, #185C37 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #0e6b37 30%, #145a33 90%)',
            }
          }}
        >
          Download Excel File
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
          Open with Microsoft Excel, Google Sheets, or compatible spreadsheet application
        </Typography>
      </Box>
    );
  }

  if (!workbook || workbook.sheets.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" gutterBottom color="text.secondary">
          📊 Empty Spreadsheet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No data found in this Excel file.
        </Typography>
      </Box>
    );
  }

  const currentSheet = workbook.sheets[activeSheet];
  const selectedCellData = selectedCell 
    ? currentSheet.data[selectedCell.row]?.[selectedCell.col] 
    : null;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
      {/* Excel-like toolbar */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider', 
        backgroundColor: 'white',
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap'
      }}>
        <Typography variant="subtitle2" sx={{ color: '#107C41', fontWeight: 'bold', mr: 2 }}>
          📊 {filename}
        </Typography>
        
        <Divider orientation="vertical" flexItem />
        
        <Tooltip title="Download File">
          <IconButton 
            size="small" 
            onClick={handleDownload}
            sx={{
              color: '#000000 !important',
              backgroundColor: '#FFFFFF !important',
              border: '2px solid #000000 !important',
              padding: '6px !important',
              '& .MuiSvgIcon-root': {
                fontSize: '20px !important',
                color: '#000000 !important',
              },
              '&:hover': {
                backgroundColor: '#F0F0F0 !important',
                '& .MuiSvgIcon-root': {
                  color: '#000000 !important',
                },
              },
              '@media (prefers-color-scheme: dark)': {
                color: '#FFFFFF !important',
                backgroundColor: '#2D2D2D !important',
                borderColor: '#FFFFFF !important',
                '& .MuiSvgIcon-root': {
                  color: '#FFFFFF !important',
                },
                '&:hover': {
                  backgroundColor: '#404040 !important',
                  '& .MuiSvgIcon-root': {
                    color: '#FFFFFF !important',
                  },
                }
              }
            }}
          >
            <Download sx={{ fontSize: 20, color: 'inherit' }} />
          </IconButton>
        </Tooltip>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {selectedCell && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            backgroundColor: '#f0f0f0',
            px: 2,
            py: 0.5,
            borderRadius: 1,
            fontSize: '12px'
          }}>
            <Typography variant="caption" fontFamily="monospace" fontWeight="bold">
              {getColumnLabel(selectedCell.col)}{selectedCell.row + 1}
            </Typography>
            {selectedCellData?.formula && (
              <>
                <Divider orientation="vertical" flexItem />
                <Typography variant="caption" fontFamily="monospace">
                  ={selectedCellData.formula}
                </Typography>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Sheet tabs */}
      {workbook.sheets.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'white' }}>
          <Tabs 
            value={activeSheet} 
            onChange={(_e, newValue) => setActiveSheet(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '13px',
                minWidth: '80px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #d0d0d0',
                borderRadius: '4px 4px 0 0',
                marginRight: '2px',
                '&.Mui-selected': {
                  backgroundColor: 'white',
                  borderBottomColor: 'white',
                  fontWeight: 'bold',
                }
              }
            }}
          >
            {workbook.sheets.map((sheet, index) => (
              <Tab 
                key={index} 
                label={sheet.name}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Excel grid */}
      <Box 
        ref={tableRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          backgroundColor: 'white',
        }}
        onContextMenu={handleContextMenu}
      >
        <TableContainer sx={{ 
            maxHeight: '50vh', 
            overflow: 'auto',
            // Performance optimizations
            willChange: 'scroll-position',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            // Custom scrollbars
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,0.1)',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
            },
          }}>
          <Table 
            size="small" 
            stickyHeader
            sx={{ 
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed', // Fixed layout for better performance
              '& .MuiTableCell-root': {
                padding: '4px 6px', // Reduced padding
                border: '1px solid #e0e0e0',
                fontSize: '13px',
              }
            }}
          >
            {/* Column headers */}
            <TableHead>
              <TableRow>
                {/* Corner cell */}
                <TableCell 
                  sx={{ 
                    width: '50px',
                    backgroundColor: '#e8f0fe', 
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#1a73e8',
                  }}
                />
                {Array.from({ length: currentSheet.cols }, (_, index) => (
                  <TableCell 
                    key={index} // Simpler key
                    sx={{ 
                      backgroundColor: '#e8f0fe',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      color: '#1a73e8',
                      width: '120px', // Fixed width
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#d2e3fc',
                      }
                    }}
                  >
                    {getColumnLabel(index)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {currentSheet.data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {/* Row number */}
                  <TableCell 
                    sx={{ 
                      backgroundColor: '#e8f0fe',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      color: '#1a73e8',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#d2e3fc',
                      }
                    }}
                  >
                    {rowIndex + 1}
                  </TableCell>
                  
                  {row.map((cellData, colIndex) => {
                    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                    
                    return (
                      <TableCell
                        key={colIndex} // Simpler key
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        sx={{
                          fontFamily: cellData.type === 'number' ? 'monospace' : 'inherit',
                          backgroundColor: isSelected 
                            ? '#e3f2fd' 
                            : cellData.style?.backgroundColor || 'transparent',
                          color: cellData.style?.color || 'inherit',
                          fontWeight: cellData.style?.fontWeight || 'normal',
                          textAlign: cellData.type === 'number' ? 'right' : (cellData.style?.textAlign || 'left'),
                          cursor: 'cell',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          borderColor: isSelected ? '#1976d2' : '#e0e0e0',
                          borderWidth: isSelected ? '2px' : '1px',
                        }}
                        title={`${getColumnLabel(colIndex)}${rowIndex + 1}: ${formatCellValue(cellData)}${cellData.formula ? ` (=${cellData.formula})` : ''}`}
                      >
                        {formatCellValue(cellData)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Status bar */}
      <Box sx={{ 
        borderTop: 1, 
        borderColor: 'divider', 
        backgroundColor: '#f8f9fa',
        px: 2,
        py: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: 'text.secondary'
      }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <span>📊 {currentSheet.name}</span>
          <span>{currentSheet.rows} rows × {currentSheet.cols} columns</span>
          {currentSheet.rows > 50 && (
            <span style={{ color: '#f57c00' }}>Showing first 50 rows (for performance)</span>
          )}
          {currentSheet.cols > 20 && (
            <span style={{ color: '#f57c00' }}>• First 20 columns</span>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {selectedCell && selectedCellData && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>
                {getColumnLabel(selectedCell.col)}{selectedCell.row + 1}
              </span>
              <span>•</span>
              <span>{selectedCellData.type}</span>
              {selectedCellData.formula && (
                <>
                  <span>•</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    ={selectedCellData.formula}
                  </span>
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Context menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={() => { handleDownload(); setContextMenu(null); }}>
          <Download sx={{ mr: 1 }} /> Download File
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ExcelViewer;