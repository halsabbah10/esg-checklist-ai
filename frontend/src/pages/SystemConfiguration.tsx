import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Save,
  Restore,
  Security,
  Notifications,
  Storage,
  Analytics,
  Edit,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface SystemConfig {
  ai_processing: {
    enabled: boolean;
    max_file_size: number;
    allowed_formats: string[];
    processing_timeout: number;
  };
  notifications: {
    email_enabled: boolean;
    sms_enabled: boolean;
    in_app_enabled: boolean;
    notification_frequency: 'immediate' | 'daily' | 'weekly';
  };
  security: {
    session_timeout: number;
    max_login_attempts: number;
    password_expiry_days: number;
    require_2fa: boolean;
  };
  analytics: {
    data_retention_days: number;
    anonymize_data: boolean;
    export_enabled: boolean;
  };
  storage: {
    max_upload_size: number;
    cleanup_frequency: 'daily' | 'weekly' | 'monthly';
    backup_enabled: boolean;
  };
}

export const SystemConfiguration: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<{ section: string; field: string; value: any } | null>(null);
  const queryClient = useQueryClient();

  const { data: systemConfig, isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => adminAPI.getSystemConfig().then((res: any) => res.data),
  });

  // Set config when data is loaded
  useEffect(() => {
    if (systemConfig) {
      setConfig(systemConfig);
    }
  }, [systemConfig]);

  const saveMutation = useMutation({
    mutationFn: (newConfig: SystemConfig) => adminAPI.updateSystemConfig(newConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      setHasChanges(false);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => adminAPI.resetSystemConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      setHasChanges(false);
    },
  });

  const handleConfigChange = (section: keyof SystemConfig, field: string, value: any) => {
    if (!config) return;
    
    const newConfig = {
      ...config,
      [section]: {
        ...config[section],
        [field]: value,
      },
    };
    setConfig(newConfig);
    setHasChanges(true);
  };

  const handleArrayChange = (section: keyof SystemConfig, field: string, action: 'add' | 'remove', value?: string, index?: number) => {
    if (!config) return;
    
    const currentArray = (config[section] as any)[field] as string[];
    let newArray: string[];
    
    if (action === 'add' && value) {
      newArray = [...currentArray, value];
    } else if (action === 'remove' && index !== undefined) {
      newArray = currentArray.filter((_, i) => i !== index);
    } else {
      return;
    }
    
    handleConfigChange(section, field, newArray);
  };

  const openEditDialog = (section: string, field: string, value: any) => {
    setEditingField({ section, field, value });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingField(null);
  };

  const saveEdit = () => {
    if (editingField) {
      handleConfigChange(editingField.section as keyof SystemConfig, editingField.field, editingField.value);
    }
    closeEditDialog();
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading system configuration..." />;
  }

  if (!config) {
    return (
      <Alert severity="error">
        Failed to load system configuration.
      </Alert>
    );
  }

  const configSections = [
    {
      key: 'ai_processing',
      title: 'AI Processing',
      icon: <Analytics />,
      fields: [
        { key: 'enabled', label: 'AI Processing Enabled', type: 'boolean' },
        { key: 'max_file_size', label: 'Max File Size (MB)', type: 'number' },
        { key: 'allowed_formats', label: 'Allowed Formats', type: 'array' },
        { key: 'processing_timeout', label: 'Processing Timeout (seconds)', type: 'number' },
      ],
    },
    {
      key: 'notifications',
      title: 'Notifications',
      icon: <Notifications />,
      fields: [
        { key: 'email_enabled', label: 'Email Notifications', type: 'boolean' },
        { key: 'sms_enabled', label: 'SMS Notifications', type: 'boolean' },
        { key: 'in_app_enabled', label: 'In-App Notifications', type: 'boolean' },
        { key: 'notification_frequency', label: 'Notification Frequency', type: 'select', options: ['immediate', 'daily', 'weekly'] },
      ],
    },
    {
      key: 'security',
      title: 'Security',
      icon: <Security />,
      fields: [
        { key: 'session_timeout', label: 'Session Timeout (minutes)', type: 'number' },
        { key: 'max_login_attempts', label: 'Max Login Attempts', type: 'number' },
        { key: 'password_expiry_days', label: 'Password Expiry (days)', type: 'number' },
        { key: 'require_2fa', label: 'Require 2FA', type: 'boolean' },
      ],
    },
    {
      key: 'analytics',
      title: 'Analytics',
      icon: <Analytics />,
      fields: [
        { key: 'data_retention_days', label: 'Data Retention (days)', type: 'number' },
        { key: 'anonymize_data', label: 'Anonymize Data', type: 'boolean' },
        { key: 'export_enabled', label: 'Export Enabled', type: 'boolean' },
      ],
    },
    {
      key: 'storage',
      title: 'Storage',
      icon: <Storage />,
      fields: [
        { key: 'max_upload_size', label: 'Max Upload Size (MB)', type: 'number' },
        { key: 'cleanup_frequency', label: 'Cleanup Frequency', type: 'select', options: ['daily', 'weekly', 'monthly'] },
        { key: 'backup_enabled', label: 'Backup Enabled', type: 'boolean' },
      ],
    },
  ];

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          System Configuration
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Restore />}
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={() => saveMutation.mutate(config)}
            disabled={!hasChanges || saveMutation.isPending}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You have unsaved changes. Don't forget to save your configuration.
        </Alert>
      )}

      <Box display="grid" sx={{ gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {configSections.map((section) => (
          <Box key={section.key}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  {section.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {section.title}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                <List dense>
                  {section.fields.map((field) => {
                    const value = (config[section.key as keyof SystemConfig] as any)[field.key];
                    
                    return (
                      <ListItem key={field.key}>
                        <ListItemText
                          primary={field.label}
                          secondary={
                            field.type === 'array' ? (
                              <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                                {value.map((item: string, index: number) => (
                                  <Chip
                                    key={index}
                                    label={item}
                                    size="small"
                                    onDelete={() => handleArrayChange(section.key as keyof SystemConfig, field.key, 'remove', undefined, index)}
                                  />
                                ))}
                                <Chip
                                  label="+ Add"
                                  size="small"
                                  variant="outlined"
                                  onClick={() => openEditDialog(section.key, field.key, '')}
                                />
                              </Box>
                            ) : field.type === 'boolean' ? (
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={value}
                                    onChange={(e) => handleConfigChange(section.key as keyof SystemConfig, field.key, e.target.checked)}
                                  />
                                }
                                label=""
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {String(value)}
                              </Typography>
                            )
                          }
                        />
                        {field.type !== 'boolean' && field.type !== 'array' && (
                          <ListItemSecondaryAction>
                            <Tooltip title="Edit">
                              <IconButton
                                edge="end"
                                onClick={() => openEditDialog(section.key, field.key, value)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={closeEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit {editingField?.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </DialogTitle>
        <DialogContent>
          {editingField?.field === 'allowed_formats' ? (
            <TextField
              fullWidth
              label="Add Format"
              value={editingField.value}
              onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
              placeholder="e.g., .pdf, .xlsx, .docx"
            />
          ) : (
            <TextField
              fullWidth
              type={typeof editingField?.value === 'number' ? 'number' : 'text'}
              value={editingField?.value || ''}
              onChange={(e) => setEditingField({ 
                ...editingField!, 
                value: typeof editingField?.value === 'number' ? Number(e.target.value) : e.target.value 
              })}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button onClick={saveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemConfiguration;
