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
  Alert,
} from '@mui/material';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Assessment,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Visibility,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { exportAPI, analyticsAPI } from '../services/api';

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
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf' | 'docx'>('pdf');

  // Fetch analytics data for KPI data (use auditor metrics for reviewers)
  const { data: dashboardData } = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: () => analyticsAPI.getAuditorMetrics().then(res => res.data),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  // KPI data from auditor metrics
  const kpiData: KPIData[] = [
    {
      label: 'Overall Score',
      value: dashboardData?.overallScore
        ? `${Math.round(dashboardData.overallScore * 100)}%`
        : '0%',
      trend: 'neutral',
      icon: <Assessment sx={{ fontSize: 20 }} />,
    },
    {
      label: 'Passed Audits',
      value: dashboardData?.passedAudits || 0,
      trend: 'up',
      icon: <CheckCircle sx={{ fontSize: 20 }} />,
    },
    {
      label: 'Pending Reviews',
      value: dashboardData?.pendingReviews || 0,
      trend: 'neutral',
      icon: <Warning sx={{ fontSize: 20 }} />,
    },
    {
      label: 'Failed Audits',
      value: dashboardData?.failedAudits || 0,
      trend: 'down',
      icon: <ErrorIcon sx={{ fontSize: 20 }} />,
    },
  ];

  // Generate available reports based on actual backend endpoints
  const generateReports = (): Report[] => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return [
      {
        id: 'checklists',
        name: `ESG Checklists Export ${now.getFullYear()}`,
        type: 'compliance',
        format: 'pdf',
        generated_at: now.toISOString(),
        status: 'ready',
        size: '2.4 MB',
      },
      {
        id: 'ai-results',
        name: 'AI Analysis Results Export',
        type: 'performance',
        format: 'pdf',
        generated_at: weekAgo.toISOString(),
        status: 'ready',
        size: '1.8 MB',
      },
      {
        id: 'submissions',
        name: 'User Submissions Export',
        type: 'summary',
        format: 'pdf',
        generated_at: monthAgo.toISOString(),
        status: 'ready',
        size: '850 KB',
      },
      {
        id: 'users',
        name: 'Users Directory Export',
        type: 'summary',
        format: 'pdf',
        generated_at: weekAgo.toISOString(),
        status: 'ready',
        size: '450 KB',
      },
    ];
  };

  const availableReports = generateReports();

  const filteredReports = availableReports.filter(
    report => reportType === 'all' || report.type === reportType
  );

  // Export mutations
  const exportDashboardMutation = useMutation({
    mutationFn: (format: 'csv' | 'xlsx' | 'pdf' | 'docx') => exportAPI.exportAnalytics(format),
    onSuccess: (response, format) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileExtension = format === 'xlsx' ? 'xlsx' : format;
      link.setAttribute(
        'download',
        `esg-analytics-dashboard-${new Date().toISOString().split('T')[0]}.${fileExtension}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    onError: (error) => {
      console.error('Export dashboard error:', error);
    },
  });

  const downloadReportMutation = useMutation({
    mutationFn: (data: { reportId: string; format: 'csv' | 'xlsx' | 'pdf' | 'docx' }) => {
      const { reportId, format } = data;
      // Map report IDs to appropriate export endpoints
      switch (reportId) {
        case 'checklists':
          return exportAPI.exportChecklists(format);
        case 'ai-results':
          return exportAPI.exportAIResults(format);
        case 'submissions':
          return exportAPI.exportSubmissions(format);
        case 'users':
          return exportAPI.exportUsers(format);
        default:
          throw new globalThis.Error(`Unknown report type: ${reportId}`);
      }
    },
    onSuccess: (response, data) => {
      const { reportId, format } = data;
      const report = availableReports.find(r => r.id === reportId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileExtension = format === 'xlsx' ? 'xlsx' : format;
      const filename = `${report?.name || 'report'}.${fileExtension}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    onError: (error) => {
      console.error('Download error:', error);
    },
  });

  const handleExportDashboard = () => {
    exportDashboardMutation.mutate(exportFormat);
  };

  const handleDownloadReport = (reportId: string, format?: 'csv' | 'xlsx' | 'pdf' | 'docx') => {
    downloadReportMutation.mutate({ 
      reportId, 
      format: format || exportFormat 
    });
  };

  const handleViewReport = (reportId: string) => {
    const report = availableReports.find(r => r.id === reportId);
    if (report) {
      // Generate actual preview content based on available data
      const reportContent = generateReportPreview(reportId, report);
      
      // Open a new window with properly formatted report preview
      const newWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>${report.name} - Preview</title>
              <style>
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  margin: 0; 
                  padding: 20px; 
                  background-color: #f8fafc; 
                  color: #334155;
                }
                .header { 
                  background: linear-gradient(135deg, #1976d2, #1565c0); 
                  color: white; 
                  padding: 30px; 
                  border-radius: 8px; 
                  margin-bottom: 30px; 
                  text-align: center;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
                .header p { margin: 10px 0 0 0; opacity: 0.9; }
                .content { 
                  background: white; 
                  padding: 30px; 
                  border-radius: 8px; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  margin-bottom: 20px;
                }
                .meta-info { 
                  display: grid; 
                  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                  gap: 20px; 
                  margin-bottom: 30px; 
                }
                .meta-item { 
                  padding: 15px; 
                  background: #f1f5f9; 
                  border-radius: 6px; 
                  border-left: 4px solid #1976d2;
                }
                .meta-item strong { color: #1976d2; }
                .data-section { margin: 30px 0; }
                .data-section h3 { 
                  color: #1976d2; 
                  border-bottom: 2px solid #e2e8f0; 
                  padding-bottom: 10px; 
                  margin-bottom: 20px;
                }
                .data-grid { 
                  display: grid; 
                  gap: 15px; 
                  margin: 20px 0; 
                }
                .data-item { 
                  padding: 15px; 
                  background: #f8fafc; 
                  border-radius: 6px; 
                  border: 1px solid #e2e8f0;
                }
                .highlight { 
                  background: #dbeafe; 
                  color: #1e40af; 
                  padding: 15px; 
                  border-radius: 6px; 
                  margin: 20px 0;
                  border-left: 4px solid #3b82f6;
                }
                .footer { 
                  text-align: center; 
                  color: #64748b; 
                  margin-top: 30px; 
                  padding: 20px; 
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${report.name}</h1>
                <p>ESG Compliance Report Preview</p>
              </div>
              
              <div class="content">
                <div class="meta-info">
                  <div class="meta-item">
                    <strong>Report Type:</strong><br>
                    ${report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                  </div>
                  <div class="meta-item">
                    <strong>Generated:</strong><br>
                    ${new Date(report.generated_at).toLocaleString()}
                  </div>
                  <div class="meta-item">
                    <strong>Format:</strong><br>
                    ${report.format.toUpperCase()}
                  </div>
                  <div class="meta-item">
                    <strong>File Size:</strong><br>
                    ${report.size}
                  </div>
                </div>
                
                ${reportContent}
              </div>
              
              <div class="footer">
                Generated by ESG Checklist AI Platform • ${new Date().toLocaleDateString()}
              </div>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    }
  };

  const generateReportPreview = (reportId: string, report: Report): string => {
    const kpiSummary = dashboardData ? `
      <div class="data-section">
        <h3>📊 Key Performance Indicators</h3>
        <div class="data-grid">
          <div class="data-item">
            <strong>Overall Compliance Score:</strong> ${Math.round((dashboardData.overallScore || 0) * 100)}%
          </div>
          <div class="data-item">
            <strong>Passed Audits:</strong> ${dashboardData.passedAudits || 0}
          </div>
          <div class="data-item">
            <strong>Pending Reviews:</strong> ${dashboardData.pendingReviews || 0}
          </div>
          <div class="data-item">
            <strong>Failed Audits:</strong> ${dashboardData.failedAudits || 0}
          </div>
        </div>
      </div>
    ` : '';

    switch (reportId) {
      case 'checklists':
        return `
          <div class="highlight">
            📋 This report contains comprehensive data about all ESG checklists in your organization, including their status, completion rates, and compliance metrics.
          </div>
          ${kpiSummary}
          <div class="data-section">
            <h3>📋 Checklist Overview</h3>
            <div class="data-item">
              <strong>Content Includes:</strong><br>
              • Checklist titles and descriptions<br>
              • Active/inactive status<br>
              • Creation and update timestamps<br>
              • Version information<br>
              • Question counts and categories
            </div>
          </div>
        `;
      
      case 'ai-results':
        return `
          <div class="highlight">
            🤖 This report provides detailed AI analysis results for all processed documents, including compliance scores, feedback, and processing metrics.
          </div>
          ${kpiSummary}
          <div class="data-section">
            <h3>🤖 AI Analysis Data</h3>
            <div class="data-item">
              <strong>Content Includes:</strong><br>
              • AI compliance scores and ratings<br>
              • Document analysis feedback<br>
              • Processing time metrics<br>
              • Model version information<br>
              • File and user associations
            </div>
          </div>
        `;
      
      case 'submissions':
        return `
          <div class="highlight">
            📝 This report details user submissions and responses to checklist questions, providing insights into completion patterns and response quality.
          </div>
          ${kpiSummary}
          <div class="data-section">
            <h3>📝 Submission Analytics</h3>
            <div class="data-item">
              <strong>Content Includes:</strong><br>
              • User response data<br>
              • Submission timestamps<br>
              • Question completion rates<br>
              • Answer text analysis<br>
              • User engagement metrics
            </div>
          </div>
        `;
      
      case 'users':
        return `
          <div class="highlight">
            👥 This report provides comprehensive user directory information along with activity statistics and performance metrics.
          </div>
          ${kpiSummary}
          <div class="data-section">
            <h3>👥 User Directory</h3>
            <div class="data-item">
              <strong>Content Includes:</strong><br>
              • User profile information<br>
              • Role and permission data<br>
              • Activity statistics<br>
              • Average compliance scores<br>
              • Last login and registration data
            </div>
          </div>
        `;
      
      default:
        return `
          <div class="highlight">
            📊 This report contains detailed ESG compliance and performance data for your organization.
          </div>
          ${kpiSummary}
        `;
    }
  };

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
          },
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
            {data.icon && <Box sx={{ color: 'text.secondary' }}>{data.icon}</Box>}
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
                {data.change > 0 ? '+' : ''}
                {data.change}
                {data.trend !== 'neutral' ? '%' : ''}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { color: 'success' | 'warning' | 'error'; label: string }> =
      {
        ready: { color: 'success', label: 'Ready' },
        generating: { color: 'warning', label: 'Generating' },
        failed: { color: 'error', label: 'Failed' },
      };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ready;

    return <Chip label={config.label} size="small" color={config.color} sx={{ minWidth: 80 }} />;
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
      {/* Error/Success Messages */}
      {exportDashboardMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to export dashboard. Please try again.
        </Alert>
      )}
      {downloadReportMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to download report. Please try again.
        </Alert>
      )}
      {exportDashboardMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Dashboard exported successfully!
        </Alert>
      )}

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
          ESG Reports & Analytics
        </Typography>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={handleExportDashboard}
          disabled={exportDashboardMutation.isPending}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
            borderRadius: '0.25rem',
          }}
        >
          {exportDashboardMutation.isPending ? 'Exporting...' : `Export Dashboard (${exportFormat.toUpperCase()})`}
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
        {kpiData.map(kpi => (
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
            onChange={e => setReportType(e.target.value)}
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
            onChange={e => setTimeRange(e.target.value)}
            sx={{ borderRadius: '0.25rem' }}
          >
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
            <MenuItem value="365">Last year</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Export Format</InputLabel>
          <Select
            value={exportFormat}
            label="Export Format"
            onChange={e => setExportFormat(e.target.value as 'csv' | 'xlsx' | 'pdf' | 'docx')}
            sx={{ borderRadius: '0.25rem' }}
          >
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="docx">Word</MenuItem>
            <MenuItem value="xlsx">Excel</MenuItem>
            <MenuItem value="csv">CSV</MenuItem>
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
            {filteredReports.map(report => (
              <Card
                key={report.id}
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '0.25rem',
                  '&:hover': {
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  },
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
                            onClick={() => handleViewReport(report.id)}
                            sx={{ borderRadius: '0.25rem' }}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Download />}
                            variant="contained"
                            onClick={() => handleDownloadReport(report.id)}
                            disabled={downloadReportMutation.isPending}
                            sx={{ borderRadius: '0.25rem' }}
                          >
                            {downloadReportMutation.isPending ? 'Downloading...' : `Download ${exportFormat.toUpperCase()}`}
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
