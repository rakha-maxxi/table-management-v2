const crypto = require('crypto');

const userBodySchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string' },
    email: { type: 'string' },
    status: { type: 'string', enum: ['active', 'inactive'] }
  }
};

module.exports = async function (fastify, opts) {
  // GET all users
  fastify.get('/', {
    schema: { tags: ['Users'], summary: 'Get all users' }
  }, async (request, reply) => {
    const users = await fastify.db.all('SELECT * FROM users ORDER BY created_at DESC');
    return users;
  });

  // POST create a user
  fastify.post('/', {
    schema: {
      tags: ['Users'],
      summary: 'Create a new user',
      body: userBodySchema
    }
  }, async (request, reply) => {
    const data = request.body;
    
    // Check if email already exists
    const existing = await fastify.db.get('SELECT * FROM users WHERE email = ?', data.email);
    if (existing) {
      return reply.code(400).send({ error: 'Email sudah terdaftar.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await fastify.db.run(
      `INSERT INTO users (id, name, email, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.email, data.status || 'active', now, now]
    );

    const newUser = await fastify.db.get('SELECT * FROM users WHERE id = ?', id);
    return newUser;
  });

  // PUT update a user
  fastify.put('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Update a user',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      body: userBodySchema
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    const now = new Date().toISOString();

    const user = await fastify.db.get('SELECT * FROM users WHERE id = ?', id);
    if (!user) return reply.code(404).send({ error: 'User tidak ditemukan' });

    // Check if updated email conflicts with another user
    if (updates.email && updates.email !== user.email) {
      const emailConflict = await fastify.db.get('SELECT * FROM users WHERE email = ? AND id != ?', [updates.email, id]);
      if (emailConflict) {
        return reply.code(400).send({ error: 'Email sudah terdaftar pada pengguna lain.' });
      }
    }

    const merged = { ...user, ...updates, updated_at: now };

    await fastify.db.run(
      `UPDATE users 
       SET name = ?, email = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [merged.name, merged.email, merged.status, merged.updated_at, id]
    );

    return merged;
  });

  // DELETE a user
  fastify.delete('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Delete a user',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const user = await fastify.db.get('SELECT * FROM users WHERE id = ?', id);
    if (!user) return reply.code(404).send({ error: 'User tidak ditemukan' });

    await fastify.db.run('DELETE FROM users WHERE id = ?', id);
    return user;
  });
};
