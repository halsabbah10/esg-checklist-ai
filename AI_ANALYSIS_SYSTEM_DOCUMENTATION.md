# ESG Checklist AI - AI Analysis and Scoring System Documentation

## Overview

The ESG Checklist AI system features a comprehensive AI analysis and scoring engine designed specifically for Environmental, Social, and Governance (ESG) compliance assessment. The system integrates multiple AI providers, department-specific analysis configurations, and a sophisticated workflow that transforms document uploads into actionable ESG insights.

## System Architecture

### Core Components

1. **ComprehensiveESGAnalyzer** - Central analysis orchestrator
2. **AIScorer** - Multi-provider AI abstraction layer 
3. **Department Configurations** - Specialized prompts and contexts
4. **AI Analysis Router** - API endpoints for frontend integration
5. **Frontend AI Workflow** - 4-step user interface

## AI Provider Integration

### Supported AI Providers

#### 1. Google Gemini (Primary/Recommended)
- **Model**: `gemini-2.0-flash-exp` 
- **Configuration**: `backend/app/config.py` - `gemini_api_key`, `gemini_model`
- **Capabilities**:
  - Comprehensive ESG scoring
  - Department-specific analysis
  - Multi-language support
  - Fast processing (2000+ token output)
- **Usage**: Default provider with automatic fallback functionality

#### 2. DeepSeek R1
- **Model**: `deepseek-reasoner`
- **Configuration**: `backend/app/config.py` - `deepseek_api_key`, `deepseek_model`, `deepseek_api_base`
- **Capabilities**:
  - Advanced reasoning capabilities
  - Detailed analysis
  - Complex problem solving
  - Thorough assessments
- **API Base**: `https://api.deepseek.com`

#### 3. OpenAI
- **Configuration**: `backend/app/config.py` - `openai_api_key`
- **Capabilities**:
  - Standard ESG analysis
  - General scoring
  - Fallback provider
- **Integration**: Full API integration with standard OpenAI endpoints

#### 4. e& ChatGPT (Custom)
- **Configuration**: `backend/app/config.py` - `eand_api_url`, `eand_api_key`
- **Capabilities**:
  - Regional compliance expertise
  - e& specific requirements
  - Local regulations knowledge
  - Industry standards alignment
- **Fallback**: Uses Gemini if e& API unavailable

### Provider Selection Strategy

```python
# AI_SCORER configuration in .env
AI_SCORER=gemini  # Options: gemini, deepseek, openai, eand

# Fallback hierarchy:
# 1. Selected provider (if API key available)
# 2. Gemini (if selected provider fails)
# 3. Error (if Gemini also fails)
```

### API Configuration Management

The system uses centralized configuration through Pydantic BaseSettings:

```python
class Settings(BaseSettings):
    # AI Provider Configuration
    ai_scorer: str = "gemini"
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.0-flash-exp"
    openai_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    deepseek_model: str = "deepseek-reasoner"
    deepseek_api_base: str = "https://api.deepseek.com"
    eand_api_url: Optional[str] = None
    eand_api_key: Optional[str] = None
```

## Department-Specific Analysis

### Available Departments

1. **Group Legal & Compliance**
2. **Group Finance** 
3. **Group Strategy**
4. **Group Operations**
5. **Group Human Resources**
6. **Branding & Communications**
7. **Admin & Contracts**
8. **Group Risk & Internal Audit**
9. **Technology**
10. **General Approach** (fallback)

### Department Configuration Structure

Each department has specialized analysis parameters:

```python
{
    "department_name": "Group Legal & Compliance",
    "audit_context": {
        "focus_areas": [
            "esg_regulatory_compliance",
            "anti_bribery_iso37001", 
            "contract_management",
            # ... more areas
        ],
        "compliance_frameworks": [
            "ISO 37001 Anti-Bribery",
            "EU CSRD",
            "UAE ESG Regulations"
            # ... more frameworks
        ],
        "key_metrics": [
            "zero_tolerance_violations",
            "ethics_training_completion"
            # ... more metrics
        ]
    },
    "prompt_for_gemini": "Specialized prompt text...",
    "ui_config": {
        "insert_after": "Recommendations",
        "add_section": "Detailed Compliance Report"
    }
}
```

### Department-Specific Prompt Engineering

Each department has tailored prompts that include:
- **Context Setting**: Department role and responsibilities
- **ESG Focus Areas**: Environmental, social, governance priorities
- **Scoring Criteria**: Department-specific 0.0-1.0 scale
- **Evidence Requirements**: Documentation needed for compliance
- **Action Plans**: Concrete next steps for improvement

Example for Group Legal & Compliance:
- Zero-tolerance anti-corruption framework
- ISO 37001 compliance requirements  
- Whistleblower program evaluation
- Cross-border regulatory compliance (38 countries)

## ESG Scoring Methodology

### Scoring Scale (0.0 - 1.0)

- **0.9-1.0**: Exceptional ESG performance, comprehensive compliance
- **0.7-0.8**: Strong ESG performance with minor gaps
- **0.5-0.6**: Adequate ESG awareness but significant improvements needed
- **0.3-0.4**: Poor ESG integration with major risks
- **0.0-0.2**: Critical ESG failures requiring immediate intervention

### Scoring Components

1. **Overall Score**: Primary 0.0-1.0 assessment
2. **Category Scores**: Environmental, Social, Governance breakdowns
3. **Checklist Completeness**: Item-by-item analysis
4. **Compliance Indicators**: Regulatory alignment metrics
5. **Department-Specific Metrics**: Specialized KPIs per department

### Multi-Dimensional Analysis

The system evaluates documents across multiple dimensions:

```python
{
    "category_scores": {
        "environmental": 0.75,
        "social": 0.68, 
        "governance": 0.82
    },
    "checklist_completeness": {
        "total": 45,
        "completed": 32,
        "completion_rate": 0.71,
        "summary": {
            "complete": 32,
            "incomplete": 8,
            "missing": 5
        }
    },
    "compliance_indicators": {
        "regulatory_alignment": 0.78,
        "framework_compliance": 0.65,
        "best_practices": 0.71
    }
}
```

## Analysis Workflow

### End-to-End Process

#### 1. Document Upload & Validation
- **File Types**: PDF, DOCX, XLSX, CSV, TXT
- **Security**: Secure filename generation, virus scanning
- **Size Limits**: Configurable (default 50MB)
- **Text Extraction**: Format-specific parsing

#### 2. AI Model Selection
- **Provider Choice**: Gemini, DeepSeek, OpenAI, e&
- **Department Selection**: 10 specialized configurations
- **Configuration Validation**: API key verification

#### 3. Comprehensive Analysis
- **Text Processing**: Intelligent truncation for token limits
- **Department Context**: Specialized prompts and frameworks
- **AI Scoring**: Multi-provider analysis with fallbacks
- **Metadata Generation**: Structured analysis data

#### 4. Results Storage & Presentation
- **Database Persistence**: Analysis results, metadata, files
- **Export Options**: JSON, Excel formats
- **Real-time Analytics**: Processing tracking
- **Notifications**: User alerts on completion

### Technical Implementation

```python
# ComprehensiveESGAnalyzer workflow
def analyze_document(self, document_text: str, department_name: str, 
                    filename: str, checklist_items: Optional[List] = None):
    
    # 1. Validation
    if not document_text or not department_name:
        raise ValueError("Required inputs missing")
    
    # 2. AI Analysis via AIScorer
    score, feedback, metadata = self.scorer.analyze_by_department(
        document_text, department_name, checklist_items
    )
    
    # 3. Metadata Formatting
    formatted_metadata = self._format_metadata(
        metadata, department_name, filename, score, feedback, document_text
    )
    
    # 4. Result Structure
    return {
        "score": score,
        "feedback": feedback,
        "metadata": formatted_metadata,
        "created_at": datetime.now().isoformat(),
        "model_version": self.scorer.provider
    }
```

## Document Analysis Features

### Intelligent Text Extraction

#### PDF Processing
- **Library**: pdfplumber
- **Capabilities**: Multi-page text extraction, table parsing
- **Error Handling**: Graceful degradation for corrupted files

#### Excel Processing  
- **Library**: openpyxl
- **Smart Sheet Detection**: Prioritizes "ESG Questionnaires" sheets
- **Fallback**: Processes all sheets if ESG-specific not found

#### Word Processing
- **Library**: python-docx
- **Features**: Paragraph extraction, formatting preservation

### Dynamic Questionnaire Analysis

The system dynamically extracts questionnaire items from documents:

```python
def _extract_questionnaire_items(self, document_text: str) -> List[Dict]:
    """
    Dynamically extract ALL questionnaire items from document.
    Handles unlimited questions with follow-up sub-questions.
    """
    # Pattern matching for ESG reference codes
    # ESG-Environment-01a:, ESG-Social-02b:, etc.
    
    # Question detection patterns
    # - Direct questions (ending with ?)
    # - Action verbs (describe, explain, outline)
    # - ESG-specific terms (policy, compliance, governance)
    
    # Categorization (Environmental, Social, Governance)
    # Duplicate detection and cleanup
```

### Checklist Completeness Evaluation

For each extracted questionnaire item:
- **Status Assessment**: Complete, Incomplete, Missing
- **Evidence Extraction**: Supporting documentation references
- **Completeness Scoring**: Weighted evaluation per item
- **Gap Analysis**: Detailed improvement recommendations

## Frontend Integration

### 4-Step AI Analysis Workflow

#### Step 1: Model & Department Selection
- **Component**: `Step1ModelDepartmentSelection.tsx`
- **Features**: AI model selection, department specialization choice
- **Validation**: Configuration verification before proceeding

#### Step 2: Document Upload  
- **Component**: `Step2DocumentUpload.tsx`
- **Features**: Drag-and-drop upload, file validation, progress tracking
- **Security**: Client-side file type validation

#### Step 3: Processing Analysis
- **Component**: `Step3ProcessingAnalysis.tsx`
- **Features**: Real-time processing status, progress indicators
- **Analytics**: Processing time tracking

#### Step 4: Results Display
- **Component**: `ComprehensiveStep4ResultsDisplay.tsx`
- **Features**: 
  - Overall score with percentage
  - Category breakdowns (Environmental, Social, Governance)
  - Checklist completeness analysis
  - Detailed recommendations
  - Gap analysis
  - Export functionality

### API Integration

The frontend communicates with the backend through RESTful APIs:

```typescript
// Primary analysis endpoint
POST /api/ai-analysis/upload-and-analyze
- Form data: model, department, file
- Returns: analysis_id, score, feedback, metadata

// Results retrieval
GET /api/ai-analysis/results/{analysis_id}
- Returns: Complete analysis with metadata

// Export functionality  
GET /api/ai-analysis/results/{analysis_id}/export?format=json|excel
- Returns: Formatted analysis export
```

## Data Flow Architecture

### Upload → Analysis → Storage → Display

1. **File Upload**: Secure storage with validation
2. **Text Extraction**: Format-specific content parsing
3. **AI Analysis**: Department-specific processing
4. **Result Storage**: Database persistence with metadata
5. **Frontend Display**: Structured presentation of insights

### Database Schema

```sql
-- File storage
file_uploads: id, user_id, filename, filepath, file_size, processing_status

-- Analysis results
ai_results: id, file_upload_id, score, feedback, ai_model_version, 
           processing_time_ms, analysis_metadata (JSON)

-- Analytics tracking
realtime_analytics: user_id, session_id, file_id, ai_score, processing_time
```

## Advanced Features

### Error Handling & Resilience

- **Provider Fallback**: Automatic switching between AI providers
- **Circuit Breaker**: Rate limit and quota protection
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Graceful Degradation**: Demo analysis when quota exceeded

### Performance Optimization

- **Text Truncation**: Intelligent content pruning for token limits
- **Caching**: Analysis result caching for repeated requests  
- **Async Processing**: Non-blocking file operations
- **Connection Pooling**: Efficient database connections

### Security & Compliance

- **File Validation**: Content-type verification, size limits
- **Secure Storage**: Isolated file system with access controls
- **API Authentication**: Role-based access (auditor role required)
- **Audit Logging**: Complete analysis trail for compliance

## Configuration Management

### Environment Variables

```bash
# AI Provider Configuration
AI_SCORER=gemini
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key  
DEEPSEEK_API_KEY=your_deepseek_key
EAND_API_URL=your_eand_endpoint
EAND_API_KEY=your_eand_key

# Performance Tuning
AI_TIMEOUT_SECONDS=120
AI_MAX_RETRIES=3
AI_MODEL_TEMPERATURE=0.7
AI_MAX_TOKENS=2048

# File Upload Limits
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_EXTENSIONS=.pdf,.docx,.xlsx,.csv,.txt
```

### Deployment Considerations

- **Production Security**: Secret key rotation, HTTPS enforcement
- **Database**: PostgreSQL recommended over SQLite
- **API Rate Limits**: Provider-specific quota management
- **Monitoring**: Comprehensive logging and error tracking

## Usage Examples

### Basic Analysis Request

```python
# Backend analysis
analyzer = ComprehensiveESGAnalyzer()
result = analyzer.analyze_document(
    document_text="ESG document content...",
    department_name="Group Legal & Compliance", 
    filename="esg_audit_2024.pdf"
)

# Returns structured analysis with score, feedback, metadata
```

### Frontend Workflow Integration

```typescript
// Step-by-step workflow management
const [analysisState, setAnalysisState] = useState({
    currentStep: 0,
    selectedModel: 'gemini',
    selectedDepartment: 'Group Legal & Compliance',
    analysisResults: null
});

// Upload and analyze
const response = await uploadAndAnalyze(
    analysisState.selectedModel,
    analysisState.selectedDepartment,
    uploadedFile
);
```

## Monitoring & Analytics

### Real-time Tracking

The system tracks comprehensive analytics:
- Processing times per AI model
- Success/failure rates by department
- User engagement metrics
- File type analysis patterns

### Performance Metrics

- **AI Response Time**: Average processing duration
- **Accuracy Metrics**: Score consistency across providers
- **Error Rates**: Provider failure statistics
- **Resource Utilization**: Token usage and API costs

## Future Enhancements

### Planned Features

1. **Batch Processing**: Multiple document analysis
2. **Comparative Analysis**: Department performance benchmarking
3. **Historical Trending**: Score evolution over time
4. **Custom Departments**: User-defined analysis contexts
5. **API Rate Optimization**: Intelligent provider selection
6. **Advanced Export**: PDF report generation with charts

### Integration Opportunities

- **Third-party ESG Databases**: Real-time compliance updates
- **Workflow Management**: Integration with approval processes
- **Notification Systems**: Advanced alerting and reporting
- **Business Intelligence**: Dashboard analytics and insights

---

This documentation provides a comprehensive overview of the ESG Checklist AI analysis and scoring system. The architecture supports flexible AI provider integration, department-specific analysis, and sophisticated ESG compliance assessment through a user-friendly workflow interface.