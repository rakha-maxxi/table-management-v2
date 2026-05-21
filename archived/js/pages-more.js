// Mejaaa — Bookings, Audit Trail, Settings Pages

// ---- BOOKINGS ----
Pages.bookings = function(c) {
  const bookings = Store.getBookings();
  const rooms = Store.getRooms();
  c.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Reservasi</div><div class="page-subtitle">Kelola reservasi dan walk-in</div></div>
      <div style="display:flex;gap:8px">
        <select class="form-select" id="bk-filter-status" onchange="Pages.filterBookings()" style="width:140px;padding:6px 10px;font-size:12px">
          <option value="">Semua Status</option>${['confirmed','checked_in','seated','completed','cancelled','no_show','draft','pending'].map(s=>{const smap={pending:'Menunggu',confirmed:'Dikonfirmasi',checked_in:'Hadir',seated:'Duduk',completed:'Selesai',cancelled:'Dibatalkan',no_show:'Tidak Hadir',draft:'Draf'};return `<option value="${s}">${smap[s]||s}</option>`;}).join('')}
        </select>
        <select class="form-select" id="bk-filter-channel" onchange="Pages.filterBookings()" style="width:130px;padding:6px 10px;font-size:12px">
          <option value="">Semua Saluran</option>${['admin','kiosk','whatsapp'].map(s=>`<option value="${s}">${s}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="Pages.bookingModal()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Reservasi Baru</button>
      </div>
    </div>
    <div class="card"><div class="data-table-wrap"><table class="data-table"><thead><tr>
      <th>Kode</th><th>Pelanggan</th><th>Jumlah</th><th>Tanggal</th><th>Waktu</th><th>Meja</th><th>Saluran</th><th>Status</th><th style="width:140px">Aksi</th>
    </tr></thead><tbody id="bookings-tbody">
      ${Pages._renderBookingRows(bookings)}
    </tbody></table></div></div>`;
};

Pages._renderBookingRows = function(bookings) {
  if (!bookings.length) return '<tr><td colspan="9"><div class="empty-state"><h3>Belum ada reservasi</h3></div></td></tr>';
  return bookings.sort((a,b) => b.created_at.localeCompare(a.created_at)).map(b => {
    const tbl = b.assigned_table_id ? Store.getTable(b.assigned_table_id) : null;
    return `<tr data-status="${b.status}" data-channel="${b.channel}">
      <td><strong style="font-size:12px">${b.booking_code}</strong></td>
      <td><div>${b.customer_name}</div><div style="font-size:11px;color:var(--text-muted)">${b.customer_phone}</div></td>
      <td>${b.party_size}</td>
      <td style="font-size:12px">${b.booking_date}</td>
      <td style="font-size:12px">${b.start_time||'-'}</td>
      <td>${tbl ? tbl.code : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td><span style="font-size:11px;text-transform:capitalize;color:var(--text-secondary)">${b.channel}</span></td>
      <td>${App.badge(b.status)}</td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">
        ${b.status==='confirmed'?`<button class="btn btn-sm btn-secondary" onclick="Pages.bookingAction('${b.id}','checked_in')">Check In</button>`:''}
        ${b.status==='checked_in'?`<button class="btn btn-sm btn-primary" onclick="Pages.bookingAction('${b.id}','seated')">Dudukkan</button>`:''}
        ${b.status==='seated'?`<button class="btn btn-sm btn-secondary" onclick="Pages.bookingAction('${b.id}','completed')">Selesai</button>`:''}
        ${!['cancelled','completed','no_show'].includes(b.status)?`<button class="btn btn-sm btn-ghost" onclick="Pages.bookingAction('${b.id}','cancelled')" title="Batal">✕</button>`:''}
        <button class="btn btn-ghost btn-sm btn-icon" onclick="Pages.bookingModal('${b.id}')" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      </div></td>
    </tr>`;
  }).join('');
};

Pages.filterBookings = function() {
  const status = document.getElementById('bk-filter-status').value;
  const channel = document.getElementById('bk-filter-channel').value;
  let bk = Store.getBookings();
  if (status) bk = bk.filter(b => b.status === status);
  if (channel) bk = bk.filter(b => b.channel === channel);
  document.getElementById('bookings-tbody').innerHTML = Pages._renderBookingRows(bk);
};

Pages.bookingAction = function(id, status) {
  Store.updateBooking(id, { status });
  if (status === 'seated') { const b = Store.getBooking(id); if (b && b.assigned_table_id) Store.updateTable(b.assigned_table_id, { status: 'occupied' }); }
  if (status === 'completed') { const b = Store.getBooking(id); if (b && b.assigned_table_id) Store.updateTable(b.assigned_table_id, { status: 'cleaning' }); }
  if (status === 'cancelled') { const b = Store.getBooking(id); if (b && b.assigned_table_id) Store.updateTable(b.assigned_table_id, { status: 'available' }); }
  const smap={pending:'Menunggu',confirmed:'Dikonfirmasi',checked_in:'Hadir',seated:'Duduk',completed:'Selesai',cancelled:'Dibatalkan',no_show:'Tidak Hadir'};
  App.toast(`Reservasi → ${smap[status]||status}`); App.render();
};

Pages.bookingModal = function(id) {
  const b = id ? Store.getBooking(id) : null;
  const tables = Store.getTables();
  const today = new Date().toISOString().split('T')[0];
  const body = `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nama Pelanggan *</label><input class="form-input" id="bk-name" value="${b?b.customer_name:''}" placeholder="Nama tamu"></div>
      <div class="form-group"><label class="form-label">Telepon</label><input class="form-input" id="bk-phone" value="${b?b.customer_phone:''}" placeholder="+62..."></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Jumlah Tamu *</label><input class="form-input" id="bk-party" type="number" value="${b?b.party_size:2}" min="1"></div>
      <div class="form-group"><label class="form-label">Saluran</label><select class="form-select" id="bk-channel">
        ${['admin','kiosk','whatsapp'].map(s=>`<option value="${s}" ${b&&b.channel===s?'selected':''}>${s}</option>`).join('')}
      </select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Tanggal *</label><input class="form-input" id="bk-date" type="date" value="${b?b.booking_date:today}"></div>
      <div class="form-group"><label class="form-label">Waktu *</label><input class="form-input" id="bk-time" type="time" value="${b?b.start_time:'19:00'}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Durasi (mnt)</label><input class="form-input" id="bk-dur" type="number" value="${b?b.duration_minutes:90}"></div>
      <div class="form-group"><label class="form-label">Pilih Meja</label><select class="form-select" id="bk-table">
        <option value="">— Tidak Ada —</option>${tables.map(t=>`<option value="${t.id}" ${b&&b.assigned_table_id===t.id?'selected':''}>${t.code} (${App.roomName(t.room_id)}) - ${t.status}</option>`).join('')}
      </select></div>
    </div>
    <div class="form-group"><label class="form-label">Permintaan Khusus</label><textarea class="form-textarea" id="bk-req" placeholder="Mis. alergi, acara khusus">${b?b.special_request:''}</textarea></div>
    <div class="form-group"><label class="form-label">Catatan Internal</label><textarea class="form-textarea" id="bk-notes" placeholder="Catatan khusus staf">${b?b.internal_notes:''}</textarea></div>`;
  const footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Batal</button><button class="btn btn-primary" onclick="Pages.saveBooking('${id||''}')">Simpan</button>`;
  App.openModal(b ? 'Edit Reservasi' : 'Reservasi Baru', body, footer);
};

Pages.saveBooking = function(id) {
  const name = document.getElementById('bk-name').value.trim();
  const date = document.getElementById('bk-date').value;
  const time = document.getElementById('bk-time').value;
  if (!name || !date || !time) { App.toast('Nama, tanggal, dan waktu wajib diisi', 'error'); return; }
  const data = { customer_name: name, customer_phone: document.getElementById('bk-phone').value.trim(), party_size: parseInt(document.getElementById('bk-party').value)||2, channel: document.getElementById('bk-channel').value, booking_date: date, start_time: time, duration_minutes: parseInt(document.getElementById('bk-dur').value)||90, assigned_table_id: document.getElementById('bk-table').value || null, special_request: document.getElementById('bk-req').value.trim(), internal_notes: document.getElementById('bk-notes').value.trim() };
  if (id) Store.updateBooking(id, data); else Store.createBooking(data);
  App.closeModal(); App.toast(id ? 'Reservasi diperbarui' : 'Reservasi dibuat'); App.render();
};

// ---- AUDIT TRAIL ----
Pages.audit = function(c) {
  const logs = Store.getAuditLogs();
  c.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Log Aktivitas</div><div class="page-subtitle">Log aktivitas sistem — ${logs.length} entri</div></div>
      <div style="display:flex;gap:8px">
        <select class="form-select" id="au-filter" onchange="Pages.filterAudit()" style="width:160px;padding:6px 10px;font-size:12px">
          <option value="">Semua Aksi</option>${[...new Set(logs.map(l=>l.action))].map(a=>`<option value="${a}">${a.replace(/_/g,' ')}</option>`).join('')}
        </select>
        <select class="form-select" id="au-entity" onchange="Pages.filterAudit()" style="width:130px;padding:6px 10px;font-size:12px">
          <option value="">Semua Entitas</option>${['room','table','booking'].map(e=>`<option value="${e}">${e}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="card"><div class="data-table-wrap"><table class="data-table"><thead><tr>
      <th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Entitas</th><th>Perubahan</th>
    </tr></thead><tbody id="audit-tbody">
      ${Pages._renderAuditRows(logs)}
    </tbody></table></div></div>`;
};

Pages._renderAuditRows = function(logs) {
  if (!logs.length) return '<tr><td colspan="5"><div class="empty-state"><h3>Belum ada log aktivitas</h3></div></td></tr>';
  return logs.slice(0, 100).map(l => {
    let changes = '-';
    if (l.old_value && l.new_value && typeof l.old_value === 'object' && typeof l.new_value === 'object') {
      const diffs = [];
      for (const k of Object.keys(l.new_value)) {
        if (JSON.stringify(l.old_value[k]) !== JSON.stringify(l.new_value[k]) && !['updated_at','created_at'].includes(k)) {
          diffs.push(`<span style="color:var(--text-muted)">${k}:</span> <span style="color:#DC2626;text-decoration:line-through">${typeof l.old_value[k]==='object'?JSON.stringify(l.old_value[k]):l.old_value[k]}</span> → <span style="color:var(--brand-700)">${typeof l.new_value[k]==='object'?JSON.stringify(l.new_value[k]):l.new_value[k]}</span>`);
        }
      }
      if (diffs.length) changes = diffs.slice(0,3).join('<br>');
    } else if (l.action.includes('CREATED') && l.new_value) {
      changes = `<span style="color:var(--brand-700)">Dibuat: ${l.new_value.name || l.new_value.code || l.new_value.booking_code || ''}</span>`;
    } else if (l.action.includes('DELETED') && l.old_value) {
      changes = `<span style="color:#DC2626">Dihapus: ${l.old_value.name || l.old_value.code || ''}</span>`;
    }
    return `<tr data-action="${l.action}" data-entity="${l.entity_type}">
      <td style="font-size:12px;white-space:nowrap;color:var(--text-muted)">${App.fmtDateTime(l.created_at)}</td>
      <td style="font-weight:600;font-size:12px">${l.actor_name}</td>
      <td><span style="font-size:11px;font-family:monospace;background:var(--bg-tertiary);padding:2px 6px;border-radius:3px">${l.action}</span></td>
      <td style="text-transform:capitalize;font-size:12px">${l.entity_type}</td>
      <td style="font-size:12px;max-width:300px;line-height:1.6">${changes}</td>
    </tr>`;
  }).join('');
};

Pages.filterAudit = function() {
  const action = document.getElementById('au-filter').value;
  const entity = document.getElementById('au-entity').value;
  let logs = Store.getAuditLogs();
  if (action) logs = logs.filter(l => l.action === action);
  if (entity) logs = logs.filter(l => l.entity_type === entity);
  document.getElementById('audit-tbody').innerHTML = Pages._renderAuditRows(logs);
};

// ---- SETTINGS ----
Pages.settings = function(c) {
  c.innerHTML = `
    <div class="page-header"><div><div class="page-title">Pengaturan</div><div class="page-subtitle">Konfigurasi aplikasi</div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">Aturan Reservasi</span></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label" style="display:flex;align-items:center;">Durasi Default (mnt) <span class="tooltip-icon" data-tooltip="Waktu standar yang dialokasikan untuk reservasi baru (mis. 90 menit).">?</span></label><input class="form-input" value="90" disabled></div>
          <div class="form-group"><label class="form-label" style="display:flex;align-items:center;">Waktu Jeda (mnt) <span class="tooltip-icon" data-tooltip="Waktu jeda setelah reservasi selesai sebelum meja bisa dipesan lagi.">?</span></label><input class="form-input" value="15" disabled></div>
          <div class="form-group"><label class="form-label" style="display:flex;align-items:center;">Waktu Toleransi (mnt) <span class="tooltip-icon" data-tooltip="Waktu toleransi keterlambatan sebelum tamu ditandai sebagai Tidak Hadir.">?</span></label><input class="form-input" value="15" disabled></div>
          <div class="form-group"><label class="form-label" style="display:flex;align-items:center;">Durasi Pembersihan (mnt) <span class="tooltip-icon" data-tooltip="Waktu yang dibutuhkan untuk membersihkan meja setelah tamu pergi.">?</span></label><input class="form-input" value="10" disabled></div>
          <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Pengaturan sudah diprakonfigurasi untuk tujuan demo.</p>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Manajemen Data</span></div>
        <div class="card-body">
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5">Semua data disimpan di localStorage peramban Anda. Anda dapat mengatur ulang ke data demo atau menghapus semuanya.</p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" onclick="Pages.exportData()"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Ekspor JSON</button>
            <button class="btn btn-danger" onclick="App.confirm('Atur ulang semua data ke default demo?',()=>{Store.reset();App.toast('Data diatur ulang ke default');App.render();})">Atur Ulang Data</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">Tentang Mejaaa</span></div>
      <div class="card-body">
        <p style="font-size:13px;color:var(--text-secondary);line-height:1.6"><strong>Mejaaa</strong> adalah sistem manajemen meja restoran untuk denah lantai, pemesanan, dan pelacakan status waktu nyata. Dibangun dengan HTML, Tailwind CSS, dan Vanilla JavaScript. Semua data bertahan di localStorage — tidak diperlukan backend.</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Versi 1.0 · Fase MVP 1</p>
      </div>
    </div>`;
};

Pages.exportData = function() {
  const data = { rooms: Store.getRooms(), tables: Store.getTables(), bookings: Store.getBookings(), audit: Store.getAuditLogs() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'mejaaa-export.json'; a.click();
  URL.revokeObjectURL(url);
  App.toast('Data diekspor');
};

// ---- CUSTOMER BOOKING ----
Pages.customerBookingModal = function(tableId) {
  const today = new Date().toISOString().split('T')[0];
  const t = Store.getTable(tableId);
  const title = `Pesan ${t.code} (${App.roomName(t.room_id)})`;
  
  const body = `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Tanggal *</label><input type="date" class="form-input" id="cb-date" value="${today}"></div>
      <div class="form-group"><label class="form-label">Waktu *</label><input type="time" class="form-input" id="cb-time" value="19:00"></div>
    </div>
    <div class="form-group"><label class="form-label">Jumlah Tamu *</label><input type="number" class="form-input" id="cb-party" value="${t.capacity_min}" min="1" max="${t.capacity_max}"></div>
    
    <hr style="border: 0; border-top: 1px solid var(--border-default); margin: 8px 0 16px 0;">
    
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nama Lengkap *</label><input type="text" class="form-input" id="cb-name" placeholder="John Doe"></div>
      <div class="form-group"><label class="form-label">Nomor Telepon *</label><input type="text" class="form-input" id="cb-phone" placeholder="+62 812..."></div>
    </div>
    <div class="form-group"><label class="form-label">Permintaan Khusus</label><textarea class="form-textarea" id="cb-req" placeholder="Hari jadi, info alergi, dll."></textarea></div>
  `;
  
  const footer = `
    <button class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="Pages.submitCustomerBooking('${tableId}')">Konfirmasi Reservasi</button>
  `;
  
  App.openModal(title, body, footer);
};

Pages.submitCustomerBooking = function(tableId) {
  const name = document.getElementById('cb-name').value.trim();
  const phone = document.getElementById('cb-phone').value.trim();
  const date = document.getElementById('cb-date').value;
  const time = document.getElementById('cb-time').value;
  const party = parseInt(document.getElementById('cb-party').value) || 2;
  const req = document.getElementById('cb-req').value.trim();

  if (!name || !phone || !date || !time) {
    App.toast('Harap isi semua kolom wajib', 'error');
    return;
  }

  Store.createBooking({
    customer_name: name,
    customer_phone: phone,
    party_size: party,
    booking_date: date,
    start_time: time,
    duration_minutes: 90,
    status: 'pending',
    channel: 'kiosk',
    assigned_table_id: tableId,
    special_request: req,
    internal_notes: 'Dibuat melalui layanan mandiri pelanggan'
  });

  App.closeModal();
  App.toast('Reservasi dikonfirmasi! Kami menantikan kedatangan Anda.', 'success');
  App.render(); // Re-render floor plan so table shows as reserved
};
