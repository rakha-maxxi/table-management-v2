const crypto = require('crypto');

const accessBodySchema = {
  type: 'object',
  required: ['user_id', 'organization_id', 'role_id'],
  properties: {
    user_id: { type: 'string' },
    organization_id: { type: 'string' },
    role_id: { type: 'string' }
  }
};

module.exports = async function (fastify, opts) {
  // GET all access mappings (with joined details)
  fastify.get('/', {
    schema: { tags: ['Organization Access'], summary: 'Get all organization access mappings' }
  }, async (request, reply) => {
    const accessList = await fastify.db.all(`
      SELECT 
        oa.id, 
        oa.user_id, 
        oa.organization_id, 
        oa.role_id, 
        oa.created_at,
        u.name AS user_name,
        u.email AS user_email,
        r.name AS role_name,
        r.code AS role_code,
        o.name AS organization_name,
        o.code AS organization_code
      FROM organization_access oa
      JOIN users u ON oa.user_id = u.id
      JOIN roles r ON oa.role_id = r.id
      JOIN organizations o ON oa.organization_id = o.id
      ORDER BY oa.created_at DESC
    `);
    return accessList;
  });

  // POST create a new organization access mapping
  fastify.post('/', {
    schema: {
      tags: ['Organization Access'],
      summary: 'Assign a user to a role in an organization',
      body: accessBodySchema
    }
  }, async (request, reply) => {
    const data = request.body;
    
    // Check if mapping already exists (satu peran aktif per organisasi)
    const existing = await fastify.db.get(
      'SELECT * FROM organization_access WHERE user_id = ? AND organization_id = ?', 
      [data.user_id, data.organization_id]
    );
    if (existing) {
      return reply.code(400).send({ 
        error: 'Pengguna sudah memiliki peran aktif di organisasi ini. Cabut peran sebelumnya terlebih dahulu.' 
      });
    }

    // Verify user, role, and organization exist
    const user = await fastify.db.get('SELECT * FROM users WHERE id = ?', data.user_id);
    const org = await fastify.db.get('SELECT * FROM organizations WHERE id = ?', data.organization_id);
    const role = await fastify.db.get('SELECT * FROM roles WHERE id = ?', data.role_id);

    if (!user || !org || !role) {
      return reply.code(400).send({ error: 'User, Role, atau Organisasi tidak valid.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await fastify.db.run(
      `INSERT INTO organization_access (id, user_id, organization_id, role_id, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.user_id, data.organization_id, data.role_id, now]
    );

    // Retrieve joined newly created mapping to return
    const newMapping = await fastify.db.get(`
      SELECT 
        oa.id, 
        oa.user_id, 
        oa.organization_id, 
        oa.role_id, 
        oa.created_at,
        u.name AS user_name,
        u.email AS user_email,
        r.name AS role_name,
        r.code AS role_code,
        o.name AS organization_name,
        o.code AS organization_code
      FROM organization_access oa
      JOIN users u ON oa.user_id = u.id
      JOIN roles r ON oa.role_id = r.id
      JOIN organizations o ON oa.organization_id = o.id
      WHERE oa.id = ?
    `, id);

    return newMapping;
  });

  // DELETE an organization access mapping (Lepas Akses)
  fastify.delete('/:id', {
    schema: {
      tags: ['Organization Access'],
      summary: 'Revoke organization access (Lepas Akses)',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const mapping = await fastify.db.get(`
      SELECT 
        oa.id, 
        oa.user_id, 
        oa.organization_id, 
        oa.role_id, 
        oa.created_at,
        u.name AS user_name,
        u.email AS user_email,
        r.name AS role_name,
        o.name AS organization_name
      FROM organization_access oa
      JOIN users u ON oa.user_id = u.id
      JOIN roles r ON oa.role_id = r.id
      JOIN organizations o ON oa.organization_id = o.id
      WHERE oa.id = ?
    `, id);

    if (!mapping) return reply.code(404).send({ error: 'Hak akses tidak ditemukan' });

    await fastify.db.run('DELETE FROM organization_access WHERE id = ?', id);
    return mapping;
  });
};
