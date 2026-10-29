import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../api/axios.js';
import { BookOpen, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['author', 'admin']),
  adminKey: z.string().optional(),
}).refine((data) => data.role !== 'admin' || data.adminKey?.trim(), {
  message: 'Admin registration key is required for admin signup',
  path: ['adminKey'],
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('author');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'author' },
  });

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      const user = res.data.data;
      // Update auth context by reloading the page so AuthProvider fetches /me
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-elevated"
      >
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-leaf-50">
            <BookOpen className="h-7 w-7 text-leaf-600" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">Create an account</h1>
          <p className="mt-2 text-sm text-ink-500">Register as an author or admin</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input {...register('name')} className="input" placeholder="Your name" autoComplete="name" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email address</label>
            <input type="email" {...register('email')} className="input" placeholder="you@example.com" autoComplete="email" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" {...register('password')} className="input" placeholder="••••••••" autoComplete="new-password" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">Account type</label>
            <select {...register('role')} onChange={(e) => setRole(e.target.value)} className="input">
              <option value="author">Author</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {role === 'admin' && (
            <div>
              <label className="label flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Admin registration key
              </label>
              <input type="password" {...register('adminKey')} className="input" placeholder="Provided by your team" />
              {errors.adminKey && <p className="mt-1 text-xs text-red-600">{errors.adminKey.message}</p>}
              <p className="mt-1 text-xs text-ink-500">
                Ask the person who deployed the app for the key, or set <code className="rounded bg-ink-100 px-1 py-0.5">ADMIN_REGISTRATION_KEY</code> in the server environment.
              </p>
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-leaf-600 hover:text-leaf-700">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
