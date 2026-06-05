import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2, UserPlus } from 'lucide-react';
import { resolveCtvRefCode, joinCtv, lookupPublicCtvByPhone, type PublicCtvLookup } from '@/lib/api/ctv';
import { ApiError } from '@/lib/api/core';

/**
 * Public (unauthenticated) CTV self-signup page. A shared referral link
 * (`/ctv/join?ref=CTV-XXXXXX`) pre-resolves the upline; direct landing CTA
 * visits use the final CTV phone field to choose the upline.
 */
export function JoinCtv() {
  const [params] = useSearchParams();
  const code = (params.get('ref') || '').trim();
  // Root/top-level CTV signup (no upline) is gated to NK3 via the baked VITE flag so
  // NK/NK2 web builds keep requiring an upline until the feature is migrated.
  const rootSignupEnabled =
    import.meta.env.VITE_CTV_PUBLIC_ROOT_SIGNUP === 'true' || import.meta.env.VITE_CTV_PUBLIC_ROOT_SIGNUP === '1';

  const [upline, setUpline] = useState<{ status: 'manual' | 'loading' | 'ok' | 'invalid'; name?: string | null }>({
    status: code ? 'loading' : 'manual',
  });
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', uplinePhone: '' });
  const [ctvLookup, setCtvLookup] = useState<{ status: 'idle' | 'checking' | 'done'; result?: PublicCtvLookup }>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!code) {
      setUpline({ status: 'manual' });
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

  useEffect(() => {
    const uplinePhone = form.uplinePhone.trim();
    if (uplinePhone.length < 6) {
      setCtvLookup({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setCtvLookup({ status: 'checking' });
    const id = setTimeout(async () => {
      try {
        const result = await lookupPublicCtvByPhone(uplinePhone);
        if (!cancelled) setCtvLookup({ status: 'done', result });
      } catch {
        if (!cancelled) setCtvLookup({ status: 'done', result: { exists: false } });
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [form.uplinePhone]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.phone.trim() || !form.password) {
      setError('Vui lòng nhập họ tên, số điện thoại và mật khẩu.');
      return;
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    const uplinePhone = form.uplinePhone.trim();
    if (upline.status !== 'ok' && !uplinePhone && !rootSignupEnabled) {
      setError('Vui lòng nhập số điện thoại CTV giới thiệu.');
      return;
    }
    if (uplinePhone && ctvLookup.status === 'checking') {
      setError('Vui lòng chờ xác minh số điện thoại CTV giới thiệu.');
      return;
    }
    if (uplinePhone && (ctvLookup.status !== 'done' || !ctvLookup.result?.exists)) {
      setError('Không tìm thấy CTV theo số điện thoại này.');
      return;
    }
    setSubmitting(true);
    try {
      await joinCtv({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(uplinePhone ? { uplinePhone } : { code }),
      });
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
          ) : upline.status === 'manual' ? (
            <p className="mt-1 text-sm text-gray-600">Nhập số điện thoại CTV giới thiệu ở cuối form.</p>
          ) : null}
        </div>

        {upline.status === 'loading' ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra liên kết...
          </div>
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
            {upline.status === 'invalid' ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-700">
                Liên kết giới thiệu không hợp lệ. Nhập số điện thoại CTV giới thiệu để tiếp tục.
              </p>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Họ tên</span>
              <input className={field} type="text" placeholder="Họ tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Số điện thoại của bạn</span>
              <input className={field} type="tel" placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Email <span className="font-normal text-gray-400">(không bắt buộc)</span>
              </span>
              <input className={field} type="email" placeholder="Email (không bắt buộc)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Mật khẩu</span>
              <input className={field} type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">CTV giới thiệu</span>
              <input
                className={field}
                type="tel"
                placeholder="Số điện thoại CTV giới thiệu"
                value={form.uplinePhone}
                onChange={(e) => setForm({ ...form, uplinePhone: e.target.value })}
              />
              <JoinCtvPhoneCheck lookup={ctvLookup} />
              <span className="mt-1 block text-xs text-gray-500">
                {upline.status === 'ok'
                  ? 'Để trống để dùng CTV từ liên kết giới thiệu.'
                  : rootSignupEnabled
                    ? 'Không bắt buộc — để trống để đăng ký làm CTV cấp gốc.'
                    : 'Bắt buộc khi đăng ký từ nút Đăng Ký CTV trên landing.'}
              </span>
            </label>
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

function JoinCtvPhoneCheck({
  lookup,
}: {
  readonly lookup: { status: 'idle' | 'checking' | 'done'; result?: PublicCtvLookup };
}) {
  if (lookup.status === 'idle') return null;
  if (lookup.status === 'checking') {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Đang xác minh số CTV...
      </p>
    );
  }
  if (lookup.result?.exists) {
    return <p className="mt-1 text-xs font-semibold text-emerald-600">CTV hợp lệ: {lookup.result.name || 'CTV'}</p>;
  }
  return <p className="mt-1 text-xs font-semibold text-red-600">Không tìm thấy CTV theo số điện thoại này.</p>;
}

export default JoinCtv;
