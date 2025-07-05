import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
} from '@mui/material';
import { CloudUpload, Delete, Description, CheckCircle, Error } from '@mui/icons-material';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface FileUploaderProps {
  onFilesUploaded?: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  multiple?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesUploaded,
  acceptedFileTypes = ['.xlsx', '.xls', '.csv', '.txt', '.pdf'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const validFiles = fileArray.filter(file => {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is ${formatFileSize(maxFileSize)}`);
        return false;
      }

      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFileTypes.includes(fileExtension)) {
        alert(
          `File ${file.name} is not a supported format. Supported: ${acceptedFileTypes.join(', ')}`
        );
        return false;
      }

      return true;
    });

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      size: file.size,
      status: 'completed',
      progress: 100,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    if (onFilesUploaded) {
      onFilesUploaded(validFiles);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Description color="action" />;
    }
  };

  const getStatusColor = (
    status: UploadedFile['status']
  ): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
        return 'warning';
      case 'uploading':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Paper
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: 'grey.300',
          textAlign: 'center',
          mb: 3,
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = multiple;
          input.accept = acceptedFileTypes.join(',');
          input.onchange = e => handleFileSelect((e.target as HTMLInputElement).files);
          input.click();
        }}
      >
        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />

        <Typography variant="h6" gutterBottom>
          Click to select files
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Supported formats: {acceptedFileTypes.join(', ')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Maximum file size: {formatFileSize(maxFileSize)}
        </Typography>
        <Button variant="outlined" sx={{ mt: 2 }}>
          Choose Files
        </Button>
      </Paper>

      {files.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Selected Files ({files.length})
            </Typography>

            <List>
              {files.map((file, index) => (
                <Box key={file.id}>
                  <ListItem>
                    <Box display="flex" alignItems="center" mr={2}>
                      {getStatusIcon(file.status)}
                    </Box>

                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1">{file.name}</Typography>
                          <Chip
                            label={file.status}
                            size="small"
                            color={getStatusColor(file.status)}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {formatFileSize(file.size)}
                        </Typography>
                      }
                    />

                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => removeFile(file.id)}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {index < files.length - 1 && (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />
                  )}
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
