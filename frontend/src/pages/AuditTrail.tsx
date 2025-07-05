import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  GetApp,
  FilterList,
  Search,
  Refresh,
  Warning,
  Error,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { auditAPI, exportAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure' | 'warning' | 'info';
  details: unknown;
  session_id: string;
}

export const AuditTrail: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    resource_type: '',
    status: '',
    start_date: '',
    end_date: '',
    search: '',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const {
    data: auditLogs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs', page, rowsPerPage, filters],
    queryFn: () =>
      auditAPI
        .getAuditLogs({
          page: page + 1,
          limit: rowsPerPage,
          ...filters,
        })
        .then(res => res.data),
  });

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      user_id: '',
      action: '',
      resource_type: '',
      status: '',
      start_date: '',
      end_date: '',
      search: '',
    });
    setPage(0);
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const response = await exportAPI.exportAuditLogs({ format, ...filters });
      const blob = new Blob([response.data], {
        type:
          format === 'csv'
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'failure':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'info':
        return <Info color="info" />;
      default:
        return <Info />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success' as const;
      case 'failure':
        return 'error' as const;
      case 'warning':
        return 'warning' as const;
      case 'info':
        return 'info' as const;
      default:
        return 'default' as const;
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading audit logs..." />;
  }

  const logs = auditLogs?.results || [];
  const totalCount = auditLogs?.total || 0;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Audit Trail</Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<GetApp />} onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
          <Button variant="outlined" startIcon={<GetApp />} onClick={() => handleExport('xlsx')}>
            Export Excel
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetch()}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Box
            display="grid"
            gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
            gap={2}
            mb={2}
          >
            <TextField
              label="Search"
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              placeholder="Search logs..."
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            <FormControl>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={e => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="failure">Failure</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Action</InputLabel>
              <Select
                value={filters.action}
                label="Action"
                onChange={e => handleFilterChange('action', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="logout">Logout</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="update">Update</MenuItem>
                <MenuItem value="delete">Delete</MenuItem>
                <MenuItem value="upload">Upload</MenuItem>
                <MenuItem value="download">Download</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Resource Type</InputLabel>
              <Select
                value={filters.resource_type}
                label="Resource Type"
                onChange={e => handleFilterChange('resource_type', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="checklist">Checklist</MenuItem>
                <MenuItem value="submission">Submission</MenuItem>
                <MenuItem value="upload">Upload</MenuItem>
                <MenuItem value="system">System</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box display="flex" gap={2}>
            <TextField
              type="datetime-local"
              label="Start Date"
              value={filters.start_date}
              onChange={e => handleFilterChange('start_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="datetime-local"
              label="End Date"
              value={filters.end_date}
              onChange={e => handleFilterChange('end_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="outlined" startIcon={<FilterList />} onClick={clearFilters}>
              Clear Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Showing {logs.length} of {totalCount} audit log entries
      </Alert>

      {/* Audit Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log: AuditLog) => (
              <TableRow key={log.id} hover>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{log.user_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {log.user_id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={log.action} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{log.resource_type}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {log.resource_id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getStatusIcon(log.status)}
                    <Chip label={log.status} color={getStatusColor(log.status)} size="small" />
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {log.ip_address}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton onClick={() => handleViewDetails(log)} size="small">
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Audit Log Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} mb={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    User
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.user_name} ({selectedLog.user_id})
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Action
                  </Typography>
                  <Typography variant="body1">{selectedLog.action}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Resource
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.resource_type} ({selectedLog.resource_id})
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(selectedLog.status)}
                    <Typography variant="body1">{selectedLog.status}</Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Session ID
                  </Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {selectedLog.session_id}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="h6" gutterBottom>
                Technical Details
              </Typography>
              <Box display="grid" gridTemplateColumns="1fr" gap={2} mb={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    IP Address
                  </Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {selectedLog.ip_address}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    User Agent
                  </Typography>
                  <Typography
                    variant="body1"
                    fontFamily="monospace"
                    sx={{ wordBreak: 'break-all' }}
                  >
                    {selectedLog.user_agent}
                  </Typography>
                </Box>
              </Box>

              {selectedLog.details != null && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Additional Details
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography
                      component="pre"
                      variant="body2"
                      fontFamily="monospace"
                      sx={{ whiteSpace: 'pre-wrap' }}
                    >
                      {(() => {
                        const details = selectedLog.details;
                        if (details == null) return 'No additional details available';
                        if (typeof details === 'object') {
                          return JSON.stringify(details, null, 2);
                        }
                        return String(details);
                      })()}
                    </Typography>
                  </Paper>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditTrail;
