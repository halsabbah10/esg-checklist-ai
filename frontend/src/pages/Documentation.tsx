import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Divider,
  Button,
  Alert,
  Chip,
  Grid,
  Link,
} from '@mui/material';
import {
  ExpandMore,
  Description,
  CloudUpload,
  Assessment,
  Security,
  Admin,
  Group,
  PlayArrow,
  CheckCircle,
  Warning,
  Info,
  ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const Documentation: React.FC = () => {
  const navigate = useNavigate();
  const [expandedPanel, setExpandedPanel] = useState<string | false>('getting-started');

  const handlePanelChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/help')}
          sx={{ mb: 2 }}
        >
          Back to Help
        </Button>
        <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
          <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
          ESG Checklist AI Documentation
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Comprehensive guide to using ESG Checklist AI for compliance automation
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            This documentation covers all aspects of the ESG Checklist AI system, from basic usage to advanced features.
          </Typography>
        </Alert>
      </Box>

      {/* Quick Start Guide */}
      <Accordion expanded={expandedPanel === 'getting-started'} onChange={handlePanelChange('getting-started')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <PlayArrow sx={{ mr: 1 }} />
          <Typography variant="h6">Getting Started</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Welcome to ESG Checklist AI
            </Typography>
            <Typography paragraph>
              ESG Checklist AI is a comprehensive platform for automating Environmental, Social, and Governance (ESG) compliance processes using artificial intelligence.
            </Typography>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              System Overview
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <CloudUpload color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Upload Documents</Typography>
                  <Typography variant="body2">Upload ESG documents in various formats</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Assessment color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">AI Analysis</Typography>
                  <Typography variant="body2">Automated compliance scoring using Gemini AI</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Review & Approve</Typography>
                  <Typography variant="body2">Collaborative review and approval workflows</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              First Steps
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                <ListItemText 
                  primary="1. Login to your account"
                  secondary="Use your credentials to access the system"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                <ListItemText 
                  primary="2. Select a checklist"
                  secondary="Choose from available ESG checklists or create a new one"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                <ListItemText 
                  primary="3. Upload documents"
                  secondary="Upload PDF, DOCX, XLSX, CSV, or TXT files for analysis"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                <ListItemText 
                  primary="4. Review AI analysis"
                  secondary="Examine the automated compliance scores and recommendations"
                />
              </ListItem>
            </List>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* File Upload Guide */}
      <Accordion expanded={expandedPanel === 'file-upload'} onChange={handlePanelChange('file-upload')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <CloudUpload sx={{ mr: 1 }} />
          <Typography variant="h6">File Upload & Processing</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="h6" gutterBottom>
            Supported File Formats
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Chip label="PDF" sx={{ mr: 1, mb: 1 }} color="primary" />
            <Chip label="DOCX" sx={{ mr: 1, mb: 1 }} color="primary" />
            <Chip label="XLSX" sx={{ mr: 1, mb: 1 }} color="primary" />
            <Chip label="CSV" sx={{ mr: 1, mb: 1 }} color="primary" />
            <Chip label="TXT" sx={{ mr: 1, mb: 1 }} color="primary" />
          </Box>

          <Typography variant="h6" gutterBottom>
            File Requirements
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><Info color="info" /></ListItemIcon>
              <ListItemText 
                primary="Maximum file size: 25MB"
                secondary="Larger files may be rejected or take longer to process"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Info color="info" /></ListItemIcon>
              <ListItemText 
                primary="Text-based content preferred"
                secondary="Scanned documents should be OCR-processed for better analysis"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Warning color="warning" /></ListItemIcon>
              <ListItemText 
                primary="Avoid duplicate uploads"
                secondary="The system will detect and prevent duplicate file uploads"
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Upload Process
          </Typography>
          <Typography paragraph>
            1. Navigate to the checklist you want to upload documents for
            <br />
            2. Click "Choose File" or drag and drop your document
            <br />
            3. The system will validate the file format and size
            <br />
            4. Upon successful upload, AI analysis begins automatically
            <br />
            5. Results are available within 1-3 minutes depending on document size
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* AI Analysis */}
      <Accordion expanded={expandedPanel === 'ai-analysis'} onChange={handlePanelChange('ai-analysis')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Assessment sx={{ mr: 1 }} />
          <Typography variant="h6">AI Analysis & Scoring</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="h6" gutterBottom>
            AI-Powered ESG Analysis
          </Typography>
          <Typography paragraph>
            The system uses Google Gemini AI to analyze uploaded documents and provide comprehensive ESG compliance scores.
          </Typography>

          <Typography variant="h6" gutterBottom>
            Scoring System
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText 
                primary="0.9-1.0: Exceptional ESG performance"
                secondary="Comprehensive reporting and best practices"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText 
                primary="0.8-0.89: Strong ESG performance"
                secondary="Good practices and detailed reporting"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Warning color="warning" /></ListItemIcon>
              <ListItemText 
                primary="0.7-0.79: Good ESG performance"
                secondary="Solid practices, some areas for improvement"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Warning color="warning" /></ListItemIcon>
              <ListItemText 
                primary="0.6-0.69: Adequate ESG performance"
                secondary="Basic compliance with room for enhancement"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Warning color="error" /></ListItemIcon>
              <ListItemText 
                primary="Below 0.6: Needs improvement"
                secondary="Significant gaps in ESG practices"
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Category Analysis
          </Typography>
          <Typography paragraph>
            Each document is analyzed across three key ESG dimensions:
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Environmental (E)"
                secondary="Climate change, carbon emissions, energy usage, waste management, water conservation"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Social (S)"
                secondary="Employee relations, diversity, health & safety, community engagement, human rights"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Governance (G)"
                secondary="Board structure, risk management, ethics, transparency, data integrity"
              />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      {/* User Roles */}
      <Accordion expanded={expandedPanel === 'user-roles'} onChange={handlePanelChange('user-roles')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Group sx={{ mr: 1 }} />
          <Typography variant="h6">User Roles & Permissions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="h6" gutterBottom>
            System Roles
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Admin color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Administrator</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Full system access with complete administrative privileges
              </Typography>
              <Typography variant="subtitle2" gutterBottom>Permissions:</Typography>
              <List dense>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Manage users and roles" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Create and modify checklists" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Access all analytics and reports" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• System configuration" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Export all data" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Auditor</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Primary users who upload documents and conduct ESG assessments
              </Typography>
              <Typography variant="subtitle2" gutterBottom>Permissions:</Typography>
              <List dense>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Upload documents to checklists" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• View AI analysis results" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Export own analysis results" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Access analytics dashboard" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Submit for review" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Reviewer</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Review and approve documents submitted by auditors
              </Typography>
              <Typography variant="subtitle2" gutterBottom>Permissions:</Typography>
              <List dense>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Review submitted documents" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Approve or reject submissions" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Add comments and feedback" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• View review analytics" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Export review reports" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </AccordionDetails>
      </Accordion>

      {/* Security */}
      <Accordion expanded={expandedPanel === 'security'} onChange={handlePanelChange('security')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Security sx={{ mr: 1 }} />
          <Typography variant="h6">Security & Compliance</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="h6" gutterBottom>
            Data Security
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><Security color="success" /></ListItemIcon>
              <ListItemText 
                primary="End-to-end encryption"
                secondary="All data is encrypted in transit and at rest"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Security color="success" /></ListItemIcon>
              <ListItemText 
                primary="Role-based access control"
                secondary="Users can only access data appropriate to their role"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Security color="success" /></ListItemIcon>
              <ListItemText 
                primary="Audit logging"
                secondary="All user actions are logged for compliance tracking"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Security color="success" /></ListItemIcon>
              <ListItemText 
                primary="Secure file uploads"
                secondary="File validation and malware scanning"
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Compliance Features
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="GDPR Compliance"
                secondary="Data protection and privacy controls"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="SOC 2 Type II"
                secondary="Security, availability, and confidentiality controls"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="ISO 27001"
                secondary="Information security management standards"
              />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Troubleshooting */}
      <Accordion expanded={expandedPanel === 'troubleshooting'} onChange={handlePanelChange('troubleshooting')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Warning sx={{ mr: 1 }} />
          <Typography variant="h6">Troubleshooting</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="h6" gutterBottom>
            Common Issues
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Failures
              </Typography>
              <Typography variant="body2" paragraph>
                If file uploads are failing, try these solutions:
              </Typography>
              <List>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Check file size (must be under 25MB)" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Verify file format (PDF, DOCX, XLSX, CSV, TXT only)" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Ensure stable internet connection" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Try refreshing the page and uploading again" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Analysis Issues
              </Typography>
              <Typography variant="body2" paragraph>
                If AI analysis is not working properly:
              </Typography>
              <List>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Wait 2-3 minutes for processing to complete" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Ensure document contains readable text" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Check if file is corrupted" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Contact support if analysis fails repeatedly" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Login Problems
              </Typography>
              <Typography variant="body2" paragraph>
                If you're having trouble logging in:
              </Typography>
              <List>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Verify your email and password" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Check if your account is active" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Clear browser cache and cookies" />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText primary="• Try using an incognito/private window" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </AccordionDetails>
      </Accordion>

      {/* Contact Support */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Need Additional Help?
          </Typography>
          <Typography variant="body2" paragraph>
            If you can't find what you're looking for in this documentation, please contact our support team:
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.open('mailto:husam.alsabbah@gmail.com?subject=ESG Checklist AI Support - Documentation Question', '_blank')}
          >
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
};