const crypto = require('crypto');

const organizationBodySchema = {
  type: 'object',
  required: ['name', 'code'],
  properties: {
    name: { type: 'string' },
    code: { type: 'string' },
    parent_id: { type: ['string', 'null'] }
  }
};

module.exports = async function (fastify, opts) {
  // GET all organizations
  fastify.get('/', {
    schema: { tags: ['Organizations'], summary: 'Get all organizations' }
  }, async (request, reply) => {
    const orgs = await fastify.db.all('SELECT * FROM organizations ORDER BY name ASC');
    return orgs;
  });

  // POST create an organization
  fastify.post('/', {
    schema: {
      tags: ['Organizations'],
      summary: 'Create a new organization',
      body: organizationBodySchema
    }
  }, async (request, reply) => {
    const data = request.body;
    
    // Check if code already exists
    const existing = await fastify.db.get('SELECT * FROM organizations WHERE code = ?', data.code);
    if (existing) {
      return reply.code(400).send({ error: 'Kode organisasi sudah terdaftar.' });
    }

    // Check if parent_id exists
    if (data.parent_id) {
      const parent = await fastify.db.get('SELECT * FROM organizations WHERE id = ?', data.parent_id);
      if (!parent) {
        return reply.code(400).send({ error: 'Organisasi induk tidak ditemukan.' });
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await fastify.db.run(
      `INSERT INTO organizations (id, parent_id, code, name, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.parent_id || null, data.code, data.name, now, now]
    );

    const newOrg = await fastify.db.get('SELECT * FROM organizations WHERE id = ?', id);
    return newOrg;
  });

  // PUT update an organization
  fastify.put('/:id', {
    schema: {
      tags: ['Organizations'],
      summary: 'Update an organization',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      body: organizationBodySchema
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    const now = new Date().toISOString();

    const org = await fastify.db.get('SELECT * FROM organizations WHERE id = ?', id);
    if (!org) return reply.code(404).send({ error: 'Organisasi tidak ditemukan' });

    // Check if updated code conflicts with another org
    if (updates.code && updates.code !== org.code) {
      const codeConflict = await fastify.db.get('SELECT * FROM organizations WHERE code = ? AND id != ?', [updates.code, id]);
      if (codeConflict) {
        return reply.code(400).send({ error: 'Kode organisasi sudah terdaftar pada organisasi lain.' });
      }
    }

    // Prevent circular reference
    if (updates.parent_id === id) {
      return reply.code(400).send({ error: 'Organisasi tidak dapat menjadi induk bagi dirinya sendiri.' });
    }

    const merged = { ...org, ...updates, updated_at: now };

    await fastify.db.run(
      `UPDATE organizations 
       SET parent_id = ?, code = ?, name = ?, updated_at = ?
       WHERE id = ?`,
      [merged.parent_id || null, merged.code, merged.name, merged.updated_at, id]
    );

    return merged;
  });

  // DELETE an organization
  fastify.delete('/:id', {
    schema: {
      tags: ['Organizations'],
      summary: 'Delete an organization',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const org = await fastify.db.get('SELECT * FROM organizations WHERE id = ?', id);
    if (!org) return reply.code(404).send({ error: 'Organisasi tidak ditemukan' });

    // Check if it has child organizations
    const hasChildren = await fastify.db.get('SELECT * FROM organizations WHERE parent_id = ?', id);
    if (hasChildren) {
      return reply.code(400).send({ error: 'Tidak dapat menghapus organisasi yang memiliki sub-organisasi. Silakan hapus sub-organisasi terlebih dahulu.' });
    }

    // Check if it has assigned users
    const assigned = await fastify.db.get('SELECT * FROM organization_access WHERE organization_id = ?', id);
    if (assigned) {
      return reply.code(400).send({ error: 'Tidak dapat menghapus organisasi yang sedang aktif digunakan dalam hak akses anggota.' });
    }

    await fastify.db.run('DELETE FROM organizations WHERE id = ?', id);
    return org;
  });
};
