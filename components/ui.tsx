import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-kb-line pb-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description ? <p className="text-sm text-kb-muted">{description}</p> : null}
      </div>
      {actions ? <div className="no-print flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  flush,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="kb-card mb-4 overflow-hidden">
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-kb-line bg-kb-raised px-3 py-2">
          <h2 className="text-sm font-semibold">
            {title}
            {description ? <span className="ml-2 font-normal text-kb-muted">{description}</span> : null}
          </h2>
          {actions}
        </div>
      ) : null}
      <div className={flush ? "" : "p-3"}>{children}</div>
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  OK: "text-kb-ok",
  BAIXO: "text-kb-warn",
  ZERADO: "text-kb-danger",
};

const STATUS_LABEL: Record<string, string> = {
  OK: "OK",
  BAIXO: "Baixo",
  ZERADO: "Zerado",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold ${STATUS_STYLE[status] ?? ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-sm ${
        kind === "error"
          ? "border-kb-error-line bg-kb-error-bg text-kb-danger"
          : "border-kb-ok-line bg-kb-ok-bg text-kb-ok"
      }`}
    >
      {children}
    </p>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-kb-muted">
        {children}
      </td>
    </tr>
  );
}
