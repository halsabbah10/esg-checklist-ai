import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Download,
  PictureAsPdf,
  GridView,
  Description,
} from '@mui/icons-material';
import { analyticsAPI } from '../services/api';

interface Report {
  id: string;
  name: string;
  type: 'compliance' | 'performance' | 'summary';
  format: 'pdf' | 'excel' | 'csv';
  generated_at: string;
  status: 'ready' | 'generating' | 'failed';
  size: string;
}

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('all');
  const [timeRange, setTimeRange] = useState('30');

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
      name: 'Monthly Performance Report - June 2025',
      type: 'performance',
      format: 'excel',
      generated_at: '2025-07-01T09:15:00Z',
      status: 'ready',
      size: '1.8 MB',
    },
    {
      id: '3',
      name: 'Annual ESG Assessment 2024',
      type: 'summary',
      format: 'pdf',
      generated_at: '2025-06-28T14:20:00Z',
      status: 'ready',
      size: '5.2 MB',
    },
    {
      id: '4',
      name: 'Weekly Checklist Analysis',
      type: 'performance',
      format: 'csv',
      generated_at: '2025-07-03T16:45:00Z',
      status: 'generating',
      size: '',
    },
  ];

  // Fetch analytics data for report generation
  const {
    data: analyticsData,
    isLoading: loadingAnalytics,
  } = useQuery({
    queryKey: ['analytics', 'overall'],
    queryFn: () => analyticsAPI.getSummary(),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'generating':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <PictureAsPdf />;
      case 'excel':
        return <GridView />;
      case 'csv':
        return <Description />;
      default:
        return <Description />;
    }
  };

  const handleGenerateReport = (type: string) => {
    console.log(`Generating ${type} report...`);
    // Implement report generation logic
  };

  const handleDownload = (reportId: string) => {
    console.log(`Downloading report ${reportId}...`);
    // Implement download logic
  };

  const filteredReports = mockReports.filter(report => 
    reportType === 'all' || report.type === reportType
  );

  if (loadingAnalytics) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        ESG Reports
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Generate and download comprehensive ESG compliance and performance reports.
      </Typography>

      {/* Quick Stats */}
      <Box 
        display="grid" 
        gridTemplateColumns={{
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'repeat(4, 1fr)',
        }}
        gap={3} 
        sx={{ mb: 4 }}
      >
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Reports
            </Typography>
            <Typography variant="h4">
              {mockReports.length}
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Ready to Download
            </Typography>
            <Typography variant="h4" color="success.main">
              {mockReports.filter(r => r.status === 'ready').length}
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Overall Score
            </Typography>
            <Typography variant="h4" color="primary">
              {analyticsData?.data ? Math.round(analyticsData.data.average_ai_score * 100) : 77}%
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Last Generated
            </Typography>
            <Typography variant="h6">
              Today
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Generate New Report */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Generate New Report
          </Typography>
          
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="compliance">Compliance Report</MenuItem>
                <MenuItem value="performance">Performance Report</MenuItem>
                <MenuItem value="summary">Executive Summary</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="90">Last 3 months</MenuItem>
                <MenuItem value="365">Last year</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              onClick={() => handleGenerateReport(reportType)}
              disabled={reportType === 'all'}
            >
              Generate Report
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Generated Reports
            </Typography>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={reportType}
                label="Filter"
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="all">All Reports</MenuItem>
                <MenuItem value="compliance">Compliance</MenuItem>
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="summary">Summary</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Report Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Generated</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getFormatIcon(report.format)}
                        {report.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.type}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{report.format.toUpperCase()}</TableCell>
                    <TableCell>
                      {new Date(report.generated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.status}
                        color={getStatusColor(report.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{report.size || 'Generating...'}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Download />}
                        onClick={() => handleDownload(report.id)}
                        disabled={report.status !== 'ready'}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredReports.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No reports found. Generate your first report using the controls above.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};
