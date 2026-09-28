'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', role: 'SALES' });

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
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaPlus style={{ color: 'var(--primary)' }} /> Thêm tài khoản mới
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {users.map(u => (
          <div key={u.id} className="glass-panel hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', transition: 'var(--transition)' }}>
             {/* Avatar */}
             <div style={{ width: '55px', height: '55px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}>
               {u.name.charAt(0).toUpperCase()}
             </div>
             
             {/* Info */}
             <div style={{ flex: 1, overflow: 'hidden' }}>
               <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</h4>
               <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>@{u.username}</div>
               <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : u.role === 'SALES' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                 {u.role}
               </span>
             </div>
             
             {/* Action */}
             <div>
               <button onClick={() => handleDelete(u.id)} className="btn-danger" style={{ padding: '0.5rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }} title="Xóa tài khoản">
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
    </div>
  );
}
