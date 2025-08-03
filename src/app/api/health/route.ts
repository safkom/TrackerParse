export async function GET() {
  return Response.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development'
  });
}
