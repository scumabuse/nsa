# Orbit Health

Orbit Health is an offline-capable crew health monitoring prototype for the NASA Space Apps Challenge. It lets a crew member record six health metrics, spot changes and prepare a report for the onboard medic while communications with Earth are delayed.

## Run locally

Open `dist/index.html` in Chrome or Edge. The app has no build step or runtime dependencies. To test offline reloads, serve the app over localhost:

```powershell
python -m http.server 8787 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:8787/` and wait for the “Available offline” footer before disconnecting.

## Demonstrate the workflow

1. In Training mode, select **Review training scenario** to see how the app highlights the last sleep reading and displays its trend.
2. Add a reading or edit one in **Log**. Download **Crew handoff** for a readable report or the JSON report for the complete log. Training and personal records are stored separately.
3. Open **NASA data**, switch between Curiosity’s detectors and select an observation. Compare the chart and source table. The archive is also available offline.

## Data and resources

- [NASA PDS MSL RAD RDR V1.0](https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MSL-M-RAD-3-RDR-V1.0) provides historical rover measurements shown in **NASA data**. The app plots both detectors’ published absorbed dose rates in µGy/h for the 14 observations in the [Sol 1 data product](https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_00000_00089/RAD_RDR_2012_220_02_25_0001_V00.TXT). The [PDS label](https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/SOL_00000_00089/RAD_RDR_2012_220_02_25_0001_V00.LBL) supplies units and byte offsets. The [instrument specification](https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DOCUMENT/RAD_RDR_SIS.PDF) describes the detectors and product structure.
- [NASA Human Research Program’s five spaceflight hazards](https://www.nasa.gov/hrp/hazards/) informs the Crew guide.
- Training readings are synthetic test fixtures. The rover measurements come from NASA PDS.

To reproduce `dist/rad-data.js`, download the TXT and LBL linked above and run `node tools/extract-rad.cjs <TXT path> <LBL path>`. The script verifies SHA-256 hashes and matches all 28 values against the offsets in the label.

## Interpretation and storage

Personal comparisons use the median of daily medians from at least three previous UTC days in a 30-day window. Glucose requires matching meal context. Readings older than 48 hours prompt a new reading. Serious symptoms can be flagged explicitly and take priority for the latest reading of that metric.

The comparison thresholds are prototype settings and require clinical validation. Rover readings are absorbed dose rates in instrument material and are kept separate from the crew journal, its alerts and exports. A real mission would require approved medical procedures, onboard dosimetry and protected storage. The browser stores records locally and exports files for manual sharing.

## Tests

```powershell
node --test tests/model.test.cjs
```

For end-to-end tests, start the server on port 8787 and run `node tests/browser.test.cjs` with Playwright available. Set `ORBIT_PLAYWRIGHT` to an external Playwright installation if needed and `ORBIT_BROWSER` to an installed Chrome or Edge binary.

The application source is licensed under [Apache 2.0](LICENSE). The NASA archive extract retains its original attribution.
