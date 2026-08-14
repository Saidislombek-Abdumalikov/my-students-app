import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
import { saveUser, deleteUser } from '../services/auth';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Users, UserPlus, Key, Edit3, Trash2, ShieldCheck, UserCheck, Check, Sparkles } from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const users = useLiveQuery(() => db.users.toArray());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('TEACHER');
  const [subject, setSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center space-y-3 animate-fade-in">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto opacity-80" />
        <h2 className="text-lg font-bold text-slate-100">Ruxsat Berilmadi</h2>
        <p className="text-xs text-slate-400">
          Ushbu sahifa faqat Tizim Administratori (Admin) uchun ochiq.
        </p>
      </div>
    );
  }

  if (!users) {
    return <LoadingSpinner label="Foydalanuvchilar ro'yxati yuklanmoqda..." />;
  }

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setRole('TEACHER');
    setSubject('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setUsername(u.username || '');
    setPassword(u.password || '');
    setRole(u.role);
    setSubject(u.subject || '');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !fullName.trim()) {
      alert("Iltimos, Ism, Login va Parolni to'liq kiriting.");
      return;
    }

    setIsSaving(true);
    try {
      const userId = editingUser ? editingUser.id : `u-${Date.now()}`;
      const now = new Date().toISOString();

      const updatedUser: User = {
        id: userId,
        fullName: fullName.trim(),
        username: username.trim(),
        password: password.trim(),
        email: `${username.trim().toLowerCase()}@learningcenter.com`,
        role,
        subject: subject.trim() || undefined,
        createdAt: editingUser ? editingUser.createdAt : now,
      };

      await saveUser(updatedUser);
      alert(`Akkount (${username}) muvaffaqiyatli saqlandi!`);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save user error:', err);
      alert('Akkountni saqlashda xatolik yuz berdi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentUser.id) {
      alert("Siz o'zingizning aktiv Admin akkountingizni o'chira olmaysiz.");
      return;
    }
    if (!confirm(`Haqiqatan ham "${u.fullName}" (${u.username}) akkountini o'chirmoqchimisiz?`)) {
      return;
    }

    try {
      await deleteUser(u.id);
      alert("Akkount o'chirildi.");
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Foydalanuvchilar va Akkountlar Boshqaruvi</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            O'qituvchilar va Admin akkountlarini yaratish, login hamda parollarni o'zgartirish paneli.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          Yangi Foydalanuvchi Qo'shish
        </Button>
      </div>

      {/* Accounts List Table / Cards */}
      <Card className="space-y-4 bg-slate-900 border-slate-800 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-slate-100">Barcha Akkountlar Ro'yxati</h3>
          </div>
          <Badge variant="brand">{users.length} ta foydalanuvchi</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const isAdmin = u.role === 'ADMIN';

            return (
              <Card
                key={u.id}
                className={`p-4 space-y-3 bg-slate-950 border transition-all ${
                  isAdmin ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                        isAdmin
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isAdmin ? <ShieldCheck className="w-5 h-5" /> : u.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 truncate max-w-[140px]">
                        {u.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {u.subject ? `${u.subject} O'qituvchisi` : u.role}
                      </p>
                    </div>
                  </div>

                  <Badge variant={isAdmin ? 'warning' : 'success'} size="sm">
                    {u.role}
                  </Badge>
                </div>

                {/* Credentials Display */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500">Login:</span>
                    <span className="font-bold text-emerald-400">{u.username}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500">Parol:</span>
                    <span className="font-bold text-amber-400">{u.password || '1'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-800/50">
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEditModal(u)}
                  >
                    Tahrirlash
                  </Button>

                  {u.id !== currentUser.id && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteUser(u)}
                      className="p-2"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Akkountni Tahrirlash (${editingUser.username})` : "Yangi Foydalanuvchi Yaratish"}
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Foydalanuvchi To'liq Ismi</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="masalan: Alisher Navoiy"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Login (Foydalanuvchi Nomi)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masalan: 1, english, math"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Parol</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="masalan: saidislomadmin1 yoki 1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Roli</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="TEACHER">TEACHER (O'qituvchi)</option>
                <option value="ADMIN">ADMIN (Administrator)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Fan (Subject)</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="masalan: English, Math, Physics"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving} leftIcon={<Check className="w-4 h-4" />}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
