"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type {
  Map as MapLibreMap,
  Marker,
  StyleSpecification,
} from "maplibre-gl";
import { appConfig, hasSupabasePublicConfig } from "@/lib/config";
import { demoIncidents } from "@/lib/demo-data";
import { titleCaseStatus } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { IncidentSeverity, MapIncident } from "@/types/domain";

// High-visibility status telemetry colors
const severityColor: Record<IncidentSeverity, string> = {
  LOW: "#00df89",      // Emerald Operational Green
  MODERATE: "#f0b90b", // Amber Warning
  HIGH: "#ff9900",     // Electric Warning Orange
  CRITICAL: "#f6465d", // Alert Coral Red
};

const FALLBACK_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

type PublicIncidentRow = {
  id: string;
  code: string;
  title: string;
  incident_type: string;
  severity: IncidentSeverity;
  status: MapIncident["status"];
  latitude: number;
  longitude: number;
  estimated_affected: number;
  updated_at: string;
};

type MapState = "loading" | "ready" | "error";

function normalizeIncident(row: PublicIncidentRow): MapIncident {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    incidentType: row.incident_type,
    severity: row.severity,
    status: row.status,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    estimatedAffected: Number(row.estimated_affected ?? 0),
    updatedAt: row.updated_at,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderIncidentPopup(incident: MapIncident): string {
  const isSample = incident.id.startsWith("sample-");
  const escapedTitle = escapeHtml(incident.title);
  const escapedCode = escapeHtml(incident.code);
  const escapedType = escapeHtml(incident.incidentType || "Emergency");
  const formattedStatus = escapeHtml(titleCaseStatus(incident.status));
  const sevLower = incident.severity.toLowerCase();

  const latDir = incident.latitude >= 0 ? "N" : "S";
  const lngDir = incident.longitude >= 0 ? "E" : "W";
  const latFormatted = `${Math.abs(incident.latitude).toFixed(4)}° ${latDir}`;
  const lngFormatted = `${Math.abs(incident.longitude).toFixed(4)}° ${lngDir}`;

  const actionButtonHtml = !isSample
    ? `<a class="map-popup-action-btn" href="/incidents/${encodeURIComponent(incident.id)}">
        <span>View Incident Dossier</span>
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>`
    : `<div class="map-popup-action-simulated">
        <span class="simulated-dot"></span>
        <span>Simulated Telemetry Record</span>
      </div>`;

  return `
    <div class="map-popup-card">
      <div class="map-popup-header">
        <span class="map-pill map-pill-code">${escapedCode}</span>
        <span class="map-pill map-pill-type">${escapedType}</span>
      </div>
      <div class="map-popup-title-block">
        <h4 class="map-popup-title">${escapedTitle}</h4>
        <div class="map-popup-coords">
          <svg viewBox="0 0 16 16" width="11" height="11" fill="none" aria-hidden="true">
            <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5C8 14.5 12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z" stroke="#00FF66" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="8" cy="6" r="1.8" fill="#00FF66"/>
          </svg>
          <span>${latFormatted}, ${lngFormatted}</span>
        </div>
      </div>
      <div class="map-popup-grid">
        <div class="map-popup-tile">
          <span class="tile-caption">SEVERITY</span>
          <div class="tile-badge severity-${sevLower}">
            <span class="badge-dot"></span>
            <span>${incident.severity}</span>
          </div>
        </div>
        <div class="map-popup-tile">
          <span class="tile-caption">STATUS</span>
          <div class="tile-badge status-${incident.status.toLowerCase().replace(/_/g, "-")}">
            <span class="badge-dot pulse-beacon"></span>
            <span>${formattedStatus}</span>
          </div>
        </div>
        <div class="map-popup-tile">
          <span class="tile-caption">EST. IMPACT</span>
          <div class="tile-stat">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
              <path d="M10.5 13.5v-1.5a2.5 2.5 0 0 0-2.5-2.5H4a2.5 2.5 0 0 0-2.5 2.5v1.5" stroke="#94a3b8" stroke-width="1.2"/>
              <circle cx="6" cy="4.5" r="2.2" stroke="#94a3b8" stroke-width="1.2"/>
              <path d="M13.5 13v-1a2 2 0 0 0-1.6-1.95" stroke="#94a3b8" stroke-width="1.2"/>
            </svg>
            <strong>${incident.estimatedAffected.toLocaleString()}</strong>
            <small>ppl</small>
          </div>
        </div>
        <div class="map-popup-tile">
          <span class="tile-caption">NODE STATE</span>
          <div class="tile-stat">
            <span class="telemetry-chip ${isSample ? "chip-sim" : "chip-live"}">${isSample ? "SIMULATED" : "VERIFIED"}</span>
          </div>
        </div>
      </div>
      <div class="map-popup-footer">
        ${actionButtonHtml}
      </div>
    </div>
  `;
}

export function SafeSphereMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [incidents, setIncidents] = useState<MapIncident[]>(
    appConfig.enableDemoData ? demoIncidents : [],
  );
  const [usingLiveData, setUsingLiveData] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mapState, setMapState] = useState<MapState>("loading");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapAttempt, setMapAttempt] = useState(0);

  const incidentSignature = useMemo(
    () => incidents.map((incident) => `${incident.id}:${incident.updatedAt}`).join("|"),
    [incidents],
  );

  useEffect(() => {
    if (!hasSupabasePublicConfig()) return;

    let active = true;
    const supabase = createClient();

    async function loadIncidents() {
      const { data, error } = await supabase.rpc("get_public_incidents");

      if (!active) return;

      if (error) {
        setNotice(
          appConfig.enableDemoData
            ? "The live incident feed is temporarily unavailable. Safe Sphere sample incidents are active."
            : "The live incident feed is temporarily unavailable. The basemap remains active.",
        );
        return;
      }

      const rows = (data ?? []) as PublicIncidentRow[];
      setIncidents(rows.map(normalizeIncident));
      setUsingLiveData(true);
      setNotice(null);
    }

    loadIncidents();

    const channel = supabase
      .channel("public-incidents-v1")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => loadIncidents(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setMapState("loading");
    setMapError(null);

    let fallbackApplied = false;
    let fallbackFailed = false;
    let destroyed = false;
    let ready = false;

    // Self-hosted worker modules for high performance
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const map = new maplibregl.Map({
      container,
      style: appConfig.mapStyleUrl,
      center: appConfig.mapCenter,
      zoom: appConfig.mapZoom,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right",
    );

    const handleReady = () => {
      if (destroyed) return;
      ready = true;
      map.resize();
      setMapState("ready");
      setMapError(null);
    };

    const applyFallbackStyle = () => {
      if (destroyed || fallbackApplied || ready) return;
      fallbackApplied = true;
      setNotice(
        "Primary high-resolution tile service reached timeout. Active fallback basemap engaged.",
      );
      try {
        map.setStyle(FALLBACK_RASTER_STYLE);
      } catch (error) {
        console.warn("Safe Sphere fallback map error", error);
        fallbackFailed = true;
        setMapState("error");
        setMapError(
          "Unable to connect to GIS tile infrastructure. Check network and refresh.",
        );
      }
    };

    map.on("error", (event) => {
      console.warn("Safe Sphere GIS map notice", event.error);

      if (ready) return;

      if (!fallbackApplied) {
        applyFallbackStyle();
        return;
      }

      if (!fallbackFailed) {
        fallbackFailed = true;
        setMapState("error");
        setMapError(
          "Unable to establish connection to map tile services.",
        );
      }
    });

    map.on("load", handleReady);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    const resizeFrame = window.requestAnimationFrame(() => map.resize());
    const resizeTimer = window.setTimeout(() => map.resize(), 250);

    const workerRecoveryTimer = window.setTimeout(applyFallbackStyle, 7000);
    const terminalTimer = window.setTimeout(() => {
      if (!ready && fallbackApplied && !fallbackFailed) {
        fallbackFailed = true;
        setMapState("error");
        setMapError(
          "GIS map loading timed out. Please check connectivity.",
        );
      }
    }, 14000);

    return () => {
      destroyed = true;
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(workerRecoveryTimer);
      window.clearTimeout(terminalTimer);
      resizeObserver.disconnect();
      map.off("load", handleReady);
      map.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [mapAttempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState === "error") return;

    const markerNodes: HTMLElement[] = [];
    const markers: Marker[] = [];

    incidents.forEach((incident) => {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "incident-marker";
      node.style.setProperty("--marker-color", severityColor[incident.severity]);
      node.setAttribute("aria-label", `${incident.severity} incident: ${incident.title}`);
      markerNodes.push(node);

      const popup = new maplibregl.Popup({
        offset: [0, -14],
        closeButton: true,
        closeOnClick: true,
        className: "tactical-map-popup",
        maxWidth: "320px",
      }).setHTML(renderIncidentPopup(incident));

      const marker = new maplibregl.Marker({ element: node, anchor: "center" })
        .setLngLat([incident.longitude, incident.latitude])
        .setPopup(popup)
        .addTo(map);

      markers.push(marker);
    });

    return () => {
      markers.forEach((marker) => marker.remove());
      markerNodes.forEach((node) => node.remove());
    };
  }, [incidentSignature, incidents, mapState]);

  function retryMap() {
    setMapAttempt((attempt) => attempt + 1);
  }

  return (
    <div className="map-module">
      <div className="map-toolbar">
        <div>
          <span className="eyebrow">Operational GIS Telemetry</span>
          <h2>{appConfig.name} Live Incident Map</h2>
        </div>
        <span className={`status-pill ${usingLiveData ? "status-green" : "status-neutral"}`}>
          {usingLiveData ? "Live telemetry feed" : appConfig.enableDemoData ? "Simulation Dataset" : "Live Map"}
        </span>
      </div>

      {notice && <div className="map-notice">{notice}</div>}

      <div className="map-frame">
        <div ref={containerRef} className="map-canvas" />

        <div
          className={`map-state-overlay ${mapState === "ready" ? "map-state-hidden" : ""}`}
          aria-live="polite"
        >
          {mapState === "loading" ? (
            <div className="map-loader-card">
              <span className="map-spinner" aria-hidden="true" />
              <strong>Initializing GIS Infrastructure</strong>
              <span>Loading basemap tiles and incident telemetry layer…</span>
            </div>
          ) : (
            <div className="map-loader-card map-error-card">
              <strong>Telemetry Offline</strong>
              <span>{mapError}</span>
              <button className="button button-green" type="button" onClick={retryMap}>
                Retry Connection
              </button>
            </div>
          )}
        </div>

        <div className="map-legend" aria-label="Incident severity legend">
          {Object.entries(severityColor).map(([severity, color]) => (
            <span key={severity}>
              <i style={{ background: color }} />
              {severity}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
