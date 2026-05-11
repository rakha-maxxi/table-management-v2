import { defineStore } from 'pinia'
import { db } from '@/db/restaurantDb'

export const useMainStore = defineStore('mainStore', {
  state: () => ({
    rooms: [],
    tables: [],
    bookings: [],
    auditLogs: [],
    personas: [
      { id: 'owner', name: 'Pemilik Restoran', role: 'Pemilik', initials: 'PR' },
      { id: 'admin', name: 'Admin Sistem', role: 'Admin', initials: 'AS' },
      { id: 'manager', name: 'Manajer Lantai', role: 'Manajer', initials: 'ML' },
      { id: 'host', name: 'Resepsionis', role: 'Resepsionis', initials: 'RS' },
      { id: 'waiter', name: 'Staf Pelayanan', role: 'Pelayan', initials: 'SP' },
      { id: 'cleaner', name: 'Staf Kebersihan', role: 'Pembersih', initials: 'SK' },
      { id: 'customer', name: 'Tamu', role: 'Pelanggan', initials: 'TM' }
    ],
    currentPersonaId: localStorage.getItem('mejaaa_persona') || 'admin',
    isLoading: false,
    settings: JSON.parse(localStorage.getItem('mejaaa_settings')) || {
      restaurantName: 'Mejaaa Resto',
      openTime: '10:00',
      closeTime: '22:00'
    }
  }),

  getters: {
    currentPersona: (state) => state.personas.find(p => p.id === state.currentPersonaId) || state.personas[1],
    tablesByRoom: (state) => (roomId) => state.tables.filter(t => t.room_id === roomId),
    stats: (state) => {
      const today = new Date().toISOString().split('T')[0];
      return {
        totalTables: state.tables.length,
        totalRooms: state.rooms.length,
        available: state.tables.filter(t => t.status === 'available').length,
        occupied: state.tables.filter(t => t.status === 'occupied').length,
        reserved: state.tables.filter(t => t.status === 'reserved').length,
        cleaning: state.tables.filter(t => t.status === 'cleaning').length,
        blocked: state.tables.filter(t => t.status === 'blocked').length,
        todayBookings: state.bookings.filter(b => b.booking_date === today).length,
        upcomingBookings: state.bookings.filter(b => b.booking_date > today && b.status === 'confirmed').length,
        totalBookings: state.bookings.length,
        noShows: state.bookings.filter(b => b.status === 'no_show').length,
      }
    }
  },

  actions: {
    setPersona(id) {
      this.currentPersonaId = id;
      localStorage.setItem('mejaaa_persona', id);
      this.logAudit('USER_ROLE_CHANGED', 'user', 'self', null, { role: id }, this.currentPersona.name);
    },

    updateSettings(newSettings) {
      const oldSettings = { ...this.settings };
      this.settings = { ...this.settings, ...newSettings };
      localStorage.setItem('mejaaa_settings', JSON.stringify(this.settings));
      this.logAudit('SETTINGS_UPDATED', 'settings', 'general', oldSettings, this.settings);
    },
    
    async loadAllData() {
      this.isLoading = true;
      try {
        // Add a artificial delay for demo purpose if needed, or just let it be fast
        // await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.rooms = await db.table('rooms').toArray();
        this.tables = await db.table('tables').toArray();
        this.bookings = await db.table('bookings').toArray();
        
        const logs = await db.table('auditLogs').orderBy('created_at').reverse().limit(500).toArray();
        this.auditLogs = logs;
        
        if (this.rooms.length === 0) {
          await this.seedDemoData();
        }
      } finally {
        this.isLoading = false;
      }
    },

    async logAudit(action, entityType, entityId, oldVal, newVal, actorName) {
      actorName = actorName || this.currentPersona.name;
      const log = {
        id: crypto.randomUUID(),
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldVal,
        new_value: newVal,
        actor_name: actorName,
        created_at: new Date().toISOString()
      };
      await db.table('auditLogs').add(log);
      this.auditLogs.unshift(log);
      if (this.auditLogs.length > 500) this.auditLogs.length = 500;
    },

    async createRoom(data) {
      const room = {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description || '',
        floor_number: data.floor_number || 1,
        type: data.type || 'indoor',
        status: data.status || 'active',
        layout_width: data.layout_width || 800,
        layout_height: data.layout_height || 600,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.table('rooms').add(room);
      this.rooms.push(room);
      await this.logAudit('ROOM_CREATED', 'room', room.id, null, room);
      return room;
    },

    async updateRoom(id, data) {
      const idx = this.rooms.findIndex(r => r.id === id);
      if (idx === -1) return null;
      const old = { ...this.rooms[idx] };
      const updated = { ...old, ...data, updated_at: new Date().toISOString() };
      
      await db.table('rooms').put(updated);
      this.rooms[idx] = updated;
      await this.logAudit('ROOM_UPDATED', 'room', id, old, updated);
      return updated;
    },

    async deleteRoom(id) {
      const relatedTables = this.tables.filter(t => t.room_id === id);
      if (relatedTables.length > 0) return { error: 'Tidak dapat menghapus ruangan yang memiliki meja.' };
      
      const room = this.rooms.find(r => r.id === id);
      await db.table('rooms').delete(id);
      this.rooms = this.rooms.filter(r => r.id !== id);
      if (room) await this.logAudit('ROOM_DELETED', 'room', id, room, null);
      return room;
    },

    async createTable(data) {
      const table = {
        id: crypto.randomUUID(),
        room_id: data.room_id,
        code: data.code,
        name: data.name || data.code,
        shape: data.shape || 'square',
        capacity_min: parseInt(data.capacity_min) || 2,
        capacity_max: parseInt(data.capacity_max) || 4,
        chair_count: parseInt(data.chair_count) || 4,
        status: data.status || 'available',
        x_position: data.x_position || 80 + Math.random() * 300,
        y_position: data.y_position || 80 + Math.random() * 200,
        width: data.width || 80,
        height: data.height || 80,
        rotation: data.rotation || 0,
        notes: data.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.table('tables').add(table);
      this.tables.push(table);
      await this.logAudit('TABLE_CREATED', 'table', table.id, null, table);
      return table;
    },

    async updateTable(id, data) {
      const idx = this.tables.findIndex(t => t.id === id);
      if (idx === -1) return null;
      const old = { ...this.tables[idx] };
      const updated = { ...old, ...data, updated_at: new Date().toISOString() };
      
      await db.table('tables').put(updated);
      this.tables[idx] = updated;
      
      const action = data.status && data.status !== old.status ? 'TABLE_STATUS_CHANGED' : 'TABLE_UPDATED';
      await this.logAudit(action, 'table', id, old, updated);
      return updated;
    },

    async updateTablePosition(id, x, y) {
      const idx = this.tables.findIndex(t => t.id === id);
      if (idx === -1) return;
      const old = { x_position: this.tables[idx].x_position, y_position: this.tables[idx].y_position };
      const updated = { ...this.tables[idx], x_position: x, y_position: y, updated_at: new Date().toISOString() };
      
      await db.table('tables').put(updated);
      this.tables[idx] = updated;
      await this.logAudit('TABLE_MOVED', 'table', id, old, { x_position: x, y_position: y });
    },

    async deleteTable(id) {
      const activeBookings = this.bookings.filter(b => b.assigned_table_id === id && !['cancelled','completed','no_show'].includes(b.status));
      if (activeBookings.length > 0) return { error: 'Tidak dapat menghapus meja dengan reservasi aktif.' };
      
      const table = this.tables.find(t => t.id === id);
      await db.table('tables').delete(id);
      this.tables = this.tables.filter(t => t.id !== id);
      if (table) await this.logAudit('TABLE_DELETED', 'table', id, table, null);
      return table;
    },

    async createBooking(data) {
      const code = 'BK-' + Date.now().toString(36).toUpperCase();
      const booking = {
        id: crypto.randomUUID(),
        booking_code: code,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone || '',
        party_size: parseInt(data.party_size) || 2,
        booking_date: data.booking_date,
        start_time: data.start_time,
        end_time: data.end_time || '',
        duration_minutes: parseInt(data.duration_minutes) || 90,
        status: data.status || 'confirmed',
        channel: data.channel || 'admin',
        assigned_table_id: data.assigned_table_id || null,
        special_request: data.special_request || '',
        internal_notes: data.internal_notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await db.table('bookings').add(booking);
      this.bookings.push(booking);
      await this.logAudit('BOOKING_CREATED', 'booking', booking.id, null, booking);
      
      if (booking.assigned_table_id) {
        await this.updateTable(booking.assigned_table_id, { status: 'reserved' });
      }
      return booking;
    },

    async updateBooking(id, data) {
      const idx = this.bookings.findIndex(b => b.id === id);
      if (idx === -1) return null;
      const old = { ...this.bookings[idx] };
      const updated = { ...old, ...data, updated_at: new Date().toISOString() };
      
      await db.table('bookings').put(updated);
      this.bookings[idx] = updated;
      
      const statusActions = { confirmed: 'BOOKING_CONFIRMED', checked_in: 'BOOKING_CHECKED_IN', seated: 'BOOKING_SEATED', completed: 'BOOKING_COMPLETED', cancelled: 'BOOKING_CANCELLED', no_show: 'BOOKING_NO_SHOW' };
      await this.logAudit(statusActions[data.status] || 'BOOKING_UPDATED', 'booking', id, old, updated);
      
      if (data.status === 'seated' && updated.assigned_table_id) {
        await this.updateTable(updated.assigned_table_id, { status: 'occupied' });
      } else if (data.status === 'completed' && updated.assigned_table_id) {
        await this.updateTable(updated.assigned_table_id, { status: 'cleaning' });
      } else if (data.status === 'cancelled' && updated.assigned_table_id) {
        await this.updateTable(updated.assigned_table_id, { status: 'available' });
      }
      
      return updated;
    },

    async exportData() {
      const data = {
        rooms: await db.table('rooms').toArray(),
        tables: await db.table('tables').toArray(),
        bookings: await db.table('bookings').toArray(),
        auditLogs: await db.table('auditLogs').toArray()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'mejaaa-export.json'; a.click();
      URL.revokeObjectURL(url);
    },

    async resetData() {
      await db.table('rooms').clear();
      await db.table('tables').clear();
      await db.table('bookings').clear();
      await db.table('auditLogs').clear();
      this.rooms = [];
      this.tables = [];
      this.bookings = [];
      this.auditLogs = [];
      await this.seedDemoData();
    },

    async seedDemoData() {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const r1 = crypto.randomUUID(), r2 = crypto.randomUUID(), r3 = crypto.randomUUID(), r4 = crypto.randomUUID();
      
      const rooms = [
        { id: r1, name: 'Main Hall', description: 'Primary dining area', floor_number: 1, type: 'indoor', status: 'active', layout_width: 800, layout_height: 500, created_at: now, updated_at: now },
        { id: r2, name: 'VIP Room', description: 'Private VIP dining', floor_number: 1, type: 'vip', status: 'active', layout_width: 600, layout_height: 400, created_at: now, updated_at: now },
        { id: r3, name: 'Outdoor Terrace', description: 'Al fresco dining', floor_number: 1, type: 'outdoor', status: 'active', layout_width: 700, layout_height: 450, created_at: now, updated_at: now },
        { id: r4, name: 'Bar Area', description: 'Casual bar seating', floor_number: 1, type: 'bar', status: 'active', layout_width: 500, layout_height: 350, created_at: now, updated_at: now }
      ];
      await db.table('rooms').bulkAdd(rooms);
      this.rooms = rooms;

      const tables = [
        { id: crypto.randomUUID(), room_id: r1, code: 'A01', name: 'Table A01', shape: 'square', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'available', x_position: 60, y_position: 60, width: 80, height: 80, rotation: 0, notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r1, code: 'A02', name: 'Table A02', shape: 'square', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'occupied', x_position: 200, y_position: 60, width: 80, height: 80, rotation: 0, notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r1, code: 'A03', name: 'Table A03', shape: 'round', capacity_min: 4, capacity_max: 6, chair_count: 6, status: 'available', x_position: 340, y_position: 60, width: 90, height: 90, rotation: 0, notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r1, code: 'A04', name: 'Table A04', shape: 'rectangle', capacity_min: 4, capacity_max: 8, chair_count: 8, status: 'reserved', x_position: 60, y_position: 220, width: 160, height: 80, rotation: 0, notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r1, code: 'A05', name: 'Table A05', shape: 'round', capacity_min: 2, capacity_max: 2, chair_count: 2, status: 'cleaning', x_position: 340, y_position: 230, width: 70, height: 70, rotation: 0, notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r1, code: 'A06', name: 'Table A06', shape: 'square', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'available', x_position: 500, y_position: 60, width: 80, height: 80, rotation: 0, notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r2, code: 'VIP-01', name: 'VIP 1', shape: 'round', capacity_min: 4, capacity_max: 8, chair_count: 8, status: 'available', x_position: 80, y_position: 80, width: 110, height: 110, rotation: 0, notes: 'Premium', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r2, code: 'VIP-02', name: 'VIP 2', shape: 'rectangle', capacity_min: 6, capacity_max: 12, chair_count: 12, status: 'reserved', x_position: 300, y_position: 80, width: 180, height: 90, rotation: 0, notes: 'Large party', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r3, code: 'T-01', name: 'Terrace 1', shape: 'round', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'available', x_position: 80, y_position: 80, width: 80, height: 80, rotation: 0, notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r3, code: 'T-02', name: 'Terrace 2', shape: 'round', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'occupied', x_position: 250, y_position: 80, width: 80, height: 80, rotation: 0, notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r4, code: 'B-01', name: 'Bar 1', shape: 'square', capacity_min: 1, capacity_max: 2, chair_count: 2, status: 'available', x_position: 60, y_position: 60, width: 60, height: 60, rotation: 0, notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), room_id: r4, code: 'B-02', name: 'Bar 2', shape: 'square', capacity_min: 1, capacity_max: 2, chair_count: 2, status: 'available', x_position: 160, y_position: 60, width: 60, height: 60, rotation: 0, notes: '', created_at: now, updated_at: now }
      ];
      await db.table('tables').bulkAdd(tables);
      this.tables = tables;

      const bookings = [
        { id: crypto.randomUUID(), booking_code: 'BK-DEMO01', customer_name: 'Andi Pratama', customer_phone: '+6281234567890', party_size: 4, booking_date: today, start_time: '19:00', end_time: '20:30', duration_minutes: 90, status: 'confirmed', channel: 'whatsapp', assigned_table_id: tables[3].id, special_request: 'Birthday celebration', internal_notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), booking_code: 'BK-DEMO02', customer_name: 'Siti Rahayu', customer_phone: '+6287654321098', party_size: 2, booking_date: today, start_time: '12:00', end_time: '13:30', duration_minutes: 90, status: 'seated', channel: 'kiosk', assigned_table_id: tables[1].id, special_request: '', internal_notes: '', created_at: now, updated_at: now },
        { id: crypto.randomUUID(), booking_code: 'BK-DEMO03', customer_name: 'Budi Santoso', customer_phone: '+6289012345678', party_size: 8, booking_date: today, start_time: '20:00', end_time: '22:00', duration_minutes: 120, status: 'confirmed', channel: 'admin', assigned_table_id: tables[7].id, special_request: 'Corporate dinner', internal_notes: 'VIP client', created_at: now, updated_at: now }
      ];
      await db.table('bookings').bulkAdd(bookings);
      this.bookings = bookings;
    }
  }
})
