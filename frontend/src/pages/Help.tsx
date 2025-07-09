import React from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Link,
} from '@mui/material';
import {
  ExpandMore,
  HelpOutline,
  Email,
  Description,
  VideoLibrary,
  Chat,
  BugReport,
  Feedback,
  QuestionAnswer,
} from '@mui/icons-material';

export const HelpPage: React.FC = () => {
  const handleContactSupport = () => {
    window.open(
      'mailto:support@esg-checklist.com?subject=ESG Checklist AI Support Request',
      '_blank'
    );
  };

  const handleScheduleDemo = () => {
    window.open('https://calendly.com/esg-checklist-demo', '_blank');
  };

  const handleOpenChat = () => {
    // This would integrate with a chat system like Intercom, Zendesk, etc.
    // For now, redirect to email support
    window.open('mailto:husam.alsabbah@gmail.com?subject=ESG Checklist AI Support Request', '_blank');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
          <HelpOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
          Help & Support
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Get the help you need to make the most of ESG Checklist AI
        </Typography>
        <Alert severity="info" sx={{ mb: 4 }}>
          Our support team is available Monday-Friday, 9 AM - 6 PM EST
        </Alert>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Email />}
          onClick={handleContactSupport}
        >
          Contact Support
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<VideoLibrary />}
          onClick={handleScheduleDemo}
        >
          Schedule Demo
        </Button>
        <Button variant="outlined" size="large" startIcon={<Chat />} onClick={handleOpenChat}>
          Live Chat
        </Button>
      </Box>

      {/* FAQ Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
            <QuestionAnswer sx={{ mr: 1, verticalAlign: 'middle' }} />
            Frequently Asked Questions
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">How do I upload and analyze ESG documents?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>To upload and analyze ESG documents:</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="1. Navigate to any checklist from the Checklists page" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="2. Click 'Upload Files' or use the upload section" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="3. Select your document (PDF, DOC, DOCX, XLS, XLSX, TXT, or CSV)" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="4. Wait for AI analysis to complete (usually 1-3 minutes)" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="5. Review your compliance score and recommendations" />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">What file formats are supported?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  ESG Checklist AI supports the following file formats:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'TXT', 'CSV'].map(format => (
                    <Chip key={format} label={format} color="primary" variant="outlined" />
                  ))}
                </Box>
                <Typography>
                  Maximum file size is 25MB. For larger files, please contact support for
                  assistance.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">How accurate is the AI analysis?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Our AI analysis is trained on comprehensive ESG frameworks including GRI, SASB,
                  TCFD, and more. The system provides:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="• 90%+ accuracy in identifying ESG-related content" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Compliance scoring based on industry standards" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Actionable recommendations for improvement" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Gap analysis for missing disclosures" />
                  </ListItem>
                </List>
                <Typography>
                  Remember that AI analysis should supplement, not replace, professional ESG
                  expertise.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">How do I manage user roles and permissions?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  User management is available for Admin and Super Admin roles:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="1. Navigate to Admin → User Management" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="2. Click on any user to edit their role" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="3. Available roles: Auditor, Reviewer, Admin, Super Admin" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="4. Export user lists for reporting and compliance" />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Can I export my analysis results?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Yes! You can export analysis results in multiple formats:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="• JSON format for technical integration" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• CSV format for spreadsheet analysis" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• PDF reports for stakeholder sharing" />
                  </ListItem>
                </List>
                <Typography>
                  Export options are available in the analysis results section after upload
                  completion.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Box>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" component="h3" fontWeight={600} gutterBottom>
              <Email sx={{ mr: 1, verticalAlign: 'middle' }} />
              Email Support
            </Typography>
            <Typography paragraph color="text.secondary">
              Get detailed help with technical questions and account issues.
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Email />
                </ListItemIcon>
                <ListItemText
                  primary="support@esg-checklist.com"
                  secondary="Response within 24 hours"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <BugReport />
                </ListItemIcon>
                <ListItemText
                  primary="bugs@esg-checklist.com"
                  secondary="Report technical issues"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" component="h3" fontWeight={600} gutterBottom>
              <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
              Resources
            </Typography>
            <Typography paragraph color="text.secondary">
              Additional resources to help you succeed with ESG compliance.
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <VideoLibrary />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Link
                      href="#"
                      onClick={e => {
                        e.preventDefault();
                        // Placeholder video tutorial link
                        window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank');
                      }}
                    >
                      Video Tutorials
                    </Link>
                  }
                  secondary="Step-by-step guides"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Description />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Link
                      href="#"
                      onClick={e => {
                        e.preventDefault();
                        window.open('/documentation', '_blank');
                      }}
                    >
                      User Documentation
                    </Link>
                  }
                  secondary="Comprehensive guides"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Feedback />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Link
                      href="#"
                      onClick={e => {
                        e.preventDefault();
                        handleContactSupport();
                      }}
                    >
                      Submit Feedback
                    </Link>
                  }
                  secondary="Help us improve"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default HelpPage;
