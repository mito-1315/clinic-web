import { useState, type FormEvent } from "react";
import { api, errMsg, useApi } from "../api";
import { ErrorBox, Loading, PageTitle, Sheet } from "./ui";

export type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "bool" | "datetime" | "url";
  nullable?: boolean;
  hint?: string;
};

export type ManagerConfig = {
  title: string;
  endpoint: string;
  fields: Field[];
  itemTitle: (r: any) => string;
  itemSub: (r: any) => string;
  defaults: Record<string, any>;
};

const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** One list + add/edit/delete screen driven by a field config. Used for services, doctors and announcements. */
export function ContentManager({ title, endpoint, fields, itemTitle, itemSub, defaults }: ManagerConfig) {
  const { data, error, loading, reload } = useApi<any[]>(endpoint);
  const [editing, setEditing] = useState<any | "new" | null>(null);

  return (
    <>
      <PageTitle action={<button className="btn btn-primary" onClick={() => setEditing("new")}>+ Add</button>}>{title}</PageTitle>
      {loading && !data ? <Loading /> : error ? <ErrorBox msg={error} retry={reload} /> : (
        <ul className="space-y-2">
          {data!.length === 0 && <li className="card text-center text-stone-500">Nothing here yet.</li>}
          {data!.map((r) => (
            <li key={r.id}>
              <button className="card flex w-full items-center justify-between gap-3 text-left hover:border-brand-500" onClick={() => setEditing(r)}>
                <span>
                  <span className="block font-semibold">{itemTitle(r)}</span>
                  <span className="text-sm text-stone-600">{itemSub(r)}</span>
                </span>
                {!r.isActive && <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">Hidden</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <Editor title={title} endpoint={endpoint} fields={fields} defaults={defaults} row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />
      )}
    </>
  );
}

function Editor({ title, endpoint, fields, defaults, row, onClose, onDone }: {
  title: string; endpoint: string; fields: Field[]; defaults: Record<string, any>; row: any | null; onClose: () => void; onDone: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() => {
    const src = row ?? defaults;
    return Object.fromEntries(fields.map((f) => [f.key, f.type === "datetime" ? toLocalInput(src[f.key]) : (src[f.key] ?? (f.type === "bool" ? true : ""))]));
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, any> = {};
    for (const f of fields) {
      const v = form[f.key];
      if (f.type === "bool") body[f.key] = !!v;
      else if (v === "" || v == null) { if (f.nullable) body[f.key] = null; }
      else if (f.type === "number") body[f.key] = Number(v);
      else if (f.type === "datetime") body[f.key] = new Date(v).toISOString();
      else body[f.key] = v;
    }
    setBusy(true); setErr("");
    try {
      await api(row ? `${endpoint}/${row.id}` : endpoint, { method: row ? "PUT" : "POST", body });
      onDone();
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }

  async function remove() {
    if (!confirm("Delete this item permanently?")) return;
    setBusy(true);
    try { await api(`${endpoint}/${row.id}`, { method: "DELETE" }); onDone(); }
    catch (x) { setErr(errMsg(x)); setBusy(false); }
  }

  return (
    <Sheet title={`${row ? "Edit" : "Add"} · ${title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            {f.type === "bool" ? (
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="size-5 accent-brand-600" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
                <span className="text-sm font-medium">{f.label}</span>
              </label>
            ) : (
              <>
                <label className="label" htmlFor={f.key}>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea id={f.key} className="input" rows={4} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <input id={f.key} className="input" value={form[f.key]}
                    type={f.type === "datetime" ? "datetime-local" : f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                    inputMode={f.type === "number" ? "numeric" : undefined}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
                {f.hint && <p className="mt-1 text-xs text-stone-500">{f.hint}</p>}
              </>
            )}
          </div>
        ))}
        {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
        <div className="flex gap-2">
          {row && <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>Delete</button>}
          <button className="btn btn-primary flex-1" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Sheet>
  );
}
