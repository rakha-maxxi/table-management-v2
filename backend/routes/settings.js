const settingsBodySchema = {
  type: 'object',
  properties: {
    restaurantName: { type: 'string' },
    openTime: { type: 'string' },
    closeTime: { type: 'string' },
    defaultDuration: { type: 'number' },
    bufferTime: { type: 'number' },
    gracePeriod: { type: 'number' },
    cleaningDuration: { type: 'number' }
  }
};

module.exports = async function (fastify, opts) {
  fastify.get('/', {
    schema: { tags: ['Settings'], summary: 'Get all settings' }
  }, async (request, reply) => {
    const rows = await fastify.db.all('SELECT * FROM settings');
    const settings = {
      restaurantName: 'Mejaaa Resto',
      openTime: '10:00',
      closeTime: '22:00',
      defaultDuration: 90,
      bufferTime: 15,
      gracePeriod: 15,
      cleaningDuration: 10
    };
    rows.forEach(row => {
      settings[row.key] = JSON.parse(row.value);
    });
    return settings;
  });

  fastify.put('/', {
    schema: { 
      tags: ['Settings'], 
      summary: 'Update settings',
      body: settingsBodySchema
    }
  }, async (request, reply) => {
    const updates = request.body;
    for (const [key, value] of Object.entries(updates)) {
      await fastify.db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?) 
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        [key, JSON.stringify(value)]
      );
    }
    const rows = await fastify.db.all('SELECT * FROM settings');
    const settings = {
      restaurantName: 'Mejaaa Resto',
      openTime: '10:00',
      closeTime: '22:00',
      defaultDuration: 90,
      bufferTime: 15,
      gracePeriod: 15,
      cleaningDuration: 10
    };
    rows.forEach(row => {
      settings[row.key] = JSON.parse(row.value);
    });
    return settings;
  });
};
