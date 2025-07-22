import React, { useState, useRef } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Paper,
  Alert,
  Chip,
} from '@mui/material';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';

interface Step2Props {
  state: any;
  onComplete: (data: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.csv', '.txt'];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function Step2DocumentUpload({ state, onComplete, onError, onBack }: Step2Props) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(state.uploadedFile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB`;
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return `File type "${fileExtension}" is not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      onError(error);
      return;
    }

    setSelectedFile(file);
    // Clear any previous errors
    onError('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const proceedToAnalysis = () => {
    if (!selectedFile) {
      onError('Please select a file to upload');
      return;
    }

    onComplete({ file: selectedFile });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      case 'xlsx':
        return '📊';
      case 'csv':
        return '📋';
      case 'txt':
        return '📃';
      default:
        return '📄';
    }
  };

  return (
    <Box>
      {/* Selected Configuration Summary */}
      <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
        <CardHeader>
          <Typography variant="h6" color="text.primary">
            Analysis Configuration
          </Typography>
        </CardHeader>
        <CardContent>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={2}>
            <Box>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                AI Model
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {state.selectedModel}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                Department
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {state.selectedDepartment}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                Analysis Type
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ESG Checklist Document
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Box mb={3}>
        <Box display="flex" alignItems="center" mb={2}>
          <Upload size={20} style={{ marginRight: 8, color: '#2e7d32' }} />
          <Typography variant="h6">Upload ESG Checklist Document</Typography>
        </Box>

        <Paper
          sx={{
            position: 'relative',
            border: 2,
            borderStyle: 'dashed',
            borderColor: dragActive ? 'primary.main' : selectedFile ? 'success.main' : 'grey.300',
            bgcolor: dragActive ? 'primary.50' : selectedFile ? 'success.50' : 'background.paper',
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: selectedFile ? 'success.main' : 'grey.400'
            }
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            style={{ 
              position: 'absolute', 
              inset: 0, 
              width: '100%', 
              height: '100%', 
              opacity: 0, 
              cursor: 'pointer' 
            }}
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileInputChange}
          />

          {selectedFile ? (
            <Box>
              <Box display="flex" justifyContent="center" mb={2}>
                <Typography variant="h3">{getFileIcon(selectedFile.name)}</Typography>
              </Box>
              <Typography variant="h6" color="success.main" gutterBottom>
                {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="success.600" gutterBottom>
                {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
              </Typography>
              <Box display="flex" justifyContent="center" alignItems="center" gap={1} mt={2}>
                <Chip 
                  icon={<CheckCircle2 size={16} />}
                  label="File Selected" 
                  color="success" 
                  size="small"
                />
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<X size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  Remove
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Box display="flex" justifyContent="center" mb={2}>
                <Upload size={48} color={dragActive ? '#1976d2' : '#9e9e9e'} />
              </Box>
              <Typography variant="h6" color="text.primary" gutterBottom>
                {dragActive ? 'Drop your file here' : 'Upload your ESG checklist document'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Upload your ESG checklist document for AI analysis
              </Typography>
              <Button variant="outlined" sx={{ mt: 2 }} startIcon={<FileText size={16} />}>
                Choose File
              </Button>
            </Box>
          )}
        </Paper>

        {/* File Requirements */}
        <Alert severity="info" sx={{ mt: 2 }} icon={<AlertCircle />}>
          <Box>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              File Requirements:
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2">
                <strong>Supported formats:</strong> {ALLOWED_EXTENSIONS.join(', ')}
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Maximum size:</strong> {MAX_FILE_SIZE_MB}MB
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Content:</strong> ESG checklist documents, questionnaires, or compliance forms
              </Typography>
            </Box>
          </Box>
        </Alert>

        {/* Best Practices */}
        <Card sx={{ mt: 2, bgcolor: 'grey.50' }}>
          <CardHeader>
            <Typography variant="body2" fontWeight="medium">
              💡 Best Practices for Better Analysis
            </Typography>
          </CardHeader>
          <CardContent sx={{ pt: 0 }}>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" gutterBottom>
                Upload complete ESG checklist documents for comprehensive analysis
              </Typography>
              <Typography component="li" variant="body2" gutterBottom>
                Ensure text is clear and readable (avoid scanned images when possible)
              </Typography>
              <Typography component="li" variant="body2" gutterBottom>
                Include all relevant sections: Environmental, Social, and Governance
              </Typography>
              <Typography component="li" variant="body2">
                For Excel files, organize your ESG checklist data in clearly labeled sheets
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="space-between">
        <Button variant="outlined" onClick={onBack}>
          Back to Selection
        </Button>
        
        <Button
          variant="contained"
          onClick={proceedToAnalysis}
          disabled={!selectedFile}
          sx={{ minWidth: 150 }}
        >
          Start AI Analysis
        </Button>
      </Box>
    </Box>
  );
}