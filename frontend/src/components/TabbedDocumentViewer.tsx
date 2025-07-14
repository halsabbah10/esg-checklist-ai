import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import {
  Close,
  Download,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  RotateRight,
  AssessmentOutlined,
  Description,
  CheckCircle,
  Analytics,
  Dashboard,
  Info,
  ExpandMore,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { uploadsAPI, filesAPI, aiAPI } from '../services/api';
import ExcelViewer from './ExcelViewer';

interface TabbedDocumentViewerProps {
  open: boolean;
  onClose: () => void;
  uploadId: number;
  filename: string;
  fileSize?: number;
}

interface FileData {
  id: number;
  filename: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  status: string;
  download_url?: string;
  preview_url?: string;
}

interface AIAnalysis {
  id: number;
  overall_score: number;
  analysis: string;
  created_at: string;
  status: string;
  feedback?: any;
}

export const TabbedDocumentViewer: React.FC<TabbedDocumentViewerProps> = ({
  open,
  onClose,
  uploadId,
  filename,
  fileSize,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (open && uploadId) {
      fetchFileData();
      fetchAIAnalysis();
    }
  }, [open, uploadId]);

  const fetchFileData = async () => {
    setLoading(true);
    setError(null);
    try {
      // First try to get detailed file info from files API
      try {
        const fileInfoResponse = await filesAPI.getInfo(uploadId.toString());
        console.log('File info response:', fileInfoResponse.data);
        
        if (fileInfoResponse.data) {
          setFileData({
            id: uploadId,
            filename: fileInfoResponse.data.filename || filename,
            file_size: fileInfoResponse.data.file_size,
            mime_type: fileInfoResponse.data.mime_type,
            uploaded_at: fileInfoResponse.data.uploaded_at,
            status: fileInfoResponse.data.processing_status || 'unknown',
          });
          return;
        }
      } catch (fileInfoError) {
        console.log('Files API failed, falling back to uploads search:', fileInfoError);
      }
      
      // Fallback to uploads search
      const response = await uploadsAPI.search({ limit: 100 });
      const file = response.data?.results?.find((f: any) => f.id === uploadId);
      if (file) {
        setFileData({
          id: file.id,
          filename: file.filename,
          file_size: file.file_size,
          mime_type: file.mime_type,
          uploaded_at: file.uploaded_at,
          status: file.status,
        });
      } else {
        setError('File not found');
      }
    } catch (error) {
      console.error('Error fetching file data:', error);
      setError('File data temporarily unavailable. File viewing will be implemented in a future update.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIAnalysis = async () => {
    setAILoading(true);
    try {
      const response = await aiAPI.getResultByUpload(uploadId.toString());
      
      if (response?.data?.results && response.data.results.length > 0) {
        setAIAnalysis(response.data.results[0]);
      } else {
        setAIAnalysis(null);
      }
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      setAIAnalysis(null);
    } finally {
      setAILoading(false);
    }
  };

  const getFileType = (filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop() || '';
    
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) return 'image';
    if (['txt', 'md', 'csv'].includes(extension)) return 'text';
    if (['doc', 'docx'].includes(extension)) return 'document';
    if (['xls', 'xlsx'].includes(extension)) return 'spreadsheet';
    if (['mp4', 'avi', 'mov', 'wmv'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
    
    return 'unknown';
  };

  const handleDownload = async () => {
    try {
      const response = await filesAPI.download(uploadId.toString());
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatScore = (score: any): string => {
    if (score === null || score === undefined || isNaN(score)) return '0%';
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(numScore)) return '0%';
    const percentage = numScore <= 1 ? Math.round(numScore * 100) : Math.round(numScore);
    return `${percentage}%`;
  };

  const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 0.7) return 'success';
    if (score >= 0.5) return 'warning';
    return 'error';
  };

  const renderDocumentViewer = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>
            Document Information
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Document viewing functionality is being implemented.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            File: <strong>{filename}</strong>
          </Typography>
          <Typography variant="body2">
            ID: <strong>{uploadId}</strong>
          </Typography>
        </Box>
      );
    }

    if (!fileData) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No file data available
        </Alert>
      );
    }

    const fileType = getFileType(filename);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const viewUrl = `${baseUrl}/v1/files/${uploadId}/view`;
    const streamUrl = `${baseUrl}/v1/files/${uploadId}/stream`;

    switch (fileType) {
      case 'pdf':
        return (
          <Box sx={{ height: '100%', width: '100%' }}>
            <iframe
              src={`${viewUrl}#zoom=${zoom / 100}&rotate=${rotation}`}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title={filename}
            />
          </Box>
        );

      case 'image':
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100%',
              overflow: 'auto'
            }}
          >
            <img
              src={viewUrl}
              alt={filename}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease',
              }}
            />
          </Box>
        );

      case 'text':
        return (
          <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: `${zoom}%` }}>
              <FileContentLoader uploadId={uploadId} />
            </Typography>
          </Paper>
        );

      case 'spreadsheet':
        return (
          <Box sx={{ height: '100%', width: '100%' }}>
            <ExcelViewer uploadId={uploadId} filename={filename} />
          </Box>
        );

      case 'document':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Word Document
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This file type cannot be previewed directly. Click download to view in the appropriate application.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownload}
              sx={{ mt: 2 }}
            >
              Download {filename}
            </Button>
          </Box>
        );

      case 'video':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
            <video
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                transform: `scale(${zoom / 100})`,
              }}
            >
              <source src={streamUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </Box>
        );

      case 'audio':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <audio controls style={{ width: '100%' }}>
              <source src={streamUrl} type="audio/mpeg" />
              Your browser does not support the audio tag.
            </audio>
          </Box>
        );

      default:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Document Viewer
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Document viewing functionality will be available in a future update.
              For now, you can review the file information above.
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              File: <strong>{filename}</strong>
            </Typography>
            <Typography variant="body2">
              Status: <strong>{fileData?.status || 'Unknown'}</strong>
            </Typography>
          </Box>
        );
    }
  };

  const renderAIAnalysis = () => {
    try {
      if (aiLoading) {
        return (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="h6" sx={{ mt: 2 }}>Loading AI Analysis...</Typography>
            </Box>
          </Box>
        );
      }

      if (!aiAnalysis) {
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AssessmentOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No AI Analysis Available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This document has not been analyzed by our AI system yet.
            </Typography>
          </Box>
        );
      }
    } catch (error) {
      console.error('Error in renderAIAnalysis initial checks:', error);
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom color="error">
            Error Loading AI Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There was an issue loading the AI analysis. Please try refreshing.
          </Typography>
        </Box>
      );
    }

    try {
      // Helper functions exactly like ChecklistUpload (using global getScoreColor)

      const getScoreIcon = (score: number) => {
        if (score >= 0.8) return <CheckCircle sx={{ color: 'white' }} />;
        if (score >= 0.6) return <Analytics sx={{ color: 'white' }} />;
        return <AssessmentOutlined sx={{ color: 'white' }} />;
      };

    // Enhanced helper functions for document-specific data extraction
    const extractCategoryScores = (feedback: string, baseScore: number) => {
      // Try to find specific scores in the feedback text
      const envMatches = [
        feedback.match(/Environmental[:\s]*(\d+\.?\d*)%/i),
        feedback.match(/Environmental[:\s]*(\d+\.?\d*)/i),
        feedback.match(/Environmental.*?Score[:\s]*(\d+\.?\d*)/i),
        feedback.match(/E[:\s]*(\d+\.?\d*)%/i)
      ];
      const socialMatches = [
        feedback.match(/Social[:\s]*(\d+\.?\d*)%/i),
        feedback.match(/Social[:\s]*(\d+\.?\d*)/i),
        feedback.match(/Social.*?Score[:\s]*(\d+\.?\d*)/i),
        feedback.match(/S[:\s]*(\d+\.?\d*)%/i)
      ];
      const govMatches = [
        feedback.match(/Governance[:\s]*(\d+\.?\d*)%/i),
        feedback.match(/Governance[:\s]*(\d+\.?\d*)/i),
        feedback.match(/Governance.*?Score[:\s]*(\d+\.?\d*)/i),
        feedback.match(/G[:\s]*(\d+\.?\d*)%/i)
      ];
      
      const parseScore = (matches: (RegExpMatchArray | null)[], fallback: number) => {
        for (const match of matches) {
          if (match) {
            const value = parseFloat(match[1]);
            return value > 1 ? value / 100 : value;
          }
        }
        return fallback;
      };
      
      // Create more varied scores based on content analysis
      const contentAnalysis = analyzeContentForScores(feedback, baseScore);
      
      return {
        environmental: parseScore(envMatches, contentAnalysis.environmental),
        social: parseScore(socialMatches, contentAnalysis.social),
        governance: parseScore(govMatches, contentAnalysis.governance),
      };
    };

    const analyzeContentForScores = (feedback: string, baseScore: number) => {
      // Analyze content for e&-specific ESG keywords and adjust scores accordingly
      const envKeywords = ['climate', 'carbon', 'emission', 'environmental', 'sustainability', 'renewable', 'waste', 'pollution', 'net zero', '5g energy', 'data center', 'network infrastructure', 'green technology', 'circular economy'];
      const socialKeywords = ['employee', 'diversity', 'training', 'safety', 'community', 'human rights', 'labor', 'digital inclusion', 'digital divide', 'digital skills', 'workforce development', 'cybersecurity awareness', 'digital literacy'];
      const govKeywords = ['board', 'governance', 'ethics', 'compliance', 'risk', 'audit', 'transparency', 'cybersecurity governance', 'data protection', 'digital governance', 'technology ethics', 'ai governance', 'privacy protection'];
      
      const countKeywords = (keywords: string[], text: string) => {
        return keywords.reduce((count, keyword) => {
          return count + (text.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
        }, 0);
      };
      
      const envCount = countKeywords(envKeywords, feedback);
      const socialCount = countKeywords(socialKeywords, feedback);
      const govCount = countKeywords(govKeywords, feedback);
      
      // Adjust scores based on keyword presence and base score
      const envScore = Math.min(0.95, baseScore + (envCount * 0.02));
      const socialScore = Math.min(0.95, baseScore + (socialCount * 0.02));
      const govScore = Math.min(0.95, baseScore + (govCount * 0.02));
      
      return {
        environmental: envScore,
        social: socialScore,
        governance: govScore
      };
    };

    const extractDocumentSpecificRecommendations = (feedback: string, filename: string) => {
      const recommendations = [];
      
      // Try to extract structured recommendations first
      const recMatch = feedback.match(/### Recommendations:\s*(.*?)(?=###|$)/s);
      if (recMatch) {
        const extracted = recMatch[1].split('\n').map(line => line.replace(/^[•\-*]\s*/, '').trim()).filter(line => line.length > 0);
        recommendations.push(...extracted);
      }
      
      // If no structured recommendations, analyze content for specific suggestions
      if (recommendations.length === 0) {
        const analysisBasedRecs = generateContentBasedRecommendations(feedback, filename);
        recommendations.push(...analysisBasedRecs);
      }
      
      return recommendations.length > 0 ? recommendations : ['Document requires detailed ESG compliance review', 'Implement comprehensive ESG reporting framework'];
    };

    const generateContentBasedRecommendations = (feedback: string, filename: string, department?: string) => {
      const recommendations = [];
      const lowerFeedback = feedback.toLowerCase();
      
      // Focus on specific checklist item completion rather than broad strategy
      if (lowerFeedback.includes('missing') || lowerFeedback.includes('incomplete')) {
        recommendations.push(`Document missing specific evidence required for checklist item completion - gather additional documentation`);
        recommendations.push(`Provide quantitative data and metrics to fully address checklist requirements`);
      }
      
      // Department-specific recommendations
      if (department) {
        return generateDepartmentSpecificRecommendations(feedback, filename, department);
      }
      
      // Environmental checklist item recommendations
      if (lowerFeedback.includes('carbon') || lowerFeedback.includes('emission')) {
        recommendations.push('Provide specific carbon emissions data and reduction targets to complete environmental checklist items');
        recommendations.push('Include e& network infrastructure energy consumption metrics and renewable energy usage percentages');
      }
      
      // Social checklist item recommendations
      if (lowerFeedback.includes('diversity') || lowerFeedback.includes('inclusion')) {
        recommendations.push('Submit workforce diversity statistics and digital inclusion program metrics for social checklist completion');
        recommendations.push('Document specific digital skills training programs and accessibility measures for UAE workforce');
      }
      
      // Governance checklist item recommendations
      if (lowerFeedback.includes('governance') || lowerFeedback.includes('board')) {
        recommendations.push('Provide governance structure documentation and board oversight evidence for governance checklist items');
        recommendations.push('Include cybersecurity governance policies and data protection compliance documentation');
      }
      
      // Compliance checklist item recommendations
      if (lowerFeedback.includes('risk') || lowerFeedback.includes('compliance')) {
        recommendations.push('Submit risk assessment documentation and compliance monitoring procedures for checklist requirements');
        recommendations.push('Provide TDRA regulatory compliance evidence and telecommunications license documentation');
      }
      
      // Data and metrics checklist recommendations
      if (lowerFeedback.includes('data') || lowerFeedback.includes('metrics')) {
        recommendations.push('Include specific ESG performance metrics and KPIs to address quantitative checklist requirements');
        recommendations.push('Provide baseline measurements and progress tracking data for telecommunications infrastructure');
      }
      
      // Technology and infrastructure checklist recommendations
      if (lowerFeedback.includes('technology') || lowerFeedback.includes('digital') || lowerFeedback.includes('5g')) {
        recommendations.push('Provide 5G network energy efficiency data and smart infrastructure sustainability metrics for technology checklist items');
        recommendations.push('Include green technology adoption evidence and IoT environmental monitoring capabilities');
      }
      
      // Business operations checklist recommendations
      if (lowerFeedback.includes('enterprise') || lowerFeedback.includes('business') || lowerFeedback.includes('fintech')) {
        recommendations.push('Submit business unit ESG performance data and service sustainability metrics for operational checklist completion');
        recommendations.push('Provide fintech ESG compliance documentation and digital banking accessibility evidence');
      }
      
      // Document-type specific checklist guidance
      if (filename.toLowerCase().includes('annual') || filename.toLowerCase().includes('report')) {
        recommendations.push('Annual reports should contain comprehensive data addressing all environmental, social, and governance checklist categories');
        recommendations.push('Include year-over-year comparison data and progress against specific checklist item targets');
      }
      
      if (filename.toLowerCase().includes('policy') || filename.toLowerCase().includes('procedure')) {
        recommendations.push('Policy documents should clearly address governance checklist requirements and compliance procedures');
        recommendations.push('Ensure policies include specific implementation timelines and measurable outcomes for checklist validation');
      }
      
      if (filename.toLowerCase().includes('cyber') || filename.toLowerCase().includes('security')) {
        recommendations.push('Cybersecurity documentation should address data protection governance checklist items with specific controls and procedures');
        recommendations.push('Include incident response protocols and security training metrics for comprehensive checklist coverage');
      }
      
      return recommendations;
    };

    const extractDocumentSpecificGaps = (feedback: string, filename: string, score: number) => {
      const gaps = [];
      
      // Try to extract structured gaps first
      const gapsMatch = feedback.match(/### Areas for Improvement:\s*(.*?)$/s);
      if (gapsMatch) {
        const extracted = gapsMatch[1].split('\n').map(line => line.replace(/^[•\-*]\s*/, '').trim()).filter(line => line.length > 0);
        gaps.push(...extracted);
      }
      
      // If no structured gaps, analyze content for specific issues
      if (gaps.length === 0) {
        const analysisBasedGaps = generateContentBasedGaps(feedback, filename, score);
        gaps.push(...analysisBasedGaps);
      }
      
      return gaps;
    };

    const generateContentBasedGaps = (feedback: string, filename: string, score: number) => {
      const gaps = [];
      const lowerFeedback = feedback.toLowerCase();
      
      // Identify specific checklist evidence gaps
      if (score < 0.7) {
        if (lowerFeedback.includes('environmental') || filename.toLowerCase().includes('environmental')) {
          gaps.push('Missing quantitative environmental data required for environmental checklist items (carbon emissions, energy consumption, waste metrics)');
          gaps.push('Environmental checklist requires specific targets, timelines, and progress measurements - current documentation insufficient');
        }
        
        if (lowerFeedback.includes('social') || filename.toLowerCase().includes('social')) {
          gaps.push('Social checklist items require workforce diversity statistics, training records, and community impact measurements');
          gaps.push('Documentation lacks specific evidence for employee safety protocols, digital inclusion programs, and stakeholder engagement');
        }
        
        if (lowerFeedback.includes('governance') || filename.toLowerCase().includes('governance')) {
          gaps.push('Governance checklist items missing board composition details, oversight procedures, and risk management frameworks');
          gaps.push('Documentation insufficient for governance transparency, ethics policies, and compliance monitoring requirements');
        }
      }
      
      // Specific checklist evidence gaps
      if (!lowerFeedback.includes('baseline') && !lowerFeedback.includes('benchmark')) {
        gaps.push('Checklist requires baseline data and industry benchmarks - current document lacks comparative performance metrics');
        gaps.push('Provide historical performance data and peer comparison metrics to complete checklist baseline requirements');
      }
      
      if (!lowerFeedback.includes('target') && !lowerFeedback.includes('goal')) {
        gaps.push('Checklist items require specific, measurable targets with timelines - document lacks quantitative objectives');
        gaps.push('Include SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) for each applicable checklist category');
      }
      
      if (!lowerFeedback.includes('verification') && !lowerFeedback.includes('audit')) {
        gaps.push('Checklist requires third-party verification or audit evidence - documentation lacks independent validation');
        gaps.push('Provide external audit reports, certifications, or independent assessments to complete verification requirements');
      }
      
      // Technology infrastructure checklist gaps
      if (!lowerFeedback.includes('5g') && !lowerFeedback.includes('network') && !lowerFeedback.includes('infrastructure')) {
        gaps.push('Technology infrastructure checklist items require network deployment and energy efficiency documentation');
      }
      
      if (!lowerFeedback.includes('cyber') && !lowerFeedback.includes('security') && !lowerFeedback.includes('data protection')) {
        gaps.push('Cybersecurity and data protection checklist items missing - provide security governance and privacy protection evidence');
      }
      
      if (!lowerFeedback.includes('fintech') && !lowerFeedback.includes('digital banking')) {
        gaps.push('Digital financial services checklist items require fintech ESG compliance and accessibility documentation');
      }
      
      return gaps;
    };

    // Department-specific checklist recommendations
    const generateDepartmentSpecificRecommendations = (feedback: string, filename: string, department: string) => {
      const recommendations = [];
      const lowerFeedback = feedback.toLowerCase();
      const isFinancialDoc = filename.toLowerCase().includes('financial') || filename.toLowerCase().includes('annual');
      const isAuditDoc = filename.toLowerCase().includes('audit') || filename.toLowerCase().includes('compliance');
      
      // Document-specific context for recommendations
      const docContext = isFinancialDoc ? ' in financial reporting' : isAuditDoc ? ' in audit documentation' : ' in submitted documentation';
      
      switch (department.toLowerCase()) {
        case 'group finance':
          // Finance-specific checklist recommendations
          if (lowerFeedback.includes('missing') || lowerFeedback.includes('incomplete')) {
            recommendations.push(`Finance: Document missing financial risk assessment data required for ESG financial checklist items${docContext}`);
            recommendations.push(`Finance: Provide ESG investment criteria and sustainable finance metrics for checklist completion${docContext}`);
          }
          if (lowerFeedback.includes('climate') || lowerFeedback.includes('risk')) {
            recommendations.push('Finance: Submit climate financial risk disclosures and TCFD compliance documentation');
            recommendations.push('Finance: Include financial impact assessments of ESG risks for checklist validation');
          }
          if (lowerFeedback.includes('investment') || lowerFeedback.includes('capital')) {
            recommendations.push('Finance: Provide ESG investment screening criteria and sustainable finance reporting');
          }
          break;
          
        case 'group legal & compliance':
          // Legal & Compliance-specific checklist recommendations
          if (lowerFeedback.includes('missing') || lowerFeedback.includes('incomplete')) {
            recommendations.push('Legal: Document missing regulatory compliance evidence for governance checklist items');
            recommendations.push('Legal: Provide legal risk assessments and compliance monitoring procedures');
          }
          if (lowerFeedback.includes('data') || lowerFeedback.includes('privacy')) {
            recommendations.push('Legal: Submit UAE data protection compliance documentation and privacy governance procedures');
            recommendations.push('Legal: Include TDRA regulatory compliance evidence and telecommunications legal framework');
          }
          if (lowerFeedback.includes('governance') || lowerFeedback.includes('ethics')) {
            recommendations.push('Legal: Provide anti-bribery policies, ethics frameworks, and legal governance structures');
          }
          break;
          
        case 'group operations':
          // Operations-specific checklist recommendations
          if (lowerFeedback.includes('missing') || lowerFeedback.includes('incomplete')) {
            recommendations.push('Operations: Document missing operational environmental data for infrastructure checklist items');
            recommendations.push('Operations: Provide network operations sustainability metrics and energy efficiency data');
          }
          if (lowerFeedback.includes('environmental') || lowerFeedback.includes('energy')) {
            recommendations.push('Operations: Submit 5G network energy consumption data and renewable energy integration metrics');
            recommendations.push('Operations: Include data center efficiency measurements and telecommunications infrastructure environmental impact');
          }
          if (lowerFeedback.includes('safety') || lowerFeedback.includes('emergency')) {
            recommendations.push('Operations: Provide operational safety protocols and emergency preparedness procedures');
          }
          break;
          
        case 'group risk & internal audit':
          // Risk & Audit-specific checklist recommendations
          if (lowerFeedback.includes('missing') || lowerFeedback.includes('incomplete')) {
            recommendations.push('Internal Audit: Document missing control testing evidence for governance checklist items');
            recommendations.push('Internal Audit: Provide ESG risk assessment procedures and audit findings');
          }
          if (lowerFeedback.includes('risk') || lowerFeedback.includes('control')) {
            recommendations.push('Internal Audit: Submit ESG risk register, control testing procedures, and audit methodology');
            recommendations.push('Internal Audit: Include cybersecurity governance audits and digital transformation risk assessments');
          }
          if (lowerFeedback.includes('audit') || lowerFeedback.includes('assessment')) {
            recommendations.push('Internal Audit: Provide independent ESG assessment procedures and validation frameworks');
          }
          break;
          
        default:
          // General recommendations when department not recognized
          recommendations.push('Provide department-specific ESG documentation relevant to selected organizational unit');
      }
      
      return recommendations.length > 0 ? recommendations : ['Department-specific checklist evidence required - submit relevant documentation for selected department'];
    };

    // e&-specific ESG analysis framework based on company strategy
    const analyzeDocumentForEandESGStrategy = (feedback: string, filename: string, overallScore: number) => {
      const analysis = {
        strategic_alignment: [] as string[],
        business_pillar_impact: {} as Record<string, any>,
        regulatory_compliance: [] as string[],
        stakeholder_impact: [] as string[],
        innovation_sustainability: [] as string[]
      };
      
      const lowerFeedback = feedback.toLowerCase();
      // Use filename and overallScore in analysis
      console.log(`Analyzing ${filename} with score ${overallScore} for e& ESG strategy alignment`);
      
      // e& Strategic ESG Pillars Analysis
      
      // 1. Net Zero 2030 and Climate Action
      if (lowerFeedback.includes('climate') || lowerFeedback.includes('carbon') || lowerFeedback.includes('emission')) {
        analysis.strategic_alignment.push('Document addresses e&\'s Net Zero 2030 climate commitment');
        if (lowerFeedback.includes('renewable') || lowerFeedback.includes('energy efficiency')) {
          analysis.strategic_alignment.push('Renewable energy integration aligned with e&\'s infrastructure sustainability goals');
        }
      }
      
      // 2. Digital Inclusion and Social Impact
      if (lowerFeedback.includes('digital') || lowerFeedback.includes('inclusion') || lowerFeedback.includes('access')) {
        analysis.strategic_alignment.push('Digital inclusion initiatives support e&\'s mission to bridge the digital divide');
        if (lowerFeedback.includes('skills') || lowerFeedback.includes('training')) {
          analysis.strategic_alignment.push('Digital skills development aligns with e&\'s workforce transformation strategy');
        }
      }
      
      // 3. Technology Governance and Cybersecurity
      if (lowerFeedback.includes('cyber') || lowerFeedback.includes('security') || lowerFeedback.includes('data protection')) {
        analysis.strategic_alignment.push('Cybersecurity governance supports e&\'s enterprise digital services');
        analysis.regulatory_compliance.push('Data protection measures align with UAE cybersecurity regulations');
      }
      
      // Business Pillar Impact Analysis
      
      // e& enterprise impact
      if (lowerFeedback.includes('cloud') || lowerFeedback.includes('iot') || lowerFeedback.includes('ai') || lowerFeedback.includes('enterprise')) {
        analysis.business_pillar_impact['e& enterprise'] = {
          impact_level: 'high',
          areas: ['Cloud services sustainability', 'IoT environmental monitoring', 'AI-driven ESG analytics'],
          recommendations: ['Integrate ESG metrics into e& enterprise service offerings', 'Develop sustainable cloud infrastructure solutions']
        };
      }
      
      // e& life impact
      if (lowerFeedback.includes('fintech') || lowerFeedback.includes('banking') || lowerFeedback.includes('financial')) {
        analysis.business_pillar_impact['e& life'] = {
          impact_level: 'medium',
          areas: ['Sustainable fintech services', 'Digital banking ESG compliance', 'Financial inclusion'],
          recommendations: ['Implement ESG criteria in e& life fintech products', 'Promote financial inclusion through digital banking']
        };
      }
      
      // e& capital impact
      if (lowerFeedback.includes('investment') || lowerFeedback.includes('startup') || lowerFeedback.includes('venture')) {
        analysis.business_pillar_impact['e& capital'] = {
          impact_level: 'high',
          areas: ['ESG investment criteria', 'Sustainable technology funding', 'Green innovation support'],
          recommendations: ['Apply ESG screening to e& capital investments', 'Prioritize sustainable technology startups']
        };
      }
      
      // UAE and Regional Context
      if (lowerFeedback.includes('uae') || lowerFeedback.includes('emirates') || lowerFeedback.includes('middle east')) {
        analysis.regulatory_compliance.push('Compliance with UAE Vision 2071 sustainability goals');
        analysis.stakeholder_impact.push('Contribution to UAE\'s digital transformation and sustainability objectives');
      }
      
      // Telecommunications Industry Specific
      if (lowerFeedback.includes('5g') || lowerFeedback.includes('network') || lowerFeedback.includes('telecommunications')) {
        analysis.innovation_sustainability.push('5G network deployment with environmental considerations');
        analysis.innovation_sustainability.push('Smart infrastructure supporting sustainable cities');
      }
      
      return analysis;
    };

    // Enhance checklist items based on department-specific requirements
    const enhanceChecklistForDepartment = (baseItems: any[], department: string, departmentContext: any) => {
      const enhancedItems = [...baseItems];
      
      // Use departmentContext to adjust weights and requirements
      const contextMultiplier = departmentContext?.expertise_level === 'high' ? 1.2 : departmentContext?.expertise_level === 'low' ? 0.8 : 1.0;
      
      // Add department-specific checklist items and modify weights
      switch (department.toLowerCase()) {
        case 'group legal & compliance':
          enhancedItems.push({
            id: 10,
            question_text: "UAE Telecommunications Regulatory Compliance Framework",
            category: "Governance",
            required_evidence: ["TDRA compliance procedures", "telecommunications license compliance", "UAE ESG regulatory adherence"],
            weight: 0.22
          });
          enhancedItems.push({
            id: 11,
            question_text: "e& Anti-Bribery and Corruption Controls",
            category: "Governance",
            required_evidence: ["e& anti-bribery policies", "corruption risk assessment for telecommunications", "third-party due diligence procedures"],
            weight: 0.15
          });
          enhancedItems.push({
            id: 12,
            question_text: "Data Protection and Privacy Governance for e& Services",
            category: "Governance",
            required_evidence: ["UAE data protection compliance", "e& cybersecurity governance", "digital services privacy controls"],
            weight: 0.18
          });
          // Increase weight for governance items
          enhancedItems.forEach(item => {
            if (item.category === 'Governance') {
              item.weight *= 1.3;
            }
          });
          break;

        case 'group finance':
          enhancedItems.push({
            id: 13,
            question_text: "e& ESG Financial Risk Assessment and Digital Investment Criteria",
            category: "Governance",
            required_evidence: ["telecommunications infrastructure financial risk metrics", "e& capital ESG investment criteria", "sustainable technology finance reporting"],
            weight: 0.20
          });
          enhancedItems.push({
            id: 14,
            question_text: "e& Net Zero 2030 Climate Financial Risk Disclosure",
            category: "Environmental",
            required_evidence: ["telecommunications climate risk scenarios", "network infrastructure financial impact assessment", "e& TCFD compliance"],
            weight: 0.18
          });
          enhancedItems.push({
            id: 15,
            question_text: "e& Digital Services Revenue ESG Integration",
            category: "Governance",
            required_evidence: ["fintech ESG revenue metrics", "sustainable digital services financial reporting", "e& life financial sustainability"],
            weight: 0.16
          });
          break;

        case 'group operations':
          enhancedItems.push({
            id: 16,
            question_text: "e& Network Infrastructure Environmental Management",
            category: "Environmental",
            required_evidence: ["5G network energy efficiency measures", "data center renewable energy integration", "telecommunications equipment lifecycle management"],
            weight: 0.22
          });
          enhancedItems.push({
            id: 17,
            question_text: "e& Digital Infrastructure Safety and Resilience",
            category: "Social",
            required_evidence: ["network safety protocols", "cybersecurity incident response", "digital service continuity planning"],
            weight: 0.18
          });
          enhancedItems.push({
            id: 18,
            question_text: "e& Net Zero 2030 Operational Implementation",
            category: "Environmental",
            required_evidence: ["renewable energy sourcing for operations", "carbon footprint reduction measures", "sustainable technology deployment"],
            weight: 0.20
          });
          // Increase weight for environmental and social items
          enhancedItems.forEach(item => {
            if (item.category === 'Environmental' || item.category === 'Social') {
              item.weight *= 1.25;
            }
          });
          break;

        case 'group risk & internal audit':
          enhancedItems.push({
            id: 19,
            question_text: "e& ESG Risk Framework and Digital Transformation Control Testing",
            category: "Governance",
            required_evidence: ["telecommunications ESG risk register", "digital services control testing", "e& business pillar risk mitigation strategies"],
            weight: 0.24
          });
          enhancedItems.push({
            id: 20,
            question_text: "e& Internal Audit ESG Assessment for Technology Operations",
            category: "Governance",
            required_evidence: ["cybersecurity governance audit", "digital infrastructure ESG assessment", "e& Net Zero 2030 progress audit"],
            weight: 0.20
          });
          enhancedItems.push({
            id: 21,
            question_text: "e& Cybersecurity and Data Protection Risk Assessment",
            category: "Governance",
            required_evidence: ["audit procedures", "ESG control testing", "audit findings"],
            weight: 0.18
          });
          // Significantly increase governance weights for audit department
          enhancedItems.forEach(item => {
            if (item.category === 'Governance') {
              item.weight *= 1.5;
            }
          });
          break;

        case 'human resources':
          enhancedItems.push({
            id: 18,
            question_text: "Diversity, Equity, and Inclusion Programs",
            category: "Social",
            required_evidence: ["DEI metrics", "inclusion programs", "equity assessments"],
            weight: 0.19
          });
          enhancedItems.push({
            id: 19,
            question_text: "Employee Well-being and Development Programs",
            category: "Social",
            required_evidence: ["well-being initiatives", "training programs", "career development"],
            weight: 0.16
          });
          // Increase weight for social items
          enhancedItems.forEach(item => {
            if (item.category === 'Social') {
              item.weight *= 1.4;
            }
          });
          break;
      }

      // Apply context multiplier to all items
      enhancedItems.forEach(item => {
        item.weight = item.weight * contextMultiplier;
      });
      
      // Normalize weights to ensure they sum to approximately 1
      const totalWeight = enhancedItems.reduce((sum, item) => sum + item.weight, 0);
      enhancedItems.forEach(item => {
        item.weight = item.weight / totalWeight;
      });

      return enhancedItems;
    };

    // Generate comprehensive completeness analysis based on document content and department context
    const generateCompletenessAnalysis = (feedback: string, filename: string, overallScore: number, departmentContext?: any) => {
      const lowerFeedback = feedback.toLowerCase();
      const lowerFilename = filename.toLowerCase();
      
      // Define ESG checklist items that should be evaluated, adjusted for department context
      let checklistItems = [
        {
          id: 1,
          question_text: "Environmental Impact Assessment and Carbon Footprint Reporting",
          category: "Environmental",
          required_evidence: ["carbon emissions data", "environmental impact metrics", "sustainability targets"],
          weight: 0.15
        },
        {
          id: 2,
          question_text: "Diversity, Equity, and Inclusion (DEI) Policies and Metrics",
          category: "Social",
          required_evidence: ["diversity statistics", "inclusion policies", "equal opportunity measures"],
          weight: 0.12
        },
        {
          id: 3,
          question_text: "Corporate Governance Structure and Board Oversight",
          category: "Governance",
          required_evidence: ["board composition", "governance framework", "oversight mechanisms"],
          weight: 0.13
        },
        {
          id: 4,
          question_text: "Stakeholder Engagement and Community Impact",
          category: "Social",
          required_evidence: ["stakeholder consultation", "community programs", "impact assessment"],
          weight: 0.10
        },
        {
          id: 5,
          question_text: "Risk Management and Compliance Framework",
          category: "Governance",
          required_evidence: ["risk assessment", "compliance procedures", "monitoring systems"],
          weight: 0.14
        },
        {
          id: 6,
          question_text: "Supply Chain Sustainability and Vendor Assessment",
          category: "Environmental",
          required_evidence: ["vendor evaluation", "supply chain standards", "sustainability criteria"],
          weight: 0.11
        },
        {
          id: 7,
          question_text: "Employee Health, Safety, and Well-being Programs",
          category: "Social",
          required_evidence: ["safety protocols", "health programs", "well-being initiatives"],
          weight: 0.10
        },
        {
          id: 8,
          question_text: "Data Privacy and Cybersecurity Measures",
          category: "Governance",
          required_evidence: ["data protection policies", "security measures", "privacy compliance"],
          weight: 0.09
        },
        {
          id: 9,
          question_text: "Waste Management and Resource Efficiency",
          category: "Environmental",
          required_evidence: ["waste reduction programs", "resource utilization", "circular economy practices"],
          weight: 0.06
        }
      ];

      // Enhance checklist items based on department context
      if (departmentContext) {
        const department = processedData.department || '';
        checklistItems = enhanceChecklistForDepartment(checklistItems, department, departmentContext);
      }

      // Analyze each checklist item for completeness
      const analyzedItems = checklistItems.map(item => {
        const evidenceFound: string[] = [];
        const gapsIdentified: string[] = [];
        const recommendations = [];
        
        // Check for evidence in the feedback
        let evidenceScore = 0;
        item.required_evidence.forEach(evidence => {
          const evidenceKeywords = evidence.split(' ');
          const foundInFeedback = evidenceKeywords.some(keyword => 
            lowerFeedback.includes(keyword) || lowerFilename.includes(keyword)
          );
          
          if (foundInFeedback) {
            evidenceFound.push(`Document contains ${evidence} information`);
            evidenceScore += 0.33;
          } else {
            gapsIdentified.push(`Missing or insufficient ${evidence}`);
            recommendations.push(`Provide detailed documentation of ${evidence}`);
          }
        });

        // Determine completeness status
        let status = 'missing';
        let completeness_score = 0;
        
        if (evidenceScore >= 0.8) {
          status = 'complete';
          completeness_score = Math.min(0.95, overallScore + 0.1);
        } else if (evidenceScore >= 0.4) {
          status = 'incomplete';
          completeness_score = Math.max(0.3, overallScore - 0.1);
        } else {
          status = 'missing';
          completeness_score = Math.max(0.1, overallScore - 0.3);
        }

        // Add specific recommendations for Internal Audit experts
        if (status !== 'complete') {
          recommendations.push(`Internal Audit should verify ${item.category.toLowerCase()} controls and documentation`);
          recommendations.push(`Implement ${item.category} monitoring and reporting procedures`);
        }

        return {
          ...item,
          status,
          completeness_score,
          evidence_found: evidenceFound,
          gaps_identified: gapsIdentified,
          recommendations: recommendations
        };
      });

      // Calculate summary statistics
      const complete = analyzedItems.filter(item => item.status === 'complete').length;
      const incomplete = analyzedItems.filter(item => item.status === 'incomplete').length;
      const missing = analyzedItems.filter(item => item.status === 'missing').length;
      const total = analyzedItems.length;

      // Calculate weighted overall completeness
      const weightedCompleteness = analyzedItems.reduce((sum, item) => {
        return sum + (item.completeness_score * item.weight);
      }, 0);

      // Perform e& strategy analysis (using function parameters)
      const eandAnalysis = analyzeDocumentForEandESGStrategy(feedback, filename, overallScore);

      return {
        overall_completeness: weightedCompleteness,
        eand_strategic_analysis: eandAnalysis,
        summary: {
          complete,
          incomplete,
          missing,
          total
        },
        items: analyzedItems,
        analysis_insights: generateCompletenessInsights(analyzedItems, complete, incomplete, missing, processedData.department)
      };
    };

    const generateCompletenessInsights = (items: any[], complete: number, incomplete: number, missing: number, department?: string) => {
      const insights = [];
      
      if (complete === 0) {
        insights.push("Critical: No checklist items are fully compliant - immediate comprehensive review required");
      } else if (complete < 3) {
        insights.push("Significant compliance gaps identified - prioritize completing incomplete items");
      }
      
      if (missing > incomplete) {
        insights.push("Major documentation gaps - focus on gathering missing evidence before remediation");
      }
      
      // Category-specific insights
      const envItems = items.filter(item => item.category === 'Environmental');
      const socialItems = items.filter(item => item.category === 'Social');
      const govItems = items.filter(item => item.category === 'Governance');
      
      const envComplete = envItems.filter(item => item.status === 'complete').length;
      const socialComplete = socialItems.filter(item => item.status === 'complete').length;
      const govComplete = govItems.filter(item => item.status === 'complete').length;
      
      if (envComplete === 0) {
        insights.push("Environmental compliance requires immediate attention - implement environmental management system");
      }
      if (socialComplete === 0) {
        insights.push("Social responsibility documentation is inadequate - develop comprehensive HR and community policies");
      }
      if (govComplete === 0) {
        insights.push("Governance framework needs fundamental restructuring - establish board oversight and risk management");
      }

      // Department-specific insights
      if (department) {
        switch (department.toLowerCase()) {
          case 'group legal & compliance':
            if (govComplete < govItems.length * 0.8) {
              insights.push("Legal & Compliance: Focus on strengthening regulatory compliance documentation and legal risk frameworks");
            }
            break;
          case 'group finance':
            if (envComplete === 0) {
              insights.push("Finance: Implement climate financial risk assessment and ESG investment criteria documentation");
            }
            break;
          case 'group operations':
            if (envComplete + socialComplete < (envItems.length + socialItems.length) * 0.7) {
              insights.push("Operations: Strengthen environmental management systems and operational safety protocols");
            }
            break;
          case 'group risk & internal audit':
            insights.push("Internal Audit: Develop ESG-specific audit procedures and control testing methodologies");
            if (govComplete < govItems.length) {
              insights.push("Internal Audit: Establish ESG risk register and enhance governance control testing");
            }
            break;
          case 'human resources':
            if (socialComplete < socialItems.length * 0.8) {
              insights.push("HR: Enhance DEI metrics and employee well-being documentation for compliance");
            }
            break;
        }
      }

      return insights;
    };

    // Parse the data structure to match ChecklistUpload format
    const overallScore = (aiAnalysis as any).overall_score || (aiAnalysis as any).score || 0;
    const feedbackText = aiAnalysis.feedback || aiAnalysis.analysis || '';
    
    const processedData = {
      overall_score: overallScore,
      category_scores: (aiAnalysis as any).category_scores || extractCategoryScores(feedbackText, overallScore),
      recommendations: (aiAnalysis as any).recommendations || extractDocumentSpecificRecommendations(feedbackText, filename),
      gaps: (aiAnalysis as any).gaps || extractDocumentSpecificGaps(feedbackText, filename, overallScore),
      processed_at: aiAnalysis.created_at,
      department_context: (aiAnalysis as any).department_context || null,
      department: (aiAnalysis as any).department || null
    };

    return (
      <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
        {/* Header exactly like ChecklistUpload */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2" fontWeight={600}>
            🤖 AI Analysis Results
          </Typography>
        </Box>

        {/* Enhanced Score Display - exactly like ChecklistUpload */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            mb: 3,
            '& > *': { flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' },
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 3,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              {getScoreIcon(processedData.overall_score)}
              <Typography variant="h6" sx={{ ml: 1 }}>
                Overall Score
              </Typography>
            </Box>
            <Typography variant="h2" fontWeight={700}>
              {formatScore(processedData.overall_score)}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'white',
                fontWeight: 500
              }}
            >
              Compliance Level:{' '}
              {processedData.overall_score >= 0.8
                ? 'Excellent'
                : processedData.overall_score >= 0.6
                  ? 'Good'
                  : 'Needs Improvement'}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={processedData.overall_score * 100}
              sx={{ mt: 2, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.3)' }}
            />
          </Paper>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              <Dashboard sx={{ color: 'white' }} />
              <Typography variant="h6" sx={{ ml: 1, color: 'white' }}>
                Categories
              </Typography>
            </Box>
            <Typography variant="h2" fontWeight={700}>
              {Object.keys(processedData.category_scores || {}).length}
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
              Areas Analyzed
            </Typography>
          </Paper>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              <Info />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Recommendations
              </Typography>
            </Box>
            <Typography variant="h2" fontWeight={700}>
              {processedData.recommendations?.length || 0}
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
              Action Items
            </Typography>
          </Paper>
        </Box>

        {/* Enhanced Category Breakdown - exactly like ChecklistUpload */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary' }}>
              📊 Areas Analyzed - Category Performance
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                '& > *': { flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' },
              }}
            >
              {Object.entries(processedData.category_scores || {}).map(([category, score]) => (
                <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }} key={category}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography 
                      variant="subtitle1" 
                      fontWeight={600}
                      sx={{ 
                        color: 'text.primary',
                        textTransform: 'capitalize'
                      }}
                    >
                      {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Typography
                        variant="h6"
                        color={`${getScoreColor(score as number)}.main`}
                        sx={{ ml: 1 }}
                      >
                        {formatScore(score)}
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(score as number) * 100}
                    color={getScoreColor(score as number)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    {(score as number) >= 0.8
                      ? 'Excellent performance'
                      : (score as number) >= 0.6
                        ? 'Good, room for improvement'
                        : 'Needs immediate attention'}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Enhanced Recommendations - exactly like ChecklistUpload */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" fontWeight={600}>
              ✅ Recommendations ({processedData.recommendations?.length || 0})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {processedData.recommendations?.length > 0 ? (
              <List>
                {processedData.recommendations.map((rec: string, index: number) => (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: 'success.light',
                      borderRadius: 1,
                      mb: 1,
                      color: 'success.contrastText',
                    }}
                  >
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText primary={<Typography fontWeight={500}>{rec}</Typography>} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                No specific recommendations available for this analysis.
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Enhanced Gaps Analysis - exactly like ChecklistUpload */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" fontWeight={600}>
              ⚠️ Identified Gaps ({processedData.gaps?.length || 0})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {processedData.gaps?.length > 0 ? (
              <List>
                {processedData.gaps.map((gap: string, index: number) => (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: 'error.light',
                      borderRadius: 1,
                      mb: 1,
                      color: 'error.contrastText',
                    }}
                  >
                    <ListItemIcon>
                      <ErrorIcon color="error" />
                    </ListItemIcon>
                    <ListItemText primary={<Typography fontWeight={500}>{gap}</Typography>} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="success">No significant gaps identified in the analysis.</Alert>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Enhanced Checklist Completeness Evaluation */}
        {(() => {
          // Generate comprehensive completeness analysis based on document content
          let checklistCompleteness = null;
          
          // First, try to extract from metadata if available
          try {
            if ((aiAnalysis as any).analysis_metadata) {
              const metadata = typeof (aiAnalysis as any).analysis_metadata === 'string' 
                ? JSON.parse((aiAnalysis as any).analysis_metadata) 
                : (aiAnalysis as any).analysis_metadata;
              checklistCompleteness = metadata?.checklist_completeness;
            }
          } catch (e) {
            console.warn('Failed to parse analysis_metadata:', e);
          }
          
          // If no metadata completeness data, generate it from the analysis
          if (!checklistCompleteness || !checklistCompleteness.items?.length) {
            checklistCompleteness = generateCompletenessAnalysis(feedbackText, filename, overallScore, processedData.department_context);
          }
          
          return checklistCompleteness && checklistCompleteness.items?.length > 0 ? (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary' }}>
                  ✅ Checklist Completeness Evaluation 
                  ({Math.round(checklistCompleteness.overall_completeness * 100)}% Complete)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    This section evaluates how well your uploaded document addresses each checklist item.
                  </Typography>
                  
                  {/* Analysis Insights for Internal Audit Experts */}
                  {checklistCompleteness.analysis_insights && checklistCompleteness.analysis_insights.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'warning.main' }}>
                        🎯 Internal Audit Insights
                      </Typography>
                      {checklistCompleteness.analysis_insights.map((insight: string, index: number) => (
                        <Paper key={index} elevation={1} sx={{ p: 2, mb: 1, bgcolor: 'warning.light', borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
                          <Typography variant="body2" fontWeight={500} sx={{ color: 'warning.dark' }}>
                            {insight}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  )}
                  
                  {/* Summary Statistics */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    mb: 3,
                    flexWrap: 'wrap'
                  }}>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', minWidth: 120 }}>
                      <Typography variant="h4" fontWeight={700} sx={{ color: 'success.dark' }}>
                        {checklistCompleteness.summary.complete}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'success.dark' }}>
                        Complete
                      </Typography>
                    </Paper>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', minWidth: 120 }}>
                      <Typography variant="h4" fontWeight={700} sx={{ color: 'warning.dark' }}>
                        {checklistCompleteness.summary.incomplete}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'warning.dark' }}>
                        Incomplete
                      </Typography>
                    </Paper>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', minWidth: 120 }}>
                      <Typography variant="h4" fontWeight={700} sx={{ color: 'error.dark' }}>
                        {checklistCompleteness.summary.missing}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'error.dark' }}>
                        Missing
                      </Typography>
                    </Paper>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', minWidth: 120 }}>
                      <Typography variant="h4" fontWeight={700} sx={{ color: 'info.dark' }}>
                        {checklistCompleteness.summary.total}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'info.dark' }}>
                        Total Items
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Individual Item Details */}
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Detailed Item Analysis
                  </Typography>
                  
                  {checklistCompleteness.items.map((item: any, index: number) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'complete': return 'success';
                        case 'incomplete': return 'warning';
                        case 'missing': return 'error';
                        default: return 'info';
                      }
                    };
                    
                    const getStatusIcon = (status: string) => {
                      switch (status) {
                        case 'complete': return <CheckCircle />;
                        case 'incomplete': return <Analytics />;
                        case 'missing': return <ErrorIcon />;
                        default: return <Info />;
                      }
                    };
                    
                    return (
                      <Paper 
                        key={index} 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderLeft: `4px solid`,
                          borderLeftColor: `${getStatusColor(item.status)}.main`
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box sx={{ color: `${getStatusColor(item.status)}.main`, pt: 0.5 }}>
                            {getStatusIcon(item.status)}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {item.question_text}
                              </Typography>
                              <Chip
                                label={item.status.toUpperCase()}
                                color={getStatusColor(item.status)}
                                size="small"
                              />
                              <Chip
                                label={formatScore(item.completeness_score)}
                                variant="outlined"
                                size="small"
                              />
                            </Box>
                            
                            {item.category && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Category: {item.category}
                              </Typography>
                            )}
                            
                            {item.evidence_found?.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                                  Evidence Found:
                                </Typography>
                                <List dense sx={{ pl: 2 }}>
                                  {item.evidence_found.map((evidence: string, idx: number) => (
                                    <ListItem key={idx} sx={{ py: 0, px: 0 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        • {evidence}
                                      </Typography>
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                            
                            {item.gaps_identified?.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5, color: 'error.main' }}>
                                  Gaps Identified:
                                </Typography>
                                <List dense sx={{ pl: 2 }}>
                                  {item.gaps_identified.map((gap: string, idx: number) => (
                                    <ListItem key={idx} sx={{ py: 0, px: 0 }}>
                                      <Typography variant="body2" color="error.main">
                                        • {gap}
                                      </Typography>
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                            
                            {item.recommendations?.length > 0 && (
                              <Box>
                                <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5, color: 'primary.main' }}>
                                  Recommendations:
                                </Typography>
                                <List dense sx={{ pl: 2 }}>
                                  {item.recommendations.map((rec: string, idx: number) => (
                                    <ListItem key={idx} sx={{ py: 0, px: 0 }}>
                                      <Typography variant="body2" color="primary.main">
                                        • {rec}
                                      </Typography>
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>
          ) : null;
        })()}

        {/* Department-Based Analysis Context */}
        {processedData.department_context && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary' }}>
                🏢 {processedData.department || 'Department'} Analysis Context
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper elevation={1} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'primary.main' }}>
                    Department-Specific Context
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    This analysis was performed with <strong>{processedData.department}</strong> department context.
                  </Typography>
                </Box>

                {/* Display department context details */}
                {processedData.department_context.focus_areas && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                      📋 Focus Areas:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {processedData.department_context.focus_areas.map((area: string, index: number) => (
                        <Chip key={index} label={area.replace(/_/g, ' ').toUpperCase()} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}

                {processedData.department_context.expertise_level && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                      📊 Expertise Level:
                    </Typography>
                    <Chip
                      label={`${processedData.department_context.expertise_level.toUpperCase()} EXPERTISE`}
                      color={processedData.department_context.expertise_level === 'high' ? 'success' : 
                             processedData.department_context.expertise_level === 'medium' ? 'warning' : 'info'}
                      size="small"
                    />
                  </Box>
                )}

                {processedData.department_context.specialized_criteria && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                      🎯 Specialized Criteria:
                    </Typography>
                    <List dense>
                      {processedData.department_context.specialized_criteria.map((criterion: string, index: number) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <Typography variant="body2" color="primary.main">•</Typography>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" color="text.primary">
                                {criterion}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {processedData.department_context.weightings && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                      ⚖️ Department Weightings:
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      {Object.entries(processedData.department_context.weightings).map(([key, weight]) => (
                        <Paper key={key} elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(weight as number) * 100}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                              color={getScoreColor(weight as number)}
                            />
                            <Typography variant="caption" fontWeight={600}>
                              {Math.round((weight as number) * 100)}%
                            </Typography>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
    } catch (error) {
      console.error('Error rendering AI Analysis:', error);
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom color="error">
            Error Loading AI Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            There was an issue processing the AI analysis data.
          </Typography>
          <Typography variant="caption" color="error">
            {error instanceof Error ? error.message : 'Unknown error'}
          </Typography>
        </Box>
      );
    }
  };

  const canZoom = ['pdf', 'image', 'text'].includes(getFileType(filename));
  const canRotate = ['pdf', 'image'].includes(getFileType(filename));

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={isFullscreen ? false : "lg"} 
      fullWidth
      fullScreen={isFullscreen}
      sx={{
        '& .MuiDialog-paper': {
          height: isFullscreen ? '100vh' : '90vh',
          maxHeight: isFullscreen ? '100vh' : '90vh',
          width: isFullscreen ? '100vw' : undefined,
          maxWidth: isFullscreen ? '100vw' : undefined,
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="span">
              {filename}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip 
                label={getFileType(filename).toUpperCase()} 
                size="small" 
                color="primary" 
              />
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(fileData?.file_size || fileSize)}
              </Typography>
              {fileData?.status && (
                <Chip 
                  label={fileData.status.toUpperCase()} 
                  size="small" 
                  color={fileData.status === 'approved' ? 'success' : 
                         fileData.status === 'rejected' ? 'error' : 'warning'} 
                />
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Description />} label="Document Viewer" />
          <Tab icon={<AssessmentOutlined />} label="AI Analysis" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden', height: '100%' }}>
        {activeTab === 0 ? renderDocumentViewer() : renderAIAnalysis()}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeTab === 0 && canZoom && (
            <>
              <IconButton 
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                disabled={zoom <= 25}
                title="Zoom Out"
              >
                <ZoomOut />
              </IconButton>
              <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '50px' }}>
                {zoom}%
              </Typography>
              <IconButton 
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
                title="Zoom In"
              >
                <ZoomIn />
              </IconButton>
            </>
          )}
          {activeTab === 0 && canRotate && (
            <IconButton 
              onClick={() => setRotation((rotation + 90) % 360)}
              title="Rotate"
            >
              <RotateRight />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <Fullscreen />
          </IconButton>
          <Button 
            startIcon={<Download />} 
            onClick={handleDownload}
            variant="outlined"
          >
            Download
          </Button>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

const FileContentLoader: React.FC<{ uploadId: number }> = ({ uploadId }) => {
  const [content, setContent] = useState<string>('Loading...');

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await filesAPI.view(uploadId.toString());
        const text = await response.data.text();
        setContent(text);
      } catch (error) {
        setContent('Error loading file content. Text preview may not be available for this file type.');
      }
    };
    loadContent();
  }, [uploadId]);

  return <>{content}</>;
};

