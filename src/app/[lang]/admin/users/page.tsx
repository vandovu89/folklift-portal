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
      <h1 style={{ marginBottom: '2rem' }}>Quản lý Nhân sự / Phân quyền</h1>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Form thêm user */}
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', padding: '2rem', alignSelf: 'flex-start' }}>
          <h3>Thêm Tài Khoản Mới</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label>Tên hiển thị</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="form-control"
              />
            </div>
            <div>
              <label>Tên đăng nhập</label>
              <input 
                type="text" 
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="form-control"
              />
            </div>
            <div>
              <label>Mật khẩu</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="form-control"
              />
            </div>
            <div>
              <label>Phân quyền (Role)</label>
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
            <button type="submit" className="btn-primary" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <FaPlus /> Tạo Tài Khoản
            </button>
          </form>
        </div>

        {/* Danh sách user */}
        <div className="glass-panel" style={{ flex: '2', minWidth: '400px', padding: '2rem' }}>
          <h3>Danh sách Tài Khoản</h3>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : u.role === 'SALES' ? 'badge-success' : 'badge-warning'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleDelete(u.id)} className="btn-icon" style={{ color: 'var(--danger)' }} title="Xóa">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
