'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaTimes, FaSave } from 'react-icons/fa';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', role: 'SALES' });

  // State cho việc chỉnh sửa user
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'SALES',
    isActive: true
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.name) {
      alert('Vui lòng điền đủ thông tin');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert('Tạo người dùng thành công');
        setFormData({ username: '', password: '', name: '', role: 'SALES' });
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || 'Lỗi khi tạo người dùng');
      }
    } catch (e) {
      alert('Lỗi hệ thống');
    }
  };

  const handleStartEdit = (u: any) => {
    setEditingUser(u);
    setEditFormData({
      name: u.name || '',
      username: u.username || '',
      password: '',
      role: u.role || 'SALES',
      isActive: u.isActive !== false
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFormData.name.trim() || !editFormData.username.trim()) {
      alert('Tên hiển thị và Tên đăng nhập không được để trống');
      return;
    }

    setSavingEdit(true);
    try {
      const payload: any = {
        name: editFormData.name.trim(),
        username: editFormData.username.trim(),
        role: editFormData.role,
        isActive: editFormData.isActive
      };
      if (editFormData.password && editFormData.password.trim() !== '') {
        payload.password = editFormData.password;
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Cập nhật tài khoản thành công!');
        setEditingUser(null);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cập nhật tài khoản');
      }
    } catch (e) {
      alert('Lỗi kết nối hệ thống');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || 'Lỗi khi xóa');
      }
    } catch (e) {
      alert('Lỗi hệ thống');
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Quản lý Tài Khoản</h1>
      </div>

      {/* Form thêm user */}
      <div className="glass-panel" style={{ padding: 'clamp(1.2rem, 3vw, 2rem)', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
          <FaPlus style={{ color: 'var(--primary)' }} /> Thêm tài khoản mới
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600, color: 'var(--foreground)' }}>Tên hiển thị</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="form-control"
              placeholder="VD: Nguyễn Văn A"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600, color: 'var(--foreground)' }}>Tên đăng nhập</label>
            <input 
              type="text" 
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              className="form-control"
              placeholder="VD: nguyenvana"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600, color: 'var(--foreground)' }}>Mật khẩu</label>
            <input 
              type="password" 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="form-control"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600, color: 'var(--foreground)' }}>Phân quyền</label>
            <select 
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
              className="form-control"
            >
              <option value="SALES">Sales (Kinh doanh)</option>
              <option value="ADMIN">Admin (Quản trị)</option>
              <option value="VIEWER">Viewer (Chỉ xem)</option>
            </select>
          </div>
          <div>
            <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', borderRadius: '8px' }}>
              <FaPlus /> Tạo Mới
            </button>
          </div>
        </form>
      </div>

      {/* Danh sách user (Dạng Card) */}
      <h3 style={{ marginBottom: '1rem' }}>Danh sách nhân sự ({users.length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
        {users.map(u => (
          <div key={u.id} className="glass-panel hover-scale" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'var(--transition)' }}>
             {/* Avatar */}
             <div style={{ width: '55px', height: '55px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}>
               {u.name?.charAt(0).toUpperCase() || 'U'}
             </div>
             
             {/* Info */}
             <div style={{ flex: 1, overflow: 'hidden' }}>
               <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</h4>
               <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>@{u.username}</div>
               <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                 <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : u.role === 'SALES' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                   {u.role}
                 </span>
                 {u.isActive === false ? (
                   <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: '#ef4444', color: 'white' }}>
                     Đã khóa
                   </span>
                 ) : (
                   <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: '#10b981', color: 'white' }}>
                     Hoạt động
                   </span>
                 )}
               </div>
             </div>
             
             {/* Action */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
               <button 
                 onClick={() => handleStartEdit(u)} 
                 className="btn-secondary" 
                 style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }} 
                 title="Chỉnh sửa tài khoản"
               >
                 <FaEdit /> Sửa
               </button>
               <button 
                 onClick={() => handleDelete(u.id)} 
                 className="btn-danger" 
                 style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }} 
                 title="Xóa tài khoản"
               >
                 <FaTrash /> Xóa
               </button>
             </div>
          </div>
        ))}
        
        {users.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            Chưa có tài khoản nào.
          </div>
        )}
      </div>

      {/* Modal chỉnh sửa User */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            background: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: 'clamp(1.2rem, 3vw, 2rem)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                <FaEdit color="var(--primary)" /> Chỉnh sửa tài khoản
              </h3>
              <button 
                type="button"
                onClick={() => setEditingUser(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600, color: '#334155' }}>
                  Tên hiển thị *
                </label>
                <input 
                  type="text" 
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="form-control"
                  style={{ width: '100%', background: '#fff' }}
                  placeholder="Họ và tên nhân sự"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600, color: '#334155' }}>
                  Tên đăng nhập *
                </label>
                <input 
                  type="text" 
                  required
                  value={editFormData.username}
                  onChange={e => setEditFormData({ ...editFormData, username: e.target.value })}
                  className="form-control"
                  style={{ width: '100%', background: '#fff' }}
                  placeholder="username"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600, color: '#334155' }}>
                  Đổi mật khẩu mới
                </label>
                <input 
                  type="password" 
                  value={editFormData.password}
                  onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="form-control"
                  style={{ width: '100%', background: '#fff' }}
                  placeholder="Để trống nếu không muốn đổi mật khẩu"
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  (Chỉ nhập khi muốn thiết lập lại mật khẩu cho nhân viên)
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600, color: '#334155' }}>
                    Phân quyền
                  </label>
                  <select 
                    value={editFormData.role}
                    onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="form-control"
                    style={{ width: '100%', background: '#fff' }}
                  >
                    <option value="SALES">Sales (Kinh doanh)</option>
                    <option value="ADMIN">Admin (Quản trị)</option>
                    <option value="VIEWER">Viewer (Chỉ xem)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600, color: '#334155' }}>
                    Trạng thái
                  </label>
                  <select 
                    value={editFormData.isActive ? 'active' : 'inactive'}
                    onChange={e => setEditFormData({ ...editFormData, isActive: e.target.value === 'active' })}
                    className="form-control"
                    style={{ width: '100%', background: '#fff' }}
                  >
                    <option value="active">🟢 Hoạt động</option>
                    <option value="inactive">🔴 Khóa tài khoản</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.2rem' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)} 
                  className="btn-secondary" 
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={savingEdit}
                  className="btn-primary" 
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FaSave /> {savingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
