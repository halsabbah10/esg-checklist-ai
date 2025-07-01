# AI Abstraction Layer - Implementation Guide

## Overview

The ESG Checklist AI system now includes a production-grade AI model abstraction layer that supports multiple AI providers with seamless switching. This allows the system to work with Google Gemini, OpenAI GPT, or e& internal AI models without code changes.

## Architecture

```
ESG Application
       ↓
app/ai/scorer.py (Abstraction Layer)
       ↓
[Gemini API] [OpenAI API] [e& API]
```

## Key Features

- **Multi-Provider Support**: Gemini, OpenAI, and e& AI models
- **Environment-Based Switching**: Change providers via environment variables
- **Robust Error Handling**: Comprehensive error handling and fallbacks
- **Production Ready**: Timeout handling, logging, and validation
- **Extensible**: Easy to add new AI providers

## Quick Start

### 1. Configuration

Set your AI provider in the environment:

```bash
# Use Google Gemini (default)
export AI_SCORER=gemini
export GEMINI_API_KEY=your_gemini_key

# Or use OpenAI
export AI_SCORER=openai
export OPENAI_API_KEY=your_openai_key

# Or use e& (when available)
export AI_SCORER=eand
export EAND_API_KEY=your_eand_key
export EAND_API_URL=https://eand-ai-api.com/v1
```

### 2. Basic Usage

```python
from app.ai.scorer import AIScorer

# Initialize scorer (automatically uses configured provider)
scorer = AIScorer()

# Score a document
score, feedback = scorer.score("Your ESG document text here")

print(f"Score: {score}")
print(f"Feedback: {feedback}")
```

### 3. FastAPI Integration

```python
from fastapi import FastAPI, HTTPException
from app.ai.scorer import AIScorer

app = FastAPI()

@app.post("/score")
async def score_document(content: str):
    try:
        scorer = AIScorer()
        score, feedback = scorer.score(content)

        return {
            "score": score,
            "feedback": feedback,
            "provider": scorer.get_provider_info()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## API Reference

### AIScorer Class

#### `__init__()`

Initialize the AI scorer with environment-based configuration.

#### `score(text: str) -> Tuple[float, str]`

Score the given text using the configured AI provider.

**Parameters:**

- `text`: The text to be scored

**Returns:**

- `Tuple[float, str]`: (score, feedback) where score is between 0 and 1

**Raises:**

- `ValueError`: If text is empty or provider configuration is invalid
- `Exception`: If AI provider API fails

#### `get_provider_info() -> dict`

Get information about the current AI provider.

**Returns:**

```python
{
    "provider": "gemini",
    "available": True,
    "description": "Google Gemini Pro - Advanced AI model..."
}
```

## Provider Details

### Google Gemini

- **Model**: `gemini-pro`
- **Strengths**: Advanced reasoning, comprehensive analysis
- **Requirements**: `GEMINI_API_KEY`
- **Timeout**: 30 seconds

### OpenAI GPT

- **Model**: `gpt-3.5-turbo`
- **Strengths**: Reliable, fast responses
- **Requirements**: `OPENAI_API_KEY`
- **Timeout**: 30 seconds

### e& Internal AI

- **Model**: Custom e& AI model
- **Strengths**: Regional ESG standards, custom training
- **Requirements**: `EAND_API_KEY`, `EAND_API_URL`
- **Status**: Integration pending API availability

## Environment Variables

| Variable         | Required        | Description           | Example                    |
| ---------------- | --------------- | --------------------- | -------------------------- |
| `AI_SCORER`      | No              | AI provider to use    | `gemini`, `openai`, `eand` |
| `GEMINI_API_KEY` | If using Gemini | Google Gemini API key | `AIza...`                  |
| `OPENAI_API_KEY` | If using OpenAI | OpenAI API key        | `sk-...`                   |
| `EAND_API_KEY`   | If using e&     | e& AI API key         | `eand_...`                 |
| `EAND_API_URL`   | If using e&     | e& AI API endpoint    | `https://...`              |

## Error Handling

The abstraction layer includes comprehensive error handling:

1. **Configuration Errors**: Invalid provider or missing API keys
2. **Network Errors**: API timeout or connection issues
3. **Response Errors**: Invalid AI model responses
4. **Fallback**: Automatic fallback to heuristic scoring if AI fails

## Integration Examples

### Example 1: Basic Document Scoring

```python
from app.ai.scorer import AIScorer

def analyze_esg_document(document_content):
    scorer = AIScorer()

    try:
        score, feedback = scorer.score(document_content)

        return {
            "esg_score": score,
            "analysis": feedback,
            "provider": scorer.get_provider_info()["provider"]
        }
    except Exception as e:
        return {
            "error": str(e),
            "fallback_score": 0.5
        }
```

### Example 2: Batch Processing

```python
from app.ai.scorer import AIScorer

def batch_score_documents(documents):
    scorer = AIScorer()
    results = []

    for doc in documents:
        try:
            score, feedback = scorer.score(doc["content"])
            results.append({
                "document_id": doc["id"],
                "score": score,
                "feedback": feedback
            })
        except Exception as e:
            results.append({
                "document_id": doc["id"],
                "error": str(e),
                "score": None
            })

    return results
```

### Example 3: Health Check

```python
from app.ai.scorer import AIScorer

def check_ai_health():
    try:
        scorer = AIScorer()
        provider_info = scorer.get_provider_info()

        # Test with sample content
        test_score, _ = scorer.score("Test ESG content")

        return {
            "status": "healthy",
            "provider": provider_info["provider"],
            "available": provider_info["available"],
            "test_score": test_score
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
```

## Switching Providers

To switch between AI providers, simply change the environment variable:

```bash
# Switch to OpenAI
export AI_SCORER=openai
export OPENAI_API_KEY=your_openai_key

# Restart your application
# The system will automatically use OpenAI for all new requests
```

## Adding New Providers

To add a new AI provider:

1. Add a new method `_score_newprovider(self, text: str)` in `AIScorer`
2. Update the `score()` method to handle the new provider
3. Add validation in `_validate_provider_config()`
4. Update environment variable documentation

Example:

```python
def _score_newprovider(self, text: str) -> Tuple[float, str]:
    """Score text using New Provider AI."""
    # Implementation here
    pass
```

## Production Deployment

### Docker Environment

```dockerfile
ENV AI_SCORER=gemini
ENV GEMINI_API_KEY=your_api_key_here
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-config
data:
  AI_SCORER: "gemini"
  GEMINI_API_KEY: "your_api_key_here"
```

### Load Balancing

For high-traffic deployments, consider:

1. **Multiple Providers**: Configure different instances with different providers
2. **Circuit Breakers**: Built-in circuit breaker handles failures
3. **Caching**: Cache scores for identical content
4. **Rate Limiting**: Implement rate limiting for API calls

## Monitoring

Monitor AI abstraction layer performance:

```python
# Log AI provider usage
logger.info(f"AI scoring: provider={provider}, score={score}, time={duration}")

# Track provider switching
logger.info(f"Provider switched: {old_provider} -> {new_provider}")

# Monitor error rates
logger.error(f"AI provider failed: {provider}, error={error}")
```

## Best Practices

1. **Always handle exceptions** when calling `scorer.score()`
2. **Validate input text** before scoring (length, content)
3. **Use provider info** to understand current configuration
4. **Implement fallbacks** for critical applications
5. **Monitor API usage** and costs across providers
6. **Test provider switching** in staging environment

## Troubleshooting

### Common Issues

1. **"Unknown AI provider"**: Check `AI_SCORER` environment variable
2. **"API key required"**: Ensure correct API key is set for provider
3. **"Request timeout"**: Network issues or API service down
4. **"Invalid response"**: AI model returned unexpected format

### Debug Mode

Enable debug logging to troubleshoot:

```python
import logging
logging.getLogger('app.ai.scorer').setLevel(logging.DEBUG)
```

This comprehensive AI abstraction layer makes the ESG Checklist AI system flexible, maintainable, and ready for production deployment with any AI provider.
