const Fastify = require('fastify');
const cors = require('@fastify/cors');
const setupDatabase = require('./database');

const roomRoutes = require('./routes/rooms');
const tableRoutes = require('./routes/tables');
const bookingRoutes = require('./routes/bookings');
const auditLogRoutes = require('./routes/auditLogs');
const settingRoutes = require('./routes/settings');

const fastify = Fastify({ logger: true });

async function start() {
  try {
    await fastify.register(cors, {
      origin: '*' // Allow all origins for development
    });

    // Register Swagger for API Documentation
    await fastify.register(require('@fastify/swagger'), {
      openapi: {
        info: {
          title: 'Mejaaa API',
          description: 'API documentation for Table Management',
          version: '1.0.0'
        },
        servers: [{
          url: 'http://localhost:3000'
        }]
      }
    });

    await fastify.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    });

    const db = await setupDatabase();
    
    // Decorate fastify instance so routes can access it
    fastify.decorate('db', db);

    // Register API routes
    fastify.register(roomRoutes, { prefix: '/api/rooms' });
    fastify.register(tableRoutes, { prefix: '/api/tables' });
    fastify.register(bookingRoutes, { prefix: '/api/bookings' });
    fastify.register(auditLogRoutes, { prefix: '/api/audit-logs' });
    fastify.register(settingRoutes, { prefix: '/api/settings' });

    // Root route
    fastify.get('/', async (request, reply) => {
      return { hello: 'Mejaaa API is running' };
    });

    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
