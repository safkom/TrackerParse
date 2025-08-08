# Server Logging System

This application now includes a comprehensive server-side logging system that writes to files for analysis.

## Log Files Location

All logs are written to the `/logs` directory in the project root:
- `logs/app-YYYY-MM-DD.log` - Daily log files in JSON format

## Log Entry Format

Each log entry is a JSON object with the following fields:
```json
{
  "timestamp": "2025-08-08T12:34:56.789Z",
  "level": "info|warn|error|debug",
  "message": "Description of the event",
  "meta": { /* Additional data */ },
  "requestId": "req_1691507696789_abc123def",
  "userId": "optional_user_id",
  "endpoint": "/api/parse"
}
```

## What Gets Logged

### API Requests
- All API requests and responses with timing
- Request IDs for tracing requests across logs
- HTTP status codes and response times
- Error details with stack traces

### Parsing Operations
- Google Sheets parse start/success/failure
- Document IDs and statistics (artist name, album count, track count)
- Parse duration and performance metrics
- Quota errors and API failures

### Examples

**API Request:**
```json
{
  "timestamp": "2025-08-08T12:34:56.789Z",
  "level": "info",
  "message": "POST /api/parse",
  "requestId": "req_1691507696789_abc123def",
  "endpoint": "/api/parse"
}
```

**Parse Success:**
```json
{
  "timestamp": "2025-08-08T12:34:57.123Z",
  "level": "info", 
  "message": "Parse completed successfully for 1BxUQvfeKFa8VX4b8XhGqy9K2SmLz8Dv_abc123 (2340ms)",
  "meta": {
    "spreadsheetId": "1BxUQvfeKFa8VX4b8XhGqy9K2SmLz8Dv_abc123",
    "stats": {
      "artistName": "Taylor Swift",
      "albumCount": 12,
      "totalTracks": 245
    }
  },
  "requestId": "req_1691507696789_abc123def",
  "endpoint": "/api/parse"
}
```

**Error:**
```json
{
  "timestamp": "2025-08-08T12:34:58.456Z",
  "level": "error",
  "message": "POST /api/parse - Google Sheets quota exceeded",
  "meta": {
    "error": "Error: Request failed with status 429...",
    "spreadsheetId": "1BxUQvfeKFa8VX4b8XhGqy9K2SmLz8Dv_abc123"
  },
  "requestId": "req_1691507696789_abc123def",
  "endpoint": "/api/parse"
}
```

## Log Analysis

You can analyze the logs using standard command-line tools:

```bash
# View today's logs
cat logs/app-$(date +%Y-%m-%d).log

# Find all error logs
grep '"level":"error"' logs/app-*.log

# Find specific request by ID
grep 'req_1691507696789_abc123def' logs/app-*.log

# Count API requests by endpoint
grep '"endpoint":"/api/parse"' logs/app-*.log | wc -l

# Parse duration analysis
grep 'Parse completed successfully' logs/app-*.log | jq '.meta.duration'

# Most common errors
grep '"level":"error"' logs/app-*.log | jq -r '.message' | sort | uniq -c | sort -nr
```

## Log Rotation

Logs are automatically rotated daily. Each day gets its own file named with the date (YYYY-MM-DD format).

## Development vs Production

- In development: Logs are written to files AND displayed in console
- In production: Logs are only written to files (not console) for performance

The log level can be controlled via environment variables if needed.
