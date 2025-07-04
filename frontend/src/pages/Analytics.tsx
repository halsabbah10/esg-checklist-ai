import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { analyticsAPI } from '../services/api';

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [selectedChecklist, setSelectedChecklist] = useState('all');

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading: loadingAnalytics,
    error: analyticsError,
  } = useQuery({
    queryKey: ['analytics', 'overall'],
    queryFn: () => analyticsAPI.getSummary(),
  });

  if (loadingAnalytics) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (analyticsError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Failed to load analytics data. Please try again later.
        </Alert>
      </Container>
    );
  }

  // Prepare data for charts
  const overallData = analyticsData?.data;
  
  // Mock data for demonstration - replace with real data from API
  const scoreDistributionData = [
    { name: '90-100%', value: 15, color: '#4CAF50' },
    { name: '80-89%', value: 25, color: '#8BC34A' },
    { name: '70-79%', value: 30, color: '#FFC107' },
    { name: '60-69%', value: 20, color: '#FF9800' },
    { name: '<60%', value: 10, color: '#F44336' },
  ];

  const categoryScoresData = [
    { category: 'Environmental', score: 85, target: 90 },
    { category: 'Social', score: 78, target: 85 },
    { category: 'Governance', score: 92, target: 95 },
    { category: 'Risk Management', score: 74, target: 80 },
    { category: 'Reporting', score: 88, target: 90 },
  ];

  const trendDataPoints = [
    { month: 'Jan', score: 75, submissions: 12 },
    { month: 'Feb', score: 78, submissions: 15 },
    { month: 'Mar', score: 82, submissions: 18 },
    { month: 'Apr', score: 79, submissions: 22 },
    { month: 'May', score: 85, submissions: 28 },
    { month: 'Jun', score: 87, submissions: 31 },
  ];

  const complianceRadarData = [
    { subject: 'Climate Risk', A: 85, B: 90, fullMark: 100 },
    { subject: 'Diversity & Inclusion', A: 78, B: 85, fullMark: 100 },
    { subject: 'Board Governance', A: 92, B: 95, fullMark: 100 },
    { subject: 'Data Privacy', A: 88, B: 90, fullMark: 100 },
    { subject: 'Supply Chain', A: 74, B: 80, fullMark: 100 },
    { subject: 'Stakeholder Engagement', A: 82, B: 85, fullMark: 100 },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            ESG Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive analysis of ESG compliance performance and trends
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
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
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Checklist</InputLabel>
            <Select
              value={selectedChecklist}
              label="Checklist"
              onChange={(e) => setSelectedChecklist(e.target.value)}
            >
              <MenuItem value="all">All Checklists</MenuItem>
              <MenuItem value="1">ESG Compliance</MenuItem>
              <MenuItem value="2">Environmental Impact</MenuItem>
              <MenuItem value="3">Social Responsibility</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Summary Metrics */}
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
              Overall Score
            </Typography>
            <Typography variant="h4" color="primary">
              {overallData ? Math.round(overallData.average_ai_score * 100) : 77}%
            </Typography>
            <Chip label="+5% vs last month" color="success" size="small" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Assessments
            </Typography>
            <Typography variant="h4">
              {overallData?.total_uploads || 142}
            </Typography>
            <Chip label="+12 this month" color="info" size="small" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Active Checklists
            </Typography>
            <Typography variant="h4">
              {overallData?.total_checklists || 24}
            </Typography>
            <Chip label="3 new" color="secondary" size="small" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Users
            </Typography>
            <Typography variant="h4">
              {overallData?.total_users || 48}
            </Typography>
            <Chip label="+8 this week" color="warning" size="small" />
          </CardContent>
        </Card>
      </Box>

      {/* Charts Grid */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '2fr 1fr' }} gap={3} sx={{ mb: 3 }}>
        {/* Score Trends */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Score Trends Over Time
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendDataPoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    name="Average Score (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Score Distribution
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {scoreDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Category Performance and Compliance Radar */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '1fr 1fr' }} gap={3} sx={{ mb: 3 }}>
        {/* Category Performance */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Category Performance
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryScoresData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="category" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#8884d8" name="Current Score" />
                  <Bar dataKey="target" fill="#82ca9d" name="Target Score" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Compliance Radar */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance Coverage
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={complianceRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Current"
                    dataKey="A"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Target"
                    dataKey="B"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Monthly Submissions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Monthly Submission Volume & Performance
          </Typography>
          <Box height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendDataPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="submissions" fill="#8884d8" name="Submissions" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#ff7300" 
                  strokeWidth={3}
                  name="Avg Score"
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
