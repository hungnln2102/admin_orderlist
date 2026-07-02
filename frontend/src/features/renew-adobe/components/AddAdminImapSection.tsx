import type { MailBackupMailboxOption } from "../api/renewAdobeApi";

function formatMailboxOptionLine(mailbox: MailBackupMailboxOption): string {
  const aliasPrefix = mailbox.alias_prefix?.trim();
  if (aliasPrefix) return `${aliasPrefix} — ${mailbox.email}`;
  return mailbox.email + (mailbox.note ? ` — ${mailbox.note}` : "");
}

type AddAdminImapSectionProps = {
  inputClass: string;
  selectClass: string;
  loading: boolean;
  quickAddLoading: boolean;
  mbLoading: boolean;
  quickAddError: string | null;
  mbLoadError: string | null;
  mailboxes: MailBackupMailboxOption[];
  mailBackupId: string;
  newAliasPrefix: string;
  onNewAliasPrefixChange: (value: string) => void;
  onQuickAddMailbox: () => void;
  onMailBackupIdChange: (value: string) => void;
};

export function AddAdminImapSection({
  inputClass,
  selectClass,
  loading,
  quickAddLoading,
  mbLoading,
  quickAddError,
  mbLoadError,
  mailboxes,
  mailBackupId,
  newAliasPrefix,
  onNewAliasPrefixChange,
  onQuickAddMailbox,
  onMailBackupIdChange,
}: AddAdminImapSectionProps) {
  return (
    <>
      <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3 space-y-2">
        <p className="text-xs font-medium text-emerald-200/90">
          Thêm Alias IMAP (chỉ alias_prefix)
        </p>
        <p className="text-[11px] text-white/45 leading-relaxed">
          Nguồn IMAP bắt buộc phải chọn Alias. Nếu chưa có, tạo nhanh bằng
          <code className="text-white/55"> alias_prefix</code> ở đây.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            className={`${inputClass} flex-1`}
            placeholder="vd. kelvindevil210299+acc4"
            value={newAliasPrefix}
            onChange={(event) => onNewAliasPrefixChange(event.target.value)}
            disabled={loading || quickAddLoading || mbLoading}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onQuickAddMailbox}
            disabled={
              loading || quickAddLoading || mbLoading || !newAliasPrefix.trim()
            }
            className="rounded-xl bg-emerald-500/25 text-emerald-200 border border-emerald-400/35 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500/35 disabled:opacity-50 whitespace-nowrap"
          >
            {quickAddLoading ? "Đang tạo…" : "Tạo & chọn"}
          </button>
        </div>
        {quickAddError && (
          <p className="text-xs text-amber-400/90">{quickAddError}</p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="add-admin-mail-backup"
          className="text-xs font-medium text-white/60"
        >
          Alias IMAP (mail dự phòng)
        </label>
        {mbLoading ? (
          <p className="text-xs text-white/45 py-2">
            Đang tải danh sách hộp thư…
          </p>
        ) : mbLoadError ? (
          <p className="text-xs text-amber-400/90 py-1">{mbLoadError}</p>
        ) : mailboxes.length === 0 ? (
          <p className="text-xs text-white/45 py-1">
            Chưa có Alias IMAP khả dụng. Hãy tạo mới bằng ô phía trên.
          </p>
        ) : (
          <select
            id="add-admin-mail-backup"
            className={selectClass}
            value={mailBackupId}
            onChange={(event) => onMailBackupIdChange(event.target.value)}
            disabled={loading}
            required={mailboxes.length > 0}
          >
            <option value="">— Chọn Alias IMAP —</option>
            {mailboxes.map((mailbox) => (
              <option key={mailbox.id} value={String(mailbox.id)}>
                {formatMailboxOptionLine(mailbox)}
              </option>
            ))}
          </select>
        )}
        {!mbLoading && !mbLoadError && mailboxes.length > 0 && (
          <p className="text-[11px] text-white/40">
            Hiển thị theo cột alias_prefix trong database; email IMAP
            thường giống dòng mẫu.
          </p>
        )}
      </div>
    </>
  );
}
