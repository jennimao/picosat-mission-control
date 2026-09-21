const checkins = [
  {
    time: "12:08:19",
    lat: 37.004,
    lon: -110.17,
    alt: 910,
    speed: 12.1,
    heading: "058°",
  },
  {
    time: "12:31:44",
    lat: 37.021,
    lon: -110.084,
    alt: 7230,
    speed: 18.4,
    heading: "064°",
  },
  {
    time: "13:04:27",
    lat: 37.03,
    lon: -109.915,
    alt: 13960,
    speed: 24.6,
    heading: "071°",
  },
  {
    time: "13:36:02",
    lat: 37.012,
    lon: -109.74,
    alt: 19220,
    speed: 31.8,
    heading: "074°",
  },
  {
    time: "14:05:56",
    lat: 36.99,
    lon: -109.603,
    alt: 23190,
    speed: 35.1,
    heading: "073°",
  },
  {
    time: "14:20:04",
    lat: 36.98,
    lon: -109.548,
    alt: 24170,
    speed: 37.0,
    heading: "073°",
  },
  {
    time: "14:32:18",
    lat: 36.974,
    lon: -109.507,
    alt: 24580,
    speed: 38.4,
    heading: "072°",
  },
];
const forecast = [
  { lat: 36.97, lon: -109.5 },
  { lat: 36.99, lon: -109.31 },
  { lat: 37.03, lon: -109.12 },
  { lat: 37.1, lon: -108.84 },
  { lat: 37.15, lon: -108.66 },
];
const flightQuotes = [
  ["The Earth asks, 'how can we love you?'", "— Ada Limón, The Hurting Kind"],
  ["If you want to fly, you have to give up the things that weigh you down.", "— Toni Morrison"],
  ["The vastness of the heavens stretches my imagination.", "— Richard Feynman"],
  ["My life is a stitched sail, the sewn sinew of a mimetic animal.", "— Anne Carson"],
  ["The most beautiful part of your body is where it’s headed.", "— Ocean Vuong"],
  ["The world changes according to the way people see it.", "— James Baldwin"],
  ["We are going to the Moon because it is in the nature of the human being to face challenges.", "— Buzz Aldrin"],
];
const canvas = document.querySelector("#globe"),
  ctx = canvas.getContext("2d");
// Center the initial view on the Four Corners launch region.
let rotation = 1.91,
  tilt = -0.1,
  showGrid = true,
  showPath = true,
  active = 6,
  dragging = false,
  last = null;
const stage = document.querySelector("#globe-stage");
function fmt(n, axis) {
  return `${Math.abs(n).toFixed(3)}° ${n >= 0 ? (axis === "lat" ? "N" : "E") : axis === "lat" ? "S" : "W"}`;
}
function resize() {
  const r = stage.getBoundingClientRect();
  canvas.width = r.width * devicePixelRatio;
  canvas.height = r.height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  drawGlobe();
}
function project(lat, lon, R, cx, cy) {
  const p = Math.PI / 180,
    la = lat * p,
    lo = lon * p + rotation;
  const x = R * Math.cos(la) * Math.sin(lo);
  const y =
    R *
    (Math.cos(tilt) * Math.sin(la) -
      Math.sin(tilt) * Math.cos(la) * Math.cos(lo));
  const z =
    Math.sin(tilt) * Math.sin(la) +
    Math.cos(tilt) * Math.cos(la) * Math.cos(lo);
  return { x: cx + x, y: cy - y, z };
}
function path(points, color, dashed = false) {
  ctx.beginPath();
  let started = false;
  points.forEach((p) => {
    const q = project(
      p.lat,
      p.lon,
      Math.min(stage.clientWidth, stage.clientHeight) * 0.38,
      stage.clientWidth * 0.5,
      stage.clientHeight * 0.48,
    );
    if (q.z < -0.05) {
      started = false;
      return;
    }
    if (!started) {
      ctx.moveTo(q.x, q.y);
      started = true;
    } else ctx.lineTo(q.x, q.y);
  });
  ctx.setLineDash(dashed ? [9, 7] : []);
  ctx.strokeStyle = color;
  ctx.lineWidth = dashed ? 2.8 : 2.4;
  ctx.stroke();
  ctx.setLineDash([]);
}
function drawLandmass(shape, R, cx, cy) {
  const projected = shape
    .map(([lat, lon]) => project(lat, lon, R, cx, cy))
    .filter((point) => point.z > -0.03);
  if (projected.length < 3) return;
  ctx.beginPath();
  projected.forEach((point, index) =>
    index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
  );
  ctx.closePath();
  ctx.fillStyle = "rgba(43,103,78,.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(180,229,196,.48)";
  ctx.lineWidth = 0.9;
  ctx.stroke();
}
function drawCloudBand(lat, startLon, endLon, R, cx, cy) {
  ctx.beginPath();
  for (let lon = startLon; lon <= endLon; lon += 2) {
    const wave = lat + Math.sin(lon * 0.18) * 2.5;
    const point = project(wave, lon, R * 1.012, cx, cy);
    if (point.z > 0) lon === startLon ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
  }
  ctx.strokeStyle = "rgba(225,249,246,.12)";
  ctx.lineWidth = 3;
  ctx.stroke();
}
function placeCallout(selector, point, R, cx, cy, offsetX, offsetY) {
  const el = document.querySelector(selector),
    q = project(point.lat, point.lon, R, cx, cy);
  if (!showPath || q.z < 0.04) {
    el.style.opacity = "0";
    return;
  }
  el.style.opacity = "1";
  el.style.left = `${q.x + offsetX}px`;
  el.style.top = `${q.y + offsetY}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
}
function drawGlobe() {
  const w = stage.clientWidth,
    h = stage.clientHeight,
    R = Math.min(w, h) * 0.38,
    cx = w * 0.5,
    cy = h * 0.48;
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(
    cx - R * 0.3,
    cy - R * 0.36,
    R * 0.08,
    cx,
    cy,
    R * 1.05,
  );
  g.addColorStop(0, "#356475");
  g.addColorStop(0.7, "#153944");
  g.addColorStop(1, "#08191f");
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // Thin atmospheric halo gives the sphere a lit, photographed edge.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(122,232,255,.38)";
  ctx.shadowColor = "rgba(99,230,208,.7)";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  if (showGrid) {
    ctx.strokeStyle = "rgba(218,242,235,.15)";
    ctx.lineWidth = 0.8;
    for (let lat = -75; lat <= 75; lat += 15) {
      ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += 4) {
        let p = project(lat, lon, R, cx, cy);
        if (p.z >= 0) ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    for (let lon = -180; lon < 180; lon += 15) {
      ctx.beginPath();
      for (let lat = -90; lat <= 90; lat += 3) {
        let p = project(lat, lon, R, cx, cy);
        if (p.z >= 0) ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  } // stylized continent outlines
  ctx.strokeStyle = "rgba(184,229,216,.32)";
  ctx.lineWidth = 1.15;
  const land = [
    [
      [50, -130],
      [65, -105],
      [55, -78],
      [32, -82],
      [18, -96],
      [35, -118],
      [50, -130],
    ],
    [
      [12, -80],
      [-8, -75],
      [-25, -58],
      [-43, -66],
      [-54, -72],
      [-35, -56],
      [-12, -51],
      [12, -80],
    ],
    [
      [68, -10],
      [55, 15],
      [48, 5],
      [36, 25],
      [30, 12],
      [10, 18],
      [-15, 18],
      [-32, 30],
      [-35, 17],
      [-8, -5],
      [17, -15],
      [35, -5],
      [50, -10],
      [68, -10],
    ],
    [
      [70, 35],
      [62, 70],
      [48, 92],
      [30, 105],
      [22, 88],
      [7, 80],
      [19, 65],
      [35, 55],
      [45, 32],
      [70, 35],
    ],
    [
      [45, 110],
      [30, 125],
      [25, 145],
      [38, 142],
      [52, 130],
      [45, 110],
    ],
    [
      [-12, 115],
      [-25, 133],
      [-38, 145],
      [-43, 130],
      [-23, 113],
      [-12, 115],
    ],
  ];
  land.forEach((shape) => drawLandmass(shape, R, cx, cy));
  drawCloudBand(42, -150, -40, R, cx, cy);
  drawCloudBand(8, -90, 65, R, cx, cy);
  drawCloudBand(-32, 70, 175, R, cx, cy);
  // Polar ice caps are kept faint so they read as terrain, not a UI overlay.
  [[76, -55], [-75, 15]].forEach(([lat, lon]) => {
    const ice = project(lat, lon, R * 1.005, cx, cy);
    if (ice.z > 0) {
      ctx.beginPath();
      ctx.arc(ice.x, ice.y, Math.max(5, R * 0.08 * ice.z), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(222,248,248,.32)";
      ctx.fill();
    }
  });
  if (showPath) {
    // The solid red segment is the entire observed flight track, not only the playback point.
    path(checkins, "#f04a47");
    // The projected segment deliberately remains dotted to distinguish it from received GPS data.
    path(forecast, "#f5c84c", true);
    checkins.forEach((p, i) => {
      let q = project(p.lat, p.lon, R, cx, cy);
      if (q.z > 0) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, i === active ? 6 : 2.8, 0, Math.PI * 2);
        ctx.fillStyle = i === active ? "#f04a47" : "#4c80ec";
        ctx.fill();
        if (i === active) {
          ctx.beginPath();
          ctx.arc(q.x, q.y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(240,74,71,.55)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    });
    const end = project(forecast.at(-1).lat, forecast.at(-1).lon, R, cx, cy);
    if (end.z > 0) {
      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#f5c84c";
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(190,235,222,.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  placeCallout(".current-card", checkins[active], R, cx, cy, 20, -67);
  placeCallout(".forecast-card", forecast.at(-1), R, cx, cy, -232, 15);
}
function update(i) {
  active = i;
  const p = checkins[i],
    quote = flightQuotes[i];
  document.querySelector("#time-slider").value = i;
  document.querySelector("#altitude").textContent = p.alt.toLocaleString();
  document.querySelector("#speed").textContent = p.speed.toFixed(1);
  document.querySelector("#heading").textContent = p.heading;
  document.querySelector("#battery").textContent = 81 + i;
  document.querySelector("#position-readout").textContent =
    `${fmt(p.lat, "lat")}, ${fmt(p.lon, "lon")}`;
  document.querySelector("#position-time").textContent = `${p.time} UTC`;
  document.querySelector("#quote-index").textContent = String(i + 1).padStart(2, "0");
  document.querySelector("#flight-quote").textContent = quote[0];
  document.querySelector("#quote-author").textContent = quote[1];
  renderCheckins();
  drawGlobe();
}
function renderCheckins() {
  document.querySelector("#checkins").innerHTML = checkins
    .slice()
    .reverse()
    .slice(0, 5)
    .map((p, idx) => {
      const original = checkins.length - 1 - idx;
      return `<li class="${original === active ? "active" : ""}"><b>${fmt(p.lat, "lat")} · ${fmt(p.lon, "lon")}</b><span>${p.alt.toLocaleString()} FT</span><small>${p.time}</small></li>`;
    })
    .join("");
}
function drawChart() {
  const c = document.querySelector("#altitude-chart"),
    x = c.getContext("2d"),
    w = (c.width = c.clientWidth * devicePixelRatio),
    h = (c.height = c.clientHeight * devicePixelRatio);
  x.scale(devicePixelRatio, devicePixelRatio);
  const W = c.clientWidth,
    H = c.clientHeight;
  x.clearRect(0, 0, W, H);
  x.strokeStyle = "rgba(190,235,222,.14)";
  for (let y = 10; y < H; y += 24) {
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(W, y);
    x.stroke();
  }
  x.beginPath();
  checkins.forEach((p, i) => {
    let px = (i / (checkins.length - 1)) * W,
      py = H - 8 - (p.alt / 27000) * (H - 16);
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  });
  x.strokeStyle = "#f04a47";
  x.lineWidth = 2;
  x.stroke();
  const p = checkins[active],
    px = (active / (checkins.length - 1)) * W,
    py = H - 8 - (p.alt / 27000) * (H - 16);
  x.beginPath();
  x.arc(px, py, 4, 0, 7);
  x.fillStyle = "#f5c84c";
  x.fill();
}
stage.addEventListener("pointerdown", (e) => {
  dragging = true;
  last = { x: e.clientX, y: e.clientY };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  rotation += (e.clientX - last.x) * 0.008;
  tilt = Math.max(-0.7, Math.min(0.7, tilt + (e.clientY - last.y) * 0.006));
  last = { x: e.clientX, y: e.clientY };
  drawGlobe();
});
stage.addEventListener("pointerup", () => (dragging = false));
document.querySelector("#time-slider").addEventListener("input", (e) => {
  update(+e.target.value);
  drawChart();
});
document.querySelector("#reset-view").onclick = () => {
  rotation = 1.91;
  tilt = -0.1;
  drawGlobe();
};
document.querySelector("#toggle-grid").onclick = (e) => {
  showGrid = !showGrid;
  e.currentTarget.classList.toggle("active", showGrid);
  drawGlobe();
};
document.querySelector("#toggle-path").onclick = (e) => {
  showPath = !showPath;
  e.currentTarget.classList.toggle("active", showPath);
  drawGlobe();
};
document.querySelector("#export-button").onclick = () => {
  const csv =
    "time,latitude,longitude,altitude_ft,ground_speed_kmh\\n" +
    checkins
      .map((p) => `${p.time},${p.lat},${p.lon},${p.alt},${p.speed}`)
      .join("\\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "stardust-01-flight-data.csv";
  a.click();
  URL.revokeObjectURL(a.href);
};
setInterval(
  () =>
    (document.querySelector("#utc-clock").textContent =
      new Date().toISOString().slice(11, 19) + " UTC"),
  1000,
);
window.addEventListener("resize", () => {
  resize();
  drawChart();
});
resize();
update(active);
drawChart();
