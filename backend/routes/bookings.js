const crypto = require('crypto');

const bookingBodySchema = {
  type: 'object',
  required: ['customer_name', 'booking_date', 'start_time'],
  properties: {
    customer_name: { type: 'string' },
    customer_phone: { type: 'string' },
    party_size: { type: 'number' },
    booking_date: { type: 'string' },
    start_time: { type: 'string' },
    end_time: { type: 'string' },
    duration_minutes: { type: 'number' },
    status: { type: 'string' },
    channel: { type: 'string' },
    assigned_table_id: { type: 'string' },
    special_request: { type: 'string' },
    internal_notes: { type: 'string' }
  }
};

module.exports = async function (fastify, opts) {
  fastify.get('/', {
    schema: { tags: ['Bookings'], summary: 'Get all bookings' }
  }, async (request, reply) => {
    const bookings = await fastify.db.all('SELECT * FROM bookings');
    return bookings;
  });

  fastify.post('/', {
    schema: { 
      tags: ['Bookings'], 
      summary: 'Create a new booking',
      body: bookingBodySchema
    }
  }, async (request, reply) => {
    const data = request.body;
    const id = crypto.randomUUID();
    const code = 'BK-' + Date.now().toString(36).toUpperCase();
    const now = new Date().toISOString();
    
    await fastify.db.run(
      `INSERT INTO bookings (id, booking_code, customer_name, customer_phone, party_size, booking_date, start_time, end_time, duration_minutes, status, channel, assigned_table_id, special_request, internal_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        code, 
        data.customer_name, 
        data.customer_phone || '', 
        parseInt(data.party_size) || 2,
        data.booking_date, 
        data.start_time, 
        data.end_time || '', 
        parseInt(data.duration_minutes) || 90,
        data.status || 'confirmed', 
        data.channel || 'admin', 
        data.assigned_table_id || null,
        data.special_request || '', 
        data.internal_notes || '', 
        now, 
        now
      ]
    );

    if (data.assigned_table_id) {
      await fastify.db.run('UPDATE tables SET status = ?, updated_at = ? WHERE id = ?', ['reserved', now, data.assigned_table_id]);
    }

    const newBooking = await fastify.db.get('SELECT * FROM bookings WHERE id = ?', id);
    return newBooking;
  });

  fastify.put('/:id', {
    schema: { 
      tags: ['Bookings'], 
      summary: 'Update a booking status',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      body: bookingBodySchema
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    const now = new Date().toISOString();

    const booking = await fastify.db.get('SELECT * FROM bookings WHERE id = ?', id);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });

    const merged = { ...booking, ...updates, updated_at: now };

    await fastify.db.run(
      `UPDATE bookings 
       SET customer_name = ?, customer_phone = ?, party_size = ?, booking_date = ?, start_time = ?, end_time = ?, duration_minutes = ?, status = ?, channel = ?, assigned_table_id = ?, special_request = ?, internal_notes = ?, updated_at = ?
       WHERE id = ?`,
      [merged.customer_name, merged.customer_phone, merged.party_size, merged.booking_date, merged.start_time, merged.end_time, merged.duration_minutes, merged.status, merged.channel, merged.assigned_table_id, merged.special_request, merged.internal_notes, merged.updated_at, id]
    );

    // Handling table status changes based on booking status
    if (updates.status === 'seated' && merged.assigned_table_id) {
      await fastify.db.run('UPDATE tables SET status = ?, updated_at = ? WHERE id = ?', ['occupied', now, merged.assigned_table_id]);
    } else if (updates.status === 'completed' && merged.assigned_table_id) {
      await fastify.db.run('UPDATE tables SET status = ?, updated_at = ? WHERE id = ?', ['cleaning', now, merged.assigned_table_id]);
    } else if (updates.status === 'cancelled' && merged.assigned_table_id) {
      await fastify.db.run('UPDATE tables SET status = ?, updated_at = ? WHERE id = ?', ['available', now, merged.assigned_table_id]);
    }

    return merged;
  });
};
