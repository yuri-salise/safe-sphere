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

      const popupContent = document.createElement("div");
      popupContent.className = "map-popup";

      const title = document.createElement("strong");
      title.textContent = incident.title;
      popupContent.appendChild(title);

      const code = document.createElement("span");
      code.textContent = incident.code;
      popupContent.appendChild(code);

      const details = document.createElement("dl");
      const rows = [
        ["Severity", incident.severity],
        ["Status", incident.status.replaceAll("_", " ")],
        ["Affected", String(incident.estimatedAffected)],
      ];

      rows.forEach(([label, value]) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        row.append(term, description);
        details.appendChild(row);
      });
      popupContent.appendChild(details);

      if (!incident.id.startsWith("sample-")) {
        const detailLink = document.createElement("a");
        detailLink.href = `/incidents/${incident.id}`;
        detailLink.className = "map-popup-link";
        detailLink.textContent = "View incident details →";
        popupContent.appendChild(detailLink);
      }

      const popup = new maplibregl.Popup({ offset: 24 }).setDOMContent(popupContent);

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
