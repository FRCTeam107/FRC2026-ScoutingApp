import { useAutoSync } from '../../hooks/useAutoSync';
import './SyncStatus.css';

export function SyncStatus() {
  const { isOnline, isSyncing, lastSyncTime, syncError, syncNow, hasPendingData } = useAutoSync();

  return (
    <div className="sync-status">
      <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
        <span className="status-dot"></span>
        <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {hasPendingData && (
        <span className="pending-badge">
          Pending sync
        </span>
      )}

      <button
        className="sync-button"
        onClick={syncNow}
        disabled={!isOnline || isSyncing}
      >
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {syncError && (
        <span className="sync-error" title={syncError}>!</span>
      )}

      {lastSyncTime && (
        <span className="last-sync">
          Last: {lastSyncTime.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
