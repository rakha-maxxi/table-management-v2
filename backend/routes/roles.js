const crypto = require('crypto');

const roleBodySchema = {
  type: 'object',
  required: ['name', 'code'],
  properties: {
    name: { type: 'string' },
    code: { type: 'string' },
    description: { type: 'string' }
  }
};

module.exports = async function (fastify, opts) {
  // GET all roles
  fastify.get('/', {
    schema: { tags: ['Roles'], summary: 'Get all roles' }
  }, async (request, reply) => {
    const roles = await fastify.db.all('SELECT * FROM roles ORDER BY name ASC');
    return roles;
  });

  // POST create a role
  fastify.post('/', {
    schema: {
      tags: ['Roles'],
      summary: 'Create a new role',
      body: roleBodySchema
    }
  }, async (request, reply) => {
    const data = request.body;
    
    // Check if code already exists
    const existing = await fastify.db.get('SELECT * FROM roles WHERE code = ?', data.code);
    if (existing) {
      return reply.code(400).send({ error: 'Kode peran sudah terdaftar.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await fastify.db.run(
      `INSERT INTO roles (id, code, name, description, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.code, data.name, data.description || '', now, now]
    );

    const newRole = await fastify.db.get('SELECT * FROM roles WHERE id = ?', id);
    return newRole;
  });

  // PUT update a role
  fastify.put('/:id', {
    schema: {
      tags: ['Roles'],
      summary: 'Update a role',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      body: roleBodySchema
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    const now = new Date().toISOString();

    const role = await fastify.db.get('SELECT * FROM roles WHERE id = ?', id);
    if (!role) return reply.code(404).send({ error: 'Peran tidak ditemukan' });

    // Check if updated code conflicts with another role
    if (updates.code && updates.code !== role.code) {
      const codeConflict = await fastify.db.get('SELECT * FROM roles WHERE code = ? AND id != ?', [updates.code, id]);
      if (codeConflict) {
        return reply.code(400).send({ error: 'Kode peran sudah terdaftar pada peran lain.' });
      }
    }

    const merged = { ...role, ...updates, updated_at: now };

    await fastify.db.run(
      `UPDATE roles 
       SET code = ?, name = ?, description = ?, updated_at = ?
       WHERE id = ?`,
      [merged.code, merged.name, merged.description, merged.updated_at, id]
    );

    return merged;
  });

  // DELETE a role
  fastify.delete('/:id', {
    schema: {
      tags: ['Roles'],
      summary: 'Delete a role',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const role = await fastify.db.get('SELECT * FROM roles WHERE id = ?', id);
    if (!role) return reply.code(404).send({ error: 'Peran tidak ditemukan' });

    // Check if role is assigned to any user
    const assigned = await fastify.db.get('SELECT * FROM organization_access WHERE role_id = ?', id);
    if (assigned) {
      return reply.code(400).send({ error: 'Tidak dapat menghapus peran yang sedang digunakan oleh anggota organisasi.' });
    }

    await fastify.db.run('DELETE FROM roles WHERE id = ?', id);
    return role;
  });
};
