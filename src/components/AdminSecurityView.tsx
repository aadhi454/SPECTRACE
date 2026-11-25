import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import {
  AuditLogItem,
  AuthenticatedUser,
  authFetch,
  SecuritySelfTestResultItem,
  UserRole,
} from '../services/authClient';

interface AdminSecurityViewProps {
  currentUser: AuthenticatedUser;
}

export const AdminSecurityView: React.FC<AdminSecurityViewProps> = ({
  currentUser,
}) => {
  const [users, setUsers] = useState<AuthenticatedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Add allowlisted user form
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('user');

  //Issued single-use reset token display
  const [issuedTokenInfo, setIssuedTokenInfo] = useState<{
    email: string;
    token: string;
    expiresAt: string;
  } | null>(null);

  // 12-Scenario Security Verification Results
  const [selfTestResults, setSelfTestResults] = useState<{
    executedAt: string;
    totalTests: number;
    passedTests: number;
    results: SecuritySelfTestResultItem[];
  } | null>(null);
  const [runningSelfTests, setRunningSelfTests] = useState<boolean>(false);

  const fetchAdminDirectory = useCallback(async () => {
    if (currentUser.role !== 'admin') return;
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/users');
      if (res.ok) {
        const data = (await res.json()) as {
          users: AuthenticatedUser[];
          auditLogs: AuditLogItem[];
        };
        setUsers(data.users);
        setAuditLogs(data.auditLogs);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser.role]);

  useEffect(() => {
    fetchAdminDirectory();
  }, [fetchAdminDirectory]);

  const handleCreateAllowlistedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail.includes('@') || newPassword.length < 8) {
      setFeedback({
        type: 'error',
        text: 'Enter a valid email address and an initial password of at least 8 characters.',
      });
      return;
    }

    const res = await authFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: trimmedEmail,
        password: newPassword,
        role: newRole,
        isActive: true,
      }),
    });

    const data = (await res.json()) as {
      error?: string;
      users?: AuthenticatedUser[];
      auditLogs?: AuditLogItem[];
    };

    if (!res.ok) {
      setFeedback({
        type: 'error',
        text: data.error || 'Failed to add user to allowlist.',
      });
      return;
    }

    if (data.users) setUsers(data.users);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    setNewEmail('');
    setNewPassword('');
    setNewRole('user');
    setFeedback({
      type: 'success',
      text: `Added ${trimmedEmail} (${newRole}) to the authorized database allowlist.`,
    });
  };

  const handleToggleUserActive = async (target: AuthenticatedUser) => {
    setFeedback(null);
    const res = await authFetch(`/api/admin/users/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !target.isActive }),
    });
    const data = (await res.json()) as {
      error?: string;
      users?: AuthenticatedUser[];
      auditLogs?: AuditLogItem[];
    };
    if (!res.ok) {
      setFeedback({
        type: 'error',
        text: data.error || 'Could not update account status.',
      });
      return;
    }
    if (data.users) setUsers(data.users);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    setFeedback({
      type: 'success',
      text: `${target.email} is now ${!target.isActive ? 'ACTIVE' : 'DISABLED (all active sessions revoked)'}.`,
    });
  };

  const handleChangeUserRole = async (
    target: AuthenticatedUser,
    nextRole: UserRole
  ) => {
    setFeedback(null);
    const res = await authFetch(`/api/admin/users/${target.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: nextRole }),
    });
    const data = (await res.json()) as {
      error?: string;
      users?: AuthenticatedUser[];
      auditLogs?: AuditLogItem[];
    };
    if (!res.ok) {
      setFeedback({
        type: 'error',
        text: data.error || 'Could not change user role.',
      });
      return;
    }
    if (data.users) setUsers(data.users);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    setFeedback({
      type: 'success',
      text: `Updated role for ${target.email} to '${nextRole}'.`,
    });
  };

  const handleRevokeUserSessions = async (target: AuthenticatedUser) => {
    setFeedback(null);
    const res = await authFetch(
      `/api/admin/users/${target.id}/revoke-sessions`,
      {
        method: 'POST',
      }
    );
    const data = (await res.json()) as {
      error?: string;
      revokedCount?: number;
      users?: AuthenticatedUser[];
      auditLogs?: AuditLogItem[];
    };
    if (!res.ok) {
      setFeedback({
        type: 'error',
        text: data.error || 'Failed to revoke sessions.',
      });
      return;
    }
    if (data.users) setUsers(data.users);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    setFeedback({
      type: 'success',
      text: `Revoked ${data.revokedCount ?? 0} active session(s) for ${target.email}.`,
    });
  };

  const handleGenerateResetToken = async (target: AuthenticatedUser) => {
    setFeedback(null);
    const res = await authFetch(
      `/api/admin/users/${target.id}/generate-reset-token`,
      {
        method: 'POST',
      }
    );
    const data = (await res.json()) as {
      error?: string;
      singleUseResetToken?: string;
      expiresAt?: string;
      auditLogs?: AuditLogItem[];
    };
    if (!res.ok || !data.singleUseResetToken) {
      setFeedback({
        type: 'error',
        text: data.error || 'Could not issue reset token.',
      });
      return;
    }
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    setIssuedTokenInfo({
      email: target.email,
      token: data.singleUseResetToken,
      expiresAt: data.expiresAt || '',
    });
  };

  const handleRun12SecurityTests = async () => {
    setRunningSelfTests(true);
    setFeedback(null);
    try {
      const res = await authFetch('/api/security/run-self-test', {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          executedAt: string;
          totalTests: number;
          passedTests: number;
          results: SecuritySelfTestResultItem[];
        };
        setSelfTestResults(data);
        fetchAdminDirectory();
      }
    } finally {
      setRunningSelfTests(false);
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3 shadow-sm">
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h1 className="text-lg font-semibold text-slate-900">
            HTTP 403 Forbidden — Administrator Privileges Required
          </h1>
          <p className="text-sm text-slate-600">
            Your account ({currentUser.email}) is authenticated with role{' '}
            <code className="font-mono font-semibold text-slate-900">user</code>
            . Only administrators can view the user allowlist or manage accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      {/* Top Banner + 1-Click 12-Scenario Security Verification Suite */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-slate-900">
              Administrator Allowlist &amp; Database Access Control Center
            </h1>
          </div>
          <p className="text-sm text-slate-600">
            Manage invitation-only user accounts, revoke active server sessions,
            issue single-use password reset tokens, and verify all 12 security
            scenarios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAdminDirectory}
            disabled={loading}
            className="px-3.5 py-2 text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleRun12SecurityTests}
            disabled={runningSelfTests}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {runningSelfTests
                ? 'Running 12-Scenario Security Audit...'
                : 'Run 12-Scenario Security Verification Suite'}
            </span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {issuedTokenInfo && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-700" />
              Single-Use Password Reset Token Issued for {issuedTokenInfo.email}
            </span>
            <button
              type="button"
              onClick={() => setIssuedTokenInfo(null)}
              className="text-xs text-amber-800 underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-amber-800">
            Only the SHA-256 hash is stored in the database. Copy this single-use
            token now (expires at {issuedTokenInfo.expiresAt.slice(11, 19)}{' '}
            UTC):
          </p>
          <div className="p-2.5 bg-white border border-amber-300 rounded-lg font-mono text-xs text-slate-900 select-all">
            {issuedTokenInfo.token}
          </div>
        </div>
      )}

      {/* 12-Scenario Live Security Test Suite Output */}
      {selfTestResults && (
        <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>
                12-Scenario Live Server &amp; Database Security Audit Passed (
                {selfTestResults.passedTests}/{selfTestResults.totalTests})
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Executed at {selfTestResults.executedAt}
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3.5 font-semibold">
                    Security Test Scenario
                  </th>
                  <th className="py-2.5 px-3.5 font-semibold">
                    Expected Policy
                  </th>
                  <th className="py-2.5 px-3.5 font-semibold">HTTP Status</th>
                  <th className="py-2.5 px-3.5 font-semibold">
                    Verified Server Enforcement
                  </th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">
                    Verdict
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {selfTestResults.results.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                      {item.scenario}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600">
                      {item.expectedOutcome}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-blue-700">
                      HTTP {item.actualStatus}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600">
                      {item.actualDetail}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                          item.passed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.passed ? 'VERIFIED' : 'FAILED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: Add Allowlisted User + Registered Allowlist Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Add New Allowlisted User Form (4 cols) */}
        <form
          onSubmit={handleCreateAllowlistedUser}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 self-start"
        >
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Add Allowlisted User
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Public signup is disabled. Only accounts registered here by an
            administrator can authenticate.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Normalized Email Address
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="engineer@company.com"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Initial Password (min 8 chars, hashed via scrypt)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Initial strong password"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Access Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
            >
              <option value="user">
                user (Standard Engineer — Row-Level Isolated)
              </option>
              <option value="admin">
                admin (Full Administrator &amp; User Governance)
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-xs cursor-pointer"
          >
            Register &amp; Approve User
          </button>
        </form>

        {/* Right: Registered Allowlist Users Table (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Approved Database Allowlist ({users.length} Users)
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Table: users (password_hash redacted)
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-3.5 font-semibold">Email</th>
                  <th className="py-3 px-3.5 font-semibold">Role</th>
                  <th className="py-3 px-3.5 font-semibold">Status</th>
                  <th className="py-3 px-3.5 font-semibold">Active Sessions</th>
                  <th className="py-3 px-3.5 font-semibold">Last Login</th>
                  <th className="py-3 px-3.5 font-semibold text-right">
                    Admin Controls
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3.5 font-mono text-slate-900 font-medium">
                        <div>{u.email}</div>
                        {isSelf && (
                          <span className="text-[11px] text-blue-600 font-sans">
                            (Current Session)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <select
                          disabled={isSelf}
                          value={u.role}
                          onChange={(e) =>
                            handleChangeUserRole(
                              u,
                              e.target.value as UserRole
                            )
                          }
                          className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono text-slate-900 disabled:opacity-60"
                        >
                          <option value="admin">admin</option>
                          <option value="user">user</option>
                        </select>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold border ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {u.isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                        {u.lockedUntil && (
                          <div className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Temp Lockout</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-slate-700">
                        {u.activeSessionCount ?? 0}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-slate-500">
                        {u.lastLogin
                          ? `${u.lastLogin.slice(0, 19).replace('T', ' ')}Z`
                          : 'Never'}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleUserActive(u)}
                            className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-300 rounded-md inline-flex items-center gap-1 cursor-pointer"
                          >
                            {u.isActive ? (
                              <>
                                <Lock className="w-3 h-3 text-rose-600" />
                                <span>Disable</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 text-emerald-600" />
                                <span>Enable</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGenerateResetToken(u)}
                            className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md cursor-pointer"
                          >
                            Issue Reset Token
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRevokeUserSessions(u)}
                            className="px-2.5 py-1 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md inline-flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Revoke Sessions</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Security & Login Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Immutable Security &amp; Login Activity Audit Log ({auditLogs.length}{' '}
            Recent Events)
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Table: login_audit_logs
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                <th className="py-2.5 px-3.5 font-semibold">Timestamp (UTC)</th>
                <th className="py-2.5 px-3.5 font-semibold">Event Type</th>
                <th className="py-2.5 px-3.5 font-semibold">Email Attempted</th>
                <th className="py-2.5 px-3.5 font-semibold">Client IP</th>
                <th className="py-2.5 px-3.5 font-semibold">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-mono">
              {auditLogs.map((log) => {
                const isAlert =
                  log.eventType.includes('FAILED') ||
                  log.eventType.includes('BLOCKED') ||
                  log.eventType.includes('REJECTED');
                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3.5 text-slate-500 tabular-nums">
                      {log.timestamp.slice(0, 19).replace('T', ' ')}Z
                    </td>
                    <td className="py-2 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          isAlert
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {log.eventType}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 text-slate-900">
                      {log.emailAttempted}
                    </td>
                    <td className="py-2 px-3.5 text-slate-500 tabular-nums">
                      {log.ipAddress}
                    </td>
                    <td className="py-2 px-3.5 font-sans text-slate-600">
                      {log.details}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
