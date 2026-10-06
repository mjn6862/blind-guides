import type { ColorConfig } from "@blind-guides/shared";
import { describeColorRules, getColorPresetLabel } from "@blind-guides/shared";
import type { ReactNode } from "react";

type Props = {
  color: ColorConfig;
  allColors: ColorConfig[];
  children: ReactNode;
};

export function ColorRulesTooltip({ color, allColors, children }: Props) {
  const lines = describeColorRules(color, allColors);
  const presetLabel = getColorPresetLabel(color.id);

  return (
    <div className="color-rules-tooltip-wrap">
      {children}
      <div className="color-rules-tooltip" role="tooltip">
        <div className="color-rules-tooltip-title">
          {color.displayName}
          {presetLabel ? ` (${presetLabel})` : ""}
        </div>
        <ul className="rules-list compact">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
