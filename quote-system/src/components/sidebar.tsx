"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU: { href: string; label: string; section?: string }[] = [
  { href: "/", label: "ダッシュボード" },
  { href: "/projects", label: "案件一覧" },
  { href: "/projects/new", label: "新規見積" },
  { href: "/history", label: "過去見積" },
  { href: "/masters/materials", label: "材料マスタ", section: "マスタ管理" },
  { href: "/masters/processes", label: "加工マスタ" },
  { href: "/masters/purchased", label: "購入部品" },
  { href: "/masters/outsource", label: "外注マスタ" },
  { href: "/settings", label: "設定", section: "システム" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-slate-800 text-slate-100">
      <div className="border-b border-slate-700 px-4 py-4">
        <div className="text-sm font-bold leading-tight">見積管理システム</div>
        <div className="mt-0.5 text-[10px] text-slate-400">
          Quote System MVP
        </div>
      </div>
      <nav className="py-2">
        {MENU.map((item) => (
          <div key={item.href}>
            {item.section && (
              <div className="mt-3 px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {item.section}
              </div>
            )}
            <Link
              href={item.href}
              className={`block px-4 py-2 text-sm ${
                isActive(item.href)
                  ? "border-l-2 border-sky-400 bg-slate-700 font-semibold text-white"
                  : "border-l-2 border-transparent text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          </div>
        ))}
      </nav>
    </aside>
  );
}
