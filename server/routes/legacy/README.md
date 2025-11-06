# Legacy AI Routes - ARCHIVED

**Date Archived**: November 5, 2025
**Status**: DEPRECATED - Will be removed in v3.0.0

## Overview

This folder contains legacy AI routes that have been replaced by new `/api/ai` endpoints.

## Archived Routes

### `ai.js`
- **Mounted at**: `/ai`
- **Status**: DEPRECATED (but still functional)
- **Replaced by**: `/api/ai` routes in `server/routes/ai-new.js`

**Endpoints**:
- `GET /ai/status` → Use `GET /api/ai/status`
- `POST /ai/analyze` → Use `POST /api/ai/analyze`
- `POST /ai/train` → Use `POST /api/ai/retrain`

## Why Deprecated?

1. **Uses legacy AI services** that only simulate predictions
2. **No model interpretability** (SHAP, feature importance)
3. **Inconsistent response format** compared to new architecture
4. **Limited functionality** - no SHAP explanations, recommendations, etc.

## Migration Required

### Frontend Components to Update

These components currently use legacy `/ai` endpoints:
- `client/src/components/AICoach.js`
- `client/src/components/AIInsights.js`
- `client/src/components/AITrainingDashboard.js`
- `client/src/components/AIPerformanceMonitor.js`
- `client/src/components/AIModelManagement.js`

### Migration Checklist

- [ ] Update API base path from `/ai` to `/api/ai`
- [ ] Update response parsing for new format
- [ ] Add support for SHAP explanations
- [ ] Add support for taste profile predictions
- [ ] Add support for feature importance
- [ ] Test with new endpoints
- [ ] Remove deprecated code

## Timeline

- **v2.0** (Current): Legacy routes deprecated, new routes available
- **v2.5**: Frontend migration complete
- **v3.0**: Legacy routes will be permanently removed

## See Also

- `server/services/legacy/README.md` - Legacy services documentation
- `INTEGRATION_TEST_RESULTS.md` - Integration test results
- `ml_service/API_TESTING_GUIDE.md` - ML service API guide
