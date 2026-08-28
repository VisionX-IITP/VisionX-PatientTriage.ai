import { Response } from "express";
import { supabase } from "../config/supabase";
import { AuthReq } from "../middleware/auth";

/**
 * Get active alerts.
 */
export async function alerts(
  req: AuthReq,
  res: Response
) {
  try {
    const { data, error } = await supabase
      .from("alerts")
      .select(`
        *,
        patients (
          id,
          patient_code,
          age,
          sex,
          chief_complaint,
          status
        )
      `)
      .eq("status", "active")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Alerts query error:", error);

      return res.status(500).json({
        error: "Failed to fetch alerts",
      });
    }

    return res.json(data || []);
  } catch (error) {
    console.error("alerts error:", error);

    return res.status(500).json({
      error: "Failed to fetch alerts",
    });
  }
}

/**
 * Resolve an active alert.
 */
export async function resolveAlert(
  req: AuthReq,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Alert ID is required",
      });
    }

    const { data, error } = await supabase
      .from("alerts")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "active")
      .select()
      .single();

    if (error) {
      console.error(
        "Resolve alert error:",
        error
      );

      return res.status(400).json({
        error: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        error: "Active alert not found",
      });
    }

    const { error: auditError } =
      await supabase
        .from("audit_logs")
        .insert({
          user_id: req.user?.id,
          user_email: req.user?.email,
          user_role: req.user?.role,
          patient_id: data.patient_id,
          action: "ALERT_RESOLVED",
          details: {
            alert_id: id,
          },
        });

    if (auditError) {
      console.error(
        "Audit log failed:",
        auditError
      );
    }

    return res.json({
      ok: true,
      alert: data,
    });
  } catch (error) {
    console.error(
      "resolveAlert error:",
      error
    );

    return res.status(500).json({
      error: "Failed to resolve alert",
    });
  }
}

/**
 * Get audit logs.
 */
export async function auditLogs(
  req: AuthReq,
  res: Response
) {
  try {
    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 100,
        1
      ),
      500
    );

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (error) {
      console.error(
        "Audit logs query error:",
        error
      );

      return res.status(500).json({
        error: "Failed to fetch audit logs",
      });
    }

    return res.json(data || []);
  } catch (error) {
    console.error(
      "auditLogs error:",
      error
    );

    return res.status(500).json({
      error: "Failed to fetch audit logs",
    });
  }
}

/**
 * Basic analytics for the dashboard.
 */
export async function analytics(
  req: AuthReq,
  res: Response
) {
  try {
    const [
      patientsResult,
      assessmentsResult,
      alertsResult,
    ] = await Promise.all([
      supabase
        .from("patients")
        .select(
          "id, status, is_simulated, created_at"
        ),

      supabase
        .from("triage_assessments")
        .select(
          "id, priority, risk_probability, created_at"
        ),

      supabase
        .from("alerts")
        .select(
          "id, severity, status, created_at"
        ),
    ]);

    if (patientsResult.error) {
      console.error(
        "Patients analytics error:",
        patientsResult.error
      );

      return res.status(500).json({
        error: "Failed to fetch patient analytics",
      });
    }

    if (assessmentsResult.error) {
      console.error(
        "Assessments analytics error:",
        assessmentsResult.error
      );

      return res.status(500).json({
        error: "Failed to fetch assessment analytics",
      });
    }

    if (alertsResult.error) {
      console.error(
        "Alerts analytics error:",
        alertsResult.error
      );

      return res.status(500).json({
        error: "Failed to fetch alert analytics",
      });
    }

    const patients =
      patientsResult.data || [];

    const assessments =
      assessmentsResult.data || [];

    const alertsData =
      alertsResult.data || [];

    const patientsByStatus = patients.reduce(
      (acc: Record<string, number>, patient: any) => {
        const status =
          patient.status || "Unknown";

        acc[status] =
          (acc[status] || 0) + 1;

        return acc;
      },
      {}
    );

    const assessmentsByPriority =
      assessments.reduce(
        (
          acc: Record<string, number>,
          assessment: any
        ) => {
          const priority =
            String(
              assessment.priority ?? "Unknown"
            );

          acc[priority] =
            (acc[priority] || 0) + 1;

          return acc;
        },
        {}
      );

    const activeAlerts =
      alertsData.filter(
        (alert: any) =>
          alert.status === "active"
      ).length;

    const simulatedPatients =
      patients.filter(
        (patient: any) =>
          patient.is_simulated === true
      ).length;

    return res.json({
      patients: {
        total: patients.length,
        simulated: simulatedPatients,
        by_status: patientsByStatus,
      },

      assessments: {
        total: assessments.length,
        by_priority: assessmentsByPriority,
      },

      alerts: {
        total: alertsData.length,
        active: activeAlerts,
      },
    });
  } catch (error) {
    console.error(
      "analytics error:",
      error
    );

    return res.status(500).json({
      error: "Failed to fetch analytics",
    });
  }
}

/**
 * Basic system health information.
 */
export async function systemHealth(
  req: AuthReq,
  res: Response
) {
  try {
    const start = Date.now();

    const { error } = await supabase
      .from("patients")
      .select("id")
      .limit(1);

    const databaseLatency =
      Date.now() - start;

    if (error) {
      console.error(
        "System health database error:",
        error
      );

      return res.status(503).json({
        status: "degraded",
        database: {
          status: "unavailable",
          latency_ms: databaseLatency,
        },
      });
    }

    return res.json({
      status: "operational",
      database: {
        status: "operational",
        latency_ms: databaseLatency,
      },
      timestamp:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "systemHealth error:",
      error
    );

    return res.status(503).json({
      status: "degraded",
      database: {
        status: "unavailable",
      },
    });
  }
}
