const crypto = require('crypto');

const auditLogBodySchema = {
  type: 'object',
  required: ['action', 'entity_type', 'entity_id'],
  properties: {
    action: { type: 'string' },
    entity_type: { type: 'string' },
    entity_id: { type: 'string' },
    old_value: { type: ['object', 'null'] },
    new_value: { type: ['object', 'null'] },
    actor_name: { type: 'string' }
  }
};

module.exports = async function (fastify, opts) {
  fastify.get('/', {
    schema: { tags: ['Audit Logs'], summary: 'Get all audit logs' }
  }, async (request, reply) => {
    const logs = await fastify.db.all('SELECT * FROM auditLogs ORDER BY created_at DESC LIMIT 500');
    // Format JSON fields
    const formattedLogs = logs.map(log => ({
      ...log,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }));
    return formattedLogs;
  });

  fastify.post('/', {
    schema: { 
      tags: ['Audit Logs'], 
      summary: 'Create a new audit log',
      body: auditLogBodySchema
    }
  }, async (request, reply) => {
    const { action, entity_type, entity_id, old_value, new_value, actor_name } = request.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await fastify.db.run(
      `INSERT INTO auditLogs (id, action, entity_type, entity_id, old_value, new_value, actor_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        action, 
        entity_type, 
        entity_id, 
        old_value ? JSON.stringify(old_value) : null, 
        new_value ? JSON.stringify(new_value) : null, 
        actor_name || 'System', 
        now
      ]
    );

    const log = await fastify.db.get('SELECT * FROM auditLogs WHERE id = ?', id);
    log.old_value = log.old_value ? JSON.parse(log.old_value) : null;
    log.new_value = log.new_value ? JSON.parse(log.new_value) : null;
    
    return log;
  });
};
