/* eslint-disable @next/next/no-img-element */

import type { ChangeEvent } from "react";

import type {
  ChoiceOption,
  ChoiceZone,
  DragItem,
  DropZone,
  QuestionManifest,
  Rect,
  TokenZone,
} from "@/lib/exam-types";
import type { DragAssignments } from "@/lib/interaction";
import { formatPageAlt, type Locale } from "@/lib/i18n";
import { getEffectivePageCrop, getPageCrop } from "@/lib/page-crops";
import {
  isNumericChoiceZone,
  moveCaretToEnd,
  type ChoiceMark,
  type ChoiceMarkKind,
  type ChoiceZoneValues,
  type ValidationStatus,
} from "@/components/exam/question-workspace-shared";
import styles from "@/components/exam/question-workspace.module.css";

type DragOverlayViewerProps = {
  promptPages: string[];
  locale: Locale;
  isEnglish: boolean;
  dropZonesByPage: Record<number, DropZone[]>;
  tokenZonesByPage: Record<number, TokenZone[]>;
  requiredDragBottomByPage: Record<number, number>;
  requiredTopByPage: Record<number, number>;
  mapRectForPage: (rect: Rect, pagePath: string, requiredBottom?: number) => Rect;
  getAutoRectForZone: (zoneIndex: number, total: number) => Rect;
  draggableItemsById: Map<string, DragItem>;
  assignedItemIds: Set<string>;
  allowItemReuse: boolean;
  activeItemId: string | null;
  setActiveItemId: (itemId: string | null) => void;
  assignments: DragAssignments;
  zoneStatus: Record<string, ValidationStatus>;
  placeItem: (zoneId: string, itemId: string, sourceZoneId?: string) => void;
  clearZoneAssignment: (zoneId: string) => void;
};

export function DragOverlayViewer({
  promptPages,
  locale,
  isEnglish,
  dropZonesByPage,
  tokenZonesByPage,
  requiredDragBottomByPage,
  requiredTopByPage,
  mapRectForPage,
  getAutoRectForZone,
  draggableItemsById,
  assignedItemIds,
  allowItemReuse,
  activeItemId,
  setActiveItemId,
  assignments,
  zoneStatus,
  placeItem,
  clearZoneAssignment,
}: DragOverlayViewerProps) {
  return (
    <div className={styles.overlayStack}>
      {promptPages.map((page, pageIndex) => {
        const zonesOnPage = dropZonesByPage[pageIndex] ?? [];
        const tokenZonesOnPage = tokenZonesByPage[pageIndex] ?? [];
        const requiredBottom = requiredDragBottomByPage[pageIndex] ?? 0;
        const effectiveCrop = getEffectivePageCrop(
          page,
          requiredTopByPage[pageIndex] ?? 1,
          requiredBottom
        );
        const crop = getPageCrop(page);

        return (
          <figure key={`${page}-${pageIndex}`} className={styles.overlayFigure}>
            <div
              className={styles.cropFrame}
              style={{
                aspectRatio: `${crop.width} / ${crop.height * (effectiveCrop.bottom - effectiveCrop.top)}`,
              }}
            >
              <img
                src={page}
                alt={formatPageAlt(pageIndex, locale)}
                className={styles.overlayImage}
                style={{
                  transform:
                    effectiveCrop.top > 0
                      ? `translateY(-${effectiveCrop.top * 100}%)`
                      : undefined,
                }}
                loading={pageIndex === 0 ? "eager" : "lazy"}
              />
              <div className={styles.overlayLayer}>
                {tokenZonesOnPage.map((zone) => {
                  const mappedRect = mapRectForPage(zone.rect, page, requiredBottom);
                  const item = draggableItemsById.get(zone.itemId);
                  if (!item) return null;

                  const used = assignedItemIds.has(item.id);
                  if (!allowItemReuse && used) {
                    return null;
                  }

                  return (
                    <button
                      key={zone.id}
                      className={`${styles.inCanvasToken} ${
                        activeItemId === item.id ? styles.inCanvasTokenActive : ""
                      } ${used ? styles.inCanvasTokenUsed : ""}`}
                      style={{
                        left: `${mappedRect.x * 100}%`,
                        top: `${mappedRect.y * 100}%`,
                        width: `${mappedRect.w * 100}%`,
                        minHeight: `${mappedRect.h * 100}%`,
                      }}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", item.id);
                      }}
                      onClick={() => setActiveItemId(item.id)}
                      title={item.label}
                      aria-label={`${isEnglish ? "Tile" : "Brikke"} ${item.label}`}
                    >
                      <span className={styles.inCanvasTokenText}>{item.label}</span>
                    </button>
                  );
                })}
                {zonesOnPage.map((zone, zoneIndex) => {
                  const rect = zone.rect ?? getAutoRectForZone(zoneIndex, zonesOnPage.length);
                  const mappedRect = mapRectForPage(rect, page, requiredBottom);
                  const itemId = assignments[zone.id];
                  const itemLabel = itemId ? draggableItemsById.get(itemId)?.label : undefined;
                  const status = zoneStatus[zone.id];
                  const statusClass =
                    status === "correct"
                      ? styles.overlayZoneCorrect
                      : status === "wrong"
                        ? styles.overlayZoneWrong
                        : status === "empty"
                          ? styles.overlayZoneEmpty
                          : "";

                  return (
                    <div
                      key={zone.id}
                      className={`${styles.overlayZone} ${statusClass}`}
                      style={{
                        left: `${mappedRect.x * 100}%`,
                        top: `${mappedRect.y * 100}%`,
                        width: `${mappedRect.w * 100}%`,
                        height: `${mappedRect.h * 100}%`,
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const item = event.dataTransfer.getData("text/plain");
                        const sourceZoneId = event.dataTransfer.getData("application/x-source-zone");
                        if (item) {
                          placeItem(zone.id, item, sourceZoneId || undefined);
                          setActiveItemId(null);
                        }
                      }}
                      onClick={() => {
                        if (activeItemId) {
                          placeItem(zone.id, activeItemId);
                          setActiveItemId(null);
                        }
                      }}
                      onDoubleClick={() => {
                        if (itemId) {
                          clearZoneAssignment(zone.id);
                        }
                      }}
                      draggable={Boolean(itemId)}
                      onDragStart={(event) => {
                        if (!itemId) return;
                        event.dataTransfer.setData("text/plain", itemId);
                        event.dataTransfer.setData("application/x-source-zone", zone.id);
                        event.dataTransfer.effectAllowed = allowItemReuse ? "copyMove" : "move";
                      }}
                      title={itemLabel ?? undefined}
                    >
                      {itemLabel ? (
                        <>
                          <span className={styles.overlayText} title={itemLabel}>
                            {itemLabel}
                          </span>
                          <button
                            className={styles.overlayClear}
                            onClick={(event) => {
                              event.stopPropagation();
                              clearZoneAssignment(zone.id);
                            }}
                            aria-label={`${isEnglish ? "Remove tile from" : "Fjern brikke fra"} ${zone.label}`}
                          >
                            ×
                          </button>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </figure>
        );
      })}
    </div>
  );
}

type ChoiceOverlayViewerProps = {
  promptPages: string[];
  locale: Locale;
  isEnglish: boolean;
  hasPresetChoiceZones: boolean;
  choiceZonesByPage: Record<number, ChoiceZone[]>;
  requiredChoiceBottomByPage: Record<number, number>;
  requiredTopByPage: Record<number, number>;
  mapRectForPage: (rect: Rect, pagePath: string, requiredBottom?: number) => Rect;
  choiceZoneStatus: Record<string, ValidationStatus>;
  choiceZoneValues: ChoiceZoneValues;
  updateChoiceZoneText: (zoneId: string, value: string) => void;
  toggleChoiceZoneCircle: (zoneId: string, group?: string) => void;
  choiceMarksByPage: Record<number, ChoiceMark[]>;
  choiceTool: "none" | "text" | "circle";
  addChoiceMarkAt: (pageIndex: number, x: number, y: number) => void;
  updateChoiceMarkText: (id: string, text: string) => void;
  removeChoiceMark: (id: string) => void;
  toggleChoiceCircle: (id: string) => void;
};

export function ChoiceOverlayViewer({
  promptPages,
  locale,
  isEnglish,
  hasPresetChoiceZones,
  choiceZonesByPage,
  requiredChoiceBottomByPage,
  requiredTopByPage,
  mapRectForPage,
  choiceZoneStatus,
  choiceZoneValues,
  updateChoiceZoneText,
  toggleChoiceZoneCircle,
  choiceMarksByPage,
  choiceTool,
  addChoiceMarkAt,
  updateChoiceMarkText,
  removeChoiceMark,
  toggleChoiceCircle,
}: ChoiceOverlayViewerProps) {
  if (hasPresetChoiceZones) {
    return (
      <div className={styles.overlayStack}>
        {promptPages.map((page, pageIndex) => {
          const zonesOnPage = choiceZonesByPage[pageIndex] ?? [];
          const requiredBottom = requiredChoiceBottomByPage[pageIndex] ?? 0;
          const effectiveCrop = getEffectivePageCrop(
            page,
            requiredTopByPage[pageIndex] ?? 1,
            requiredBottom
          );
          const crop = getPageCrop(page);

          return (
            <figure key={`${page}-${pageIndex}`} className={styles.overlayFigure}>
              <div
                className={styles.cropFrame}
                style={{
                  aspectRatio: `${crop.width} / ${crop.height * (effectiveCrop.bottom - effectiveCrop.top)}`,
                }}
              >
                <img
                  src={page}
                  alt={formatPageAlt(pageIndex, locale)}
                  className={styles.overlayImage}
                  style={{
                    transform:
                      effectiveCrop.top > 0
                        ? `translateY(-${effectiveCrop.top * 100}%)`
                        : undefined,
                  }}
                  loading={pageIndex === 0 ? "eager" : "lazy"}
                />
                <div className={`${styles.overlayLayer} ${styles.choiceOverlayLayer}`}>
                  {zonesOnPage.map((zone) => {
                    const mappedRect = mapRectForPage(zone.rect, page, requiredBottom);
                    const status = choiceZoneStatus[zone.id];

                    return (
                      <div
                        key={zone.id}
                        className={styles.choiceZone}
                        style={{
                          left: `${mappedRect.x * 100}%`,
                          top: `${mappedRect.y * 100}%`,
                          width: `${mappedRect.w * 100}%`,
                          height: `${mappedRect.h * 100}%`,
                        }}
                      >
                        {zone.kind === "text" ? (
                          <input
                            type="text"
                            className={`${styles.choiceZoneInput} ${
                              typeof choiceZoneValues[zone.id] === "string" &&
                              (choiceZoneValues[zone.id] as string).trim().length > 2
                                ? styles.choiceZoneInputLongValue
                                : ""
                            } ${
                              status === "correct"
                                ? styles.choiceZoneInputCorrect
                                : status === "wrong"
                                  ? styles.choiceZoneInputWrong
                                  : status === "empty"
                                    ? styles.choiceZoneInputEmpty
                                    : ""
                            }`}
                            value={(choiceZoneValues[zone.id] as string) ?? ""}
                            placeholder={zone.placeholder ?? ""}
                            onChange={(event) => updateChoiceZoneText(zone.id, event.target.value)}
                            inputMode={isNumericChoiceZone(zone) ? "numeric" : "text"}
                            pattern={isNumericChoiceZone(zone) ? "[0-9-]*" : undefined}
                            autoComplete="off"
                            spellCheck={false}
                            onFocus={(event) => moveCaretToEnd(event.currentTarget)}
                            aria-label={`${isEnglish ? "Answer field" : "Svarfelt"} ${zone.id}`}
                            aria-invalid={status === "wrong"}
                          />
                        ) : (
                          <button
                            type="button"
                            className={
                              zone.kind === "box"
                                ? `${styles.choiceZoneBox} ${
                                    Boolean(choiceZoneValues[zone.id])
                                      ? styles.choiceZoneBoxActive
                                      : ""
                                  } ${
                                    status === "correct"
                                      ? styles.choiceZoneBoxCorrect
                                      : status === "wrong"
                                        ? styles.choiceZoneBoxWrong
                                        : status === "empty"
                                          ? styles.choiceZoneBoxEmpty
                                          : ""
                                  }`
                                : `${styles.choiceZoneCircle} ${
                                    Boolean(choiceZoneValues[zone.id])
                                      ? styles.choiceZoneCircleActive
                                      : ""
                                  } ${
                                    status === "correct"
                                      ? styles.choiceZoneCircleCorrect
                                      : status === "wrong"
                                        ? styles.choiceZoneCircleWrong
                                        : status === "empty"
                                          ? styles.choiceZoneCircleEmpty
                                          : ""
                                  }`
                            }
                            onClick={() => toggleChoiceZoneCircle(zone.id, zone.group)}
                            aria-label={
                              Boolean(choiceZoneValues[zone.id])
                                ? isEnglish
                                  ? "Clear mark"
                                  : "Fjern markering"
                                : isEnglish
                                  ? "Mark"
                                  : "Marker"
                            }
                          >
                            {zone.kind === "box"
                              ? status === "wrong"
                                ? "×"
                                : Boolean(choiceZoneValues[zone.id]) || status === "correct"
                                  ? "✓"
                                  : ""
                              : ""}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </figure>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.overlayStack}>
      {promptPages.map((page, pageIndex) => {
        const marksOnPage = choiceMarksByPage[pageIndex] ?? [];
        const effectiveCrop = getEffectivePageCrop(page, requiredTopByPage[pageIndex] ?? 1, 0);
        const crop = getPageCrop(page);

        return (
          <figure key={`${page}-${pageIndex}`} className={styles.overlayFigure}>
            <div
              className={styles.cropFrame}
              style={{
                aspectRatio: `${crop.width} / ${crop.height * (effectiveCrop.bottom - effectiveCrop.top)}`,
              }}
            >
              <img
                src={page}
                alt={formatPageAlt(pageIndex, locale)}
                className={styles.overlayImage}
                style={{
                  transform:
                    effectiveCrop.top > 0
                      ? `translateY(-${effectiveCrop.top * 100}%)`
                      : undefined,
                }}
                loading={pageIndex === 0 ? "eager" : "lazy"}
              />
              <div
                className={`${styles.overlayLayer} ${styles.choiceOverlayLayer} ${
                  choiceTool !== "none" ? styles.choiceOverlayLayerActiveTool : ""
                }`}
                onClick={(event) => {
                  if (choiceTool === "none") {
                    return;
                  }
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const x = (event.clientX - bounds.left) / bounds.width;
                  const y = (event.clientY - bounds.top) / bounds.height;
                  addChoiceMarkAt(pageIndex, x, y);
                }}
              >
                {marksOnPage.map((mark) => {
                  if (mark.kind === "text") {
                    return (
                      <div
                        key={mark.id}
                        className={styles.choiceMarkText}
                        style={{
                          left: `${mark.x * 100}%`,
                          top: `${mark.y * 100}%`,
                          width: `${mark.w * 100}%`,
                          height: `${mark.h * 100}%`,
                        }}
                      >
                        <input
                          type="text"
                          className={styles.choiceMarkInput}
                          value={mark.text}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateChoiceMarkText(mark.id, event.target.value)}
                          placeholder={isEnglish ? "Type..." : "Skriv..."}
                          aria-label={isEnglish ? "Text field in question" : "Tekstfelt i oppgave"}
                        />
                        <button
                          type="button"
                          className={styles.choiceMarkRemove}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeChoiceMark(mark.id);
                          }}
                          aria-label={isEnglish ? "Remove text field" : "Fjern tekstfelt"}
                        >
                          ×
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={mark.id}
                      className={styles.choiceMarkCircleWrap}
                      style={{
                        left: `${mark.x * 100}%`,
                        top: `${mark.y * 100}%`,
                        width: `${mark.w * 100}%`,
                        height: `${mark.h * 100}%`,
                      }}
                    >
                      <button
                        type="button"
                        className={`${styles.choiceMarkCircle} ${
                          mark.checked ? styles.choiceMarkCircleActive : ""
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleChoiceCircle(mark.id);
                        }}
                        aria-label={
                          mark.checked
                            ? isEnglish
                              ? "Clear mark"
                              : "Fjern markering"
                            : isEnglish
                              ? "Mark circle"
                              : "Marker sirkel"
                        }
                      />
                      <button
                        type="button"
                        className={styles.choiceMarkRemoveMini}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeChoiceMark(mark.id);
                        }}
                        aria-label={isEnglish ? "Remove circle" : "Fjern sirkel"}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </figure>
        );
      })}
    </div>
  );
}

type QuestionInteractionPanelProps = {
  question: QuestionManifest;
  isEnglish: boolean;
  showSolution: boolean;
  hasPresetChoiceZones: boolean;
  hasAutoChoiceZones: boolean;
  choiceZoneValues: ChoiceZoneValues;
  clearChoiceZones: () => void;
  checkChoiceZones: () => void;
  options: ChoiceOption[];
  allowMultiple: boolean;
  selectedChoices: string[];
  onChoiceToggle: (optionId: string) => void;
  hasAutoChoice: boolean;
  checkChoice: () => void;
  resetChoices: () => void;
  choiceTool: ChoiceMarkKind | "none";
  setChoiceTool: (tool: ChoiceMarkKind | "none") => void;
  undoChoiceMark: () => void;
  clearChoiceMarks: () => void;
  choiceMarksCount: number;
  draggableItems: DragItem[];
  dropZones: DropZone[];
  hasInCanvasTokenBank: boolean;
  hasAutoDrag: boolean;
  checkDrag: () => void;
  clearDrag: () => void;
  codeText: string;
  setCodeText: (value: string) => void;
  resetCode: () => void;
};

export function QuestionInteractionPanel({
  question,
  isEnglish,
  showSolution,
  hasPresetChoiceZones,
  hasAutoChoiceZones,
  choiceZoneValues,
  clearChoiceZones,
  checkChoiceZones,
  options,
  allowMultiple,
  selectedChoices,
  onChoiceToggle,
  hasAutoChoice,
  checkChoice,
  resetChoices,
  choiceTool,
  setChoiceTool,
  undoChoiceMark,
  clearChoiceMarks,
  choiceMarksCount,
  draggableItems,
  dropZones,
  hasInCanvasTokenBank,
  hasAutoDrag,
  checkDrag,
  clearDrag,
  codeText,
  setCodeText,
  resetCode,
}: QuestionInteractionPanelProps) {
  if (question.type === "official-only") {
    return (
      <p className={styles.note}>
        {isEnglish ? (
          <>
            This question is shown in its original format. Use <strong>Show answer key</strong> to
            see the answer.
          </>
        ) : (
          <>
            Denne oppgaven vises i originalformat. Bruk <strong>Vis fasit</strong> for svar.
          </>
        )}
      </p>
    );
  }

  if (question.type === "choice-grid") {
    const hasZoneValues = Object.values(choiceZoneValues).some((value) =>
      typeof value === "boolean" ? value : value.trim().length > 0
    );

    if (hasPresetChoiceZones) {
      return (
        <div className={styles.manualBlock}>
          <div className={styles.actions}>
            {hasAutoChoiceZones ? (
              <button type="button" className={styles.primaryButton} onClick={checkChoiceZones}>
                {isEnglish ? "Check answer" : "Sjekk svar"}
              </button>
            ) : null}
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={clearChoiceZones}
              disabled={!hasZoneValues}
            >
              {isEnglish ? "Reset" : "Nullstill"}
            </button>
          </div>
        </div>
      );
    }

    if (options.length > 0) {
      return (
        <div className={styles.manualBlock}>
          <div className={styles.choiceList}>
            {options.map((option) => {
              const checked = selectedChoices.includes(option.id);
              return (
                <label key={option.id} className={styles.choiceRow}>
                  <input
                    type={allowMultiple ? "checkbox" : "radio"}
                    name={`choice-${question.id}`}
                    checked={checked}
                    onChange={() => onChoiceToggle(option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
          <div className={styles.actions}>
            <button className={styles.primaryButton} disabled={!hasAutoChoice} onClick={checkChoice}>
              {isEnglish ? "Check answer" : "Sjekk svar"}
            </button>
            <button className={styles.secondaryButton} onClick={resetChoices}>
              {isEnglish ? "Reset" : "Nullstill"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.manualBlock}>
        <div className={styles.choiceToolRow}>
          <button
            type="button"
            className={`${styles.choiceToolButton} ${
              choiceTool === "text" ? styles.choiceToolButtonActive : ""
            }`}
            onClick={() => setChoiceTool("text")}
          >
            {isEnglish ? "Text box" : "Tekstboks"}
          </button>
          <button
            type="button"
            className={`${styles.choiceToolButton} ${
              choiceTool === "circle" ? styles.choiceToolButtonActive : ""
            }`}
            onClick={() => setChoiceTool("circle")}
          >
            {isEnglish ? "Circle" : "Sirkel"}
          </button>
          <button
            type="button"
            className={`${styles.choiceToolButton} ${
              choiceTool === "none" ? styles.choiceToolButtonActive : ""
            }`}
            onClick={() => setChoiceTool("none")}
          >
            {isEnglish ? "Pointer" : "Peker"}
          </button>
          <button
            type="button"
            className={styles.choiceToolButton}
            onClick={undoChoiceMark}
            disabled={choiceMarksCount === 0}
          >
            {isEnglish ? "Undo" : "Angre"}
          </button>
          <button
            type="button"
            className={styles.choiceToolButton}
            onClick={clearChoiceMarks}
            disabled={choiceMarksCount === 0}
          >
            {isEnglish ? "Reset markings" : "Nullstill markeringer"}
          </button>
        </div>
      </div>
    );
  }

  if (question.type === "drag-drop") {
    if (draggableItems.length === 0 || dropZones.length === 0) {
      return (
        <div className={styles.manualBlock}>
          <p className={styles.note}>
            {isEnglish
              ? "Interactive drag and drop for this question is not fully specified in the manifest yet."
              : "Interaktiv drag/drop for denne oppgaven er ikke spesifisert fullt ut i manifestet ennå."}
          </p>
        </div>
      );
    }

    return (
      <div className={styles.manualBlock}>
        <p className={styles.subtle}>
          {hasInCanvasTokenBank
            ? isEnglish
              ? "The tiles are already inside the question. Click a tile and click a slot, or drag directly."
              : "Brikkene ligger i oppgaven. Klikk en brikke og trykk i feltet, eller dra direkte."
            : isEnglish
              ? "Click a tile and click the slot, or drag it directly into place."
              : "Klikk en brikke og trykk i feltet, eller dra direkte inn i feltet."}
        </p>
        <div className={styles.actions}>
          <button className={styles.primaryButton} disabled={!hasAutoDrag} onClick={checkDrag}>
            {isEnglish ? "Check answer" : "Sjekk svar"}
          </button>
          <button className={styles.secondaryButton} onClick={clearDrag}>
            {isEnglish ? "Reset" : "Nullstill"}
          </button>
        </div>
      </div>
    );
  }

  if (question.type === "code-editor") {
    return (
      <div>
        <textarea
          className={styles.codeArea}
          value={codeText}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setCodeText(event.target.value)}
          spellCheck={false}
        />
        <div className={styles.actions}>
          <button className={styles.secondaryButton} onClick={resetCode}>
            {isEnglish ? "Reset code field" : "Nullstill kodefelt"}
          </button>
        </div>
        {showSolution && question.interaction?.solutionText ? (
          <pre className={styles.solutionText}>{question.interaction.solutionText}</pre>
        ) : null}
      </div>
    );
  }

  return null;
}
