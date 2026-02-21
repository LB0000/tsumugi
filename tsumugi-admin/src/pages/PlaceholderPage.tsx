import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import {
  Database, Activity, Bell, Download, Trash2, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Info,
} from 'lucide-react';
import {
  listBackups, createBackup, deleteBackup,
  getAlerts, markAllAlertsRead, deleteAlert as deleteAlertApi,
  getApiStats, runHealthCheck,
  type BackupItem, type AlertItem, type ServiceStats, type HealthCheckResult,
} from '../api/settings';

type Tab = 'backups' | 'api-health' | 'alerts';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('backups');

  return (
    <div>
      <Header title="設定" />
      <div className="p-6 space-y-6">
        <div className="flex gap-2 border-b border-border">
          {([
            { key: 'backups' as Tab, icon: Database, label: 'バックアップ' },
            { key: 'api-health' as Tab, icon: Activity, label: 'APIヘルス' },
            { key: 'alerts' as Tab, icon: Bell, label: 'アラート' },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors -mb-px ${
                activeTab === key
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-text-secondary hover:text-text'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'backups' && <BackupsTab />}
        {activeTab === 'api-health' && <ApiHealthTab />}
        {activeTab === 'alerts' && <AlertsTab />}
      </div>
    </div>
  );
}

// ============ Backups Tab ============

function BackupsTab() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listBackups();
      setBackups(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createBackup();
      await fetchBackups();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`${filename} を削除しますか？`)) return;
    await deleteBackup(filename);
    await fetchBackups();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">データベースバックアップ</h3>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
        >
          <Download size={16} />
          {creating ? '作成中...' : '今すぐバックアップ'}
        </button>
      </div>

      <p className="text-sm text-text-secondary">毎日4:00 AM (JST) に自動バックアップ。30日間保持。</p>

      {loading ? (
        <div className="text-text-secondary text-sm">読み込み中...</div>
      ) : backups.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-text-secondary">
          バックアップがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ファイル名</th>
                <th className="text-left px-4 py-3 font-medium">サイズ</th>
                <th className="text-left px-4 py-3 font-medium">作成日時</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.filename} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{b.filename}</td>
                  <td className="px-4 py-3">{formatSize(b.size)}</td>
                  <td className="px-4 py-3">{new Date(b.createdAt).toLocaleString('ja-JP')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(b.filename)}
                      className="text-text-secondary hover:text-danger transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ API Health Tab ============

function ApiHealthTab() {
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const s = await getApiStats();
      setStats(s);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleHealthCheck = async () => {
    setChecking(true);
    try {
      const results = await runHealthCheck();
      setHealthResults(results);
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  const SERVICE_LABELS: Record<string, string> = {
    gemini: 'Gemini AI',
    square: 'Square 決済',
    tsumugi: 'TSUMUGI 本体',
    resend: 'Resend メール',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">外部API接続状況</h3>
        <button
          onClick={handleHealthCheck}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
          {checking ? 'チェック中...' : 'ヘルスチェック実行'}
        </button>
      </div>

      {healthResults.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {healthResults.map((r) => (
            <div key={r.service} className={`rounded-xl border p-4 ${
              !r.configured ? 'border-border bg-surface-secondary' :
              r.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {!r.configured ? (
                  <Info size={16} className="text-text-secondary" />
                ) : r.available ? (
                  <CheckCircle2 size={16} className="text-success" />
                ) : (
                  <XCircle size={16} className="text-danger" />
                )}
                <span className="font-medium text-sm">{SERVICE_LABELS[r.service] ?? r.service}</span>
              </div>
              <p className="text-xs text-text-secondary">
                {!r.configured ? '未設定（モック動作）' :
                 r.available ? `正常 ${r.latencyMs ? `(${r.latencyMs}ms)` : ''}` :
                 r.error ?? '接続エラー'}
              </p>
            </div>
          ))}
        </div>
      )}

      <h4 className="font-medium text-sm text-text-secondary">過去24時間のAPI利用状況</h4>

      {loading ? (
        <div className="text-text-secondary text-sm">読み込み中...</div>
      ) : stats.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-text-secondary">
          API利用記録がありません
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.service} className="bg-white rounded-xl border border-border p-4">
              <div className="font-medium text-sm mb-2">{SERVICE_LABELS[s.service] ?? s.service}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-secondary">呼び出し数</span>
                  <p className="font-medium">{s.totalCalls}</p>
                </div>
                <div>
                  <span className="text-text-secondary">成功率</span>
                  <p className={`font-medium ${s.successRate >= 95 ? 'text-success' : s.successRate >= 80 ? 'text-warning' : 'text-danger'}`}>
                    {s.successRate}%
                  </p>
                </div>
                <div>
                  <span className="text-text-secondary">エラー数</span>
                  <p className={`font-medium ${s.errorCount > 0 ? 'text-danger' : ''}`}>{s.errorCount}</p>
                </div>
                <div>
                  <span className="text-text-secondary">平均応答</span>
                  <p className="font-medium">{s.avgResponseTimeMs ? `${s.avgResponseTimeMs}ms` : '-'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Alerts Tab ============

function AlertsTab() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAlerts();
      setAlerts(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleMarkAllRead = async () => {
    await markAllAlertsRead();
    await fetchAlerts();
  };

  const handleDelete = async (id: string) => {
    await deleteAlertApi(id);
    await fetchAlerts();
  };

  const severityConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
    info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
    warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-amber-50' },
    critical: { icon: XCircle, color: 'text-danger', bg: 'bg-red-50' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">アラート履歴</h3>
        {alerts.some((a) => !a.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-primary hover:underline"
          >
            全て既読にする
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-text-secondary text-sm">読み込み中...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-text-secondary">
          アラートはありません
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity] ?? severityConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border border-border p-4 flex gap-3 ${
                  alert.isRead ? 'bg-white' : config.bg
                }`}
              >
                <Icon size={18} className={`mt-0.5 shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${!alert.isRead ? '' : 'text-text-secondary'}`}>
                      {alert.title}
                    </span>
                    {!alert.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{alert.message}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {new Date(alert.createdAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="text-text-secondary hover:text-danger shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
