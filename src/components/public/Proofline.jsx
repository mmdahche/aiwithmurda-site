import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatCurrency, formatNumber, totalFollowers } from "../../lib/tracker.js";

function dayState(day, currentDay, record) {
  if (day === currentDay) return "current";
  if (record || day < currentDay) return "complete";
  return "future";
}

export function InteractiveProofline({ logs, latest, totalDays, preview }) {
  const [selectedDay, setSelectedDay] = useState(latest.day);
  const trackRef = useRef(null);
  const reduceMotion = Boolean(useReducedMotion());
  const recordByDay = useMemo(() => new Map(logs.map((record) => [record.day, record])), [logs]);
  const selectedRecord = recordByDay.get(selectedDay);
  const selectedState = dayState(selectedDay, latest.day, selectedRecord);

  useEffect(() => {
    setSelectedDay(latest.day);
  }, [latest.day]);

  useEffect(() => {
    const trackShell = trackRef.current;
    const selectedNode = trackShell?.querySelector(`[data-day="${selectedDay}"]`);
    if (!trackShell || !selectedNode) return;

    const targetLeft = selectedNode.offsetLeft - trackShell.clientWidth / 2 + selectedNode.clientWidth / 2;
    trackShell.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [reduceMotion, selectedDay]);

  const selectedFollowers = selectedRecord ? totalFollowers(selectedRecord) : 0;
  const selectedProof = selectedRecord?.proofAssets?.[0] || selectedRecord?.bestMoment || "Receipt pending";

  return (
    <section className="proofline-section" aria-labelledby="proofline-title">
      <div className="proofline-heading">
        <div>
          <span>{preview ? "Preview transmission" : "Live transmission"}</span>
          <h2 id="proofline-title">The 60-Day Proofline</h2>
        </div>
        <p>
          Scrub the complete public record. Every checkpoint connects the build, the number, the failure,
          and the receipt that proves the work happened.
        </p>
      </div>

      <div className="proofline-broadcast-bar">
        <span>DAY 01</span>
        <div aria-hidden="true">
          <i style={{ width: `${Math.max(1.6, (latest.day / totalDays) * 100)}%` }} />
        </div>
        <span>DAY {String(totalDays).padStart(2, "0")}</span>
      </div>

      <div className="proofline-track-shell" ref={trackRef}>
        <div className="proofline-track" role="group" aria-label="Select a sprint day">
          {Array.from({ length: totalDays }, (_, index) => {
            const day = index + 1;
            const record = recordByDay.get(day);
            const state = dayState(day, latest.day, record);
            return (
              <button
                type="button"
                className={`${state} ${selectedDay === day ? "selected" : ""}`}
                data-day={day}
                key={day}
                onClick={() => setSelectedDay(day)}
                aria-pressed={selectedDay === day}
                aria-label={`Day ${day}: ${state}`}
              >
                <span>{String(day).padStart(2, "0")}</span>
                <i aria-hidden="true" />
                <em>{record ? record.status : state}</em>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          className={`proofline-receipt ${selectedState}`}
          key={selectedDay}
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="proofline-day-lockup">
            <span>{selectedState === "future" ? "Future checkpoint" : "Selected receipt"}</span>
            <strong>{String(selectedDay).padStart(2, "0")}</strong>
            <em>DAY / {String(totalDays).padStart(2, "0")}</em>
          </div>

          <div className="proofline-receipt-story">
            <span>{selectedRecord?.date || "Awaiting transmission"}</span>
            <h3>{selectedRecord?.mainGoal || "This checkpoint unlocks when the work reaches this day."}</h3>
            <p>
              {selectedRecord?.lessonLearned ||
                "Future days stay visible on purpose. The empty space is the public pressure to keep showing up."}
            </p>
            {selectedRecord && (
              <a href={`/day/${selectedDay}`}>
                Open full Day {selectedDay} receipt <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>

          <dl className="proofline-receipt-stats">
            <div>
              <dt>Revenue</dt>
              <dd>{selectedRecord ? formatCurrency(selectedRecord.revenueCollected) : "—"}</dd>
            </div>
            <div>
              <dt>Followers</dt>
              <dd>{selectedRecord ? formatNumber(selectedFollowers) : "—"}</dd>
            </div>
            <div>
              <dt>Builds</dt>
              <dd>{selectedRecord ? formatNumber(selectedRecord.buildsShipped) : "—"}</dd>
            </div>
            <div>
              <dt>Primary proof</dt>
              <dd>{selectedProof}</dd>
            </div>
          </dl>
        </motion.article>
      </AnimatePresence>
    </section>
  );
}
