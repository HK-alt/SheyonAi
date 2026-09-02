import { GRAPH_MODEL_RUNTIME_JS } from '@/subject/science-graph/graph-models';
import type { ParsedScienceGraph } from '@/subject/science-graph/graph-types';

const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';

function escHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toInlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** App-owned advanced D3 teaching graph / timeline shell for WebView. */
export function buildGraphViewerHtml(parsed: ParsedScienceGraph): string {
  const payload = {
    chartType: parsed.chartType,
    title: parsed.title,
    goal: parsed.goal ?? '',
    caption: parsed.caption ?? '',
    xAxis: parsed.xAxis ?? null,
    yAxis: parsed.yAxis ?? null,
    yAxisRight: parsed.yAxisRight ?? null,
    series: parsed.series ?? [],
    events: parsed.events ?? [],
    eras: parsed.eras ?? [],
    annotations: parsed.annotations ?? [],
    insights: parsed.insights ?? [],
    controls: parsed.controls ?? [],
    model: parsed.model ?? null,
  };
  const json = toInlineJson(payload);
  const title = escHtml(parsed.title);
  const goal = escHtml(parsed.goal ?? '');
  const caption = escHtml(parsed.caption ?? 'Generated graph — teaching model.');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script src="${D3_CDN}"></script>
  <style>
    :root {
      --page: #f1f5f9; --card: #ffffff; --ink: #0f172a; --muted: #64748b;
      --accent: #0f766e; --border: #e2e8f0; --grid: #e2e8f0;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--page); color: var(--ink); font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
    body { padding: 14px; min-height: 100%; }
    .card {
      background: var(--card); border: 1px solid var(--border); border-radius: 16px;
      box-shadow: 0 1px 3px rgba(15,23,42,.08); padding: 18px 18px 14px; max-width: 960px; margin: 0 auto;
    }
    .head { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; }
    h1 { margin: 0 0 6px; font-size: 21px; font-weight: 650; line-height: 1.25; }
    .goal { margin: 0 0 12px; color: var(--muted); font-size: 13px; line-height: 1.45; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0; }
    .toolbar button {
      border: 1px solid var(--border); background: #fff; color: var(--ink);
      border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 600; cursor: pointer;
    }
    .toolbar button:active { transform: scale(0.98); }
    .wrap { position: relative; }
    #chart { width: 100%; min-height: 380px; touch-action: none; }
    #chart svg { display: block; width: 100%; height: auto; overflow: visible; }
    .axis text { fill: var(--ink); font-size: 11px; }
    .axis path, .axis line { stroke: #94a3b8; }
    .grid line { stroke: var(--grid); stroke-width: 1; }
    .legend { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 10px; font-size: 12px; color: var(--muted); }
    .legend button {
      display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent;
      color: inherit; cursor: pointer; padding: 2px 0; font: inherit;
    }
    .legend button.off { opacity: 0.35; text-decoration: line-through; }
    .swatch { width: 16px; height: 3px; border-radius: 2px; background: var(--accent); display: inline-block; }
    .controls { margin-top: 12px; display: grid; gap: 10px; }
    .control { display: grid; gap: 4px; }
    .control label { font-size: 12px; font-weight: 600; color: var(--ink); display: flex; justify-content: space-between; }
    .control input[type=range] { width: 100%; accent-color: var(--accent); }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .filters button {
      border: 1px solid var(--border); background: #fff; color: var(--ink);
      border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer;
    }
    .filters button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .insights { margin: 12px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; }
    .insights li {
      position: relative; padding: 8px 10px 8px 28px; background: #f8fafc; border: 1px solid var(--border);
      border-radius: 10px; font-size: 12px; line-height: 1.4; color: #334155;
    }
    .insights li::before {
      content: ""; position: absolute; left: 10px; top: 12px; width: 8px; height: 8px;
      border-radius: 50%; background: var(--accent);
    }
    .caption { margin: 12px 0 0; font-size: 11px; color: var(--muted); line-height: 1.4; }
    .tip {
      position: absolute; pointer-events: none; background: #0f172a; color: #fff;
      padding: 8px 10px; border-radius: 8px; font-size: 12px; max-width: 260px; z-index: 5;
      box-shadow: 0 8px 24px rgba(15,23,42,.28); display: none; line-height: 1.35;
    }
    .tip strong { display: block; margin-bottom: 2px; }
    .scrub { margin-top: 10px; display: none; gap: 10px; align-items: center; }
    .scrub.on { display: flex; }
    .scrub input { flex: 1; accent-color: var(--accent); }
    .scrub .year { min-width: 52px; text-align: right; font-size: 12px; font-weight: 700; color: var(--accent); }
  </style>
</head>
<body>
  <article class="card">
    <div class="head">
      <div>
        <h1 id="title">${title}</h1>
        <p class="goal" id="goal"${goal ? '' : ' hidden'}>${goal}</p>
      </div>
      <div class="toolbar" id="toolbar"></div>
    </div>
    <div class="wrap">
      <div id="chart"></div>
      <div class="tip" id="tip"></div>
    </div>
    <div class="legend" id="legend"></div>
    <div class="controls" id="controls"></div>
    <div class="filters" id="filters"></div>
    <div class="scrub" id="scrub">
      <button type="button" id="playBtn">Play</button>
      <input type="range" id="yearScrub" min="0" max="100" value="0" />
      <span class="year" id="yearLabel"></span>
    </div>
    <ul class="insights" id="insights"></ul>
    <p class="caption" id="caption">${caption}</p>
  </article>
  <script>
    window.__SCIENCE_GRAPH__ = ${json};
    ${GRAPH_MODEL_RUNTIME_JS}

    var data = window.__SCIENCE_GRAPH__;
    var COLORS = ['#0f766e','#1d4ed8','#b45309','#7c3aed','#be123c','#0369a1','#0ea5e9','#db2777'];
    var ERA_COLORS = ['#e0f2fe','#fef3c7','#dcfce7','#fce7f3','#ede9fe','#ffedd5'];
    var activeCategory = 'all';
    var controlValues = {};
    var hiddenSeries = {};
    var zoomTransform = d3.zoomIdentity;
    var playTimer = null;
    var scrubYear = null;

    (data.controls || []).forEach(function(c) { controlValues[c.id] = c.value; });

    function axisLabel(axis) {
      if (!axis) return '';
      return axis.unit ? (axis.label + ' (' + axis.unit + ')') : axis.label;
    }

    function dashArray(dash) {
      if (dash === 'dashed') return '7 4';
      if (dash === 'dotted') return '2 3';
      return null;
    }

    function resolveSeries() {
      if (data.model) {
        var params = Object.assign({}, data.model.params || {}, controlValues);
        var points = sampleModelPoints({ type: data.model.type, params: params }, controlValues, 64);
        var base = (data.series && data.series[0]) || {};
        return [{
          id: base.id || 'model',
          label: base.label || data.title || 'Model',
          color: base.color || COLORS[0],
          points: points,
          yAxis: base.yAxis || 'left',
          dash: base.dash || 'solid',
          markers: !!base.markers
        }];
      }
      return (data.series || []).map(function(s, i) {
        return {
          id: s.id || ('s' + i),
          label: s.label || ('Series ' + (i + 1)),
          color: s.color || COLORS[i % COLORS.length],
          points: s.points || [],
          yAxis: s.yAxis === 'right' ? 'right' : 'left',
          dash: s.dash || 'solid',
          markers: !!s.markers
        };
      }).filter(function(s) { return !hiddenSeries[s.id]; });
    }

    function allSeriesMeta() {
      if (data.model) {
        var base = (data.series && data.series[0]) || {};
        return [{ id: base.id || 'model', label: base.label || data.title || 'Model', color: base.color || COLORS[0] }];
      }
      return (data.series || []).map(function(s, i) {
        return { id: s.id || ('s' + i), label: s.label || ('Series ' + (i + 1)), color: s.color || COLORS[i % COLORS.length] };
      });
    }

    function filteredEvents() {
      var events = data.events || [];
      if (activeCategory === 'all') return events;
      return events.filter(function(e) { return (e.category || 'Other') === activeCategory; });
    }

    function showTip(html, evt, host) {
      var tip = document.getElementById('tip');
      tip.innerHTML = html;
      tip.style.display = 'block';
      var rect = host.getBoundingClientRect();
      var x = (evt.clientX != null ? evt.clientX : evt.pageX) - rect.left + 12;
      var y = (evt.clientY != null ? evt.clientY : evt.pageY) - rect.top + 12;
      tip.style.left = Math.min(x, Math.max(8, rect.width - 180)) + 'px';
      tip.style.top = Math.min(y, Math.max(8, rect.height - 60)) + 'px';
    }
    function hideTip() { document.getElementById('tip').style.display = 'none'; }

    function renderInsights() {
      var el = document.getElementById('insights');
      var items = data.insights || [];
      if (!items.length) { el.innerHTML = ''; return; }
      el.innerHTML = items.map(function(t) { return '<li>' + String(t).replace(/</g,'&lt;') + '</li>'; }).join('');
    }

    function renderToolbar() {
      var el = document.getElementById('toolbar');
      if (data.chartType === 'timeline') {
        el.innerHTML = '<button type="button" id="btnResetZoom">Fit</button>';
      } else {
        el.innerHTML = '<button type="button" id="btnResetZoom">Reset zoom</button>';
      }
      var btn = document.getElementById('btnResetZoom');
      if (btn) btn.onclick = function() {
        zoomTransform = d3.zoomIdentity;
        scrubYear = null;
        draw();
      };
    }

    function renderLegend() {
      var el = document.getElementById('legend');
      if (data.chartType === 'timeline') { el.innerHTML = ''; return; }
      var meta = allSeriesMeta();
      if (!meta.length) { el.innerHTML = ''; return; }
      el.innerHTML = meta.map(function(s) {
        var off = hiddenSeries[s.id] ? ' off' : '';
        return '<button type="button" class="' + off + '" data-id="' + s.id + '"><i class="swatch" style="background:' + s.color + '"></i>' + s.label + '</button>';
      }).join('');
      Array.prototype.forEach.call(el.querySelectorAll('button'), function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-id');
          hiddenSeries[id] = !hiddenSeries[id];
          draw();
        });
      });
    }

    function renderControls() {
      var el = document.getElementById('controls');
      var controls = data.controls || [];
      if (!controls.length || data.chartType === 'timeline') { el.innerHTML = ''; return; }
      el.innerHTML = controls.map(function(c) {
        var v = controlValues[c.id];
        return '<div class="control"><label><span>' + c.label + '</span><span id="val-' + c.id + '">' + v + '</span></label>' +
          '<input type="range" data-id="' + c.id + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + v + '" /></div>';
      }).join('');
      Array.prototype.forEach.call(el.querySelectorAll('input[type=range]'), function(input) {
        input.addEventListener('input', function() {
          var id = input.getAttribute('data-id');
          controlValues[id] = Number(input.value);
          var lab = document.getElementById('val-' + id);
          if (lab) lab.textContent = input.value;
          // Keep annotation K in sync for logistic
          if (id === 'K' && data.annotations) {
            data.annotations.forEach(function(a) {
              if (a.id === 'auto-k' || a.label === 'K') a.y = controlValues.K;
            });
          }
          draw();
        });
      });
    }

    function renderFilters() {
      var el = document.getElementById('filters');
      if (data.chartType !== 'timeline') { el.innerHTML = ''; return; }
      var cats = {};
      (data.events || []).forEach(function(e) { cats[e.category || 'Other'] = true; });
      var keys = Object.keys(cats);
      if (keys.length < 2) { el.innerHTML = ''; return; }
      var html = '<button data-cat="all" class="' + (activeCategory === 'all' ? 'active' : '') + '">All</button>';
      keys.forEach(function(c) {
        html += '<button data-cat="' + c + '" class="' + (activeCategory === c ? 'active' : '') + '">' + c + '</button>';
      });
      el.innerHTML = html;
      Array.prototype.forEach.call(el.querySelectorAll('button'), function(btn) {
        btn.addEventListener('click', function() {
          activeCategory = btn.getAttribute('data-cat');
          draw();
        });
      });
    }

    function extentOf(points, idx) {
      return d3.extent(points, function(d) { return d[idx]; });
    }

    function drawChart(series) {
      var host = document.getElementById('chart');
      host.innerHTML = '';
      var width = Math.max(host.clientWidth || 640, 280);
      var height = 420;
      var hasRight = series.some(function(s) { return s.yAxis === 'right'; }) || !!data.yAxisRight;
      var margin = { top: 18, right: hasRight ? 58 : 20, bottom: 52, left: 58 };
      var innerW = width - margin.left - margin.right;
      var innerH = height - margin.top - margin.bottom;

      var svg = d3.select(host).append('svg')
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        .attr('role', 'img')
        .attr('aria-label', data.title || 'Teaching graph');

      var root = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
      var clipId = 'clip-' + Math.random().toString(36).slice(2);
      svg.append('defs').append('clipPath').attr('id', clipId)
        .append('rect').attr('width', innerW).attr('height', innerH);

      var leftPts = [], rightPts = [], allX = [];
      series.forEach(function(s) {
        s.points.forEach(function(p) { allX.push(p[0]); });
        if (s.yAxis === 'right') rightPts = rightPts.concat(s.points);
        else leftPts = leftPts.concat(s.points);
      });
      (data.annotations || []).forEach(function(a) {
        if (a.x != null) allX.push(a.x);
      });
      if (!allX.length) return;

      var x0 = d3.extent(allX);
      var yL0 = leftPts.length ? extentOf(leftPts, 1) : [0, 1];
      var yR0 = rightPts.length ? extentOf(rightPts, 1) : yL0;
      var yLpad = ((yL0[1] - yL0[0]) || 1) * 0.1;
      var yRpad = ((yR0[1] - yR0[0]) || 1) * 0.1;

      var xScale = d3.scaleLinear().domain(x0).nice().range([0, innerW]);
      var yLeft = d3.scaleLinear().domain([Math.min(0, yL0[0] - yLpad), yL0[1] + yLpad]).nice().range([innerH, 0]);
      var yRight = d3.scaleLinear().domain([yR0[0] - yRpad, yR0[1] + yRpad]).nice().range([innerH, 0]);

      function yFor(s) { return s.yAxis === 'right' ? yRight : yLeft; }

      var zx = zoomTransform.rescaleX(xScale);
      var plot = root.append('g').attr('clip-path', 'url(#' + clipId + ')');

      root.append('g').attr('class', 'grid')
        .call(d3.axisLeft(yLeft).ticks(6).tickSize(-innerW).tickFormat(''))
        .select('.domain').remove();

      root.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + innerH + ')')
        .call(d3.axisBottom(zx).ticks(7));
      root.append('g').attr('class', 'axis').call(d3.axisLeft(yLeft).ticks(6));
      if (hasRight) {
        root.append('g').attr('class', 'axis').attr('transform', 'translate(' + innerW + ',0)')
          .call(d3.axisRight(yRight).ticks(6));
      }

      root.append('text').attr('x', innerW / 2).attr('y', innerH + 42)
        .attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', 12)
        .text(axisLabel(data.xAxis));
      root.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -44)
        .attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', 12)
        .text(axisLabel(data.yAxis));
      if (hasRight && data.yAxisRight) {
        root.append('text').attr('transform', 'rotate(90)')
          .attr('x', innerH / 2).attr('y', -innerW - 42)
          .attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', 12)
          .text(axisLabel(data.yAxisRight));
      }

      var type = data.chartType;

      // Annotations
      (data.annotations || []).forEach(function(a) {
        var col = a.color || '#b45309';
        if (a.x != null) {
          plot.append('line').attr('x1', zx(a.x)).attr('x2', zx(a.x)).attr('y1', 0).attr('y2', innerH)
            .attr('stroke', col).attr('stroke-dasharray', '5 4').attr('stroke-width', 1.4);
          plot.append('text').attr('x', zx(a.x) + 4).attr('y', 12).attr('fill', col).attr('font-size', 11).text(a.label);
        }
        if (a.y != null) {
          var ys = a.yAxis === 'right' ? yRight : yLeft;
          plot.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', ys(a.y)).attr('y2', ys(a.y))
            .attr('stroke', col).attr('stroke-dasharray', '5 4').attr('stroke-width', 1.4);
          plot.append('text').attr('x', innerW - 4).attr('y', ys(a.y) - 5)
            .attr('text-anchor', 'end').attr('fill', col).attr('font-size', 11).text(a.label);
        }
      });

      if (type === 'bar') {
        var flat = series[0] ? series[0].points : [];
        var bw = Math.max(2, (innerW / Math.max(flat.length, 1)) * 0.65);
        plot.selectAll('.bar').data(flat).enter().append('rect')
          .attr('x', function(d) { return zx(d[0]) - bw / 2; })
          .attr('y', function(d) { return yLeft(Math.max(0, d[1])); })
          .attr('width', bw)
          .attr('height', function(d) { return Math.abs(yLeft(d[1]) - yLeft(0)); })
          .attr('fill', (series[0] && series[0].color) || COLORS[0])
          .attr('opacity', 0.88)
          .on('mousemove', function(evt, d) {
            showTip('<strong>' + ((series[0] && series[0].label) || 'Value') + '</strong>x: ' + d[0] + '<br/>y: ' + d[1], evt, host);
          })
          .on('mouseleave', hideTip);
      } else {
        series.forEach(function(s) {
          var ys = yFor(s);
          if (type === 'area') {
            var area = d3.area().x(function(d) { return zx(d[0]); }).y0(ys(0)).y1(function(d) { return ys(d[1]); }).curve(d3.curveMonotoneX);
            plot.append('path').datum(s.points).attr('fill', s.color).attr('opacity', 0.14).attr('d', area);
          }
          if (type !== 'scatter') {
            var line = d3.line().x(function(d) { return zx(d[0]); }).y(function(d) { return ys(d[1]); }).curve(d3.curveMonotoneX);
            var path = plot.append('path').datum(s.points)
              .attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', 2.6).attr('d', line);
            var da = dashArray(s.dash);
            if (da) path.attr('stroke-dasharray', da);
            path.attr('stroke-linecap', 'round');
          }
          if (type === 'scatter' || s.markers) {
            plot.selectAll(null).data(s.points).enter().append('circle')
              .attr('cx', function(d) { return zx(d[0]); })
              .attr('cy', function(d) { return ys(d[1]); })
              .attr('r', type === 'scatter' ? 4 : 2.5)
              .attr('fill', s.color)
              .attr('opacity', 0.9);
          }
        });
      }

      // Crosshair + nearest-point tooltip
      var cross = plot.append('g').style('display', 'none');
      cross.append('line').attr('class', 'cx').attr('y1', 0).attr('y2', innerH).attr('stroke', '#94a3b8').attr('stroke-dasharray', '3 3');
      var overlay = plot.append('rect').attr('width', innerW).attr('height', innerH).attr('fill', 'transparent')
        .style('cursor', 'crosshair');

      overlay.on('mousemove', function(evt) {
        var pt = d3.pointer(evt);
        var xVal = zx.invert(pt[0]);
        cross.style('display', null).select('.cx').attr('x1', pt[0]).attr('x2', pt[0]);
        var rows = [];
        series.forEach(function(s) {
          if (!s.points.length) return;
          var bis = d3.bisector(function(d) { return d[0]; }).center;
          var i = bis(s.points, xVal);
          var d = s.points[Math.max(0, Math.min(s.points.length - 1, i))];
          rows.push('<span style="color:' + s.color + '">●</span> ' + s.label + ': <b>' + d[1] + '</b> @ ' + d[0]);
        });
        if (rows.length) showTip('<strong>' + (data.xAxis && data.xAxis.label ? data.xAxis.label : 'x') + ' ≈ ' + (+xVal.toFixed(3)) + '</strong>' + rows.join('<br/>'), evt, host);
      }).on('mouseleave', function() {
        cross.style('display', 'none');
        hideTip();
      });

      host.onwheel = function(evt) {
        evt.preventDefault();
        var factor = evt.deltaY < 0 ? 1.12 : 1 / 1.12;
        var nextK = Math.max(1, Math.min(12, zoomTransform.k * factor));
        zoomTransform = d3.zoomIdentity.scale(nextK);
        draw();
      };
    }

    function drawTimeline() {
      var host = document.getElementById('chart');
      host.innerHTML = '';
      var events = filteredEvents().slice().sort(function(a, b) { return a.start - b.start; });
      var eras = data.eras || [];
      var cats = [];
      var catSet = {};
      events.forEach(function(e) {
        var c = e.category || 'Other';
        if (!catSet[c]) { catSet[c] = true; cats.push(c); }
      });
      if (!cats.length) cats = ['Events'];

      var width = Math.max(host.clientWidth || 640, 280);
      var laneH = 44;
      var height = Math.max(260, 90 + cats.length * laneH + (eras.length ? 28 : 0));
      var margin = { top: 36, right: 20, bottom: 40, left: 108 };
      var innerW = width - margin.left - margin.right;
      var innerH = height - margin.top - margin.bottom;

      var svg = d3.select(host).append('svg')
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        .attr('role', 'img')
        .attr('aria-label', data.title || 'Teaching timeline');
      var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      if (!events.length) {
        g.append('text').attr('x', innerW / 2).attr('y', 40).attr('text-anchor', 'middle')
          .attr('fill', '#64748b').text('No events for this filter');
        document.getElementById('scrub').className = 'scrub';
        return;
      }

      var min = d3.min(events.concat(eras.map(function(e){return {start:e.start,end:e.end};})), function(e) { return e.start; });
      var max = d3.max(events.concat(eras.map(function(e){return {start:e.start,end:e.end};})), function(e) { return (e.end != null ? e.end : e.start); });
      if (min === max) { min -= 1; max += 1; }
      var pad = Math.max(0.5, (max - min) * 0.04);
      var x = d3.scaleLinear().domain([min - pad, max + pad]).range([0, innerW]);
      if (zoomTransform && zoomTransform.k !== 1) x = zoomTransform.rescaleX(x);

      var y = d3.scaleBand().domain(cats).range([0, cats.length * laneH]).padding(0.25);

      // Era bands
      eras.forEach(function(era, i) {
        var x0 = x(era.start), x1 = x(era.end);
        g.append('rect')
          .attr('x', Math.min(x0, x1)).attr('y', -8)
          .attr('width', Math.max(4, Math.abs(x1 - x0)))
          .attr('height', cats.length * laneH + 16)
          .attr('fill', era.color || ERA_COLORS[i % ERA_COLORS.length])
          .attr('opacity', 0.55);
        g.append('text')
          .attr('x', Math.min(x0, x1) + 6).attr('y', -14)
          .attr('fill', '#475569').attr('font-size', 11).attr('font-weight', 600)
          .text(era.label);
      });

      // Lane labels + guides
      cats.forEach(function(c) {
        g.append('text')
          .attr('x', -10).attr('y', (y(c) || 0) + y.bandwidth() / 2)
          .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
          .attr('fill', '#334155').attr('font-size', 11).attr('font-weight', 600)
          .text(c);
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', (y(c) || 0) + y.bandwidth() / 2)
          .attr('y2', (y(c) || 0) + y.bandwidth() / 2)
          .attr('stroke', '#e2e8f0');
      });

      g.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + (cats.length * laneH + 8) + ')')
        .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));

      // Playhead
      if (scrubYear == null) scrubYear = min;
      var playX = x(scrubYear);
      g.append('line').attr('x1', playX).attr('x2', playX).attr('y1', -8).attr('y2', cats.length * laneH + 8)
        .attr('stroke', '#0f766e').attr('stroke-width', 2).attr('opacity', 0.85);
      g.append('circle').attr('cx', playX).attr('cy', -8).attr('r', 4).attr('fill', '#0f766e');

      events.forEach(function(e, i) {
        var cat = e.category || 'Other';
        var cy = (y(cat) || 0) + y.bandwidth() / 2;
        var x0 = x(e.start);
        var x1 = x(e.end != null ? e.end : e.start);
        var color = e.color || COLORS[i % COLORS.length];
        var imp = Math.max(1, Math.min(5, e.importance || 3));
        var r = 4 + imp;
        var active = e.start <= scrubYear && (e.end == null ? e.start >= scrubYear - 0.01 : e.end >= scrubYear);
        var opacity = active ? 1 : 0.35;

        var node;
        if (e.end != null && e.end !== e.start) {
          node = g.append('rect')
            .attr('x', Math.min(x0, x1))
            .attr('y', cy - (6 + imp * 0.8))
            .attr('width', Math.max(8, Math.abs(x1 - x0)))
            .attr('height', 12 + imp * 1.4)
            .attr('rx', 6)
            .attr('fill', color)
            .attr('opacity', opacity);
        } else {
          node = g.append('circle')
            .attr('cx', x0).attr('cy', cy).attr('r', r)
            .attr('fill', color)
            .attr('opacity', opacity)
            .attr('stroke', '#fff').attr('stroke-width', 1.5);
        }
        node.style('cursor', 'pointer')
          .on('mousemove', function(evt) {
            showTip('<strong>' + e.label + '</strong>' + e.start + (e.end != null ? '–' + e.end : '') +
              (e.category ? '<br/>' + e.category : '') +
              (e.detail ? '<br/>' + e.detail : ''), evt, host);
          })
          .on('mouseleave', hideTip);

        g.append('text')
          .attr('x', Math.min(x0, x1) + (e.end != null && e.end !== e.start ? 8 : r + 6))
          .attr('y', cy - (10 + imp))
          .attr('fill', '#0f172a')
          .attr('font-size', 11)
          .attr('font-weight', imp >= 4 ? 700 : 500)
          .attr('opacity', opacity)
          .text(e.label.length > 28 ? e.label.slice(0, 26) + '…' : e.label);
      });

      // Scrubber UI
      var scrub = document.getElementById('scrub');
      scrub.className = 'scrub on';
      var input = document.getElementById('yearScrub');
      var label = document.getElementById('yearLabel');
      input.min = String(Math.floor(min));
      input.max = String(Math.ceil(max));
      input.step = '1';
      input.value = String(Math.round(scrubYear));
      label.textContent = String(Math.round(scrubYear));
      input.oninput = function() {
        scrubYear = Number(input.value);
        label.textContent = String(Math.round(scrubYear));
        drawTimeline();
      };

      var playBtn = document.getElementById('playBtn');
      playBtn.onclick = function() {
        if (playTimer) {
          clearInterval(playTimer); playTimer = null; playBtn.textContent = 'Play'; return;
        }
        playBtn.textContent = 'Pause';
        playTimer = setInterval(function() {
          scrubYear = Math.min(max, (scrubYear || min) + Math.max(0.25, (max - min) / 80));
          if (scrubYear >= max) {
            clearInterval(playTimer); playTimer = null; playBtn.textContent = 'Play';
          }
          drawTimeline();
        }, 120);
      };
    }

    // Guard against redraw loops
    var drawing = false;
    function draw() {
      if (drawing) return;
      drawing = true;
      try {
        renderToolbar();
        renderFilters();
        renderInsights();
        if (data.chartType === 'timeline') {
          document.getElementById('legend').innerHTML = '';
          drawTimeline();
        } else {
          document.getElementById('scrub').className = 'scrub';
          if (playTimer) { clearInterval(playTimer); playTimer = null; }
          var series = resolveSeries();
          renderLegend();
          drawChart(series);
        }
      } finally {
        drawing = false;
      }
    }

    renderControls();
    draw();
    window.addEventListener('resize', function() { draw(); });
  </script>
</body>
</html>`;
}
