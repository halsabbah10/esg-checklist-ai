import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Assessment,
  CheckCircle,
  Warning,
  Error,
  Visibility,
} from '@mui/icons-material';

interface Report {
  id: string;
  name: string;
  type: 'compliance' | 'performance' | 'summary';
  format: 'pdf' | 'excel' | 'csv';
  generated_at: string;
  status: 'ready' | 'generating' | 'failed';
  size: string;
}

interface KPIData {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('all');
  const [timeRange, setTimeRange] = useState('30');

  // Mock KPI data
  const kpiData: KPIData[] = [
    {
      label: 'Total Items',
      value: 1247,
      change: 12,
      trend: 'up',
      icon: <Assessment sx={{ fontSize: 20 }} />,
    },
    {
      label: 'Completed %',
      value: '87.3%',
      change: 5.2,
      trend: 'up',
      icon: <CheckCircle sx={{ fontSize: 20 }} />,
    },
    {
      label: 'Overdue Items',
      value: 23,
      change: -8,
      trend: 'down',
      icon: <Warning sx={{ fontSize: 20 }} />,
    },
    {
      label: 'Critical Issues',
      value: 5,
      change: 0,
      trend: 'neutral',
      icon: <Error sx={{ fontSize: 20 }} />,
    },
  ];

  // Mock reports data - replace with real API calls
  const mockReports: Report[] = [
    {
      id: '1',
      name: 'ESG Compliance Summary Q2 2025',
      type: 'compliance',
      format: 'pdf',
      generated_at: '2025-07-04T10:30:00Z',
      status: 'ready',
      size: '2.4 MB',
    },
    {
      id: '2',
      name: 'Performance Metrics Report',
      type: 'performance',
      format: 'excel',
      generated_at: '2025-07-03T15:45:00Z',
      status: 'ready',
      size: '1.8 MB',
    },
    {
      id: '3',
      name: 'Weekly Summary Report',
      type: 'summary',
      format: 'csv',
      generated_at: '2025-07-04T08:00:00Z',
      status: 'generating',
      size: '-',
    },
  ];

  const filteredReports = mockReports.filter(report => 
    reportType === 'all' || report.type === reportType
  );

  const KPICard: React.FC<{ data: KPIData }> = ({ data }) => {
    const getTrendIcon = () => {
      if (data.trend === 'up') return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
      if (data.trend === 'down') return <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />;
      return null;
    };

    const getTrendColor = () => {
      if (data.trend === 'up') return 'success.main';
      if (data.trend === 'down') return 'error.main';
      return 'text.secondary';
    };

    return (
      <Card 
        sx={{ 
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '0.25rem',
          p: 2,
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
          }
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography 
              variant="body2" 
              sx={{ 
                textTransform: 'uppercase',
                color: 'text.secondary',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              {data.label}
            </Typography>
            {data.icon && (
              <Box sx={{ color: 'text.secondary' }}>
                {data.icon}
              </Box>
            )}
          </Box>
          
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              color: 'text.primary',
              mb: 1,
            }}
          >
            {data.value}
          </Typography>
          
          {data.change !== undefined && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {getTrendIcon()}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: getTrendColor(),
                  fontWeight: 500,
                }}
              >
                {data.change > 0 ? '+' : ''}{data.change}
                {data.trend !== 'neutral' ? '%' : ''}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      ready: { color: 'success', label: 'Ready' },
      generating: { color: 'warning', label: 'Generating' },
      failed: { color: 'error', label: 'Failed' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ready;
    
    return (
      <Chip
        label={config.label}
        size="small"
        color={config.color as any}
        sx={{ minWidth: 80 }}
      />
    );
  };

  const getTypeChip = (type: string) => (
    <Chip
      label={type.charAt(0).toUpperCase() + type.slice(1)}
      size="small"
      variant="outlined"
      sx={{
        bgcolor: 'background.paper',
        color: 'primary.main',
        borderColor: 'primary.main',
      }}
    />
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
          ESG Reports & Analytics
        </Typography>
        <Button
          variant="contained"
          startIcon={<Download />}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
            borderRadius: '0.25rem',
          }}
        >
          Export Dashboard
        </Button>
      </Box>

      {/* KPI Summary Cards */}
      <Box 
        display="grid" 
        gridTemplateColumns={{
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)',
        }}
        gap={3} 
        mb={4}
      >
        {kpiData.map((kpi) => (
          <KPICard key={kpi.label} data={kpi} />
        ))}
      </Box>

      {/* Filters */}
      <Box 
        display="flex" 
        gap={2} 
        mb={3}
        p={2}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: '0.25rem',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Report Type</InputLabel>
          <Select
            value={reportType}
            label="Report Type"
            onChange={(e) => setReportType(e.target.value)}
            sx={{ borderRadius: '0.25rem' }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="compliance">Compliance</MenuItem>
            <MenuItem value="performance">Performance</MenuItem>
            <MenuItem value="summary">Summary</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
            sx={{ borderRadius: '0.25rem' }}
          >
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
            <MenuItem value="365">Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Reports List */}
      <Paper sx={{ borderRadius: '0.25rem', border: '1px solid', borderColor: 'divider' }}>
        <Box p={3}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Available Reports
          </Typography>
          
          <Stack spacing={2}>
            {filteredReports.map((report) => (
              <Card 
                key={report.id}
                sx={{ 
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '0.25rem',
                  '&:hover': {
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
                        {report.name}
                      </Typography>
                      
                      <Box display="flex" gap={1} mb={2}>
                        {getTypeChip(report.type)}
                        {getStatusChip(report.status)}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        Generated: {formatDate(report.generated_at)} • Size: {report.size}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" gap={1}>
                      {report.status === 'ready' && (
                        <>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            variant="outlined"
                            sx={{ borderRadius: '0.25rem' }}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Download />}
                            variant="contained"
                            sx={{ borderRadius: '0.25rem' }}
                          >
                            Download
                          </Button>
                        </>
                      )}
                      {report.status === 'generating' && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <CircularProgress size={16} />
                          <Typography variant="caption" color="text.secondary">
                            Generating...
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {filteredReports.length === 0 && (
            <Box py={4} textAlign="center">
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No reports found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or generate a new report
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
