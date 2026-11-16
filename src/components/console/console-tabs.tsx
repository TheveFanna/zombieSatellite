'use client';

import type { KeyboardEvent, ReactNode } from 'react';

export interface ConsoleTab {
  readonly id: string;
  readonly label: string;
}

export interface ConsoleTabsProps {
  readonly tabs: ReadonlyArray<ConsoleTab>;
  readonly selected: string;
  readonly onSelect: (id: string) => void;
  /** Content of the selected tab. */
  readonly children: ReactNode;
  /** Prefix that keeps element ids unique when several tab lists exist. */
  readonly idPrefix?: string;
}

export function ConsoleTabs({ tabs, selected, onSelect, children, idPrefix = 'ctab' }: ConsoleTabsProps) {
  const tabId = (id: string) => `${idPrefix}-tab-${id}`;
  const panelId = (id: string) => `${idPrefix}-panel-${id}`;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onSelect(tabs[next].id);
    document.getElementById(tabId(tabs[next].id))?.focus();
  }

  return (
    <div className="tabs">
      <div role="tablist" className="tabsList">
        {tabs.map((tab, index) => {
          const isSelected = tab.id === selected;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              className="tabsTab"
              aria-selected={isSelected}
              aria-controls={panelId(tab.id)}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="tabsPanel" id={panelId(selected)} aria-labelledby={tabId(selected)}>
        {children}
      </div>
    </div>
  );
}
