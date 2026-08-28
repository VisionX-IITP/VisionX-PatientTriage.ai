import { supabase } from "../config/supabase";
import { assessPatient } from "../services/triageService";

type SimMode = "normal" | "surge" | "extreme";

let state = {
  running: false,
  mode: "normal" as SimMode,
  speed: 1,
  interval: null as ReturnType<typeof setTimeout> | null,
  sessionId: null as string | null,
};

const complaints = [
  "Chest pain",
  "Breathing difficulty",
  "Abdominal pain",
  "Fever",
  "Headache",
  "Trauma - fall",
  "Nausea and vomiting",
  "Dizziness",
  "Weakness",
];

const names = () =>
  "SIM-" + Math.floor(1000 + Math.random() * 9000);

function randomVitals(deteriorate = false) {
  if (deteriorate) {
    return {
      heart_rate: 110 + Math.floor(Math.random() * 40),
      systolic_bp: 80 + Math.floor(Math.random() * 20),
      diastolic_bp: 50 + Math.floor(Math.random() * 15),
      spo2: 84 + Math.floor(Math.random() * 8),
      respiratory_rate: 24 + Math.floor(Math.random() * 10),
      temperature: 38.5 + Math.random() * 1.8,
    };
  }

  return {
    heart_rate: 65 + Math.floor(Math.random() * 40),
    systolic_bp: 110 + Math.floor(Math.random() * 30),
    diastolic_bp: 65 + Math.floor(Math.random() * 20),
    spo2: 95 + Math.floor(Math.random() * 5),
    respiratory_rate: 12 + Math.floor(Math.random() * 8),
    temperature: 36.3 + Math.random() * 1.2,
  };
}

async function tick() {
  // Do not start another tick after simulation has been stopped.
  if (!state.running) {
    return;
  }

  try {
    const rate =
      state.mode === "extreme"
        ? 6
        : state.mode === "surge"
          ? 3
          : 1;

    const spawn = Math.random() < rate * 0.35;

    if (spawn) {
      const deteriorate = Math.random() < 0.3;
      const v = randomVitals(deteriorate);

      const {
        data: pt,
        error: patientError,
      } = await supabase
        .from("patients")
        .insert({
          patient_code: names(),
          age: 20 + Math.floor(Math.random() * 70),
          sex: Math.random() < 0.5 ? "M" : "F",
          chief_complaint:
            complaints[
              Math.floor(Math.random() * complaints.length)
            ],
          pain_score: Math.floor(Math.random() * 10),
          consciousness: "Alert",
          is_simulated: true,
          status: "Waiting",
        })
        .select()
        .single();

      if (patientError) {
        console.error(
          "Simulation patient insert error:",
          patientError
        );
      }

      if (pt) {
        const { error: vitalsError } = await supabase
          .from("patient_vitals")
          .insert({
            patient_id: pt.id,
            ...v,
          });

        if (vitalsError) {
          console.error(
            "Simulation vitals insert error:",
            vitalsError
          );
        } else {
          try {
            await assessPatient(pt.id);
          } catch (error) {
            console.error(
              "Simulation triage error:",
              error
            );
          }
        }
      }
    }

    // Don't perform another database operation if the simulation
    // was stopped while the first operation was running.
    if (!state.running) {
      return;
    }

    if (Math.random() < 0.25) {
      const {
        data: waiting,
        error: waitingError,
      } = await supabase
        .from("patients")
        .select("id")
        .eq("status", "Waiting")
        .limit(20);

      if (waitingError) {
        console.error(
          "Simulation waiting-patient query error:",
          waitingError
        );
        return;
      }

      if (waiting && waiting.length) {
        const target =
          waiting[
            Math.floor(Math.random() * waiting.length)
          ];

        const v = randomVitals(true);

        const { error: vitalsError } = await supabase
          .from("patient_vitals")
          .insert({
            patient_id: target.id,
            ...v,
          });

        if (vitalsError) {
          console.error(
            "Simulation deterioration vitals error:",
            vitalsError
          );
          return;
        }

        const {
          data: prevList,
          error: previousError,
        } = await supabase
          .from("triage_assessments")
          .select("*")
          .eq("patient_id", target.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1);

        if (previousError) {
          console.error(
            "Simulation previous triage query error:",
            previousError
          );
          return;
        }

        const prev = prevList?.[0];

        let newT;

        try {
          newT = await assessPatient(target.id);
        } catch (error) {
          console.error(
            "Simulation reassessment error:",
            error
          );
          return;
        }

        if (
          prev &&
          newT &&
          (
            prev.priority > newT.priority ||
            Number(newT.risk_probability) -
              Number(prev.risk_probability) >
              0.2
          )
        ) {
          const {
            error: reassessmentError,
          } = await supabase
            .from("reassessments")
            .insert({
              patient_id: target.id,
              previous_priority: prev.priority,
              new_priority: newT.priority,
              previous_risk: prev.risk_probability,
              new_risk: newT.risk_probability,
              reason: "Simulated deterioration",
            });

          if (reassessmentError) {
            console.error(
              "Simulation reassessment insert error:",
              reassessmentError
            );
          }

          const { error: alertError } = await supabase
            .from("alerts")
            .insert({
              patient_id: target.id,
              type: "Deterioration",
              severity: "high",
              message:
                "Deterioration detected: P" +
                prev.priority +
                "->P" +
                newT.priority,
            });

          if (alertError) {
            console.error(
              "Simulation alert insert error:",
              alertError
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(
      "Simulation tick error:",
      error
    );
  }
}

function scheduleNextTick() {
  if (!state.running) {
    return;
  }

  const intervalMs = Math.max(
    500,
    3000 / state.speed
  );

  state.interval = setTimeout(async () => {
    // If the simulation was stopped while waiting,
    // don't execute this tick.
    if (!state.running) {
      return;
    }

    await tick();

    // Schedule the next tick only after this tick finishes.
    // This prevents overlapping async ticks.
    scheduleNextTick();
  }, intervalMs);
}

export async function startSim(
  mode: SimMode,
  speed = 1
) {
  if (state.running) {
    stopSim();
  }

  if (!Number.isFinite(speed) || speed <= 0) {
    speed = 1;
  }

  // Prevent accidentally creating an extremely fast simulation.
  speed = Math.min(speed, 10);

  state.mode = mode;
  state.speed = speed;
  state.running = true;

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("simulation_sessions")
    .insert({
      mode,
      status: "running",
    })
    .select()
    .single();

  if (sessionError) {
    console.error(
      "Simulation session creation error:",
      sessionError
    );

    state.running = false;

    return {
      ok: false,
      error: "Failed to start simulation",
    };
  }

  state.sessionId = session?.id || null;

  scheduleNextTick();

  return {
    ok: true,
    mode,
    speed,
  };
}

export function stopSim() {
  if (state.interval) {
    clearTimeout(state.interval);
  }

  state.interval = null;
  state.running = false;

  const sessionId = state.sessionId;
  state.sessionId = null;

  if (sessionId) {
    void supabase
      .from("simulation_sessions")
      .update({
        status: "stopped",
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .then(({ error }) => {
        if (error) {
          console.error(
            "Simulation session stop error:",
            error
          );
        }
      });
  }

  return {
    ok: true,
  };
}

export function simStatus() {
  return {
    running: state.running,
    mode: state.mode,
    speed: state.speed,
  };
}
