import React from 'react';

/**
 * Card — Clean editorial container with subtle border and crisp elevation
 */
export function Card({
  title,
  subtitle,
  icon,
  badge,
  actions,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
}) {
  return (
    <div
      className={`rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden transition-shadow ${className}`}
    >
      {(title || actions || icon || badge) && (
        <div
          className={`flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 ${headerClassName}`}
        >
          <div className="flex items-center gap-3">
            {icon && <span className="text-lg select-none opacity-70">{icon}</span>}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[1.0625rem] font-heading text-slate-900 tracking-tight">{title}</h3>
                {badge}
              </div>
              {subtitle && <p className="text-caption text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

