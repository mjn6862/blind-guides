import { useMemo, useState } from "react";
import type { GameRules } from "@blind-guides/shared";
import {
  buildColorsFromSelection,
  buildDefaultLobbyRules,
  COLOR_PRESETS,
  describeColorRules,
  STANDARD_COLOR_IDS,
  type ColorPresetId,
} from "@blind-guides/shared";

type Props = {
  initialRules?: GameRules;
  onSave: (rules: GameRules) => Promise<void>;
};

export function RuleConfigForm({ initialRules, onSave }: Props) {
  const base = initialRules ?? buildDefaultLobbyRules();

  const [standardColors, setStandardColors] = useState<string[]>(
    base.colors
      .filter((c) => STANDARD_COLOR_IDS.includes(c.id as (typeof STANDARD_COLOR_IDS)[number]))
      .map((c) => c.id),
  );
  const [presetColors, setPresetColors] = useState<ColorPresetId[]>(
    base.colors
      .map((c) => c.id)
      .filter((id) => COLOR_PRESETS.some((p) => p.id === id)) as ColorPresetId[],
  );
  const [presetDisplayColors, setPresetDisplayColors] = useState<
    Partial<Record<ColorPresetId, string>>
  >(() => {
    const map: Partial<Record<ColorPresetId, string>> = {};
    for (const color of base.colors) {
      const preset = COLOR_PRESETS.find((p) => p.id === color.id);
      if (preset) {
        map[preset.id] = color.displayColor;
      }
    }
    return map;
  });
  const [maxPointers, setMaxPointers] = useState(base.maxPointers);
  const [maxStumbles, setMaxStumbles] = useState(base.maxStumbles);
  const [handSize, setHandSize] = useState(base.handSize);
  const [actionsPerTurn, setActionsPerTurn] = useState(base.actionsPerTurn);
  const [openHand, setOpenHand] = useState(base.openHand);
  const [ranked, setRanked] = useState(base.ranked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPresetColors = useMemo(
    () =>
      buildColorsFromSelection(
        [...STANDARD_COLOR_IDS],
        COLOR_PRESETS.map((preset) => preset.id),
      ),
    [],
  );

  const previewRules = useMemo(
    (): GameRules => ({
      maxPointers,
      maxStumbles,
      handSize,
      actionsPerTurn,
      openHand,
      ranked,
      colors: buildColorsFromSelection(
        standardColors,
        presetColors,
        presetDisplayColors,
      ),
    }),
    [
      standardColors,
      presetColors,
      presetDisplayColors,
      maxPointers,
      maxStumbles,
      handSize,
      actionsPerTurn,
      openHand,
      ranked,
    ],
  );

  const toggleStandard = (id: string) => {
    setStandardColors((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const togglePreset = (id: ColorPresetId) => {
    setPresetColors((prev) => {
      if (prev.includes(id)) {
        return prev.filter((c) => c !== id);
      }
      const preset = COLOR_PRESETS.find((p) => p.id === id);
      if (preset && !presetDisplayColors[id]) {
        setPresetDisplayColors((colors) => ({
          ...colors,
          [id]: preset.config.displayColor,
        }));
      }
      return [...prev, id];
    });
  };

  const setPresetColor = (id: ColorPresetId, displayColor: string) => {
    setPresetDisplayColors((prev) => ({ ...prev, [id]: displayColor }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (previewRules.colors.length === 0) {
        throw new Error("Select at least one color");
      }
      await onSave(previewRules);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rules");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rule-config">
      <h3>Colors</h3>
      <fieldset className="rule-fieldset">
        <legend>Standard colors</legend>
        <div className="checkbox-grid">
          {STANDARD_COLOR_IDS.map((id) => (
            <label key={id} className="checkbox-label">
              <input
                type="checkbox"
                checked={standardColors.includes(id)}
                onChange={() => toggleStandard(id)}
              />
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rule-fieldset">
        <legend>Special colors</legend>
        <div className="preset-list">
          {COLOR_PRESETS.map((preset) => {
            const selected = presetColors.includes(preset.id);
            const displayColor =
              presetDisplayColors[preset.id] ?? preset.config.displayColor;
            return (
              <div key={preset.id} className="preset-option-row">
                <label className="preset-option">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => togglePreset(preset.id)}
                  />
                  <span>
                    <strong>{preset.name}</strong>
                    <span className="muted"> — {preset.description}</span>
                  </span>
                </label>
                {selected && (
                  <label className="preset-color-picker">
                    <span className="muted">Display color</span>
                    <input
                      type="color"
                      value={displayColor}
                      onChange={(e) => setPresetColor(preset.id, e.target.value)}
                      aria-label={`Display color for ${preset.name}`}
                    />
                    <span
                      className="preset-color-swatch"
                      style={{ background: displayColor }}
                    />
                  </label>
                )}
                <details className="preset-rules-details">
                  <summary>View full rules</summary>
                  <ul className="rules-list compact">
                    {describeColorRules(
                      { ...preset.config, displayColor },
                      allPresetColors,
                    ).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })}
        </div>
      </fieldset>

      <h3>Game options</h3>
      <div className="rule-options-grid">
        <label>
          Pointers (0-40)
          <input
            type="number"
            min={0}
            max={40}
            value={maxPointers}
            onChange={(e) => setMaxPointers(Number(e.target.value))}
          />
        </label>
        <label>
          Stumble limit (1-20): stumbling this many times results in losing the game
          <input
            type="number"
            min={1}
            max={20}
            value={maxStumbles}
            onChange={(e) => setMaxStumbles(Number(e.target.value))}
          />
        </label>
        <label>
          Hand size (1–20)
          <input
            type="number"
            min={1}
            max={20}
            value={handSize}
            onChange={(e) => setHandSize(Number(e.target.value))}
          />
        </label>
        <label>
          Actions per turn (1–5)
          <input
            type="number"
            min={1}
            max={5}
            value={actionsPerTurn}
            onChange={(e) => setActionsPerTurn(Number(e.target.value))}
          />
        </label>
      </div>

      <label className="checkbox-label block">
        <input
          type="checkbox"
          checked={openHand}
          onChange={(e) => setOpenHand(e.target.checked)}
        />
        Open-hand mode: players can see their own cards. Used only for the purposes of teaching new players the game. Not recommended for actual play.
      </label>

      <label className="checkbox-label block">
        <input
          type="checkbox"
          checked={ranked}
          onChange={(e) => setRanked(e.target.checked)}
        />
        Don't allow "Undo Action" button.
      </label>

      <p className="muted">
        Selected: {previewRules.colors.map((c) => c.displayName).join(", ") || "none"}
      </p>

      <button className="primary" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save rules"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
