const crypto = require('crypto');

const tableBodySchema = {
  type: 'object',
  required: ['room_id', 'code'],
  properties: {
    room_id: { type: 'string' },
    code: { type: 'string' },
    name: { type: 'string' },
    shape: { type: 'string' },
    capacity_min: { type: 'number' },
    capacity_max: { type: 'number' },
    chair_count: { type: 'number' },
    status: { type: 'string' },
    x_position: { type: 'number' },
    y_position: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
    rotation: { type: 'number' },
    notes: { type: 'string' }
  }
};

module.exports = async function (fastify, opts) {
  fastify.get('/', {
    schema: { tags: ['Tables'], summary: 'Get all tables' }
  }, async (request, reply) => {
    const tables = await fastify.db.all('SELECT * FROM tables');
    return tables;
  });

  fastify.post('/', {
    schema: { 
      tags: ['Tables'], 
      summary: 'Create a new table',
      body: tableBodySchema
    }
  }, async (request, reply) => {
    const data = request.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await fastify.db.run(
      `INSERT INTO tables (id, room_id, code, name, shape, capacity_min, capacity_max, chair_count, status, x_position, y_position, width, height, rotation, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        data.room_id, 
        data.code, 
        data.name || data.code, 
        data.shape || 'square', 
        parseInt(data.capacity_min) || 2, 
        parseInt(data.capacity_max) || 4, 
        parseInt(data.chair_count) || 4,
        data.status || 'available', 
        data.x_position || (80 + Math.random() * 300), 
        data.y_position || (80 + Math.random() * 200),
        data.width || 80, 
        data.height || 80, 
        data.rotation || 0, 
        data.notes || '', 
        now, 
        now
      ]
    );

    const newTable = await fastify.db.get('SELECT * FROM tables WHERE id = ?', id);
    return newTable;
  });

  fastify.put('/:id', {
    schema: { 
      tags: ['Tables'], 
      summary: 'Update a table',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      body: tableBodySchema
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    const now = new Date().toISOString();

    const table = await fastify.db.get('SELECT * FROM tables WHERE id = ?', id);
    if (!table) return reply.code(404).send({ error: 'Table not found' });

    const merged = { ...table, ...updates, updated_at: now };

    await fastify.db.run(
      `UPDATE tables 
       SET room_id = ?, code = ?, name = ?, shape = ?, capacity_min = ?, capacity_max = ?, chair_count = ?, status = ?, x_position = ?, y_position = ?, width = ?, height = ?, rotation = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [merged.room_id, merged.code, merged.name, merged.shape, merged.capacity_min, merged.capacity_max, merged.chair_count, merged.status, merged.x_position, merged.y_position, merged.width, merged.height, merged.rotation, merged.notes, merged.updated_at, id]
    );

    return merged;
  });

  fastify.delete('/:id', {
    schema: { 
      tags: ['Tables'], 
      summary: 'Delete a table',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const activeBookings = await fastify.db.all(`
      SELECT * FROM bookings 
      WHERE assigned_table_id = ? AND status NOT IN ('cancelled', 'completed', 'no_show')
    `, id);

    if (activeBookings.length > 0) {
      return reply.code(400).send({ error: 'Tidak dapat menghapus meja dengan reservasi aktif.' });
    }

    const table = await fastify.db.get('SELECT * FROM tables WHERE id = ?', id);
    if (!table) return reply.code(404).send({ error: 'Table not found' });

    await fastify.db.run('DELETE FROM tables WHERE id = ?', id);
    return table;
  });
};
