# TrackerParse Restructuring Plan

## Current Issues
1. **Parser Redundancy**: Two competing parsers (ImprovedParser vs HtmlParser)
2. **Feature Bloat**: Training APIs, complex debugging, unused components
3. **Inconsistent Architecture**: API endpoints use different parsers inconsistently
4. **Performance Overhead**: Over-engineered virtualization and lazy loading
5. **Deviation from README**: Implementation doesn't match documented simple architecture

## Restructuring Goals
1. **Consolidate to single parser** following README specifications
2. **Remove experimental/unused features** not mentioned in README  
3. **Simplify API surface** to match documented endpoints
4. **Optimize performance** by removing unnecessary complexity
5. **Clean up stale code** and unused components

## Implementation Plan

### Phase 1: Parser Consolidation ✅
- [ ] Choose best parser approach (HTML vs CSV) based on testing
- [ ] Create unified parser interface
- [ ] Update all API endpoints to use single parser
- [ ] Remove redundant parser files

### Phase 2: API Cleanup ✅  
- [ ] Remove training APIs (/api/train/*)
- [ ] Remove debugging beyond basic needs
- [ ] Remove image processing APIs not in README
- [ ] Consolidate to core endpoints: parse, cache, debug (basic)

### Phase 3: Component Simplification ✅
- [ ] Choose between Album/ImprovedAlbum components
- [ ] Remove unused track display variations
- [ ] Simplify virtualization (only for truly large datasets)
- [ ] Remove training UI components

### Phase 4: Performance Optimization ✅
- [ ] Remove unnecessary request queuing
- [ ] Simplify retry logic
- [ ] Remove over-engineered lazy loading
- [ ] Optimize bundle size

### Phase 5: Code Quality ✅
- [ ] Update types to match implementation
- [ ] Remove dead code and unused imports
- [ ] Standardize error handling
- [ ] Clean up configuration files

## Expected Outcomes
- **Simpler architecture** matching README specifications
- **Better performance** through reduced complexity  
- **Easier maintenance** with less code to manage
- **Clearer purpose** focused on Google Sheets parsing
- **Consistent behavior** across all features
