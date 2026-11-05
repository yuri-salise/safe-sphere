"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { appConfig } from "@/lib/config";

export function IncidentLocationPicker({ requireSelection = false }: { requireSelection?: boolean }) {
  const defaultCenter = appConfig.mapCenter;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const selectionRef = useRef<[number, number]>(defaultCenter);
  const [coordinates, setCoordinates] = useState<[number, number]>(defaultCenter);
  const [hasSelected, setHasSelected] = useState(false);
  const [status, setStatus] = useState("Initializing location picker…");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    let map: maplibregl.Map | undefined;
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const form = containerRef.current.closest("form");

    function selectLocation(position: [number, number]) {
      selectionRef.current = position;
      setCoordinates(position);
      setHasSelected(true);
      markerRef.current?.setLngLat(position);
    }

    function resetLocation() {
      selectLocation(defaultCenter);
      setHasSelected(false);
      map?.jumpTo({ center: defaultCenter, zoom: 16 });
    }

    try {
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new maplibregl.Map({
        container: containerRef.current,
        center: selectionRef.current,
        zoom: 16,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      
      // Electric Lime marker for selected point
      const marker = new maplibregl.Marker({ color: "#00ff66", draggable: true })
        .setLngLat(selectionRef.current)
        .addTo(map);
      markerRef.current = marker;
      marker.getElement().setAttribute("aria-label", "Selected incident location");
      marker.on("dragend", () => {
        const point = marker.getLngLat().wrap();
        selectLocation([point.lng, point.lat]);
      });
      map.on("click", (event) => {
        const point = event.lngLat.wrap();
        selectLocation([point.lng, point.lat]);
      });
      map.on("load", () => {
        clearTimeout(timer);
        setStatus("");
      });
      map.on("error", () => {
        setStatus("Map unavailable. Check network connectivity. The selected coordinates are preserved.");
      });
      timer = setTimeout(() => {
        setStatus("Map tile connection is taking longer than expected.");
      }, 15000);
      observer = new ResizeObserver(() => map?.resize());
      observer.observe(containerRef.current);
      form?.addEventListener("reset", resetLocation);
    } catch {
      // Report a failure from the external map constructor to the form UI asynchronously.
      setTimeout(() => {
        setStatus("Map unavailable. Your browser must support WebGL to interactively pick a location.");
      }, 0);
    }

    return () => {
      clearTimeout(timer);
      form?.removeEventListener("reset", resetLocation);
      observer?.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt, defaultCenter]);

  function resetToDefault() {
    selectionRef.current = defaultCenter;
    setCoordinates(defaultCenter);
    setHasSelected(false);
    markerRef.current?.setLngLat(defaultCenter);
    mapRef.current?.flyTo({ center: defaultCenter, zoom: 16 });
  }

  return (
    <fieldset className="incident-location-picker">
      <legend>Incident GIS Location</legend>
      <p id="location-picker-help">
        Click anywhere on the map or drag the neon pin to calibrate the incident location.{" "}
        {requireSelection ? "Confirm a coordinate point before submitting." : "Default: Configured operational center."}
      </p>
      <div
        ref={containerRef}
        className="incident-location-map"
        role="region"
        aria-label="Incident location map"
        aria-describedby="location-picker-help"
      />
      <input type="hidden" name="latitude" value={coordinates[1]} />
      <input type="hidden" name="longitude" value={coordinates[0]} />
      {requireSelection && (
        <input type="hidden" name="location_selected" value={hasSelected ? "true" : "false"} />
      )}
      <div className="incident-location-actions">
        <output aria-live="polite">
          Selected: {coordinates[1].toFixed(7)}, {coordinates[0].toFixed(7)}
        </output>
        <button
          type="button"
          className="mini-button"
          onClick={() => {
            const point = mapRef.current?.getCenter().wrap();
            if (!point) return;
            const position: [number, number] = [point.lng, point.lat];
            selectionRef.current = position;
            setCoordinates(position);
            setHasSelected(true);
            markerRef.current?.setLngLat(position);
          }}
        >
          Use map center
        </button>
        <button type="button" className="mini-button" onClick={resetToDefault}>
          Reset to operational center
        </button>
      </div>
      {status && (
        <div className="incident-location-actions" role="status">
          <span>{status}</span>
          <button
            type="button"
            className="mini-button"
            onClick={() => {
              setStatus("Re-initializing GIS map…");
              setAttempt((value) => value + 1);
            }}
          >
            Retry map
          </button>
        </div>
      )}
    </fieldset>
  );
}
