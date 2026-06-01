import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2, UserPlus } from 'lucide-react';
import { resolveCtvRefCode, joinCtv } from '@/lib/api/ctv';
import { ApiError } from '@/lib/api/core';

/**
 * Public (unauthenticated) CTV self-signup page reached via a shared referral link
 * `/ctv/join?ref=CTV-XXXXXX`. Registers the visitor as a CTV under the link's owner.
 */
export function JoinCtv() {
  const [params] = useSearchParams();
  const code = (params.get('ref') || '').trim();

  const [upline, setUpline] = useState<{ status: 'loading' | 'ok' | 'invalid'; name?: string | null }>({ status: 'loading' });
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!code) {
      setUpline({ status: 'invalid' });
      return;
    }
    let cancelled = false;
    resolveCtvRefCode(code)
      .then((r) => {
        if (!cancelled) setUpline(r.ok ? { status: 'ok', name: r.uplineName } : { status: 'invalid' });
      })
      .catch(() => {
        if (!cancelled) setUpline({ status: 'invalid' });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.password) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    setSubmitting(true);
    try {
      await joinCtv({ code, ...form });
      setDone(true);
    } catch (err) {
      const msg =
        err instanceof ApiError && (err.body as { error?: { message?: string } })?.error?.message
          ? (err.body as { error: { message: string } }).error.message
          : 'Đăng ký không thành công. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const field = 'w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <div className="mb-5 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/25">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-gray-900">Đăng ký Cộng tác viên</h1>
          {upline.status === 'ok' ? (
            <p className="mt-1 text-sm text-gray-600">
              Bạn sẽ đăng ký dưới <span className="font-semibold text-orange-600">{upline.name || 'CTV'}</span>
            </p>
          ) : null}
        </div>

        {upline.status === 'loading' ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra liên kết...
          </div>
        ) : upline.status === 'invalid' ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
            Liên kết giới thiệu không hợp lệ hoặc đã hết hạn.
          </p>
        ) : done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-7 w-7" />
            </span>
            <p className="text-sm font-bold text-gray-900">Tạo tài khoản CTV thành công!</p>
            <p className="text-sm text-gray-600">Bạn có thể đăng nhập bằng số điện thoại hoặc email vừa đăng ký.</p>
            <a
              href="/login"
              className="mt-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25"
            >
              Đăng nhập
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input className={field} type="text" placeholder="Họ tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={field} type="tel" placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={field} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={field} type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Đang tạo...' : 'Tạo tài khoản CTV'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default JoinCtv;
