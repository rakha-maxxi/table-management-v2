import { defineStore } from 'pinia'

const API_BASE = 'http://localhost:3000/api';

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
    globalSearchQuery: '',
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

    async updateSettings(newSettings) {
      const oldSettings = { ...this.settings };
      this.settings = { ...this.settings, ...newSettings };
      
      try {
        const response = await fetch(`${API_BASE}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.settings)
        });
        if (response.ok) {
          const savedSettings = await response.json();
          this.settings = { ...this.settings, ...savedSettings };
          this.logAudit('SETTINGS_UPDATED', 'settings', 'general', oldSettings, this.settings);
        }
      } catch (err) {
        console.error("Error saving settings:", err);
      }
    },
    
    async loadAllData() {
      this.isLoading = true;
      try {
        const [roomsRes, tablesRes, bookingsRes, logsRes, settingsRes] = await Promise.all([
          fetch(`${API_BASE}/rooms`),
          fetch(`${API_BASE}/tables`),
          fetch(`${API_BASE}/bookings`),
          fetch(`${API_BASE}/audit-logs`),
          fetch(`${API_BASE}/settings`)
        ]);
        
        this.rooms = await roomsRes.json();
        this.tables = await tablesRes.json();
        this.bookings = await bookingsRes.json();
        this.auditLogs = await logsRes.json();
        if (settingsRes.ok) {
          const fetchedSettings = await settingsRes.json();
          this.settings = { ...this.settings, ...fetchedSettings };
        }
        
        // Empty DB stays empty. No auto-seeding of demo data.
      } catch (err) {
        console.error("Error loading data from backend:", err);
      } finally {
        this.isLoading = false;
      }
    },

    async logAudit(action, entityType, entityId, oldVal, newVal, actorName) {
      actorName = actorName || this.currentPersona.name;
      try {
        const response = await fetch(`${API_BASE}/audit-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_value: oldVal,
            new_value: newVal,
            actor_name: actorName
          })
        });
        if (response.ok) {
          const log = await response.json();
          this.auditLogs.unshift(log);
          if (this.auditLogs.length > 500) this.auditLogs.length = 500;
        }
      } catch (err) {
        console.error("Error logging audit:", err);
      }
    },

    async createRoom(data) {
      try {
        const response = await fetch(`${API_BASE}/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          const room = await response.json();
          this.rooms.push(room);
          await this.logAudit('ROOM_CREATED', 'room', room.id, null, room);
          return room;
        }
      } catch (err) {
        console.error("Error creating room:", err);
      }
      return null;
    },

    async updateRoom(id, data) {
      const idx = this.rooms.findIndex(r => r.id === id);
      if (idx === -1) return null;
      const old = { ...this.rooms[idx] };
      
      try {
        const response = await fetch(`${API_BASE}/rooms/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          const updated = await response.json();
          this.rooms[idx] = updated;
          await this.logAudit('ROOM_UPDATED', 'room', id, old, updated);
          return updated;
        }
      } catch (err) {
        console.error("Error updating room:", err);
      }
      return null;
    },

    async deleteRoom(id) {
      const relatedTables = this.tables.filter(t => t.room_id === id);
      if (relatedTables.length > 0) return { error: 'Tidak dapat menghapus ruangan yang memiliki meja.' };
      
      const room = this.rooms.find(r => r.id === id);
      try {
        const response = await fetch(`${API_BASE}/rooms/${id}`, { method: 'DELETE' });
        if (response.ok) {
          this.rooms = this.rooms.filter(r => r.id !== id);
          if (room) await this.logAudit('ROOM_DELETED', 'room', id, room, null);
          return room;
        } else {
          const errData = await response.json();
          return { error: errData.error || 'Failed to delete room' };
        }
      } catch (err) {
        console.error("Error deleting room:", err);
        return { error: 'Connection error' };
      }
    },

    async createTable(data) {
      try {
        const response = await fetch(`${API_BASE}/tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          const table = await response.json();
          this.tables.push(table);
          await this.logAudit('TABLE_CREATED', 'table', table.id, null, table);
          return table;
        }
      } catch (err) {
        console.error("Error creating table:", err);
      }
      return null;
    },

    async updateTable(id, data) {
      const idx = this.tables.findIndex(t => t.id === id);
      if (idx === -1) return null;
      const old = { ...this.tables[idx] };
      
      try {
        const response = await fetch(`${API_BASE}/tables/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          const updated = await response.json();
          this.tables[idx] = updated;
          const action = data.status && data.status !== old.status ? 'TABLE_STATUS_CHANGED' : 'TABLE_UPDATED';
          await this.logAudit(action, 'table', id, old, updated);
          return updated;
        }
      } catch (err) {
        console.error("Error updating table:", err);
      }
      return null;
    },

    async updateTablePosition(id, x, y) {
      const idx = this.tables.findIndex(t => t.id === id);
      if (idx === -1) return;
      const old = { x_position: this.tables[idx].x_position, y_position: this.tables[idx].y_position };
      
      try {
        const response = await fetch(`${API_BASE}/tables/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x_position: x, y_position: y })
        });
        if (response.ok) {
          const updated = await response.json();
          this.tables[idx] = updated;
          await this.logAudit('TABLE_MOVED', 'table', id, old, { x_position: x, y_position: y });
        }
      } catch (err) {
        console.error("Error updating table position:", err);
      }
    },

    async deleteTable(id) {
      const activeBookings = this.bookings.filter(b => b.assigned_table_id === id && !['cancelled','completed','no_show'].includes(b.status));
      if (activeBookings.length > 0) return { error: 'Tidak dapat menghapus meja dengan reservasi aktif.' };
      
      const table = this.tables.find(t => t.id === id);
      try {
        const response = await fetch(`${API_BASE}/tables/${id}`, { method: 'DELETE' });
        if (response.ok) {
          this.tables = this.tables.filter(t => t.id !== id);
          if (table) await this.logAudit('TABLE_DELETED', 'table', id, table, null);
          return table;
        } else {
          const errData = await response.json();
          return { error: errData.error || 'Failed to delete table' };
        }
      } catch (err) {
        console.error("Error deleting table:", err);
        return { error: 'Connection error' };
      }
    },

    async createBooking(data) {
      try {
        const response = await fetch(`${API_BASE}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          const booking = await response.json();
          this.bookings.push(booking);
          await this.logAudit('BOOKING_CREATED', 'booking', booking.id, null, booking);
          
          if (booking.assigned_table_id) {
            const table = this.tables.find(t => t.id === booking.assigned_table_id);
            if (table) table.status = 'reserved';
          }
          return booking;
        }
      } catch (err) {
        console.error("Error creating booking:", err);
      }
      return null;
    },

    async updateBooking(id, data) {
      const idx = this.bookings.findIndex(b => b.id === id);
      if (idx === -1) return null;
      const old = { ...this.bookings[idx] };
      
      try {
        const response = await fetch(`${API_BASE}/bookings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          const updated = await response.json();
          this.bookings[idx] = updated;
          
          const statusActions = { confirmed: 'BOOKING_CONFIRMED', checked_in: 'BOOKING_CHECKED_IN', seated: 'BOOKING_SEATED', completed: 'BOOKING_COMPLETED', cancelled: 'BOOKING_CANCELLED', no_show: 'BOOKING_NO_SHOW' };
          await this.logAudit(statusActions[data.status] || 'BOOKING_UPDATED', 'booking', id, old, updated);
          
          if (data.status === 'seated' && updated.assigned_table_id) {
            const table = this.tables.find(t => t.id === updated.assigned_table_id);
            if (table) table.status = 'occupied';
          } else if (data.status === 'completed' && updated.assigned_table_id) {
            const table = this.tables.find(t => t.id === updated.assigned_table_id);
            if (table) table.status = 'cleaning';
          } else if (data.status === 'cancelled' && updated.assigned_table_id) {
            const table = this.tables.find(t => t.id === updated.assigned_table_id);
            if (table) table.status = 'available';
          }
          
          return updated;
        }
      } catch (err) {
        console.error("Error updating booking:", err);
      }
      return null;
    },

    async exportData() {
      const data = {
        rooms: this.rooms,
        tables: this.tables,
        bookings: this.bookings,
        auditLogs: this.auditLogs
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'mejaaa-export.json'; a.click();
      URL.revokeObjectURL(url);
    },

    async resetData() {
      // In a real application we would have a backend endpoint to reset data.
      // For now, we manually delete all items through the API for demo purposes.
      for (const t of this.tables) { await this.deleteTable(t.id); }
      for (const r of this.rooms) { await this.deleteRoom(r.id); }
      this.rooms = [];
      this.tables = [];
      this.bookings = [];
      this.auditLogs = [];
      await this.seedDemoData();
    },

    async seedDemoData() {
      const today = new Date().toISOString().split('T')[0];
      
      const r1 = await this.createRoom({ name: 'Main Hall', description: 'Primary dining area', floor_number: 1, type: 'indoor', status: 'active', layout_width: 800, layout_height: 500 });
      const r2 = await this.createRoom({ name: 'VIP Room', description: 'Private VIP dining', floor_number: 1, type: 'vip', status: 'active', layout_width: 600, layout_height: 400 });
      const r3 = await this.createRoom({ name: 'Outdoor Terrace', description: 'Al fresco dining', floor_number: 1, type: 'outdoor', status: 'active', layout_width: 700, layout_height: 450 });
      const r4 = await this.createRoom({ name: 'Bar Area', description: 'Casual bar seating', floor_number: 1, type: 'bar', status: 'active', layout_width: 500, layout_height: 350 });

      if(!r1) return; // Prevent seeding if backend isn't ready

      const t1 = await this.createTable({ room_id: r1.id, code: 'A01', name: 'Table A01', shape: 'square', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'available', x_position: 60, y_position: 60, width: 80, height: 80, rotation: 0, notes: '' });
      const t2 = await this.createTable({ room_id: r1.id, code: 'A02', name: 'Table A02', shape: 'square', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'occupied', x_position: 200, y_position: 60, width: 80, height: 80, rotation: 0, notes: '' });
      const t3 = await this.createTable({ room_id: r1.id, code: 'A03', name: 'Table A03', shape: 'round', capacity_min: 4, capacity_max: 6, chair_count: 6, status: 'available', x_position: 340, y_position: 60, width: 90, height: 90, rotation: 0, notes: '' });
      const t4 = await this.createTable({ room_id: r1.id, code: 'A04', name: 'Table A04', shape: 'rectangle', capacity_min: 4, capacity_max: 8, chair_count: 8, status: 'reserved', x_position: 60, y_position: 220, width: 160, height: 80, rotation: 0, notes: '' });
      const t5 = await this.createTable({ room_id: r1.id, code: 'A05', name: 'Table A05', shape: 'round', capacity_min: 2, capacity_max: 2, chair_count: 2, status: 'cleaning', x_position: 340, y_position: 230, width: 70, height: 70, rotation: 0, notes: '' });
      const t6 = await this.createTable({ room_id: r1.id, code: 'A06', name: 'Table A06', shape: 'square', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'available', x_position: 500, y_position: 60, width: 80, height: 80, rotation: 0, notes: '' });
      const t7 = await this.createTable({ room_id: r2.id, code: 'VIP-01', name: 'VIP 1', shape: 'round', capacity_min: 4, capacity_max: 8, chair_count: 8, status: 'available', x_position: 80, y_position: 80, width: 110, height: 110, rotation: 0, notes: 'Premium' });
      const t8 = await this.createTable({ room_id: r2.id, code: 'VIP-02', name: 'VIP 2', shape: 'rectangle', capacity_min: 6, capacity_max: 12, chair_count: 12, status: 'reserved', x_position: 300, y_position: 80, width: 180, height: 90, rotation: 0, notes: 'Large party' });
      const t9 = await this.createTable({ room_id: r3.id, code: 'T-01', name: 'Terrace 1', shape: 'round', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'available', x_position: 80, y_position: 80, width: 80, height: 80, rotation: 0, notes: '' });
      const t10 = await this.createTable({ room_id: r3.id, code: 'T-02', name: 'Terrace 2', shape: 'round', capacity_min: 2, capacity_max: 4, chair_count: 4, status: 'occupied', x_position: 250, y_position: 80, width: 80, height: 80, rotation: 0, notes: '' });
      const t11 = await this.createTable({ room_id: r4.id, code: 'B-01', name: 'Bar 1', shape: 'square', capacity_min: 1, capacity_max: 2, chair_count: 2, status: 'available', x_position: 60, y_position: 60, width: 60, height: 60, rotation: 0, notes: '' });
      const t12 = await this.createTable({ room_id: r4.id, code: 'B-02', name: 'Bar 2', shape: 'square', capacity_min: 1, capacity_max: 2, chair_count: 2, status: 'available', x_position: 160, y_position: 60, width: 60, height: 60, rotation: 0, notes: '' });

      if(t4) await this.createBooking({ customer_name: 'Andi Pratama', customer_phone: '+6281234567890', party_size: 4, booking_date: today, start_time: '19:00', end_time: '20:30', duration_minutes: 90, status: 'confirmed', channel: 'whatsapp', assigned_table_id: t4.id, special_request: 'Birthday celebration', internal_notes: '' });
      if(t2) await this.createBooking({ customer_name: 'Siti Rahayu', customer_phone: '+6287654321098', party_size: 2, booking_date: today, start_time: '12:00', end_time: '13:30', duration_minutes: 90, status: 'seated', channel: 'kiosk', assigned_table_id: t2.id, special_request: '', internal_notes: '' });
      if(t8) await this.createBooking({ customer_name: 'Budi Santoso', customer_phone: '+6289012345678', party_size: 8, booking_date: today, start_time: '20:00', end_time: '22:00', duration_minutes: 120, status: 'confirmed', channel: 'admin', assigned_table_id: t8.id, special_request: 'Corporate dinner', internal_notes: 'VIP client' });
      
      // reload after seeding to make sure states match backend fully
      await this.loadAllData();
    }
  }
})
