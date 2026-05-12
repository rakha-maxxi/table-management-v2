const crypto = require('crypto');

const roomBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    floor_number: { type: 'number' },
    type: { type: 'string' },
    status: { type: 'string' },
    layout_width: { type: 'number' },
    layout_height: { type: 'number' }
  }
};

module.exports = async function (fastify, opts) {
  fastify.get('/', {
    schema: { tags: ['Rooms'], summary: 'Get all rooms' }
  }, async (request, reply) => {
    const rooms = await fastify.db.all('SELECT * FROM rooms');
    return rooms;
  });

  fastify.post('/', {
    schema: { 
      tags: ['Rooms'], 
      summary: 'Create a new room',
      body: roomBodySchema
    }
  }, async (request, reply) => {
    const data = request.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await fastify.db.run(
      `INSERT INTO rooms (id, name, description, floor_number, type, status, layout_width, layout_height, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        data.name, 
        data.description || '', 
        data.floor_number || 1, 
        data.type || 'indoor', 
        data.status || 'active', 
        data.layout_width || 800, 
        data.layout_height || 600, 
        now, 
        now
      ]
    );

    const newRoom = await fastify.db.get('SELECT * FROM rooms WHERE id = ?', id);
    return newRoom;
  });

  fastify.put('/:id', {
    schema: { 
      tags: ['Rooms'], 
      summary: 'Update a room',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      body: roomBodySchema
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    const now = new Date().toISOString();

    const room = await fastify.db.get('SELECT * FROM rooms WHERE id = ?', id);
    if (!room) return reply.code(404).send({ error: 'Room not found' });

    const merged = { ...room, ...updates, updated_at: now };

    await fastify.db.run(
      `UPDATE rooms 
       SET name = ?, description = ?, floor_number = ?, type = ?, status = ?, layout_width = ?, layout_height = ?, updated_at = ?
       WHERE id = ?`,
      [merged.name, merged.description, merged.floor_number, merged.type, merged.status, merged.layout_width, merged.layout_height, merged.updated_at, id]
    );

    return merged;
  });

  fastify.delete('/:id', {
    schema: { 
      tags: ['Rooms'], 
      summary: 'Delete a room',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const relatedTables = await fastify.db.all('SELECT * FROM tables WHERE room_id = ?', id);
    if (relatedTables.length > 0) {
      return reply.code(400).send({ error: 'Tidak dapat menghapus ruangan yang memiliki meja.' });
    }

    const room = await fastify.db.get('SELECT * FROM rooms WHERE id = ?', id);
    if (!room) return reply.code(404).send({ error: 'Room not found' });

    await fastify.db.run('DELETE FROM rooms WHERE id = ?', id);
    return room;
  });
};
