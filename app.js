"use strict";

const STORAGE_KEY = "bortulev-matanaliz-progress";
const normalize = value => value.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter(number => Number.isInteger(number) && number >= 1 && number <= 42) : []);
  } catch {
    return new Set();
  }
}

function setupProgram(searchInput) {
  const categories = [...document.querySelectorAll(".filter")];
  const groups = [...document.querySelectorAll(".topic-group")].map(section => ({
    section,
    topics: [...section.querySelectorAll(".topic-row")].map(row => ({
      row,
      number: Number(row.dataset.topic),
      words: normalize(row.innerText),
    })),
  }));
  const count = document.querySelector("#result-count");
  const empty = document.querySelector("#no-results");
  const progress = document.querySelector("#progress");
  const progressLabel = document.querySelector("#progress-label");
  const requestedGroup = new URLSearchParams(location.search).get("group");
  let category = categories.some(button => button.dataset.group === requestedGroup) ? requestedGroup : "";

  function filter() {
    const query = normalize(searchInput.value);
    const number = /^\d+$/.test(query) ? Number(query) : null;
    const tokens = query.split(/\s+/).filter(Boolean);
    let total = 0;

    for (const button of categories) {
      button.setAttribute("aria-pressed", String(button.dataset.group === category));
    }
    for (const { section, topics } of groups) {
      let visible = 0;
      const categoryMatches = !category || section.dataset.section === category;
      for (const { row, number: topicNumber, words } of topics) {
        const matches = categoryMatches && (number === null ? tokens.every(token => words.includes(token)) : number === topicNumber);
        row.hidden = !matches;
        visible += Number(matches);
      }
      section.hidden = visible === 0;
      total += visible;
    }
    count.textContent = "Найдено тем: " + total + " из 42";
    empty.hidden = total > 0;
  }

  function showProgress() {
    const passed = loadProgress();
    progress.value = passed.size;
    progressLabel.textContent = passed.size + " / 42";
    for (const { topics } of groups) {
      for (const { row, number } of topics) {
        const status = row.querySelector(".read-status");
        const done = passed.has(number);
        status.textContent = done ? "✓" : "";
        status.setAttribute("aria-hidden", String(!done));
        if (done) status.setAttribute("aria-label", "Пройдено");
        else status.removeAttribute("aria-label");
      }
    }
  }

  for (const button of categories) {
    button.addEventListener("click", () => {
      category = button.dataset.group;
      filter();
    });
  }
  searchInput.addEventListener("input", filter);
  window.addEventListener("pageshow", showProgress);
  window.addEventListener("storage", showProgress);
  filter();
  showProgress();
}

function setupLesson(lesson) {
  const number = Number(lesson.dataset.lesson);
  const button = lesson.querySelector(".mark-read");
  const passed = loadProgress();

  function display() {
    const read = passed.has(number);
    button.setAttribute("aria-pressed", String(read));
    button.textContent = read ? "✓ Вопрос пройден" : "Отметить как пройденный";
  }

  button.hidden = false;
  display();
  button.addEventListener("click", () => {
    if (passed.has(number)) passed.delete(number);
    else passed.add(number);
    try {
      const latest = loadProgress();
      if (passed.has(number)) latest.add(number);
      else latest.delete(number);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...latest]));
    } catch {
      // The current page remains interactive if browser storage is disabled.
    }
    display();
  });
}

function setupChart(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const left = 10, top = 15, right = width - 12, bottom = height - 15;
    const px = x => left + (x + 7) / 14 * (right - left);
    const py = y => top + (1.2 - y) / 1.65 * (bottom - top);

    function line(x1, y1, x2, y2, color, weight = 1) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = weight;
      ctx.stroke();
    }

    for (let x = -6; x <= 6; x++) line(px(x), top, px(x), bottom, "#e1e4f5");
    for (const y of [-0.25, 0.25, 0.5, 0.75, 1]) line(left, py(y), right, py(y), "#e1e4f5");
    line(left, py(0), right, py(0), "#aeb5d6");
    line(px(0), top, px(0), bottom, "#aeb5d6");
    ctx.setLineDash([4, 4]);
    line(left, py(1), right, py(1), "#a6aeff");
    ctx.setLineDash([]);

    for (const [from, to] of [[-7, -0.14], [0.14, 7]]) {
      ctx.beginPath();
      for (let i = 0; i <= 190; i++) {
        const x = from + (to - from) * i / 190;
        const y = Math.sin(x) / x;
        if (i === 0) ctx.moveTo(px(x), py(y));
        else ctx.lineTo(px(x), py(y));
      }
      ctx.strokeStyle = "#454fe8";
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(px(0), py(1), 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#fefeff";
    ctx.fill();
    ctx.strokeStyle = "#454fe8";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "12px Segoe UI, sans-serif";
    ctx.fillStyle = "#545e85";
    ctx.fillText("1", left + 1, py(1) - 7);
    ctx.fillText("0", px(0) + 6, py(0) + 15);
    ctx.fillText("x", right - 6, py(0) - 7);
  }

  draw();
  if ("ResizeObserver" in window) new ResizeObserver(draw).observe(canvas);
}

const searchInput = document.querySelector("#topic-search");
const lesson = document.querySelector("[data-lesson]");
const chart = document.querySelector("#hero-chart");
if (searchInput) setupProgram(searchInput);
if (lesson) setupLesson(lesson);
if (chart) setupChart(chart);
